import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { IUserDocument, User } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { Workspace } from '../models/workspace.model';
import { ConflictError, NotFoundError, UnauthorizedError } from '../domain/errors';
import { RegisterInput, LoginInput, IUserResponse } from '@flowforge/shared';
import { JwtPayload } from '../middleware/auth.middleware';
import { RefreshSessionService } from './refresh-session.service';

interface AuthResult {
  user: IUserResponse;
  tokens: { accessToken: string };
  refreshToken: string;
}

interface RefreshResult {
  tokens: { accessToken: string };
  refreshToken: string;
}

export class AuthService {
  constructor(private readonly refreshSessionService = new RefreshSessionService()) {}

  async register(input: RegisterInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const user = await User.create({
      email: normalizedEmail,
      passwordHash: input.password,
      name: input.name,
    });

    // Create default organization and workspace
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 8);
    const org = await Organization.create({
      name: `${input.name}'s Organization`,
      slug: `${slug}-${uniqueSuffix}`,
      ownerId: user._id,
    });

    await Workspace.create({
      organizationId: org._id,
      name: 'Default Workspace',
      slug: 'default',
      members: [{ userId: user._id, role: 'owner', joinedAt: new Date() }],
    });

    return this.issueAuthResult(this.toUserResponse(user), user._id.toString());
  }

  async login(input: LoginInput) {
    const user = await User.findOne({ email: input.email.toLowerCase().trim() });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await user.comparePassword(input.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.issueAuthResult(this.toUserResponse(user), user._id.toString());
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

  async logout(refreshToken: string) {
    await this.refreshSessionService.revokeSession(refreshToken);
  }

  async logoutAll(userId: string) {
    await this.refreshSessionService.revokeAllUserSessions(userId);
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
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
}
