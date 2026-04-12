import { RefreshSessionService } from '../refresh-session.service';
import type Redis from 'ioredis';

jest.mock('../../config', () => ({
  config: {
    JWT_REFRESH_EXPIRY: '7d',
    AUTH_REFRESH_REPLAY_TTL_SECONDS: 3600,
    AUTH_REFRESH_SESSION_LIMIT: 5,
  },
}));

function createPipelineMock(execResult: Array<[Error | null, unknown]> = []) {
  return {
    set: jest.fn().mockReturnThis(),
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    zrem: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    hget: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(execResult),
  };
}

interface RedisMock {
  multi: jest.Mock;
  eval: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  zrange: jest.Mock;
  zcard: jest.Mock;
}

function createRedisMock() {
  return {
    multi: jest.fn(),
    eval: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    zrange: jest.fn(),
    zcard: jest.fn(),
  } satisfies RedisMock;
}

describe('RefreshSessionService', () => {
  it('creates a refresh session in redis and returns a token', async () => {
    const redis = createRedisMock();
    const creationPipeline = createPipelineMock();

    redis.multi.mockReturnValue(creationPipeline);
    redis.zcard.mockResolvedValue(1);

    const service = new RefreshSessionService(redis as unknown as Redis);
    const result = await service.createSession('user-1');

    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken.length).toBeGreaterThan(20);
    expect(creationPipeline.set).toHaveBeenCalledTimes(1);
    expect(creationPipeline.hset).toHaveBeenCalledTimes(1);
    expect(creationPipeline.zadd).toHaveBeenCalledWith(
      expect.stringContaining('rt:user:user-1:sessions'),
      expect.any(Number),
      expect.any(String),
    );
  });

  it('rotates refresh token successfully when lua script returns ok', async () => {
    const redis = createRedisMock();
    redis.eval.mockResolvedValue(['ok', 'user-1']);

    const service = new RefreshSessionService(redis as unknown as Redis);
    const result = await service.rotateSession('raw-refresh-token');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.userId).toBe('user-1');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken.length).toBeGreaterThan(20);
    }
  });

  it('returns replay status when lua script detects replay', async () => {
    const redis = createRedisMock();
    redis.eval.mockResolvedValue(['replay', 'user-9']);

    const service = new RefreshSessionService(redis as unknown as Redis);
    const result = await service.rotateSession('replayed-token');

    expect(result).toEqual({ status: 'replay', userId: 'user-9' });
  });

  it('revokes all user sessions and removes associated lookup keys', async () => {
    const redis = createRedisMock();
    const hashLookupPipeline = createPipelineMock([[null, 'token-hash-1']]);
    const cleanupPipeline = createPipelineMock();

    redis.zrange.mockResolvedValue(['session-1']);
    redis.multi.mockReturnValueOnce(hashLookupPipeline).mockReturnValueOnce(cleanupPipeline);
    redis.del.mockResolvedValue(1);

    const service = new RefreshSessionService(redis as unknown as Redis);
    await service.revokeAllUserSessions('user-1');

    expect(hashLookupPipeline.hget).toHaveBeenCalledWith(
      'rt:session:user-1:session-1',
      'tokenHash',
    );
    expect(cleanupPipeline.del).toHaveBeenCalledWith('rt:session:user-1:session-1');
    expect(cleanupPipeline.del).toHaveBeenCalledWith('rt:lookup:token-hash-1');
    expect(cleanupPipeline.zrem).toHaveBeenCalledWith('rt:user:user-1:sessions', 'session-1');
    expect(redis.del).toHaveBeenCalledWith('rt:user:user-1:sessions');
  });
});
