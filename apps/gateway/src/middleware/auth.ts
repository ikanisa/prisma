/**
 * Authentication Middleware for Gateway
 * 
 * Verifies Supabase JWT tokens on all API routes to prevent unauthorized access.
 * This addresses Critical Issue #3: Express/RAG Service Bypasses Auth & RLS
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
const JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface JWTPayload {
  sub: string;
  aud: string;
  role: string;
  email?: string;
  app_metadata?: {
    provider?: string;
  };
  user_metadata?: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  userId?: string;
  orgId?: string;
}

/**
 * Middleware to verify Supabase JWT token
 * Attaches user info to request object
 */
export async function verifySupabaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!JWT_SECRET) {
      console.error('SUPABASE_JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error',
        message: 'Authentication not properly configured',
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET, {
      audience: JWT_AUDIENCE,
    }) as JWTPayload;

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.sub;

    // Optionally fetch organization context from Supabase
    // This ensures proper tenant isolation
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      // Set the user's auth context
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      // Fetch organization membership
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (orgMember) {
        req.orgId = orgMember.organization_id;
      }
    }

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      });
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional middleware to verify organization context
 * Use after verifySupabaseToken
 */
export function requireOrganization(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.orgId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Organization context required',
    });
    return;
  }
  next();
}
