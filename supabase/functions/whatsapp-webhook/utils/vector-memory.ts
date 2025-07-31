import { Pinecone } from 'https://esm.sh/@pinecone-database/pinecone@3.0.3';

export class VectorMemory {
  private pinecone: any;
  private index: any;

  constructor() {
    this.initPinecone();
  }

  private async initPinecone() {
    try {
      this.pinecone = new Pinecone({
        apiKey: Deno.env.get('PINECONE_API_KEY') ?? ''
      });
      
      this.index = this.pinecone.index('easymo-conversations');
      console.log('📌 Pinecone vector memory initialized');
    } catch (error) {
      console.error('❌ Pinecone initialization failed:', error);
    }
  }

  async store(userId: string, userMessage: string, agentResponse: string): Promise<void> {
    if (!this.index) await this.initPinecone();
    
    try {
      const timestamp = Date.now();
      const conversationText = `User: ${userMessage}\nAgent: ${agentResponse}`;
      
      // Generate embedding using OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: conversationText
        })
      });

      if (!embeddingResponse.ok) {
        console.error('❌ OpenAI embedding failed');
        return;
      }

      const { data } = await embeddingResponse.json();
      const embedding = data[0].embedding;

      // Store in Pinecone with namespace per user
      await this.index.namespace(userId).upsert([{
        id: `conv_${timestamp}`,
        values: embedding,
        metadata: {
          user_message: userMessage,
          agent_response: agentResponse,
          timestamp: timestamp,
          user_id: userId
        }
      }]);

      console.log(`📝 Stored conversation in vector memory for user ${userId}`);
    } catch (error) {
      console.error('❌ Error storing in vector memory:', error);
    }
  }

  async getContext(userId: string, currentMessage: string, topK: number = 5): Promise<string[]> {
    if (!this.index) await this.initPinecone();
    
    try {
      // Generate embedding for current message
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: currentMessage
        })
      });

      if (!embeddingResponse.ok) {
        console.log('⚠️ Could not generate embedding for context search');
        return [];
      }

      const { data } = await embeddingResponse.json();
      const embedding = data[0].embedding;

      // Search for similar conversations
      const searchResponse = await this.index.namespace(userId).query({
        vector: embedding,
        topK: topK,
        includeMetadata: true
      });

      const context = searchResponse.matches?.map((match: any) => 
        `Previous: User said "${match.metadata.user_message}" → Agent replied "${match.metadata.agent_response}"`
      ) || [];

      console.log(`🔍 Retrieved ${context.length} context items for user ${userId}`);
      return context;
    } catch (error) {
      console.error('❌ Error retrieving context:', error);
      return [];
    }
  }

  async getUserHistory(userId: string, days: number = 7): Promise<any[]> {
    if (!this.index) await this.initPinecone();
    
    try {
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const response = await this.index.namespace(userId).query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata-only search
        topK: 100,
        includeMetadata: true,
        filter: {
          timestamp: { $gte: cutoffTime }
        }
      });

      return response.matches?.map((match: any) => match.metadata) || [];
    } catch (error) {
      console.error('❌ Error getting user history:', error);
      return [];
    }
  }
}