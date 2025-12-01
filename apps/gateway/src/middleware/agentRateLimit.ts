/**
 * Agent-specific rate limiter
 * Prevents abuse of AI agent endpoints which consume API quota
 */

import rateLimit from 'express-rate-limit';

/**
 * Agent execution rate limiter
 * 50 requests per hour per user
 * More generous than general API but protects expensive AI operations
 */
export const agentExecutionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use userId from auth context if available, fallback to IP
    return (req as any).userId || req.ip || 'unknown';
  },
  message: {
    error: 'Agent execution quota exceeded',
    message: 'You have exceeded the hourly limit for agent executions. Please try again later.',
    retryAfter: '1 hour',
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    const userRole = (req as any).user?.role;
    return userRole === 'service_role' || userRole === 'admin';
  },
});

/**
 * Auto-route rate limiter
 * Stricter limit since this endpoint does extra processing
 */
export const autoRouteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).userId || req.ip || 'unknown',
  message: {
    error: 'Auto-route quota exceeded',
    message: 'You have exceeded the hourly limit for auto-routing. Please select agents manually.',
  },
});
