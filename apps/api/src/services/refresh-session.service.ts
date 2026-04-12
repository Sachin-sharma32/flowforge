import { createHash, randomBytes, randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { config } from '../config';
import { getSharedRedisClient } from '../config/redis';
import { parseDurationToMilliseconds } from '../utils/duration';

const ROTATE_REFRESH_SESSION_SCRIPT = `
local lookupKey = KEYS[1]
local usedKey = KEYS[2]

local now = tonumber(ARGV[1])
local refreshTtlSeconds = tonumber(ARGV[2])
local oldHash = ARGV[3]
local newHash = ARGV[4]
local replayTtlSeconds = tonumber(ARGV[5])

local replayUid = redis.call('GET', usedKey)
if replayUid then
  return {'replay', replayUid}
end

local lookupValue = redis.call('GET', lookupKey)
if not lookupValue then
  return {'invalid', ''}
end

local separatorIndex = string.find(lookupValue, ':')
if not separatorIndex then
  return {'invalid', ''}
end

local uid = string.sub(lookupValue, 1, separatorIndex - 1)
local sid = string.sub(lookupValue, separatorIndex + 1)
local sessionKey = 'rt:session:' .. uid .. ':' .. sid

local tokenHash = redis.call('HGET', sessionKey, 'tokenHash')
if not tokenHash then
  return {'invalid', uid}
end

local revokedAt = redis.call('HGET', sessionKey, 'revokedAt')
if revokedAt and revokedAt ~= '' then
  return {'invalid', uid}
end

if tokenHash ~= oldHash then
  return {'replay', uid}
end

local expiresAt = tonumber(redis.call('HGET', sessionKey, 'expiresAt') or '0')
if expiresAt <= now then
  return {'invalid', uid}
end

redis.call('DEL', lookupKey)
redis.call('SET', usedKey, uid, 'EX', replayTtlSeconds)

local newLookupKey = 'rt:lookup:' .. newHash
redis.call('SET', newLookupKey, uid .. ':' .. sid, 'EX', refreshTtlSeconds)

local nextExpiresAt = now + (refreshTtlSeconds * 1000)
redis.call(
  'HSET',
  sessionKey,
  'tokenHash', newHash,
  'lastUsedAt', tostring(now),
  'expiresAt', tostring(nextExpiresAt)
)
redis.call('EXPIRE', sessionKey, refreshTtlSeconds)

local userSessionsKey = 'rt:user:' .. uid .. ':sessions'
redis.call('ZADD', userSessionsKey, now, sid)
redis.call('EXPIRE', userSessionsKey, refreshTtlSeconds)

return {'ok', uid}
`;

type RotationOutcome = 'ok' | 'invalid' | 'replay';

export type RotateRefreshSessionResult =
  | { status: 'ok'; userId: string; refreshToken: string }
  | { status: 'invalid' }
  | { status: 'replay'; userId?: string };

interface SessionLookupValue {
  userId: string;
  sessionId: string;
}

export class RefreshSessionService {
  private readonly redis: Redis;
  private readonly refreshTtlMs: number;
  private readonly refreshTtlSeconds: number;
  private readonly replayTtlSeconds: number;
  private readonly maxSessions: number;

  constructor(redis?: Redis) {
    this.redis = redis ?? getSharedRedisClient();
    this.refreshTtlMs = parseDurationToMilliseconds(config.JWT_REFRESH_EXPIRY);
    this.refreshTtlSeconds = Math.floor(this.refreshTtlMs / 1000);
    this.replayTtlSeconds = config.AUTH_REFRESH_REPLAY_TTL_SECONDS;
    this.maxSessions = config.AUTH_REFRESH_SESSION_LIMIT;

    if (this.refreshTtlSeconds <= 0) {
      throw new Error('JWT_REFRESH_EXPIRY must be greater than 0');
    }
  }

  async createSession(userId: string): Promise<{ refreshToken: string }> {
    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashRefreshToken(refreshToken);
    const sessionId = randomUUID();
    const now = Date.now().toString();
    const expiresAt = (Date.now() + this.refreshTtlMs).toString();

    const pipeline = this.redis.multi();
    pipeline.set(
      this.lookupKey(tokenHash),
      this.encodeLookupValue(userId, sessionId),
      'EX',
      this.refreshTtlSeconds,
    );
    pipeline.hset(this.sessionKey(userId, sessionId), {
      tokenHash,
      createdAt: now,
      lastUsedAt: now,
      expiresAt,
    });
    pipeline.expire(this.sessionKey(userId, sessionId), this.refreshTtlSeconds);
    pipeline.zadd(this.userSessionsKey(userId), Date.now(), sessionId);
    pipeline.expire(this.userSessionsKey(userId), this.refreshTtlSeconds);
    await pipeline.exec();

    await this.enforceSessionLimit(userId);

    return { refreshToken };
  }

  async rotateSession(refreshToken: string): Promise<RotateRefreshSessionResult> {
    const oldHash = this.hashRefreshToken(refreshToken);
    const newRefreshToken = this.generateRefreshToken();
    const newHash = this.hashRefreshToken(newRefreshToken);
    const now = Date.now();

    const result = (await this.redis.eval(
      ROTATE_REFRESH_SESSION_SCRIPT,
      2,
      this.lookupKey(oldHash),
      this.usedTokenKey(oldHash),
      now.toString(),
      this.refreshTtlSeconds.toString(),
      oldHash,
      newHash,
      this.replayTtlSeconds.toString(),
    )) as string[];

    const status = result?.[0] as RotationOutcome | undefined;
    const userId = result?.[1];

    if (status === 'ok' && userId) {
      return {
        status: 'ok',
        userId,
        refreshToken: newRefreshToken,
      };
    }

    if (status === 'replay') {
      return { status: 'replay', userId: userId || undefined };
    }

    return { status: 'invalid' };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const lookup = await this.redis.get(this.lookupKey(tokenHash));
    if (!lookup) {
      return;
    }

    const parsed = this.parseLookupValue(lookup);
    if (!parsed) {
      await this.redis.del(this.lookupKey(tokenHash));
      return;
    }

    const sessionKey = this.sessionKey(parsed.userId, parsed.sessionId);
    const userSessionsKey = this.userSessionsKey(parsed.userId);

    const pipeline = this.redis.multi();
    pipeline.del(this.lookupKey(tokenHash));
    pipeline.hset(sessionKey, { revokedAt: Date.now().toString() });
    pipeline.del(sessionKey);
    pipeline.zrem(userSessionsKey, parsed.sessionId);
    await pipeline.exec();
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.userSessionsKey(userId);
    const sessionIds = await this.redis.zrange(userSessionsKey, 0, -1);

    if (!sessionIds.length) {
      await this.redis.del(userSessionsKey);
      return;
    }

    await this.removeSessions(userId, sessionIds);
    await this.redis.del(userSessionsKey);
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessionsKey = this.userSessionsKey(userId);
    const sessionCount = await this.redis.zcard(userSessionsKey);

    if (sessionCount <= this.maxSessions) {
      return;
    }

    const overflow = sessionCount - this.maxSessions;
    const staleSessionIds = await this.redis.zrange(userSessionsKey, 0, overflow - 1);
    if (!staleSessionIds.length) {
      return;
    }

    await this.removeSessions(userId, staleSessionIds);
  }

  private async removeSessions(userId: string, sessionIds: string[]): Promise<void> {
    const tokenHashLookupPipeline = this.redis.multi();
    for (const sessionId of sessionIds) {
      tokenHashLookupPipeline.hget(this.sessionKey(userId, sessionId), 'tokenHash');
    }
    const tokenHashResults = await tokenHashLookupPipeline.exec();

    const cleanupPipeline = this.redis.multi();
    for (let index = 0; index < sessionIds.length; index += 1) {
      const sessionId = sessionIds[index];
      const tokenHashResult = tokenHashResults?.[index]?.[1];
      const tokenHash = typeof tokenHashResult === 'string' ? tokenHashResult : undefined;

      cleanupPipeline.del(this.sessionKey(userId, sessionId));
      cleanupPipeline.zrem(this.userSessionsKey(userId), sessionId);
      if (tokenHash) {
        cleanupPipeline.del(this.lookupKey(tokenHash));
      }
    }

    cleanupPipeline.expire(this.userSessionsKey(userId), this.refreshTtlSeconds);
    await cleanupPipeline.exec();
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private encodeLookupValue(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  private parseLookupValue(value: string): SessionLookupValue | null {
    const separatorIndex = value.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex >= value.length - 1) {
      return null;
    }

    return {
      userId: value.slice(0, separatorIndex),
      sessionId: value.slice(separatorIndex + 1),
    };
  }

  private lookupKey(tokenHash: string): string {
    return `rt:lookup:${tokenHash}`;
  }

  private usedTokenKey(tokenHash: string): string {
    return `rt:used:${tokenHash}`;
  }

  private sessionKey(userId: string, sessionId: string): string {
    return `rt:session:${userId}:${sessionId}`;
  }

  private userSessionsKey(userId: string): string {
    return `rt:user:${userId}:sessions`;
  }
}
