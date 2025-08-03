// Listing tool for creating and searching produce listings
export class ListingTool {
  static async create(sessionId: string, listing: any) {
    const { data, error } = await supabaseClient
      .from('produce_orders')
      .insert([{ session_id: sessionId, ...listing }])
      .select('id')
      .single();
    if (error) {
      return { success: false, error };
    }
    return { success: true, id: data.id };
  }
  static async search(sessionId: string, query: any) {
    // TODO: implement search logic
    return [];
  }
