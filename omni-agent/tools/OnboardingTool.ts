// Onboarding tool for user registration
export class OnboardingTool {
  static async register(sessionId: string, data: any) {
    // Call Supabase edge function to register user
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/register-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        },
        body: JSON.stringify({ sessionId, ...data }),
      }
    );
    if (!response.ok) {
      return { success: false, message: 'Registration failed' };
    }
    const result = await response.json();
    return { success: true, message: result.message };
  }
