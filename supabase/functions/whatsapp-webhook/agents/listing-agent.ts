import { supabaseClient } from "./client.ts";
import { MessageProcessor } from '../utils/message-processor.ts';

export class ListingAgent {
  private supabase: any;
  private processor: MessageProcessor;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.processor = new MessageProcessor(supabase);
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const productData = this.processor.parseProductMessage(message);
      
      if (!productData) {
        return "Please use format: 'add [product] [quantity][unit] [price]'\nExample: 'add beans 30kg 1500'";
      }

      // Check if user is a farmer (or allow anyone to list for now)
      const { data: newProduct, error } = await this.supabase
        .from('products')
        .insert({
          farmer_id: user.id,
          name: productData.name,
          stock: productData.stock,
          price: productData.price,
          unit: productData.unit
        })
        .select()
        .single();

      if (error) {
        console.error('Error listing product:', error);
        return "Sorry, I couldn't list your product. Please try again.";
      }

      return `📝 ${productData.name} listed successfully!\n💰 ${productData.stock}${productData.unit} at ${productData.price} RWF\n\nCustomers can now find and buy your product!`;

    } catch (error) {
      console.error('ListingAgent error:', error);
      return "Sorry, there was an error listing your product. Please use format: 'add [product] [quantity][unit] [price]'";
    }
  }
}