// Commerce Skill - Shopping, orders, and marketplace operations
import { z } from 'zod';

export interface CommerceContext {
  userId: string;
  phone: string;
  currentCart?: any;
  location?: string;
}

export const CommerceSkill = {
  name: 'commerce',
  description: 'Handle shopping, product search, orders, and marketplace operations',
  
  tools: {
    search_products: {
      name: 'search_products',
      description: 'Search for products in the marketplace',
      parameters: z.object({
        query: z.string(),
        category: z.string().optional(),
        price_min: z.number().optional(),
        price_max: z.number().optional()
      }),
      execute: async (params: any, context: CommerceContext) => {
        const products = Array.from({ length: 5 }, (_, i) => ({
          product_id: `PROD_${Date.now()}_${i}`,
          name: `${params.query} Item ${i + 1}`,
          price: Math.floor(Math.random() * 50000) + 5000,
          rating: (3.5 + Math.random() * 1.5).toFixed(1),
          vendor: `Vendor ${String.fromCharCode(65 + i)}`
        }));
        
        return {
          products,
          total_found: products.length,
          search_query: params.query
        };
      }
    }
  },
  
  intents: [
    { pattern: /shop|buy|purchase|order|product/i, confidence: 0.9 },
    { pattern: /search|find|looking for/i, confidence: 0.8 }
  ],
  
  templates: {
    products_found: {
      text: "🛍️ Found {total_found} Products\n\n🏷️ Top Result:\n{product_name}\n💰 {price} RWF\n⭐ {rating}",
      buttons: [
        { id: 'add_to_cart', title: 'Add to Cart' },
        { id: 'view_details', title: 'View Details' }
      ]
    }
  }
};