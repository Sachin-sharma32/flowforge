import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { config } from '../config';
import { IUserDocument, User } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { Workspace } from '../models/workspace.model';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../domain/errors';
import type {
  RegisterInput,
  LoginInput,
  IUserResponse,
  ResendVerificationInput,
  VerifyEmailInput,
  GoogleOneTapInput,
  RequestOtpInput,
  VerifyOtpInput,
} from '@flowforge/shared';
import { JwtPayload } from '../middleware/auth.middleware';
import { RefreshSessionService } from './refresh-session.service';
import { getLimitsForPlan } from '../domain/billing';
import { parseDurationToMilliseconds } from '../utils/duration';
import { EmailService } from './email.service';

type OAuthProvider = 'google' | 'github';

interface AuthResult {
  user: IUserResponse;
  tokens: { accessToken: string };
  refreshToken: string;
}

interface RefreshResult {
  tokens: { accessToken: string };
  refreshToken: string;
}

interface RegisterResult {
  user: IUserResponse;
  requiresEmailVerification: boolean;
  verificationToken?: string;
}

interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  username?: string;
}

interface GoogleTokenResponse {
  access_token?: string;
}

interface GoogleProfileResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface GoogleOneTapTokenInfoResponse {
  aud?: string;
  email?: string;
  email_verified?: string;
  exp?: string;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

interface GithubTokenResponse {
  access_token?: string;
}

interface GithubUserResponse {
  id?: number;
  email?: string | null;
  name?: string | null;
  login?: string;
  avatar_url?: string | null;
}

interface GithubEmailResponse {
  email: string;
  verified: boolean;
  primary: boolean;
}

export class AuthService {
  private readonly emailVerificationExpiryMs = parseDurationToMilliseconds(
    config.AUTH_EMAIL_VERIFICATION_EXPIRY,
  );

  constructor(
    private readonly refreshSessionService = new RefreshSessionService(),
    private readonly emailService = new EmailService(),
  ) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const verification = this.createEmailVerificationToken();
    const user = await User.create({
      email: normalizedEmail,
      passwordHash: input.password,
      name: input.name,
      isVerified: config.NODE_ENV !== 'production',
      emailVerificationTokenHash: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
    });

    await this.ensureDefaultWorkspace(user._id.toString(), input.name);
    if (config.NODE_ENV === 'production') {
      await this.sendVerificationEmail(user.email, user.name, verification.rawToken);
    }

    return {
      user: this.toUserResponse(user),
      requiresEmailVerification: config.NODE_ENV === 'production',
      ...(config.NODE_ENV !== 'production' ? { verificationToken: verification.rawToken } : {}),
    };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const token = input.token.trim();
    if (!token) {
      throw new UnauthorizedError('Verification token is required');
    }

    const tokenHash = this.hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid or expired verification link');
    }

    user.isVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
  }

  async resendVerification(input: ResendVerificationInput): Promise<void> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Prevent account enumeration.
    if (!user || user.isVerified) {
      return;
    }

    const verification = this.createEmailVerificationToken();
    user.emailVerificationTokenHash = verification.tokenHash;
    user.emailVerificationExpiresAt = verification.expiresAt;
    await user.save();

    await this.sendVerificationEmail(user.email, user.name, verification.rawToken);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email.toLowerCase().trim() });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError(
        'This account uses social sign-in. Continue with Google or GitHub.',
      );
    }

    const isValid = await user.comparePassword(input.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isVerified) {
      if (config.NODE_ENV !== 'production') {
        user.isVerified = true;
        user.emailVerificationTokenHash = undefined;
        user.emailVerificationExpiresAt = undefined;
        await user.save();
      } else {
        throw new ForbiddenError('Please verify your email before signing in.');
      }
    }

    return this.issueAuthResult(this.toUserResponse(user), user._id.toString());
  }

  async requestOtp(input: RequestOtpInput): Promise<void> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always return success to prevent account enumeration
    if (!user) {
      return;
    }

    if (!user.isVerified) {
      return;
    }

    const otp = this.generateOtp();
    user.otpHash = this.hashToken(otp);
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    await this.sendOtpEmail(user.email, user.name, otp);
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResult> {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new UnauthorizedError('Invalid email or OTP');
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      throw new UnauthorizedError('Invalid email or OTP');
    }

    if (user.otpExpiresAt < new Date()) {
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      await user.save();
      throw new UnauthorizedError('OTP has expired. Please request a new one.');
    }

    const otpHash = this.hashToken(input.otp);
    if (otpHash !== user.otpHash) {
      throw new UnauthorizedError('Invalid email or OTP');
    }

    // Clear OTP after successful use
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    return this.issueAuthResult(this.toUserResponse(user), user._id.toString());
  }

  getOAuthAuthorizationUrl(provider: OAuthProvider, state: string): string {
    if (provider === 'google') {
      if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
        throw new ValidationError('Google OAuth is not configured');
      }

      const params = new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID,
        redirect_uri: this.getOAuthRedirectUri('google'),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });

      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
      throw new ValidationError('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: config.GITHUB_CLIENT_ID,
      redirect_uri: this.getOAuthRedirectUri('github'),
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async loginWithOAuth(provider: OAuthProvider, code: string): Promise<AuthResult> {
    if (!code.trim()) {
      throw new UnauthorizedError('Missing OAuth authorization code');
    }

    const profile =
      provider === 'google'
        ? await this.fetchGoogleProfile(code)
        : await this.fetchGithubProfile(code);

    return this.loginWithOAuthProfile(provider, profile);
  }

  async loginWithGoogleOneTap(input: GoogleOneTapInput): Promise<AuthResult> {
    if (!config.GOOGLE_CLIENT_ID) {
      throw new ValidationError('Google OAuth is not configured');
    }

    const profile = await this.verifyGoogleOneTapCredential(input.credential);
    return this.loginWithOAuthProfile('google', profile);
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const rotatedSession = await this.refreshSessionService.rotateSession(refreshToken);

    if (rotatedSession.status === 'invalid') {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (rotatedSession.status === 'replay') {
      if (rotatedSession.userId) {
        await this.refreshSessionService.revokeAllUserSessions(rotatedSession.userId);
      }
      throw new UnauthorizedError('Refresh token replay detected. Please sign in again.');
    }

    return {
      tokens: {
        accessToken: this.generateAccessToken(rotatedSession.userId),
      },
      refreshToken: rotatedSession.refreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshSessionService.revokeSession(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshSessionService.revokeAllUserSessions(userId);
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
  }

  private applyOAuthProfileToExistingUser(
    user: IUserDocument,
    provider: OAuthProvider,
    profile: OAuthProfile,
    normalizedEmail: string,
  ): boolean {
    let changed = false;

    if (!user.isVerified) {
      user.isVerified = true;
      user.emailVerificationTokenHash = undefined;
      user.emailVerificationExpiresAt = undefined;
      changed = true;
    }

    if (!user.avatar && profile.avatar) {
      user.avatar = profile.avatar;
      changed = true;
    }

    if (provider === 'google') {
      const existingProviderId = user.oauthProviders?.google?.id;
      if (existingProviderId && existingProviderId !== profile.providerId) {
        throw new ConflictError('This account is linked to a different Google profile');
      }

      if (!existingProviderId) {
        user.set('oauthProviders.google.id', profile.providerId);
        changed = true;
      }

      if (user.oauthProviders?.google?.email !== normalizedEmail) {
        user.set('oauthProviders.google.email', normalizedEmail);
        changed = true;
      }
    } else {
      const existingProviderId = user.oauthProviders?.github?.id;
      if (existingProviderId && existingProviderId !== profile.providerId) {
        throw new ConflictError('This account is linked to a different GitHub profile');
      }

      if (!existingProviderId) {
        user.set('oauthProviders.github.id', profile.providerId);
        changed = true;
      }

      if (user.oauthProviders?.github?.email !== normalizedEmail) {
        user.set('oauthProviders.github.email', normalizedEmail);
        changed = true;
      }

      if (profile.username && user.oauthProviders?.github?.username !== profile.username) {
        user.set('oauthProviders.github.username', profile.username);
        changed = true;
      }
    }

    return changed;
  }

  private async loginWithOAuthProfile(
    provider: OAuthProvider,
    profile: OAuthProfile,
  ): Promise<AuthResult> {
    const normalizedEmail = profile.email.toLowerCase().trim();
    let user = await User.findOne({
      [`oauthProviders.${provider}.id`]: profile.providerId,
    });

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });
    }

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await User.create({
        email: normalizedEmail,
        name: profile.name,
        avatar: profile.avatar,
        isVerified: true,
        oauthProviders:
          provider === 'google'
            ? {
                google: {
                  id: profile.providerId,
                  email: normalizedEmail,
                },
              }
            : {
                github: {
                  id: profile.providerId,
                  email: normalizedEmail,
                  ...(profile.username ? { username: profile.username } : {}),
                },
              },
      });
    } else {
      const changed = this.applyOAuthProfileToExistingUser(
        user,
        provider,
        profile,
        normalizedEmail,
      );
      if (changed) {
        await user.save();
      }
    }

    if (isNewUser) {
      await this.ensureDefaultWorkspace(user._id.toString(), user.name);
    }

    return this.issueAuthResult(this.toUserResponse(user), user._id.toString());
  }

  private async fetchGoogleProfile(code: string): Promise<OAuthProfile> {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      throw new ValidationError('Google OAuth is not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.getOAuthRedirectUri('google'),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedError('Google sign-in failed');
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      throw new UnauthorizedError('Google access token is missing');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedError('Failed to load Google profile');
    }

    const profile = (await profileResponse.json()) as GoogleProfileResponse;
    if (!profile.sub || !profile.email) {
      throw new UnauthorizedError('Unable to retrieve Google account identity');
    }

    if (profile.email_verified === false) {
      throw new ForbiddenError('Google account email must be verified');
    }

    return {
      providerId: profile.sub,
      email: profile.email,
      name: profile.name?.trim() || this.nameFromEmail(profile.email),
      ...(profile.picture ? { avatar: profile.picture } : {}),
    };
  }

  private async verifyGoogleOneTapCredential(idToken: string): Promise<OAuthProfile> {
    const token = idToken.trim();
    if (!token) {
      throw new UnauthorizedError('Google credential is required');
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) {
      throw new UnauthorizedError('Google credential is invalid or expired');
    }

    const tokenInfo = (await response.json()) as GoogleOneTapTokenInfoResponse;
    if (tokenInfo.aud !== config.GOOGLE_CLIENT_ID) {
      throw new UnauthorizedError('Google credential audience mismatch');
    }

    if (
      tokenInfo.iss !== 'accounts.google.com' &&
      tokenInfo.iss !== 'https://accounts.google.com'
    ) {
      throw new UnauthorizedError('Google credential issuer is invalid');
    }

    const expiresAt = Number(tokenInfo.exp);
    if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedError('Google credential is expired');
    }

    if (tokenInfo.email_verified !== 'true') {
      throw new ForbiddenError('Google account email must be verified');
    }

    if (!tokenInfo.sub || !tokenInfo.email) {
      throw new UnauthorizedError('Unable to retrieve Google account identity');
    }

    return {
      providerId: tokenInfo.sub,
      email: tokenInfo.email,
      name: tokenInfo.name?.trim() || this.nameFromEmail(tokenInfo.email),
      ...(tokenInfo.picture ? { avatar: tokenInfo.picture } : {}),
    };
  }

  private async fetchGithubProfile(code: string): Promise<OAuthProfile> {
    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
      throw new ValidationError('GitHub OAuth is not configured');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: this.getOAuthRedirectUri('github'),
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedError('GitHub sign-in failed');
    }

    const tokenData = (await tokenResponse.json()) as GithubTokenResponse;
    if (!tokenData.access_token) {
      throw new UnauthorizedError('GitHub access token is missing');
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'FlowForge',
      },
    });

    if (!userResponse.ok) {
      throw new UnauthorizedError('Failed to load GitHub profile');
    }

    const profile = (await userResponse.json()) as GithubUserResponse;
    if (!profile.id || !profile.login) {
      throw new UnauthorizedError('Unable to retrieve GitHub account identity');
    }

    const email = await this.resolveGithubEmail(tokenData.access_token, profile.email || undefined);
    const displayName = profile.name?.trim() || profile.login;

    return {
      providerId: profile.id.toString(),
      email,
      name: displayName,
      username: profile.login,
      ...(profile.avatar_url ? { avatar: profile.avatar_url } : {}),
    };
  }

  private async resolveGithubEmail(accessToken: string, fallbackEmail?: string): Promise<string> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'FlowForge',
      },
    });

    if (!response.ok) {
      if (fallbackEmail) {
        return fallbackEmail;
      }
      throw new UnauthorizedError('GitHub account must have a verified email address');
    }

    const emails = (await response.json()) as GithubEmailResponse[];
    const verifiedPrimary = emails.find((email) => email.primary && email.verified);
    if (verifiedPrimary?.email) {
      return verifiedPrimary.email;
    }

    const verifiedAny = emails.find((email) => email.verified);
    if (verifiedAny?.email) {
      return verifiedAny.email;
    }

    if (fallbackEmail) {
      return fallbackEmail;
    }

    throw new UnauthorizedError('GitHub account must have a verified email address');
  }

  private getOAuthRedirectUri(provider: OAuthProvider): string {
    return `${config.API_PUBLIC_URL}/api/v1/auth/oauth/${provider}/callback`;
  }

  private createEmailVerificationToken(): {
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const rawToken = randomBytes(32).toString('base64url');
    return {
      rawToken,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + this.emailVerificationExpiryMs),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${config.API_PUBLIC_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your FlowForge account';
    const html = `
      <p>Hi ${this.escapeHtml(name)},</p>
      <p>Thanks for creating your FlowForge account. Please verify your email to activate sign-in.</p>
      <p><a href="${verificationUrl}">Verify your email</a></p>
      <p>This link expires in ${config.AUTH_EMAIL_VERIFICATION_EXPIRY}.</p>
    `;
    const text = [
      `Hi ${name},`,
      '',
      'Thanks for creating your FlowForge account.',
      'Please verify your email to activate sign-in.',
      '',
      verificationUrl,
      '',
      `This link expires in ${config.AUTH_EMAIL_VERIFICATION_EXPIRY}.`,
    ].join('\n');

    await this.emailService.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private async ensureDefaultWorkspace(userId: string, ownerName: string): Promise<void> {
    let organization = await Organization.findOne({ ownerId: userId });

    if (!organization) {
      const slug = ownerName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 8);

      organization = await Organization.create({
        name: `${ownerName}'s Organization`,
        slug: `${slug}-${uniqueSuffix}`,
        ownerId: userId,
        plan: 'free',
        limits: getLimitsForPlan('free'),
        billing: {
          subscriptionStatus: 'none',
          cancelAtPeriodEnd: false,
        },
      });
    }

    const existingWorkspace = await Workspace.findOne({
      organizationId: organization._id,
      'members.userId': userId,
    });

    if (!existingWorkspace) {
      await Workspace.create({
        organizationId: organization._id,
        name: 'Default Workspace',
        slug: 'default',
        members: [{ userId, role: 'owner', joinedAt: new Date() }],
      });
    }
  }

  private async issueAuthResult(user: IUserResponse, userId: string): Promise<AuthResult> {
    const { refreshToken } = await this.refreshSessionService.createSession(userId);
    return {
      user,
      tokens: {
        accessToken: this.generateAccessToken(userId),
      },
      refreshToken,
    };
  }

  private generateAccessToken(userId: string): string {
    const payload: JwtPayload = { userId };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY as string,
    } as jwt.SignOptions);
  }

  private toUserResponse(user: IUserDocument): IUserResponse {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      ...(user.avatar ? { avatar: user.avatar } : {}),
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private nameFromEmail(email: string): string {
    const localPart = email.split('@')[0] || 'FlowForge User';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    return normalized.length > 0 ? normalized : 'FlowForge User';
  }

  private generateOtp(): string {
    const bytes = randomBytes(4);
    const num = bytes.readUInt32BE(0) % 1_000_000;
    return num.toString().padStart(6, '0');
  }

  private async sendOtpEmail(email: string, name: string, otp: string): Promise<void> {
    const subject = 'Your FlowForge sign-in code';
    const html = `
      <p>Hi ${this.escapeHtml(name)},</p>
      <p>Your one-time sign-in code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace">${otp}</p>
      <p>This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
    `;
    const text = [
      `Hi ${name},`,
      '',
      `Your one-time sign-in code is: ${otp}`,
      '',
      'This code expires in 5 minutes.',
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n');

    await this.emailService.sendEmail({ to: email, subject, html, text });
  }
}
