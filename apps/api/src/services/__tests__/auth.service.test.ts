import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthService } from '../auth.service';
import { User } from '../../models/user.model';
import { Organization } from '../../models/organization.model';
import { Workspace } from '../../models/workspace.model';

// Mock config
jest.mock('../../config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-key-minimum-16-chars',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
  },
}));

describe('AuthService', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    authService = new AuthService();
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
      expect(result.tokens.refreshToken).toBeDefined();

      // Verify organization was created
      const org = await Organization.findOne({ ownerId: result.user.id });
      expect(org).toBeTruthy();

      // Verify workspace was created
      const workspace = await Workspace.findOne({ organizationId: org!._id });
      expect(workspace).toBeTruthy();
      expect(workspace!.members).toHaveLength(1);
      expect(workspace!.members[0].role).toBe('owner');
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
    it('should issue new tokens with valid refresh token', async () => {
      const registered = await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const result = await authService.refresh(registered.tokens.refreshToken);

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      // Old token should no longer work (rotation)
      expect(result.tokens.refreshToken).not.toBe(registered.tokens.refreshToken);
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      await expect(authService.refresh('invalid-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });
});
