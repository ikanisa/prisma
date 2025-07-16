export class SmartMarketplaceAgent {
  constructor(private supabase: any, private vectorMemory: any, private openAI: any) {}

  async process(
    message: string, 
    user: any, 
    whatsappNumber: string, 
    context: string[], 
    intentAnalysis?: any
  ): Promise<string> {
    try {
      console.log('🛒 Processing with Smart Marketplace Agent');

      const intent = intentAnalysis?.intent;
      const entities = intentAnalysis?.entities || {};

      // Handle specific marketplace intents
      if (intent === 'list_product' || message.toLowerCase().startsWith('add ')) {
        return await this.handleProductListing(message, user, context);
      }
      
      if (intent === 'browse_products' || message.toLowerCase() === 'browse') {
        return await this.handleBrowseProducts(context);
      }

      if (intent === 'buy_product' || message.toLowerCase().includes('buy')) {
        return await this.handlePurchaseIntent(message, user, context);
      }

      // AI-powered product search
      if (message.toLowerCase().includes('need') || 
          message.toLowerCase().includes('want') || 
          message.toLowerCase().includes('looking for')) {
        return await this.handleProductSearch(message, user, context);
      }

      // General marketplace assistance
      const systemMessage = `You are a marketplace assistant for easyMO. Help users with:
      - Browsing products: "browse"
      - Searching: "need [product]" or "want [product]"
      - Listing products: "add [product] [quantity][unit] [price]"
      - Buying: "buy id:[product_id]"
      
      The user said: "${message}"
      
      Be helpful and guide them to the right action. Keep response under 200 characters. Use emojis.`;

      return await this.openAI.generateResponse(message, systemMessage, context);

    } catch (error) {
      console.error('❌ Smart Marketplace Agent error:', error);
      return "I'm here to help with the marketplace! 🛒 Send 'browse' to see products or 'help' for more options.";
    }
  }

  private async handleProductListing(message: string, user: any, context: string[]): Promise<string> {
    const productData = this.parseProductMessage(message);
    
    if (!productData) {
      const systemMessage = `The user tried to list a product but the format is wrong. They said: "${message}"
      
      Explain the correct format: "add [product] [quantity][unit] [price]"
      Give example: "add beans 30kg 1500"
      Be helpful and encouraging. Keep under 200 characters.`;
      
      return await this.openAI.generateResponse(message, systemMessage, context);
    }

    try {
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
        console.error('❌ Error creating product:', error);
        return "Sorry, I couldn't list your product right now. Please try again! 📝";
      }

      const systemMessage = `A farmer successfully listed their product:
      - Product: ${productData.name}
      - Quantity: ${productData.stock}${productData.unit}
      - Price: ${productData.price} RWF
      
      Create an enthusiastic confirmation message. Mention that customers can now find and buy it. Use emojis. Keep under 200 characters.`;

      return await this.openAI.generateResponse(
        `Product listed: ${productData.name}`, 
        systemMessage, 
        []
      );

    } catch (error) {
      console.error('❌ Error in product listing:', error);
      return "There was an error listing your product. Please try the format: 'add [product] [qty][unit] [price]' 📝";
    }
  }

  private async handleBrowseProducts(context: string[]): Promise<string> {
    const { data: products, error } = await this.supabase
      .from('products')
      .select('id, name, price, unit, stock')
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !products || products.length === 0) {
      return "No products available right now. Check back later or ask farmers to list their produce! 🌾";
    }

    let response = "🛒 Available Products:\n\n";
    products.forEach((product: any, index: number) => {
      response += `${index + 1}. ${product.name}\n`;
      response += `💰 ${product.price} RWF${product.unit ? ` per ${product.unit}` : ''}\n`;
      response += `📊 Stock: ${product.stock}\n`;
      response += `To buy: send 'buy id:${product.id}'\n\n`;
    });

    // Truncate if too long for WhatsApp
    return response.length > 1600 ? response.substring(0, 1597) + '...' : response;
  }

  private async handleProductSearch(message: string, user: any, context: string[]): Promise<string> {
    // Extract search term using AI
    const searchTermResponse = await this.openAI.generateResponse(
      `Extract the product name from: "${message}". Respond with only the product name.`,
      'You extract product names from search queries. Examples: "need beans" -> "beans", "want maize" -> "maize"',
      []
    );

    const searchTerm = searchTermResponse.toLowerCase().trim();

    const { data: products, error } = await this.supabase
      .from('products')
      .select('id, name, price, unit, stock')
      .ilike('name', `%${searchTerm}%`)
      .gt('stock', 0)
      .limit(5);

    if (error || !products || products.length === 0) {
      return `No "${searchTerm}" found right now. 😕 Send 'browse' to see all available products or ask farmers to list some!`;
    }

    let response = `🔍 Found ${products.length} result(s) for "${searchTerm}":\n\n`;
    products.forEach((product: any, index: number) => {
      response += `${index + 1}. ${product.name} - ${product.price} RWF\n`;
      response += `To buy: send 'buy id:${product.id}'\n\n`;
    });

    return response;
  }

  private async handlePurchaseIntent(message: string, user: any, context: string[]): Promise<string> {
    // Extract product ID from message
    const idMatch = message.match(/id:(\w+)/i);
    
    if (!idMatch) {
      return "To buy a product, use format: 'buy id:[product_id]'\nYou can find product IDs when you browse or search! 🛒";
    }

    const productId = idMatch[1];
    return await this.processPurchase(productId, user);
  }

  private async processPurchase(productId: string, user: any): Promise<string> {
    try {
      // Get product details
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product || product.stock <= 0) {
        return "Sorry, that product is not available or out of stock. 😕 Send 'browse' to see available items.";
      }

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
        console.error('❌ Error creating order:', orderError);
        return "Sorry, I couldn't create your order right now. Please try again! 🛒";
      }

      // Generate payment
      const paymentResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`, {
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

      if (!paymentResponse.ok) {
        return "Order created but payment failed. Please contact support or try again.";
      }

      const paymentData = await paymentResponse.json();
      
      // Update order with payment ID
      await this.supabase
        .from('orders')
        .update({ payment_id: paymentData.id })
        .eq('id', order.id);

      return `🛒 Order created for ${product.name}!\n💰 Amount: ${product.price} RWF\n\nUSSD: ${paymentData.ussd_code}\n\nPay to confirm your order! 📱`;

    } catch (error) {
      console.error('❌ Error processing purchase:', error);
      return "Sorry, there was an error with your purchase. Please try again! 🛒";
    }
  }

  private parseProductMessage(message: string): { name: string; stock: number; price: number; unit: string } | null {
    // Enhanced parsing for "add beans 30kg 1500" format
    const patterns = [
      /^add\s+(\w+)\s+(\d+)(\w+)\s+(\d+)$/i,
      /^add\s+(\w+)\s+(\d+)\s*(\w*)\s+(\d+)$/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          name: match[1].toLowerCase(),
          stock: parseInt(match[2]),
          unit: match[3] || 'units',
          price: parseInt(match[4])
        };
      }
    }

    return null;
  }
}