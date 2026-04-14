import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHash } from 'node:crypto';
import { AuthService } from '../auth.service';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';
import { Workspace } from '../../models/workspace.model';
import { RefreshSessionService, RotateRefreshSessionResult } from '../refresh-session.service';
import { EmailService } from '../email.service';

// Mock config
jest.mock('../../config', () => ({
  config: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-minimum-16-chars',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    AUTH_EMAIL_VERIFICATION_EXPIRY: '24h',
    API_PUBLIC_URL: 'http://localhost:4000',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    GITHUB_CLIENT_ID: 'github-client-id',
    GITHUB_CLIENT_SECRET: 'github-client-secret',
    FREE_EXECUTION_LIMIT: 1000,
    PRO_EXECUTION_LIMIT: 10000,
    ENTERPRISE_EXECUTION_LIMIT: 100000,
  },
}));

describe('AuthService', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  const refreshSessionServiceMock = {
    createSession: jest.fn<Promise<{ refreshToken: string }>, [string]>(),
    rotateSession: jest.fn<Promise<RotateRefreshSessionResult>, [string]>(),
    revokeSession: jest.fn<Promise<void>, [string]>(),
    revokeAllUserSessions: jest.fn<Promise<void>, [string]>(),
  };

  const emailServiceMock = {
    sendEmail: jest.fn<
      Promise<void>,
      [{ to: string; subject: string; html: string; text: string }]
    >(),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    refreshSessionServiceMock.createSession.mockResolvedValue({
      refreshToken: 'test-refresh-token',
    });
    emailServiceMock.sendEmail.mockResolvedValue();
    fetchSpy.mockReset();
    authService = new AuthService(
      refreshSessionServiceMock as unknown as RefreshSessionService,
      emailServiceMock as unknown as EmailService,
    );
  });

  afterAll(async () => {
    fetchSpy.mockRestore();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Workspace.deleteMany({});
  });

  describe('register', () => {
    it('creates user and sends verification email', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.requiresEmailVerification).toBe(false);
      expect(result.verificationToken).toBeDefined();
      expect(emailServiceMock.sendEmail).toHaveBeenCalledTimes(0);

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.isVerified).toBe(true);
      expect(user?.emailVerificationTokenHash).toBeDefined();
      expect(user?.emailVerificationExpiresAt).toBeDefined();

      // Verify organization was created
      const org = await Organization.findOne({ ownerId: result.user.id });
      expect(org).toBeTruthy();

      // Verify workspace was created
      const workspace = await Workspace.findOne({ organizationId: org!._id });
      expect(workspace).toBeTruthy();
      expect(workspace!.members).toHaveLength(1);
      expect(workspace!.members[0].role).toBe('owner');
    });

    it('throws ConflictError for duplicate email', async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password456',
          name: 'Another User',
        }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('verifyEmail', () => {
    it('verifies token without creating a session', async () => {
      const email = 'test@example.com';
      const token = 'test-verification-token';
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await User.create({
        email,
        passwordHash: 'hashed-password',
        name: 'Test User',
        isVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      });

      await authService.verifyEmail({
        token,
      });

      const user = await User.findOne({ email: 'test@example.com' });
      expect(user?.isVerified).toBe(true);
      expect(user?.emailVerificationTokenHash).toBeUndefined();
      expect(user?.emailVerificationExpiresAt).toBeUndefined();
      expect(refreshSessionServiceMock.createSession).not.toHaveBeenCalled();
    });

    it('throws for invalid verification token', async () => {
      await expect(authService.verifyEmail({ token: 'invalid-token' })).rejects.toThrow(
        'Invalid or expired verification link',
      );
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });
    });

    it('auto-verifies unverified accounts in development upon login', async () => {
      const user = await User.findOne({ email: 'test@example.com' });
      user!.isVerified = false;
      await user!.save();

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.tokens.accessToken).toBeDefined();

      const updatedUser = await User.findOne({ email: 'test@example.com' });
      expect(updatedUser?.isVerified).toBe(true);
    });

    it('logs in with valid credentials after verification', async () => {
      const unverified = await User.findOne({ email: 'test@example.com' });
      unverified!.isVerified = true;
      unverified!.emailVerificationTokenHash = undefined;
      unverified!.emailVerificationExpiresAt = undefined;
      await unverified!.save();

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('test-refresh-token');
    });

    it('throws UnauthorizedError for wrong password', async () => {
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword1',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedError for non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nobody@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('loginWithOAuth', () => {
    it('creates a verified Google user without sending verification email', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: 'google-user-1',
              email: 'google-user@example.com',
              email_verified: true,
              name: 'Google User',
              picture: 'https://example.com/avatar.png',
            }),
            { status: 200 },
          ),
        );

      const result = await authService.loginWithOAuth('google', 'auth-code');

      expect(result.user.email).toBe('google-user@example.com');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(refreshSessionServiceMock.createSession).toHaveBeenCalledWith(result.user.id);
      expect(emailServiceMock.sendEmail).not.toHaveBeenCalled();

      const user = await User.findOne({ email: 'google-user@example.com' });
      expect(user?.isVerified).toBe(true);
      expect(user?.oauthProviders?.google?.id).toBe('google-user-1');
    });

    it('links Google sign-in to an existing unverified password account', async () => {
      const registered = await authService.register({
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Existing User',
      });
      emailServiceMock.sendEmail.mockClear();

      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'google-access-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: 'google-user-2',
              email: 'existing@example.com',
              email_verified: true,
              name: 'Existing User',
            }),
            { status: 200 },
          ),
        );

      const result = await authService.loginWithOAuth('google', 'auth-code');

      expect(result.user.id).toBe(registered.user.id);
      expect(result.user.email).toBe('existing@example.com');
      expect(refreshSessionServiceMock.createSession).toHaveBeenCalledWith(registered.user.id);
      expect(emailServiceMock.sendEmail).not.toHaveBeenCalled();

      const user = await User.findOne({ email: 'existing@example.com' });
      expect(user?.isVerified).toBe(true);
      expect(user?.emailVerificationTokenHash).toBeDefined();
      expect(user?.emailVerificationExpiresAt).toBeDefined();
      expect(user?.oauthProviders?.google?.id).toBe('google-user-2');
      expect(await User.countDocuments({ email: 'existing@example.com' })).toBe(1);
    });
  });

  describe('loginWithGoogleOneTap', () => {
    it('accepts a valid One Tap credential and signs the user in', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            aud: 'google-client-id',
            iss: 'https://accounts.google.com',
            exp: `${Math.floor(Date.now() / 1000) + 600}`,
            sub: 'google-onetap-user-1',
            email: 'onetap@example.com',
            email_verified: 'true',
            name: 'One Tap User',
            picture: 'https://example.com/avatar.png',
          }),
          { status: 200 },
        ),
      );

      const result = await authService.loginWithGoogleOneTap({
        credential: 'valid-google-id-token',
      });

      expect(result.user.email).toBe('onetap@example.com');
      expect(result.refreshToken).toBe('test-refresh-token');
      expect(refreshSessionServiceMock.createSession).toHaveBeenCalledWith(result.user.id);
    });

    it('rejects One Tap credentials with mismatched audience', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            aud: 'unexpected-client-id',
            iss: 'https://accounts.google.com',
            exp: `${Math.floor(Date.now() / 1000) + 600}`,
            sub: 'google-onetap-user-2',
            email: 'onetap@example.com',
            email_verified: 'true',
          }),
          { status: 200 },
        ),
      );

      await expect(
        authService.loginWithGoogleOneTap({
          credential: 'invalid-audience-token',
        }),
      ).rejects.toThrow('Google credential audience mismatch');
    });
  });

  describe('refresh', () => {
    it('issues new tokens for a valid refresh token', async () => {
      const registered = await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      refreshSessionServiceMock.rotateSession.mockResolvedValue({
        status: 'ok',
        userId: registered.user.id,
        refreshToken: 'rotated-refresh-token',
      });

      const result = await authService.refresh('current-refresh-token');

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('rotated-refresh-token');
      expect(refreshSessionServiceMock.rotateSession).toHaveBeenCalledWith('current-refresh-token');
    });

    it('throws UnauthorizedError for invalid refresh token', async () => {
      refreshSessionServiceMock.rotateSession.mockResolvedValue({ status: 'invalid' });

      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('revokes all sessions and fails on replay detection', async () => {
      refreshSessionServiceMock.rotateSession.mockResolvedValue({
        status: 'replay',
        userId: 'user-id-1',
      });

      await expect(authService.refresh('replayed-token')).rejects.toThrow(
        'Refresh token replay detected. Please sign in again.',
      );

      expect(refreshSessionServiceMock.revokeAllUserSessions).toHaveBeenCalledWith('user-id-1');
    });
  });
});
