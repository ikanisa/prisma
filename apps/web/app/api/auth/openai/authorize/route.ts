/**
 * OpenAI OAuth Authorization Route
 * 
 * Initiates OAuth flow by redirecting to OpenAI authorization endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthUrl } from '@prisma/lib/openai/apps-sdk/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/app/command-center';
      return NextResponse.redirect(
        new URL(`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`, request.url)
      );
    }

    // Get OAuth configuration
    const clientId = process.env.OPENAI_APP_OAUTH_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/openai/callback`;
    const state = request.nextUrl.searchParams.get('state') || request.nextUrl.searchParams.get('redirectTo') || '/app/command-center';

    if (!clientId) {
      return NextResponse.json(
        { error: 'OAuth not configured' },
        { status: 500 }
      );
    }

    // Generate OAuth URL
    const authUrl = generateOAuthUrl({
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      state: encodeURIComponent(state),
    });

    // Redirect to OpenAI authorization
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth authorization error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=oauth_authorization_failed', request.url)
    );
  }
}

