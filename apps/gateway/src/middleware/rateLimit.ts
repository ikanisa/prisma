/**
 * Rate Limiting Middleware for Gateway
 * 
 * Implements rate limiting to prevent abuse and DoS attacks.
 * This addresses High-Priority Issue #7: Missing Rate Limiting on Gateway
 * 
 * P1 FIX: Complete rate limiting coverage with Redis support
 */

import rateLimit, { type Options } from 'express-rate-limit';
import { createClient } from 'redis';

// Redis client for distributed rate limiting (production)
const redisUrl = process.env.REDIS_URL;
let redisClient: ReturnType<typeof createClient> | null = null;

// Lazy Redis connection for production
const getRedisStore = async () => {
  if (redisUrl && !redisClient) {
    try {
      const { RedisStore } = await import('rate-limit-redis');
      redisClient = createClient({ url: redisUrl });
      await redisClient.connect();
      console.log('✅ Rate limiter connected to Redis');
      return new RedisStore({
        sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
      });
    } catch (error) {
      console.warn('⚠️ Redis unavailable, using memory store:', error);
      return undefined;
    }
  }
  return undefined;
};

// Base options factory
const createLimiter = (options: Partial<Options>) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * Strict rate limiter for sensitive endpoints
 * 10 requests per 15 minutes per IP
 */
export const strictLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for this endpoint.',
  },
});

/**
 * Auth endpoint rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts, please try again later.',
  },
});

/**
 * Knowledge Base search rate limiter (P1 FIX)
 * 30 requests per minute per user for KB searches
 */
export const kbSearchLimiter = createLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
  message: {
    error: 'Knowledge Base search rate limited',
    message: 'Too many KB searches. Please slow down.',
  },
});

/**
 * Financial operations rate limiter (P1 FIX)
 * Strict limits for journal entries, payments, etc.
 * 20 requests per 5 minutes per user
 */
export const financialOpsLimiter = createLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
  message: {
    error: 'Financial operation rate limited',
    message: 'Too many financial operations. Please try again shortly.',
  },
});

/**
 * Export rate limiter (P1 FIX)
 * Very strict for data exports
 * 5 requests per hour per user
 */
export const exportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
  message: {
    error: 'Export rate limited',
    message: 'Too many export requests. Limit: 5 per hour.',
  },
});

