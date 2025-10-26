import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';
import type { SafetyAgent, SafetyAgentOptions } from './types.js';

type SupabaseDb = SupabaseClient<Database>;

type SafetyEventRow = Database['public']['Tables']['agent_safety_events']['Row'];

function mapSeverity(value: string): SafetyEventRow['severity'] {
  if (value === 'WARN' || value === 'BLOCKED' || value === 'INFO') {
    return value;
  }
  return 'INFO';
}

export function createSafetyAgent(options: SafetyAgentOptions): SafetyAgent {
  const { supabase, logError, logInfo } = options;

  return {
    async recordEvent({ sessionId, taskId = null, severity, ruleCode, details = {} }) {
      try {
        await supabase.from('agent_safety_events').insert({
          session_id: sessionId,
          task_id: taskId,
          severity: mapSeverity(severity),
          rule_code: ruleCode,
          details,
        });
        logInfo?.('mcp.safety_event_logged', { sessionId, taskId, ruleCode, severity });
      } catch (error) {
        logError('mcp.safety_event_failed', error, { sessionId, taskId, ruleCode, severity });
        throw error;
      }
    },
  } satisfies SafetyAgent;
}
