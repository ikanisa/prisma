/**
 * OpenAI Agent SDK Integration Test Script
 * Verifies end-to-end agent functionality
 */

import { supabase } from '@/integrations/supabase/client';

export async function testAgentIntegration() {
  console.log('🧪 Testing OpenAI Agent SDK Integration...');
  
  try {
    // 1. Test agent configuration exists
    console.log('1. Checking agent configuration...');
    const { data: agents, error: agentError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('code', 'easymo_main');
    
    if (agentError) throw agentError;
    if (!agents || agents.length === 0) {
      throw new Error('easymo_main agent not found');
    }
    console.log('✅ Agent configuration found');
    
    // 2. Test agent router with test message
    console.log('2. Testing agent router...');
    const { data: routerData, error: routerError } = await supabase.functions.invoke('agent-router', {
      body: {
        agent_code: 'easymo_main',
        message: 'Hello, I need help with a payment of 5000 RWF',
        phone: '+250700000000',
        test_mode: true
      }
    });
    
    if (routerError) throw routerError;
    console.log('✅ Agent router working:', routerData);
    
    // 3. Check agent runs were created
    console.log('3. Checking agent runs...');
    const { data: runs, error: runsError } = await supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (runsError) throw runsError;
    console.log('✅ Agent runs found:', runs.length);
    
    // 4. Check tool calls if any
    if (runs.length > 0) {
      const { data: toolCalls } = await supabase
        .from('agent_tool_calls')
        .select('*')
        .eq('run_id', runs[0].id);
      
      console.log('✅ Tool calls found:', toolCalls?.length || 0);
    }
    
    console.log('🎉 OpenAI Agent SDK Integration Test PASSED!');
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}