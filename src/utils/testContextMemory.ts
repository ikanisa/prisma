import { supabase } from "@/integrations/supabase/client";

interface MemoryNode {
  type: 'preference' | 'fact' | 'pattern' | 'context' | 'prediction';
  key: string;
  value: any;
  confidence: number;
  importance: number;
  source: string;
  expires_at?: string;
  emotional_context?: {
    valence: number;
    arousal: number;
    dominance: number;
  };
}

interface ContextMemoryRequest {
  action: 'retrieve' | 'store' | 'predict' | 'forget' | 'consolidate';
  userId: string;
  agentId?: string;
  context?: {
    currentIntent?: string;
    conversationPhase?: string;
    emotionalState?: string;
    urgency?: number;
    location?: { lat: number; lng: number };
    timeContext?: string;
  };
  memories?: MemoryNode[];
  query?: string;
  prediction_horizon?: number;
}

export async function testContextMemoryV3() {
  console.log('🧠 Testing Context Memory V3 System...');
  
  try {
    // Test 1: Store a memory
    console.log('📝 Test 1: Storing a test memory...');
    const storeRequest: ContextMemoryRequest = {
      action: 'store',
      userId: 'test-user-123',
      agentId: 'omni-agent',
      memories: [
        {
          type: 'preference',
          key: 'communication_style',
          value: 'prefers concise responses',
          confidence: 0.8,
          importance: 0.7,
          source: 'conversation_analysis',
          emotional_context: {
            valence: 0.2,
            arousal: 0.3,
            dominance: 0.6
          }
        }
      ]
    };

    const storeResponse = await supabase.functions.invoke('context-memory-v3', {
      body: storeRequest
    });

    if (storeResponse.error) {
      console.error('❌ Store test failed:', storeResponse.error);
      return false;
    }

    console.log('✅ Store test passed:', storeResponse.data);

    // Test 2: Retrieve memories
    console.log('🔍 Test 2: Retrieving memories...');
    const retrieveRequest: ContextMemoryRequest = {
      action: 'retrieve',
      userId: 'test-user-123',
      agentId: 'omni-agent',
      context: {
        currentIntent: 'information_request',
        conversationPhase: 'greeting',
        emotionalState: 'neutral',
        urgency: 0.3,
        timeContext: 'morning'
      }
    };

    const retrieveResponse = await supabase.functions.invoke('context-memory-v3', {
      body: retrieveRequest
    });

    if (retrieveResponse.error) {
      console.error('❌ Retrieve test failed:', retrieveResponse.error);
      return false;
    }

    console.log('✅ Retrieve test passed:', retrieveResponse.data);

    // Test 3: Predictive memory
    console.log('🔮 Test 3: Testing predictive memory...');
    const predictRequest: ContextMemoryRequest = {
      action: 'predict',
      userId: 'test-user-123',
      agentId: 'omni-agent',
      prediction_horizon: 60, // 1 hour
      context: {
        currentIntent: 'service_request',
        timeContext: 'morning'
      }
    };

    const predictResponse = await supabase.functions.invoke('context-memory-v3', {
      body: predictRequest
    });

    if (predictResponse.error) {
      console.error('❌ Predict test failed:', predictResponse.error);
      return false;
    }

    console.log('✅ Predict test passed:', predictResponse.data);

    console.log('🎉 All Context Memory V3 tests passed!');
    return true;

  } catch (error) {
    console.error('💥 Context Memory V3 test suite failed:', error);
    return false;
  }
}

// Function to test database connectivity
export async function testMemoryDatabase() {
  console.log('🗄️ Testing memory database tables...');
  
  try {
    // Test agent_memory_enhanced table
    const { data, error } = await supabase
      .from('agent_memory_enhanced')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Database test failed:', error);
      return false;
    }

    console.log('✅ Database connectivity test passed');
    console.log(`📊 Found ${data?.length || 0} existing memories`);
    
    return true;
  } catch (error) {
    console.error('💥 Database test failed:', error);
    return false;
  }
}