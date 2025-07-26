/**
 * Test utility for webhook verification functionality
 * For admin testing purposes only
 */

import { supabase } from '@/integrations/supabase/client';

export interface WebhookTestResult {
  success: boolean;
  status: number;
  response: string;
  error?: string;
}

export async function testWebhookVerification(challenge: string = 'test_challenge_12345'): Promise<WebhookTestResult> {
  try {
    // Test the webhook verification endpoint directly
    const { data, error } = await supabase.functions.invoke('webhook-verify-test', {
      body: { testChallenge: challenge }
    });

    if (error) {
      return {
        success: false,
        status: 500,
        response: '',
        error: error.message
      };
    }

    return {
      success: data.configured,
      status: 200,
      response: data.challengeResponse,
    };

  } catch (error) {
    return {
      success: false,
      status: 500,
      response: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function generateVerifyToken(): Promise<string> {
  // Generate a secure random token for webhook verification
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `easymo_waba_verify_${token}`;
}

export function getWebhookSetupInstructions() {
  return {
    steps: [
      {
        title: "Generate Verify Token",
        description: "Create a random 32-48 character string",
        command: "openssl rand -base64 32 | tr -d '=+/'"
      },
      {
        title: "Set Environment Variable",
        description: "Add META_WABA_VERIFY_TOKEN in Supabase",
        url: "https://supabase.com/dashboard/project/[PROJECT_ID]/settings/api"
      },
      {
        title: "Configure Meta Webhook",
        description: "Set callback URL and verify token in Meta for Developers",
        url: "https://developers.facebook.com/"
      },
      {
        title: "Test Verification",
        description: "Meta will send a GET request to verify the webhook",
        note: "Your webhook should return the challenge parameter"
      }
    ]
  };
}