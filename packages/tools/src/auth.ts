/**
 * Authentication & Authorization Helpers
 * 
 * Functions to extract and validate user context from requests
 */

import { createClient } from '@supabase/supabase-js';
import type { ToolContext, UserRole } from './types';
import { getUserProfile, getUserRole } from './database';

/**
 * Extract tool context from Supabase JWT
 * Decodes and validates the JWT, then fetches user profile
 */
export async function extractContextFromJWT(
  jwt: string
): Promise<ToolContext | null> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not configured');
      return null;
    }

    // Create Supabase client to verify JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    });

    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Invalid JWT or user not found:', userError);
      return null;
    }

    // Fetch user profile to get role and organization
    const profile = await getUserProfile(user.id);

    if (!profile) {
      console.error('User profile not found');
      return null;
    }

    return {
      userId: user.id,
      userRole: profile.role,
      organizationId: profile.organizationId,
    };
  } catch (error) {
    console.error('Failed to extract context from JWT:', error);
    return null;
  }
}

/**
 * Extract tool context from request headers
 * Looks for Authorization header with Bearer token
 */
export async function extractContextFromHeaders(
  headers: Record<string, string | undefined>
): Promise<ToolContext | null> {
  const authHeader = headers.authorization || headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return extractContextFromJWT(token);
}

/**
 * Create tool context from user ID
 * Fetches role and organization from database
 */
export async function createContextFromUserId(
  userId: string,
  requestId?: string
): Promise<ToolContext> {
  const profile = await getUserProfile(userId);
  
  return {
    userId,
    userRole: profile?.role || 'STAFF',
    organizationId: profile?.organizationId,
    requestId,
  };
}

/**
 * Validate tool context
 */
export function validateContext(context: ToolContext | null): context is ToolContext {
  if (!context) {
    return false;
  }
  
  if (!context.userId) {
    return false;
  }
  
  if (context.userRole !== 'SYSTEM_ADMIN' && context.userRole !== 'STAFF') {
    return false;
  }
  
  return true;
}

