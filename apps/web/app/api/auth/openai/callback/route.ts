/**
 * OpenAI OAuth Callback Handler
 * 
 * Handles OAuth callback from OpenAI after user authorization
 * 
 * This route receives the authorization code from OpenAI and exchanges it for tokens
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/openai/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/openai/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    // Store tokens in session/cookies
    // In production, use secure httpOnly cookies
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );

    // Set secure cookies with tokens
    response.cookies.set('openai_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    if (tokens.refresh_token) {
      response.cookies.set('openai_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    // Store state if provided (for CSRF protection)
    if (state) {
      response.cookies.set('openai_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10, // 10 minutes
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'authentication_failed'
        )}`,
        request.url
      )
    );
  }
}
