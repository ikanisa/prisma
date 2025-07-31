/**
 * PHASE 4 COMPLETION: API Configuration & Testing
 * This file provides utilities to complete Phase 4 properly
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Test Phase 4 integrations and verify configuration
 */
export class Phase4CompletionManager {
  
  /**
   * Check if required API keys are configured
   */
  async checkAPIConfiguration(): Promise<{
    openai: boolean;
    pinecone: boolean;
    missing: string[];
  }> {
    try {
      // Test OpenAI key by calling a test function
      const { data: openaiTest, error: openaiError } = await supabase.functions.invoke('test-openai-integration', {
        body: { test: true }
      });

      // Test Pinecone key by calling a test function  
      const { data: pineconeTest, error: pineconeError } = await supabase.functions.invoke('test-pinecone-integration', {
        body: { test: true }
      });

      const missing: string[] = [];
      if (openaiError) missing.push('OPENAI_API_KEY');
      if (pineconeError) missing.push('PINECONE_API_KEY');

      return {
        openai: !openaiError,
        pinecone: !pineconeError,
        missing
      };

    } catch (error) {
      console.error('API configuration check failed:', error);
      return {
        openai: false,
        pinecone: false,
        missing: ['OPENAI_API_KEY', 'PINECONE_API_KEY']
      };
    }
  }

  /**
   * Test verified edge functions availability
   */
  async checkEdgeFunctions(): Promise<{
    verified: string[];
    missing: string[];
    failed: string[];
  }> {
    const requiredFunctions = [
      'enhanced-qr-generator',
      'create-unified-order',
      'listing-publish',
      'listing-search', 
      'human-handoff',
      'schedule-task',
      'catalog-search',
      'omni-agent-router'
    ];

    const verified: string[] = [];
    const missing: string[] = [];
    const failed: string[] = [];

    for (const functionName of requiredFunctions) {
      try {
        const { error } = await supabase.functions.invoke(functionName, {
          body: { test: true, healthCheck: true }
        });

        if (error) {
          if (error.message?.includes('404')) {
            missing.push(functionName);
          } else {
            failed.push(functionName);
          }
        } else {
          verified.push(functionName);
        }
      } catch (error) {
        missing.push(functionName);
      }
    }

    return { verified, missing, failed };
  }

  /**
   * Test RAG integration
   */
  async testRAGIntegration(userId: string = 'test-user'): Promise<{
    success: boolean;
    error?: string;
    memoryStored?: boolean;
    memoryRetrieved?: boolean;
  }> {
    try {
      // Test memory storage
      const { data: storeResult, error: storeError } = await supabase.functions.invoke('test-rag-store', {
        body: {
          userId,
          content: 'Test memory for Phase 4 completion',
          metadata: { domain: 'testing', importance: 0.8 }
        }
      });

      if (storeError) {
        return { success: false, error: `Memory store failed: ${storeError.message}` };
      }

      // Test memory retrieval
      const { data: searchResult, error: searchError } = await supabase.functions.invoke('test-rag-search', {
        body: {
          userId,
          query: 'Test memory Phase 4',
          options: { topK: 3 }
        }
      });

      if (searchError) {
        return { success: false, error: `Memory search failed: ${searchError.message}` };
      }

      return {
        success: true,
        memoryStored: !!storeResult,
        memoryRetrieved: !!searchResult && searchResult.length > 0
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test OpenAI Agent SDK integration
   */
  async testOpenAIAgentSDK(): Promise<{
    success: boolean;
    error?: string;
    threadCreated?: boolean;
    messageProcessed?: boolean;
  }> {
    try {
      const { data: result, error } = await supabase.functions.invoke('test-openai-agent', {
        body: {
          message: 'Hello, this is a test for Phase 4 completion',
          userId: 'test-user',
          domain: 'testing'
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        threadCreated: !!result.threadId,
        messageProcessed: !!result.response
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Complete Phase 4 health check
   */
  async runCompleteHealthCheck(): Promise<{
    overall: 'PASS' | 'PARTIAL' | 'FAIL';
    apiKeys: any;
    edgeFunctions: any;
    ragIntegration: any;
    openaiAgent: any;
    recommendations: string[];
  }> {
    console.log('🔍 Running Phase 4 complete health check...');

    const [apiKeys, edgeFunctions, ragIntegration, openaiAgent] = await Promise.all([
      this.checkAPIConfiguration(),
      this.checkEdgeFunctions(),
      this.testRAGIntegration(),
      this.testOpenAIAgentSDK()
    ]);

    const recommendations: string[] = [];

    // Analyze results and provide recommendations
    if (apiKeys.missing.length > 0) {
      recommendations.push(`Configure missing API keys: ${apiKeys.missing.join(', ')}`);
    }

    if (edgeFunctions.missing.length > 0) {
      recommendations.push(`Create missing edge functions: ${edgeFunctions.missing.join(', ')}`);
    }

    if (!ragIntegration.success) {
      recommendations.push(`Fix RAG integration: ${ragIntegration.error}`);
    }

    if (!openaiAgent.success) {
      recommendations.push(`Fix OpenAI Agent SDK: ${openaiAgent.error}`);
    }

    // Determine overall status
    let overall: 'PASS' | 'PARTIAL' | 'FAIL';
    if (recommendations.length === 0) {
      overall = 'PASS';
    } else if (apiKeys.openai && edgeFunctions.verified.length > 4) {
      overall = 'PARTIAL';
    } else {
      overall = 'FAIL';
    }

    return {
      overall,
      apiKeys,
      edgeFunctions,
      ragIntegration,
      openaiAgent,
      recommendations
    };
  }
}

// Export singleton instance
export const phase4Completion = new Phase4CompletionManager();