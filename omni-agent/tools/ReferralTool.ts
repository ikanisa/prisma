// Referral tool for managing user referrals
export class ReferralTool {
  static async create(sessionId: string, data: any) {
    const { data: result, error } = await supabaseClient
      .from('referrals')
      .insert([{ session_id: sessionId, ...data }])
      .select('code')
      .single();
    if (error) {
      return { success: false, error };
    }
    return { success: true, code: result.code };
  }
