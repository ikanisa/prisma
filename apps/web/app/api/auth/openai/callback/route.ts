/**
 * OpenAI OAuth Callback Route
 * 
 * Handles OAuth 2.1 callback from OpenAI
 * Exchanges authorization code for access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@prisma/lib/openai/apps-sdk/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_code', request.url)
      );
    }

    // Get Supabase client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/sign-in?redirectTo=/api/auth/openai/callback', request.url)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.OPENAI_APP_OAUTH_CLIENT_ID;
    const clientSecret = process.env.OPENAI_APP_OAUTH_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/openai/callback`;

    if (!clientId || !clientSecret) {
      console.error('OAuth credentials not configured');
      return NextResponse.redirect(
        new URL('/auth/error?error=oauth_not_configured', request.url)
      );
    }

    // Exchange code for tokens via internal API
    const tokenUrl = new URL('/api/auth/openai/token', request.url);
    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({ error: 'Token exchange failed' }));
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(
        new URL('/auth/error?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Failed to exchange code for tokens');
      return NextResponse.redirect(
        new URL('/auth/error?error=token_exchange_failed', request.url)
      );
    }

    // Store tokens in database (link OpenAI OAuth to user)
    // Note: This assumes the user_profiles table has these columns
    // If not, you'll need to add a migration
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({
        // Store as JSON in metadata or create separate columns
        metadata: {
          ...((await supabase.from('user_profiles').select('metadata').eq('id', user.id).single()).data?.metadata || {}),
          openai_oauth: {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (dbError) {
      console.error('Failed to store OAuth tokens:', dbError);
      // Continue anyway - tokens are in response
    }

    // Redirect to app with success
    const redirectTo = state ? decodeURIComponent(state) : '/app/command-center';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`,
        request.url
      )
    );
  }
}
