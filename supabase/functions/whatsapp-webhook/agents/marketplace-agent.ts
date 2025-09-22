import { supabaseClient } from "./client.ts";
import { MessageProcessor } from '../utils/message-processor.ts';

export class MarketplaceAgent {
  private supabase: any;
  private processor: MessageProcessor;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.processor = new MessageProcessor(supabase);
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      if (msg === 'browse') {
        return await this.browseProducts();
      }

      // Handle search queries like "need beans" or "buy maize"
      if (msg.startsWith('need ') || msg.startsWith('buy ') || msg.startsWith('want ')) {
        const searchTerm = msg.replace(/^(need|buy|want)\s+/, '');
        return await this.searchProducts(searchTerm);
      }

      // Handle buy commands with product ID
      if (msg.startsWith('buy ') && msg.includes('id:')) {
        const productId = msg.match(/id:(\w+)/)?.[1];
        if (productId) {
          return await this.buyProduct(productId, user);
        }
      }

      return "Send 'browse' to see all products, or 'need [product]' to search for something specific!";

    } catch (error) {
      console.error('MarketplaceAgent error:', error);
      return "Sorry, I'm having trouble with the marketplace right now. Please try again.";
    }
  }

  private async browseProducts(): Promise<string> {
    const { data: products, error } = await this.supabase
      .from('products')
      .select('id, name, price, unit, stock')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !products || products.length === 0) {
      return "No products available right now. Check back later!";
    }

    let response = "🛒 Available Products:\n\n";
    products.forEach((product: any, index: number) => {
      response += `${index + 1}. ${this.processor.formatProductCard(product)}\n`;
      response += `To buy: send 'buy id:${product.id}'\n\n`;
    });

    return this.processor.truncateMessage(response);
  }

  private async searchProducts(searchTerm: string): Promise<string> {
    const { data: products, error } = await this.supabase
      .from('products')
      .select('id, name, price, unit, stock')
      .ilike('name', `%${searchTerm}%`)
      .gt('stock', 0)
      .limit(5);

    if (error || !products || products.length === 0) {
      return `No "${searchTerm}" found. Send 'browse' to see all available products.`;
    }

    let response = `🔍 Found ${products.length} result(s) for "${searchTerm}":\n\n`;
    products.forEach((product: any, index: number) => {
      response += `${index + 1}. ${this.processor.formatProductCard(product)}\n`;
      response += `To buy: send 'buy id:${product.id}'\n\n`;
    });

    return this.processor.truncateMessage(response);
  }

  private async buyProduct(productId: string, user: any): Promise<string> {
    // Get product details
    const { data: product, error: productError } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return "Product not found. Please check the product ID and try again.";
    }

    if (product.stock <= 0) {
      return "Sorry, this product is out of stock.";
    }

    try {
      // Create order
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          user_id: user.id,
          farmer_id: product.farmer_id,
          items: JSON.stringify([{
            product_id: product.id,
            name: product.name,
            quantity: 1,
            price: product.price
          }]),
          total_price: product.price,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return "Sorry, I couldn't create your order. Please try again.";
      }

      // Generate payment
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          user_id: user.id,
          amount: product.price
        })
      });

      if (!response.ok) {
        return "Order created but payment generation failed. Please contact support.";
      }

      const paymentData = await response.json();
      
      // Update order with payment ID
      await this.supabase
        .from('orders')
        .update({ payment_id: paymentData.id })
        .eq('id', order.id);

      return `🛒 Order created for ${product.name}!\n\n${this.processor.formatPaymentResponse(paymentData)}\n\nPay to confirm your order.`;

    } catch (error) {
      console.error('Error in buyProduct:', error);
      return "Sorry, there was an error processing your order. Please try again.";
    }
  }
}