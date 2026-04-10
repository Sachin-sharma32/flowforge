import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { User, IUserDocument } from '../models/user.model';
import { Organization } from '../models/organization.model';
import { Workspace } from '../models/workspace.model';
import { ConflictError, NotFoundError, UnauthorizedError } from '../domain/errors';
import { RegisterInput, LoginInput } from '@flowforge/shared';
import { JwtPayload } from '../middleware/auth.middleware';

export class AuthService {
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
    const uniqueSuffix = uuidv4().replace(/-/g, '').slice(0, 8);
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

    const tokens = await this.generateTokens(user);
    return { user: user.toJSON(), tokens };
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

    const tokens = await this.generateTokens(user);
    return { user: user.toJSON(), tokens };
  }

  async refresh(refreshToken: string) {
    // Atomically pull the used token to prevent concurrent reuse
    const user = await User.findOneAndUpdate(
      {
        'refreshTokens.token': refreshToken,
        'refreshTokens.expiresAt': { $gt: new Date() },
      },
      { $pull: { refreshTokens: { token: refreshToken } } },
      { new: true },
    );

    if (!user) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokens = await this.generateTokens(user);
    return { user: user.toJSON(), tokens };
  }

  async logout(userId: string, refreshToken: string) {
    await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { token: refreshToken } } });
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toJSON();
  }

  private async generateTokens(user: IUserDocument) {
    const payload: JwtPayload = { userId: user._id.toString(), email: user.email };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY as string,
    } as jwt.SignOptions);

    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    user.refreshTokens.push({ token: refreshToken, expiresAt: refreshExpiresAt });
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();

    return { accessToken, refreshToken };
  }
}
