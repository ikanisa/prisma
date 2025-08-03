// Marketplace tool for browsing listings
export class MarketplaceTool {
  static async search(sessionId: string, params: any) {
    const { data, error } = await supabaseClient
      .from('produce_orders')
      .select('*')
      .ilike('name', `%${params.text}%`);
    if (error) {
      return [];
    }
    return data;
  }
