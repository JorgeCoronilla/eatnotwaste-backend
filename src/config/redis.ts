import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

// Interface unificada para caché (Redis o Local)
export interface CacheClient {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<number>;
  flush(): Promise<void>;
}

class RedisCacheManager implements CacheClient {
  private redis: Redis | null = null;
  private localCache: NodeCache;
  private useRedis: boolean = false;

  constructor() {
    this.localCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
    
    if (process.env.REDIS_URL) {
      this.initRedis(process.env.REDIS_URL);
    } else {
      logger.info('Cache: REDIS_URL not found, using in-memory cache');
    }
  }

  private initRedis(url: string) {
    logger.info('Cache: Initializing Redis connection...');
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Cache: Redis connection failed too many times, falling back to memory');
            this.useRedis = false;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.redis.on('connect', () => {
        logger.info('Cache: Redis connected successfully');
        this.useRedis = true;
      });

      this.redis.on('error', (err) => {
        logger.error('Cache: Redis error', err);
        // Don't disable immediately on minor errors, but connection failures will trigger retryStrategy
      });

    } catch (error) {
      logger.error('Cache: Failed to initialize Redis client', error);
      this.useRedis = false;
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : undefined;
      } catch (error) {
        logger.error(`Cache: Redis get error for key ${key}`, error);
        // Fallback or just return undefined? returning undefined allows re-fetch
        return undefined; 
      }
    }
    return this.localCache.get<T>(key);
  }

  async set(key: string, value: any, ttlSeconds: number = 600): Promise<boolean> {
    if (this.useRedis && this.redis) {
      try {
        // 'EX' sets expiry in seconds
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return true;
      } catch (error) {
        logger.error(`Cache: Redis set error for key ${key}`, error);
        // Fallback to local cache so we don't lose data in current session at least
        return this.localCache.set(key, value, ttlSeconds); 
      }
    }
    return this.localCache.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<number> {
    if (this.useRedis && this.redis) {
      try {
        return await this.redis.del(key);
      } catch (error) {
        logger.error(`Cache: Redis del error for key ${key}`, error);
      }
    }
    return this.localCache.del(key);
  }

  async flush(): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.flushdb();
        return;
      } catch (error) {
         logger.error('Cache: Redis flush error', error);
      }
    }
    this.localCache.flushAll();
  }
}

export const cache = new RedisCacheManager();
export default cache;
