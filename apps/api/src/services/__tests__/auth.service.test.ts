import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthService } from '../auth.service';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';
import { Workspace } from '../../models/workspace.model';
import { RefreshSessionService, RotateRefreshSessionResult } from '../refresh-session.service';

// Mock config
jest.mock('../../config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-key-minimum-16-chars',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    FREE_EXECUTION_LIMIT: 1000,
    PRO_EXECUTION_LIMIT: 10000,
    ENTERPRISE_EXECUTION_LIMIT: 100000,
  },
}));

describe('AuthService', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;

  const refreshSessionServiceMock = {
    createSession: jest.fn<Promise<{ refreshToken: string }>, [string]>(),
    rotateSession: jest.fn<Promise<RotateRefreshSessionResult>, [string]>(),
    revokeSession: jest.fn<Promise<void>, [string]>(),
    revokeAllUserSessions: jest.fn<Promise<void>, [string]>(),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    refreshSessionServiceMock.createSession.mockResolvedValue({
      refreshToken: 'test-refresh-token',
    });
    authService = new AuthService(refreshSessionServiceMock as unknown as RefreshSessionService);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Workspace.deleteMany({});
  });

  describe('register', () => {
    it('should create a new user with organization and workspace', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('test-refresh-token');

      // Verify organization was created
      const org = await Organization.findOne({ ownerId: result.user.id });
      expect(org).toBeTruthy();

      // Verify workspace was created
      const workspace = await Workspace.findOne({ organizationId: org!._id });
      expect(workspace).toBeTruthy();
      expect(workspace!.members).toHaveLength(1);
      expect(workspace!.members[0].role).toBe('owner');

      expect(refreshSessionServiceMock.createSession).toHaveBeenCalledWith(result.user.id);
    });

    it('should throw ConflictError for duplicate email', async () => {
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

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('test-refresh-token');
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword1',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw UnauthorizedError for non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nobody@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    it('should issue new access token and refresh token for valid refresh token', async () => {
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

      const result = await authService.refresh(registered.refreshToken);

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.refreshToken).toBe('rotated-refresh-token');
      expect(refreshSessionServiceMock.rotateSession).toHaveBeenCalledWith(registered.refreshToken);
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      refreshSessionServiceMock.rotateSession.mockResolvedValue({ status: 'invalid' });

      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should revoke all sessions and fail on replay detection', async () => {
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
