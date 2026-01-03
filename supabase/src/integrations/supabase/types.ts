Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      acceptance_decisions: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          created_by_user_id: string | null
          decision: Database["public"]["Enums"]["acceptance_decision"]
          engagement_id: string
          eqr_required: boolean
          id: string
          org_id: string
          rationale: string | null
          status: Database["public"]["Enums"]["acceptance_status"]
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          decision?: Database["public"]["Enums"]["acceptance_decision"]
          engagement_id: string
          eqr_required?: boolean
          id?: string
          org_id: string
          rationale?: string | null
          status?: Database["public"]["Enums"]["acceptance_status"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          decision?: Database["public"]["Enums"]["acceptance_decision"]
          engagement_id?: string
          eqr_required?: boolean
          id?: string
          org_id?: string
          rationale?: string | null
          status?: Database["public"]["Enums"]["acceptance_status"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acceptance_decisions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acceptance_decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_type: string
          id: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_type: string
          id?: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_event_catalog: {
        Row: {
          action: string
          description: string
          module: string
          policy_pack: string | null
          severity: string | null
          standard_refs: string[] | null
        }
        Insert: {
          action: string
          description: string
          module: string
          policy_pack?: string | null
          severity?: string | null
          standard_refs?: string[] | null
        }
        Update: {
          action?: string
          description?: string
          module?: string
          policy_pack?: string | null
          severity?: string | null
          standard_refs?: string[] | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          module: string | null
          org_id: string
          policy_pack: string | null
          standard_refs: string[] | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          module?: string | null
          org_id: string
          policy_pack?: string | null
          standard_refs?: string[] | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          module?: string | null
          org_id?: string
          policy_pack?: string | null
          standard_refs?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ada_exceptions: {
        Row: {
          created_at: string
          created_by: string | null
          disposition: Database["public"]["Enums"]["ada_exception_disposition"]
          id: string
          misstatement_id: string | null
          note: string | null
          reason: string
          record_ref: string
          run_id: string
          score: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disposition?: Database["public"]["Enums"]["ada_exception_disposition"]
          id?: string
          misstatement_id?: string | null
          note?: string | null
          reason: string
          record_ref: string
          run_id: string
          score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disposition?: Database["public"]["Enums"]["ada_exception_disposition"]
          id?: string
          misstatement_id?: string | null
          note?: string | null
          reason?: string
          record_ref?: string
          run_id?: string
          score?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ada_exceptions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ada_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ada_runs: {
        Row: {
          created_by: string | null
          dataset_hash: string
          dataset_ref: string
          engagement_id: string
          finished_at: string | null
          id: string
          kind: Database["public"]["Enums"]["ada_run_kind"]
          org_id: string
          params: Json
          started_at: string
          summary: Json | null
        }
        Insert: {
          created_by?: string | null
          dataset_hash: string
          dataset_ref: string
          engagement_id: string
          finished_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ada_run_kind"]
          org_id: string
          params: Json
          started_at?: string
          summary?: Json | null
        }
        Update: {
          created_by?: string | null
          dataset_hash?: string
          dataset_ref?: string
          engagement_id?: string
          finished_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ada_run_kind"]
          org_id?: string
          params?: Json
          started_at?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ada_runs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ada_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          id: string
          input_json: Json
          org_id: string
          output_json: Json | null
          requested_at: string
          requested_by_user_id: string | null
          run_id: string | null
          sensitive: boolean
          session_id: string
          status: Database["public"]["Enums"]["agent_action_status"]
          tool_key: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          id?: string
          input_json?: Json
          org_id: string
          output_json?: Json | null
          requested_at?: string
          requested_by_user_id?: string | null
          run_id?: string | null
          sensitive?: boolean
          session_id: string
          status?: Database["public"]["Enums"]["agent_action_status"]
          tool_key: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          id?: string
          input_json?: Json
          org_id?: string
          output_json?: Json | null
          requested_at?: string
          requested_by_user_id?: string | null
          run_id?: string | null
          sensitive?: boolean
          session_id?: string
          status?: Database["public"]["Enums"]["agent_action_status"]
          tool_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_audit_log: {
        Row: {
          action: string
          after_state: Json | null
          agent_id: string
          before_state: Json | null
          changes: Json | null
          contains_pii: boolean | null
          created_at: string | null
          data_classification: string | null
          execution_id: string | null
          id: string
          ip_address: unknown
          org_id: string
          resource_id: string | null
          resource_type: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_state?: Json | null
          agent_id: string
          before_state?: Json | null
          changes?: Json | null
          contains_pii?: boolean | null
          created_at?: string | null
          data_classification?: string | null
          execution_id?: string | null
          id?: string
          ip_address?: unknown
          org_id: string
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_state?: Json | null
          agent_id?: string
          before_state?: Json | null
          changes?: Json | null
          contains_pii?: boolean | null
          created_at?: string | null
          data_classification?: string | null
          execution_id?: string | null
          id?: string
          ip_address?: unknown
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_audit_log_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          execution_id: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          execution_id?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          execution_id?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversation_messages_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "agent_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          domain: string
          id: string
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          org_id: string
          status: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          domain: string
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          org_id: string
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          domain?: string
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          org_id?: string
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_daily_stats: {
        Row: {
          agent_id: string
          avg_confidence: number | null
          avg_duration_ms: number | null
          avg_rag_similarity: number | null
          avg_rating: number | null
          date: string
          failed_executions: number
          id: number
          p95_duration_ms: number | null
          rag_queries: number
          successful_executions: number
          total_cost_usd: number | null
          total_executions: number
          total_tokens: number | null
        }
        Insert: {
          agent_id: string
          avg_confidence?: number | null
          avg_duration_ms?: number | null
          avg_rag_similarity?: number | null
          avg_rating?: number | null
          date: string
          failed_executions?: number
          id?: number
          p95_duration_ms?: number | null
          rag_queries?: number
          successful_executions?: number
          total_cost_usd?: number | null
          total_executions?: number
          total_tokens?: number | null
        }
        Update: {
          agent_id?: string
          avg_confidence?: number | null
          avg_duration_ms?: number | null
          avg_rag_similarity?: number | null
          avg_rating?: number | null
          date?: string
          failed_executions?: number
          id?: number
          p95_duration_ms?: number | null
          rag_queries?: number
          successful_executions?: number
          total_cost_usd?: number | null
          total_executions?: number
          total_tokens?: number | null
        }
        Relationships: []
      }
      agent_execution_logs: {
        Row: {
          agent_category: string
          agent_id: string
          agent_name: string
          agent_version: string
          citation_count: number | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          has_citations: boolean | null
          id: number
          llm_cost_usd: number | null
          llm_model: string | null
          llm_temperature: number | null
          llm_tokens_completion: number | null
          llm_tokens_prompt: number | null
          llm_tokens_total: number | null
          metadata: Json | null
          organization_id: string | null
          query_type: string | null
          rag_avg_similarity: number | null
          rag_categories: string[] | null
          rag_chunks_used: number | null
          rag_enabled: boolean | null
          rag_jurisdictions: string[] | null
          rag_top_similarity: number | null
          request_id: string | null
          response_length: number | null
          session_id: string | null
          started_at: string
          status: string
          user_id: string | null
          user_query: string
        }
        Insert: {
          agent_category: string
          agent_id: string
          agent_name: string
          agent_version: string
          citation_count?: number | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          has_citations?: boolean | null
          id?: number
          llm_cost_usd?: number | null
          llm_model?: string | null
          llm_temperature?: number | null
          llm_tokens_completion?: number | null
          llm_tokens_prompt?: number | null
          llm_tokens_total?: number | null
          metadata?: Json | null
          organization_id?: string | null
          query_type?: string | null
          rag_avg_similarity?: number | null
          rag_categories?: string[] | null
          rag_chunks_used?: number | null
          rag_enabled?: boolean | null
          rag_jurisdictions?: string[] | null
          rag_top_similarity?: number | null
          request_id?: string | null
          response_length?: number | null
          session_id?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
          user_query: string
        }
        Update: {
          agent_category?: string
          agent_id?: string
          agent_name?: string
          agent_version?: string
          citation_count?: number | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          has_citations?: boolean | null
          id?: number
          llm_cost_usd?: number | null
          llm_model?: string | null
          llm_temperature?: number | null
          llm_tokens_completion?: number | null
          llm_tokens_prompt?: number | null
          llm_tokens_total?: number | null
          metadata?: Json | null
          organization_id?: string | null
          query_type?: string | null
          rag_avg_similarity?: number | null
          rag_categories?: string[] | null
          rag_chunks_used?: number | null
          rag_enabled?: boolean | null
          rag_jurisdictions?: string[] | null
          rag_top_similarity?: number | null
          request_id?: string | null
          response_length?: number | null
          session_id?: string | null
          started_at?: string
          status?: string
          user_id?: string | null
          user_query?: string
        }
        Relationships: []
      }
      agent_executions: {
        Row: {
          agent_id: string
          auto_eval_score: number | null
          created_at: string | null
          engine: string | null
          estimated_cost: number | null
          execution_time_ms: number | null
          id: string
          input_text: string
          input_tokens: number | null
          knowledge_retrieved: Json | null
          latency_ms: number | null
          model_used: string | null
          organization_id: string | null
          output_text: string | null
          output_tokens: number | null
          persona_id: string | null
          session_id: string | null
          tool_calls_count: number | null
          tools_invoked: Json | null
          user_feedback: string | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          agent_id: string
          auto_eval_score?: number | null
          created_at?: string | null
          engine?: string | null
          estimated_cost?: number | null
          execution_time_ms?: number | null
          id?: string
          input_text: string
          input_tokens?: number | null
          knowledge_retrieved?: Json | null
          latency_ms?: number | null
          model_used?: string | null
          organization_id?: string | null
          output_text?: string | null
          output_tokens?: number | null
          persona_id?: string | null
          session_id?: string | null
          tool_calls_count?: number | null
          tools_invoked?: Json | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          agent_id?: string
          auto_eval_score?: number | null
          created_at?: string | null
          engine?: string | null
          estimated_cost?: number | null
          execution_time_ms?: number | null
          id?: string
          input_text?: string
          input_tokens?: number | null
          knowledge_retrieved?: Json | null
          latency_ms?: number | null
          model_used?: string | null
          organization_id?: string | null
          output_text?: string | null
          output_tokens?: number | null
          persona_id?: string | null
          session_id?: string | null
          tool_calls_count?: number | null
          tools_invoked?: Json | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_executions_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "agent_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_feedback: {
        Row: {
          accuracy_rating: number | null
          agent_kind: string
          clarity_rating: number | null
          comment: string | null
          completeness_rating: number | null
          correction_text: string | null
          corrective_action: Json | null
          created_at: string | null
          feedback_text: string | null
          feedback_type: string | null
          helpfulness_rating: number | null
          id: string
          issue_categories: Json | null
          org_id: string
          rating: number | null
          session_id: string | null
          tags: string[] | null
          task_context: Json | null
          user_id: string | null
        }
        Insert: {
          accuracy_rating?: number | null
          agent_kind: string
          clarity_rating?: number | null
          comment?: string | null
          completeness_rating?: number | null
          correction_text?: string | null
          corrective_action?: Json | null
          created_at?: string | null
          feedback_text?: string | null
          feedback_type?: string | null
          helpfulness_rating?: number | null
          id?: string
          issue_categories?: Json | null
          org_id: string
          rating?: number | null
          session_id?: string | null
          tags?: string[] | null
          task_context?: Json | null
          user_id?: string | null
        }
        Update: {
          accuracy_rating?: number | null
          agent_kind?: string
          clarity_rating?: number | null
          comment?: string | null
          completeness_rating?: number | null
          correction_text?: string | null
          corrective_action?: Json | null
          created_at?: string | null
          feedback_text?: string | null
          feedback_type?: string | null
          helpfulness_rating?: number | null
          id?: string
          issue_categories?: Json | null
          org_id?: string
          rating?: number | null
          session_id?: string | null
          tags?: string[] | null
          task_context?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_guardrail_assignments: {
        Row: {
          agent_id: string
          guardrail_id: string
          id: string
          is_enabled: boolean | null
        }
        Insert: {
          agent_id: string
          guardrail_id: string
          id?: string
          is_enabled?: boolean | null
        }
        Update: {
          agent_id?: string
          guardrail_id?: string
          id?: string
          is_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_guardrail_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_guardrail_assignments_guardrail_id_fkey"
            columns: ["guardrail_id"]
            isOneToOne: false
            referencedRelation: "agent_guardrails"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_guardrails: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          organization_id: string | null
          priority: number | null
          rule_config: Json
          rule_type: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          organization_id?: string | null
          priority?: number | null
          rule_config: Json
          rule_type: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          organization_id?: string | null
          priority?: number | null
          rule_config?: Json
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_guardrails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_assignments: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          knowledge_source_id: string
          metadata_filter: Json | null
          priority: number | null
          rerank_enabled: boolean | null
          rerank_model: string | null
          retrieval_strategy: string | null
          similarity_threshold: number | null
          top_k: number | null
          updated_at: string | null
          use_metadata_filter: boolean | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          knowledge_source_id: string
          metadata_filter?: Json | null
          priority?: number | null
          rerank_enabled?: boolean | null
          rerank_model?: string | null
          retrieval_strategy?: string | null
          similarity_threshold?: number | null
          top_k?: number | null
          updated_at?: string | null
          use_metadata_filter?: boolean | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          knowledge_source_id?: string
          metadata_filter?: Json | null
          priority?: number | null
          rerank_enabled?: boolean | null
          rerank_model?: string | null
          retrieval_strategy?: string | null
          similarity_threshold?: number | null
          top_k?: number | null
          updated_at?: string | null
          use_metadata_filter?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_assignments_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_knowledge_sources: {
        Row: {
          chunk_count: number | null
          chunk_overlap: number | null
          chunk_size: number | null
          created_at: string | null
          description: string | null
          document_count: number | null
          embedding_model: string | null
          id: string
          last_synced_at: string | null
          name: string
          organization_id: string
          source_config: Json
          source_type: string
          sync_frequency: string | null
          sync_status: string | null
          total_tokens: number | null
          updated_at: string | null
        }
        Insert: {
          chunk_count?: number | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          embedding_model?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          organization_id: string
          source_config: Json
          source_type: string
          sync_frequency?: string | null
          sync_status?: string | null
          total_tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          chunk_count?: number | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          created_at?: string | null
          description?: string | null
          document_count?: number | null
          embedding_model?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          source_config?: Json
          source_type?: string
          sync_frequency?: string | null
          sync_status?: string | null
          total_tokens?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_knowledge_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_learning_events: {
        Row: {
          action_params: Json | null
          agent_category: string
          agent_id: string
          applied_at: string | null
          applied_by: string | null
          confidence_score: number | null
          created_at: string
          event_type: string
          execution_log_id: number | null
          id: number
          original_query: string
          original_response: string | null
          status: string
          suggested_action: string
          trigger_condition: string
          user_feedback_data: Json | null
        }
        Insert: {
          action_params?: Json | null
          agent_category: string
          agent_id: string
          applied_at?: string | null
          applied_by?: string | null
          confidence_score?: number | null
          created_at?: string
          event_type: string
          execution_log_id?: number | null
          id?: number
          original_query: string
          original_response?: string | null
          status?: string
          suggested_action: string
          trigger_condition: string
          user_feedback_data?: Json | null
        }
        Update: {
          action_params?: Json | null
          agent_category?: string
          agent_id?: string
          applied_at?: string | null
          applied_by?: string | null
          confidence_score?: number | null
          created_at?: string
          event_type?: string
          execution_log_id?: number | null
          id?: number
          original_query?: string
          original_response?: string | null
          status?: string
          suggested_action?: string
          trigger_condition?: string
          user_feedback_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_events_execution_log_id_fkey"
            columns: ["execution_log_id"]
            isOneToOne: false
            referencedRelation: "agent_execution_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_learning_examples: {
        Row: {
          actual_output: string | null
          agent_id: string
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          example_type: string
          expected_output: string
          id: string
          importance: number | null
          input_text: string
          is_approved: boolean | null
          message_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tags: Json | null
        }
        Insert: {
          actual_output?: string | null
          agent_id: string
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          example_type: string
          expected_output: string
          id?: string
          importance?: number | null
          input_text: string
          is_approved?: boolean | null
          message_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tags?: Json | null
        }
        Update: {
          actual_output?: string | null
          agent_id?: string
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          example_type?: string
          expected_output?: string
          id?: string
          importance?: number | null
          input_text?: string
          is_approved?: boolean | null
          message_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_examples_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_learning_jobs: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["learning_job_kind"]
          org_id: string
          payload: Json | null
          policy_version_id: string | null
          processed_at: string | null
          result: Json | null
          status: Database["public"]["Enums"]["learning_job_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["learning_job_kind"]
          org_id: string
          payload?: Json | null
          policy_version_id?: string | null
          processed_at?: string | null
          result?: Json | null
          status?: Database["public"]["Enums"]["learning_job_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["learning_job_kind"]
          org_id?: string
          payload?: Json | null
          policy_version_id?: string | null
          processed_at?: string | null
          result?: Json | null
          status?: Database["public"]["Enums"]["learning_job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_learning_jobs_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "agent_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          answer_preview: string | null
          citations: Json | null
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string
          id: string
          latency_ms: number | null
          model: string | null
          org_id: string
          prompt_tokens: number | null
          route: string | null
          session_id: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          tools: Json | null
        }
        Insert: {
          answer_preview?: string | null
          citations?: Json | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          org_id: string
          prompt_tokens?: number | null
          route?: string | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          tools?: Json | null
        }
        Update: {
          answer_preview?: string | null
          citations?: Json | null
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          org_id?: string
          prompt_tokens?: number | null
          route?: string | null
          session_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          tools?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_manifests: {
        Row: {
          agent_key: string
          created_at: string
          default_role: string
          id: string
          metadata: Json
          persona: string
          prompt_template: string
          safety_level: string
          tool_ids: string[]
          updated_at: string
          version: string
        }
        Insert: {
          agent_key: string
          created_at?: string
          default_role?: string
          id?: string
          metadata?: Json
          persona: string
          prompt_template: string
          safety_level?: string
          tool_ids?: string[]
          updated_at?: string
          version: string
        }
        Update: {
          agent_key?: string
          created_at?: string
          default_role?: string
          id?: string
          metadata?: Json
          persona?: string
          prompt_template?: string
          safety_level?: string
          tool_ids?: string[]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      agent_mcp_tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          provider: string
          schema_json: Json
          tool_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          provider: string
          schema_json?: Json
          tool_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          provider?: string
          schema_json?: Json
          tool_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      agent_orchestration_sessions: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          director_agent_id: string | null
          id: string
          metadata: Json
          objective: string
          org_id: string
          safety_agent_id: string | null
          status: Database["public"]["Enums"]["agent_orchestration_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          director_agent_id?: string | null
          id?: string
          metadata?: Json
          objective: string
          org_id: string
          safety_agent_id?: string | null
          status?: Database["public"]["Enums"]["agent_orchestration_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          director_agent_id?: string | null
          id?: string
          metadata?: Json
          objective?: string
          org_id?: string
          safety_agent_id?: string | null
          status?: Database["public"]["Enums"]["agent_orchestration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_orchestration_sessions_director_agent_id_fkey"
            columns: ["director_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_orchestration_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_orchestration_sessions_safety_agent_id_fkey"
            columns: ["safety_agent_id"]
            isOneToOne: false
            referencedRelation: "agent_manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_orchestration_tasks: {
        Row: {
          agent_manifest_id: string | null
          completed_at: string | null
          created_at: string
          depends_on: string[]
          id: string
          input: Json
          metadata: Json
          output: Json | null
          session_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["agent_task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          agent_manifest_id?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[]
          id?: string
          input?: Json
          metadata?: Json
          output?: Json | null
          session_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          agent_manifest_id?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[]
          id?: string
          input?: Json
          metadata?: Json
          output?: Json | null
          session_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_orchestration_tasks_agent_manifest_id_fkey"
            columns: ["agent_manifest_id"]
            isOneToOne: false
            referencedRelation: "agent_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_orchestration_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_orchestration_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_personas: {
        Row: {
          agent_id: string
          capabilities: Json | null
          communication_style: string | null
          content_filters: Json | null
          context_window_size: number | null
          created_at: string | null
          frequency_penalty: number | null
          id: string
          is_active: boolean | null
          limitations: Json | null
          max_output_tokens: number | null
          name: string
          personality_traits: Json | null
          pii_handling: string | null
          presence_penalty: number | null
          role: string | null
          system_prompt: string
          temperature: number | null
          top_p: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agent_id: string
          capabilities?: Json | null
          communication_style?: string | null
          content_filters?: Json | null
          context_window_size?: number | null
          created_at?: string | null
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          limitations?: Json | null
          max_output_tokens?: number | null
          name: string
          personality_traits?: Json | null
          pii_handling?: string | null
          presence_penalty?: number | null
          role?: string | null
          system_prompt: string
          temperature?: number | null
          top_p?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agent_id?: string
          capabilities?: Json | null
          communication_style?: string | null
          content_filters?: Json | null
          context_window_size?: number | null
          created_at?: string | null
          frequency_penalty?: number | null
          id?: string
          is_active?: boolean | null
          limitations?: Json | null
          max_output_tokens?: number | null
          name?: string
          personality_traits?: Json | null
          pii_handling?: string | null
          presence_penalty?: number | null
          role?: string | null
          system_prompt?: string
          temperature?: number | null
          top_p?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_personas_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_policy_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          diff: Json | null
          id: string
          org_id: string
          rolled_back_at: string | null
          status: string
          summary: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          org_id: string
          rolled_back_at?: string | null
          status: string
          summary?: string | null
          updated_at?: string
          version: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          diff?: Json | null
          id?: string
          org_id?: string
          rolled_back_at?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_policy_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          certifications: Json | null
          created_at: string | null
          id: string
          jurisdictions: string[] | null
          kind: string
          org_id: string
          reading_lists: Json | null
          style: Json | null
        }
        Insert: {
          certifications?: Json | null
          created_at?: string | null
          id?: string
          jurisdictions?: string[] | null
          kind: string
          org_id: string
          reading_lists?: Json | null
          style?: Json | null
        }
        Update: {
          certifications?: Json | null
          created_at?: string | null
          id?: string
          jurisdictions?: string[] | null
          kind?: string
          org_id?: string
          reading_lists?: Json | null
          style?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_queries_log: {
        Row: {
          agent_name: string
          created_at: string
          id: number
          jurisdiction_id: string | null
          latency_ms: number | null
          metadata: Json | null
          query_text: string
          response_summary: string | null
          top_chunk_ids: string[] | null
          user_id: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: number
          jurisdiction_id?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          query_text: string
          response_summary?: string | null
          top_chunk_ids?: string[] | null
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: number
          jurisdiction_id?: string | null
          latency_ms?: number | null
          metadata?: Json | null
          query_text?: string
          response_summary?: string | null
          top_chunk_ids?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_queries_log_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_rag_usage: {
        Row: {
          agent_id: string
          avg_similarity: number | null
          categories_found: string[] | null
          chunks_returned: number
          chunks_used: number
          created_at: string
          execution_log_id: number | null
          id: number
          jurisdictions_found: string[] | null
          query_embedding: string | null
          search_category: string | null
          search_jurisdiction: string | null
          search_limit: number | null
          search_tags: string[] | null
          search_time_ms: number | null
          sources_used: string[] | null
          top_similarity: number | null
          user_query: string
        }
        Insert: {
          agent_id: string
          avg_similarity?: number | null
          categories_found?: string[] | null
          chunks_returned: number
          chunks_used: number
          created_at?: string
          execution_log_id?: number | null
          id?: number
          jurisdictions_found?: string[] | null
          query_embedding?: string | null
          search_category?: string | null
          search_jurisdiction?: string | null
          search_limit?: number | null
          search_tags?: string[] | null
          search_time_ms?: number | null
          sources_used?: string[] | null
          top_similarity?: number | null
          user_query: string
        }
        Update: {
          agent_id?: string
          avg_similarity?: number | null
          categories_found?: string[] | null
          chunks_returned?: number
          chunks_used?: number
          created_at?: string
          execution_log_id?: number | null
          id?: number
          jurisdictions_found?: string[] | null
          query_embedding?: string | null
          search_category?: string | null
          search_jurisdiction?: string | null
          search_limit?: number | null
          search_tags?: string[] | null
          search_time_ms?: number | null
          sources_used?: string[] | null
          top_similarity?: number | null
          user_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_rag_usage_execution_log_id_fkey"
            columns: ["execution_log_id"]
            isOneToOne: false
            referencedRelation: "agent_execution_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reasoning_traces: {
        Row: {
          agent_id: string
          citations: Json | null
          confidence_score: number | null
          created_at: string | null
          deep_search_sources: string[] | null
          deep_search_triggered: boolean | null
          execution_id: string | null
          final_answer: string | null
          guardrail_actions: Json | null
          guardrails_evaluated: string[] | null
          guardrails_triggered: string[] | null
          has_conflicts: boolean | null
          id: string
          organization_id: string
          query_embedding: string | null
          query_text: string
          reasoning_latency_ms: number | null
          reasoning_steps: Json
          requires_review: boolean | null
          retrieval_latency_ms: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          sources_consulted: string[] | null
          total_latency_ms: number | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          citations?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          deep_search_sources?: string[] | null
          deep_search_triggered?: boolean | null
          execution_id?: string | null
          final_answer?: string | null
          guardrail_actions?: Json | null
          guardrails_evaluated?: string[] | null
          guardrails_triggered?: string[] | null
          has_conflicts?: boolean | null
          id?: string
          organization_id: string
          query_embedding?: string | null
          query_text: string
          reasoning_latency_ms?: number | null
          reasoning_steps?: Json
          requires_review?: boolean | null
          retrieval_latency_ms?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          sources_consulted?: string[] | null
          total_latency_ms?: number | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          citations?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          deep_search_sources?: string[] | null
          deep_search_triggered?: boolean | null
          execution_id?: string | null
          final_answer?: string | null
          guardrail_actions?: Json | null
          guardrails_evaluated?: string[] | null
          guardrails_triggered?: string[] | null
          has_conflicts?: boolean | null
          id?: string
          organization_id?: string
          query_embedding?: string | null
          query_text?: string
          reasoning_latency_ms?: number | null
          reasoning_steps?: Json
          requires_review?: boolean | null
          retrieval_latency_ms?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          sources_consulted?: string[] | null
          total_latency_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reasoning_traces_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reasoning_traces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          created_at: string
          id: string
          openai_response_id: string | null
          openai_run_id: string | null
          org_id: string
          session_id: string
          state: Database["public"]["Enums"]["agent_run_state"]
          step_index: number
          summary: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          openai_response_id?: string | null
          openai_run_id?: string | null
          org_id: string
          session_id: string
          state?: Database["public"]["Enums"]["agent_run_state"]
          step_index: number
          summary?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          openai_response_id?: string | null
          openai_run_id?: string | null
          org_id?: string
          session_id?: string
          state?: Database["public"]["Enums"]["agent_run_state"]
          step_index?: number
          summary?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_safety_events: {
        Row: {
          created_at: string
          details: Json
          id: string
          rule_code: string
          session_id: string
          severity: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          rule_code: string
          session_id: string
          severity: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          rule_code?: string
          session_id?: string
          severity?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_safety_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_orchestration_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_safety_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_orchestration_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          ended_at: string | null
          id: string
          kind: string | null
          openai_agent_id: string | null
          openai_thread_id: string | null
          org_id: string
          started_at: string
          user_id: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          kind?: string | null
          openai_agent_id?: string | null
          openai_thread_id?: string | null
          org_id: string
          started_at?: string
          user_id?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          kind?: string | null
          openai_agent_id?: string | null
          openai_thread_id?: string | null
          org_id?: string
          started_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      agent_test_runs: {
        Row: {
          agent_id: string
          created_at: string
          environment: string | null
          failed_tests: number
          id: number
          pass_rate: number
          passed_tests: number
          results_json: Json
          run_at: string
          run_by: string | null
          suite_name: string
          total_tests: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          environment?: string | null
          failed_tests: number
          id?: number
          pass_rate: number
          passed_tests: number
          results_json: Json
          run_at?: string
          run_by?: string | null
          suite_name: string
          total_tests: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          environment?: string | null
          failed_tests?: number
          id?: number
          pass_rate?: number
          passed_tests?: number
          results_json?: Json
          run_at?: string
          run_by?: string | null
          suite_name?: string
          total_tests?: number
        }
        Relationships: []
      }
      agent_tool_assignments: {
        Row: {
          agent_id: string
          created_at: string | null
          custom_config: Json | null
          id: string
          is_enabled: boolean | null
          priority: number | null
          tool_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          custom_config?: Json | null
          id?: string
          is_enabled?: boolean | null
          priority?: number | null
          tool_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          custom_config?: Json | null
          id?: string
          is_enabled?: boolean | null
          priority?: number | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_assignments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "agent_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tools: {
        Row: {
          audit_level: string | null
          category: string
          cost_per_call: number | null
          created_at: string | null
          description: string
          id: string
          implementation_config: Json
          implementation_type: string
          input_schema: Json
          is_destructive: boolean | null
          name: string
          organization_id: string | null
          output_schema: Json
          rate_limit: number | null
          required_permissions: Json | null
          requires_confirmation: boolean | null
          slug: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          audit_level?: string | null
          category: string
          cost_per_call?: number | null
          created_at?: string | null
          description: string
          id?: string
          implementation_config: Json
          implementation_type: string
          input_schema: Json
          is_destructive?: boolean | null
          name: string
          organization_id?: string | null
          output_schema: Json
          rate_limit?: number | null
          required_permissions?: Json | null
          requires_confirmation?: boolean | null
          slug: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          audit_level?: string | null
          category?: string
          cost_per_call?: number | null
          created_at?: string | null
          description?: string
          id?: string
          implementation_config?: Json
          implementation_type?: string
          input_schema?: Json
          is_destructive?: boolean | null
          name?: string
          organization_id?: string | null
          output_schema?: Json
          rate_limit?: number | null
          required_permissions?: Json | null
          requires_confirmation?: boolean | null
          slug?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tools_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_trace: {
        Row: {
          created_at: string
          document_ids: string[] | null
          id: string
          input: Json
          org_id: string
          output: Json
          tool: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_ids?: string[] | null
          id?: string
          input?: Json
          org_id: string
          output?: Json
          tool: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_ids?: string[] | null
          id?: string
          input?: Json
          org_id?: string
          output?: Json
          tool?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_trace_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_traces: {
        Row: {
          created_at: string
          id: string
          org_id: string
          payload: Json
          run_id: string | null
          session_id: string | null
          trace_type: Database["public"]["Enums"]["agent_trace_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          payload?: Json
          run_id?: string | null
          session_id?: string | null
          trace_type?: Database["public"]["Enums"]["agent_trace_type"]
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          payload?: Json
          run_id?: string | null
          session_id?: string | null
          trace_type?: Database["public"]["Enums"]["agent_trace_type"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_traces_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_traces_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_traces_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_training_examples: {
        Row: {
          added_at: string
          category: string
          expected_rag_chunks: number | null
          expected_similarity_threshold: number | null
          id: number
          is_high_quality: boolean | null
          jurisdiction: string | null
          last_used_at: string | null
          query: string
          source_execution_log_id: number | null
          source_type: string | null
          tags: string[] | null
          use_count: number | null
          user_rating: number | null
        }
        Insert: {
          added_at?: string
          category: string
          expected_rag_chunks?: number | null
          expected_similarity_threshold?: number | null
          id?: number
          is_high_quality?: boolean | null
          jurisdiction?: string | null
          last_used_at?: string | null
          query: string
          source_execution_log_id?: number | null
          source_type?: string | null
          tags?: string[] | null
          use_count?: number | null
          user_rating?: number | null
        }
        Update: {
          added_at?: string
          category?: string
          expected_rag_chunks?: number | null
          expected_similarity_threshold?: number | null
          id?: number
          is_high_quality?: boolean | null
          jurisdiction?: string | null
          last_used_at?: string | null
          query?: string
          source_execution_log_id?: number | null
          source_type?: string | null
          tags?: string[] | null
          use_count?: number | null
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_training_examples_source_execution_log_id_fkey"
            columns: ["source_execution_log_id"]
            isOneToOne: false
            referencedRelation: "agent_execution_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage_quotas: {
        Row: {
          cost_this_month_usd: number | null
          cost_today_usd: number | null
          created_at: string | null
          executions_this_month: number | null
          executions_today: number | null
          id: string
          last_daily_reset: string | null
          last_monthly_reset: string | null
          max_cost_per_day_usd: number | null
          max_cost_per_month_usd: number | null
          max_executions_per_day: number | null
          max_executions_per_month: number | null
          max_tokens_per_day: number | null
          max_tokens_per_month: number | null
          org_id: string
          tokens_this_month: number | null
          tokens_today: number | null
          updated_at: string | null
        }
        Insert: {
          cost_this_month_usd?: number | null
          cost_today_usd?: number | null
          created_at?: string | null
          executions_this_month?: number | null
          executions_today?: number | null
          id?: string
          last_daily_reset?: string | null
          last_monthly_reset?: string | null
          max_cost_per_day_usd?: number | null
          max_cost_per_month_usd?: number | null
          max_executions_per_day?: number | null
          max_executions_per_month?: number | null
          max_tokens_per_day?: number | null
          max_tokens_per_month?: number | null
          org_id: string
          tokens_this_month?: number | null
          tokens_today?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_this_month_usd?: number | null
          cost_today_usd?: number | null
          created_at?: string | null
          executions_this_month?: number | null
          executions_today?: number | null
          id?: string
          last_daily_reset?: string | null
          last_monthly_reset?: string | null
          max_cost_per_day_usd?: number | null
          max_cost_per_month_usd?: number | null
          max_executions_per_day?: number | null
          max_executions_per_month?: number | null
          max_tokens_per_day?: number | null
          max_tokens_per_month?: number | null
          org_id?: string
          tokens_this_month?: number | null
          tokens_today?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_quotas_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_versions: {
        Row: {
          agent_id: string
          changelog: string | null
          created_at: string | null
          created_by: string | null
          id: string
          snapshot: Json
          version: string
        }
        Insert: {
          agent_id: string
          changelog?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          snapshot: Json
          version: string
        }
        Update: {
          agent_id?: string
          changelog?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          snapshot?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          avatar_url: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          organization_id: string
          parent_version_id: string | null
          published_at: string | null
          slug: string
          status: string | null
          type: string
          updated_at: string | null
          version: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          organization_id: string
          parent_version_id?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          type: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          organization_id?: string
          parent_version_id?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          event: string
          id: string
          ip: unknown
          properties: Json | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event: string
          id?: string
          ip?: unknown
          properties?: Json | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event?: string
          id?: string
          ip?: unknown
          properties?: Json | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          hashed_key: string
          id: string
          name: string
          org_id: string
          scope: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hashed_key: string
          id?: string
          name: string
          org_id: string
          scope?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hashed_key?: string
          id?: string
          name?: string
          org_id?: string
          scope?: Json
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      approval_queue: {
        Row: {
          action_id: string | null
          approved_by_user_id: string | null
          assignee_user_id: string | null
          autonomy_gate: Database["public"]["Enums"]["autonomy_level"]
          candidate_id: string | null
          context_json: Json
          created_at: string
          created_by_user_id: string | null
          decision_at: string | null
          decision_comment: string | null
          draft_id: string | null
          engagement_id: string | null
          id: string
          kind: string
          manifest_required: boolean
          org_id: string
          requested_at: string
          requested_by_user_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          service_account_membership_id: string | null
          session_id: string | null
          stage: Database["public"]["Enums"]["approval_stage"]
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          action_id?: string | null
          approved_by_user_id?: string | null
          assignee_user_id?: string | null
          autonomy_gate?: Database["public"]["Enums"]["autonomy_level"]
          candidate_id?: string | null
          context_json?: Json
          created_at?: string
          created_by_user_id?: string | null
          decision_at?: string | null
          decision_comment?: string | null
          draft_id?: string | null
          engagement_id?: string | null
          id?: string
          kind: string
          manifest_required?: boolean
          org_id: string
          requested_at?: string
          requested_by_user_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          service_account_membership_id?: string | null
          session_id?: string | null
          stage?: Database["public"]["Enums"]["approval_stage"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          action_id?: string | null
          approved_by_user_id?: string | null
          assignee_user_id?: string | null
          autonomy_gate?: Database["public"]["Enums"]["autonomy_level"]
          candidate_id?: string | null
          context_json?: Json
          created_at?: string
          created_by_user_id?: string | null
          decision_at?: string | null
          decision_comment?: string | null
          draft_id?: string | null
          engagement_id?: string | null
          id?: string
          kind?: string
          manifest_required?: boolean
          org_id?: string
          requested_at?: string
          requested_by_user_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          service_account_membership_id?: string | null
          session_id?: string | null
          stage?: Database["public"]["Enums"]["approval_stage"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_queue_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "agent_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "kam_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "kam_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_service_account_membership_id_fkey"
            columns: ["service_account_membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          org_id: string
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_evidence: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          document_id: string | null
          engagement_id: string
          id: string
          obtained_at: string | null
          org_id: string
          prepared_by_user_id: string | null
          procedure_id: string | null
          updated_at: string
          updated_by_user_id: string | null
          workpaper_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          document_id?: string | null
          engagement_id: string
          id?: string
          obtained_at?: string | null
          org_id: string
          prepared_by_user_id?: string | null
          procedure_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          workpaper_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          document_id?: string | null
          engagement_id?: string
          id?: string
          obtained_at?: string | null
          org_id?: string
          prepared_by_user_id?: string | null
          procedure_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          workpaper_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_evidence_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_evidence_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_evidence_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_planned_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_evidence_workpaper_id_fkey"
            columns: ["workpaper_id"]
            isOneToOne: false
            referencedRelation: "workpapers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_planned_procedures: {
        Row: {
          created_at: string
          created_by_user_id: string
          engagement_id: string
          id: string
          isa_references: string[]
          notes: string | null
          objective: string | null
          org_id: string
          risk_id: string | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          id?: string
          isa_references?: string[]
          notes?: string | null
          objective?: string | null
          org_id: string
          risk_id?: string | null
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          id?: string
          isa_references?: string[]
          notes?: string | null
          objective?: string | null
          org_id?: string
          risk_id?: string | null
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_planned_procedures_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_planned_procedures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_planned_procedures_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_plans: {
        Row: {
          approvals: Json
          basis_framework: string
          created_at: string
          created_by_user_id: string | null
          engagement_id: string
          id: string
          locked_at: string | null
          locked_by_user_id: string | null
          org_id: string
          status: string
          strategy: Json
          submitted_at: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approvals?: Json
          basis_framework: string
          created_at?: string
          created_by_user_id?: string | null
          engagement_id: string
          id?: string
          locked_at?: string | null
          locked_by_user_id?: string | null
          org_id: string
          status?: string
          strategy?: Json
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          approvals?: Json
          basis_framework?: string
          created_at?: string
          created_by_user_id?: string | null
          engagement_id?: string
          id?: string
          locked_at?: string | null
          locked_by_user_id?: string | null
          org_id?: string
          status?: string
          strategy?: Json
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_plans_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_response_checks: {
        Row: {
          completeness: boolean
          conclusions: string | null
          created_at: string
          engagement_id: string
          id: string
          metadata: Json
          org_id: string
          response_id: string
          reviewed_at: string | null
          reviewer_user_id: string | null
        }
        Insert: {
          completeness?: boolean
          conclusions?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          metadata?: Json
          org_id: string
          response_id: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
        }
        Update: {
          completeness?: boolean
          conclusions?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          metadata?: Json
          org_id?: string
          response_id?: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_response_checks_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_response_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_response_checks_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "audit_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_responses: {
        Row: {
          coverage_assertions: string[]
          created_at: string
          created_by_user_id: string | null
          engagement_id: string
          id: string
          linkage: Json
          objective: string | null
          org_id: string
          ownership: Json
          planned_effectiveness: Database["public"]["Enums"]["risk_rating"]
          procedure: Json
          response_type: Database["public"]["Enums"]["response_type"]
          risk_id: string
          status: Database["public"]["Enums"]["response_status"]
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          coverage_assertions?: string[]
          created_at?: string
          created_by_user_id?: string | null
          engagement_id: string
          id?: string
          linkage?: Json
          objective?: string | null
          org_id: string
          ownership?: Json
          planned_effectiveness?: Database["public"]["Enums"]["risk_rating"]
          procedure?: Json
          response_type: Database["public"]["Enums"]["response_type"]
          risk_id: string
          status?: Database["public"]["Enums"]["response_status"]
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          coverage_assertions?: string[]
          created_at?: string
          created_by_user_id?: string | null
          engagement_id?: string
          id?: string
          linkage?: Json
          objective?: string | null
          org_id?: string
          ownership?: Json
          planned_effectiveness?: Database["public"]["Enums"]["risk_rating"]
          procedure?: Json
          response_type?: Database["public"]["Enums"]["response_type"]
          risk_id?: string
          status?: Database["public"]["Enums"]["response_status"]
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_responses_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_responses_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "audit_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_risk_activity: {
        Row: {
          action: string
          created_at: string
          created_by_user_id: string | null
          engagement_id: string
          id: string
          metadata: Json
          notes: string | null
          org_id: string
          risk_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by_user_id?: string | null
          engagement_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          org_id: string
          risk_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by_user_id?: string | null
          engagement_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          org_id?: string
          risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_risk_activity_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_risk_activity_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_risk_activity_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "audit_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_risk_signals: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          detected_at: string
          engagement_id: string
          id: string
          metric: Json
          org_id: string
          risk_id: string | null
          severity: Database["public"]["Enums"]["risk_rating"]
          signal_type: string
          source: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          detected_at?: string
          engagement_id: string
          id?: string
          metric?: Json
          org_id: string
          risk_id?: string | null
          severity?: Database["public"]["Enums"]["risk_rating"]
          signal_type: string
          source: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          detected_at?: string
          engagement_id?: string
          id?: string
          metric?: Json
          org_id?: string
          risk_id?: string | null
          severity?: Database["public"]["Enums"]["risk_rating"]
          signal_type?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_risk_signals_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_risk_signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_risk_signals_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "audit_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_risks: {
        Row: {
          analytics_summary: Json
          assertions: string[]
          category: Database["public"]["Enums"]["audit_risk_category"]
          code: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          engagement_id: string
          id: string
          impact: Database["public"]["Enums"]["risk_rating"]
          inherent_rating: Database["public"]["Enums"]["risk_rating"]
          likelihood: Database["public"]["Enums"]["risk_rating"]
          org_id: string
          owner_user_id: string | null
          residual_rating: Database["public"]["Enums"]["risk_rating"] | null
          source: string
          status: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          analytics_summary?: Json
          assertions?: string[]
          category: Database["public"]["Enums"]["audit_risk_category"]
          code?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          engagement_id: string
          id?: string
          impact?: Database["public"]["Enums"]["risk_rating"]
          inherent_rating?: Database["public"]["Enums"]["risk_rating"]
          likelihood?: Database["public"]["Enums"]["risk_rating"]
          org_id: string
          owner_user_id?: string | null
          residual_rating?: Database["public"]["Enums"]["risk_rating"] | null
          source?: string
          status?: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          analytics_summary?: Json
          assertions?: string[]
          category?: Database["public"]["Enums"]["audit_risk_category"]
          code?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          engagement_id?: string
          id?: string
          impact?: Database["public"]["Enums"]["risk_rating"]
          inherent_rating?: Database["public"]["Enums"]["risk_rating"]
          likelihood?: Database["public"]["Enums"]["risk_rating"]
          org_id?: string
          owner_user_id?: string | null
          residual_rating?: Database["public"]["Enums"]["risk_rating"] | null
          source?: string
          status?: Database["public"]["Enums"]["risk_status"]
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_risks_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_risks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cfc_inclusions: {
        Row: {
          adjustment_amount: number
          cfc_entity_name: string | null
          cfc_profit: number
          created_at: string
          created_by: string | null
          domestic_rate: number | null
          foreign_rate: number | null
          foreign_tax_paid: number
          id: string
          inclusion_amount: number
          notes: string | null
          org_id: string
          participation_percentage: number | null
          period: string
          profit_attribution_ratio: number | null
          tax_credit_eligible: number
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adjustment_amount: number
          cfc_entity_name?: string | null
          cfc_profit: number
          created_at?: string
          created_by?: string | null
          domestic_rate?: number | null
          foreign_rate?: number | null
          foreign_tax_paid: number
          id?: string
          inclusion_amount: number
          notes?: string | null
          org_id: string
          participation_percentage?: number | null
          period: string
          profit_attribution_ratio?: number | null
          tax_credit_eligible: number
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adjustment_amount?: number
          cfc_entity_name?: string | null
          cfc_profit?: number
          created_at?: string
          created_by?: string | null
          domestic_rate?: number | null
          foreign_rate?: number | null
          foreign_tax_paid?: number
          id?: string
          inclusion_amount?: number
          notes?: string | null
          org_id?: string
          participation_percentage?: number | null
          period?: string
          profit_attribution_ratio?: number | null
          tax_credit_eligible?: number
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfc_inclusions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfc_inclusions_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          code: string
          id: string
          name: string
          org_id: string
          parent_id: string | null
          type: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          org_id: string
          parent_id?: string | null
          type: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          org_id?: string
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string | null
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          model: string | null
          organization_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model?: string | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model?: string | null
          organization_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chatkit_session_transcripts: {
        Row: {
          chatkit_session_id: string
          created_at: string
          id: string
          metadata: Json
          role: string
          transcript: string
        }
        Insert: {
          chatkit_session_id: string
          created_at?: string
          id?: string
          metadata?: Json
          role: string
          transcript: string
        }
        Update: {
          chatkit_session_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          role?: string
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatkit_session_transcripts_chatkit_session_id_fkey"
            columns: ["chatkit_session_id"]
            isOneToOne: false
            referencedRelation: "chatkit_sessions"
            referencedColumns: ["chatkit_session_id"]
          },
        ]
      }
      chatkit_sessions: {
        Row: {
          agent_session_id: string
          chatkit_session_id: string
          created_at: string
          id: string
          metadata: Json
          status: string
          updated_at: string
        }
        Insert: {
          agent_session_id: string
          chatkit_session_id: string
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          agent_session_id?: string
          chatkit_session_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatkit_sessions_agent_session_id_fkey"
            columns: ["agent_session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string | null
          document_id: string
          embed_model: string | null
          embedding: string | null
          id: string
          last_embedded_at: string | null
          org_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash?: string | null
          document_id: string
          embed_model?: string | null
          embedding?: string | null
          id?: string
          last_embedded_at?: string | null
          org_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string | null
          document_id?: string
          embed_model?: string | null
          embedding?: string | null
          id?: string
          last_embedded_at?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cit_computations: {
        Row: {
          adjustments: Json
          chargeable_income: number
          cit_amount: number
          id: string
          notes: string | null
          org_id: string
          participation_exempt: boolean
          period: string
          pre_tax_profit: number
          prepared_at: string | null
          prepared_by_user_id: string | null
          refund_amount: number
          refund_profile: Database["public"]["Enums"]["cit_refund_profile"]
          status: string
          tax_entity_id: string
          tb_snapshot_id: string | null
          updated_at: string
        }
        Insert: {
          adjustments?: Json
          chargeable_income?: number
          cit_amount?: number
          id?: string
          notes?: string | null
          org_id: string
          participation_exempt?: boolean
          period: string
          pre_tax_profit?: number
          prepared_at?: string | null
          prepared_by_user_id?: string | null
          refund_amount?: number
          refund_profile?: Database["public"]["Enums"]["cit_refund_profile"]
          status?: string
          tax_entity_id: string
          tb_snapshot_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustments?: Json
          chargeable_income?: number
          cit_amount?: number
          id?: string
          notes?: string | null
          org_id?: string
          participation_exempt?: boolean
          period?: string
          pre_tax_profit?: number
          prepared_at?: string | null
          prepared_by_user_id?: string | null
          refund_amount?: number
          refund_profile?: Database["public"]["Enums"]["cit_refund_profile"]
          status?: string
          tax_entity_id?: string
          tb_snapshot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cit_computations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cit_computations_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_canonicalizer: {
        Row: {
          activated_at: string
          id: string
          jurisdiction: string | null
          org_id: string | null
          pattern: string
          policy_version_id: string | null
          replacement: string
        }
        Insert: {
          activated_at?: string
          id?: string
          jurisdiction?: string | null
          org_id?: string | null
          pattern: string
          policy_version_id?: string | null
          replacement: string
        }
        Update: {
          activated_at?: string
          id?: string
          jurisdiction?: string | null
          org_id?: string | null
          pattern?: string
          policy_version_id?: string | null
          replacement?: string
        }
        Relationships: [
          {
            foreignKeyName: "citation_canonicalizer_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citation_canonicalizer_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "agent_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_improvements: {
        Row: {
          applied_at: string | null
          confidence_score: number | null
          created_at: string
          id: number
          learning_event_id: number | null
          original_category: string | null
          original_jurisdiction: string | null
          original_query: string
          original_tags: string[] | null
          reason: string
          similar_queries: Json | null
          status: string
          suggested_category: string | null
          suggested_jurisdiction: string | null
          suggested_tags: string[] | null
          user_feedback_count: number | null
        }
        Insert: {
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: number
          learning_event_id?: number | null
          original_category?: string | null
          original_jurisdiction?: string | null
          original_query: string
          original_tags?: string[] | null
          reason: string
          similar_queries?: Json | null
          status?: string
          suggested_category?: string | null
          suggested_jurisdiction?: string | null
          suggested_tags?: string[] | null
          user_feedback_count?: number | null
        }
        Update: {
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: number
          learning_event_id?: number | null
          original_category?: string | null
          original_jurisdiction?: string | null
          original_query?: string
          original_tags?: string[] | null
          reason?: string
          similar_queries?: Json | null
          status?: string
          suggested_category?: string | null
          suggested_jurisdiction?: string | null
          suggested_tags?: string[] | null
          user_feedback_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classification_improvements_learning_event_id_fkey"
            columns: ["learning_event_id"]
            isOneToOne: false
            referencedRelation: "agent_learning_events"
            referencedColumns: ["id"]
          },
        ]
      }
      client_background_checks: {
        Row: {
          client_id: string
          created_at: string
          created_by_user_id: string | null
          id: string
          notes: string | null
          org_id: string
          risk_rating: Database["public"]["Enums"]["background_risk_rating"]
          screenings: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          risk_rating?: Database["public"]["Enums"]["background_risk_rating"]
          screenings?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          risk_rating?: Database["public"]["Enums"]["background_risk_rating"]
          screenings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "client_background_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_background_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_name: string | null
          country: string | null
          created_at: string | null
          email: string | null
          fiscal_year_end: string | null
          id: string
          industry: string | null
          name: string
          org_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          fiscal_year_end?: string | null
          id?: string
          industry?: string | null
          name: string
          org_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          fiscal_year_end?: string | null
          id?: string
          industry?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      close_pbc_items: {
        Row: {
          area: string
          assignee_user_id: string | null
          created_at: string
          document_id: string | null
          due_at: string | null
          entity_id: string | null
          id: string
          note: string | null
          org_id: string
          period_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          area: string
          assignee_user_id?: string | null
          created_at?: string
          document_id?: string | null
          due_at?: string | null
          entity_id?: string | null
          id?: string
          note?: string | null
          org_id: string
          period_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          assignee_user_id?: string | null
          created_at?: string
          document_id?: string | null
          due_at?: string | null
          entity_id?: string | null
          id?: string
          note?: string | null
          org_id?: string
          period_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_pbc_items_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_pbc_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_pbc_items_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      close_periods: {
        Row: {
          created_at: string
          end_date: string | null
          entity_id: string | null
          id: string
          locked_at: string | null
          locked_by_user_id: string | null
          name: string
          org_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["close_period_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          entity_id?: string | null
          id?: string
          locked_at?: string | null
          locked_by_user_id?: string | null
          name: string
          org_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["close_period_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          entity_id?: string | null
          id?: string
          locked_at?: string | null
          locked_by_user_id?: string | null
          name?: string
          org_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["close_period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_periods_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_periods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_map: {
        Row: {
          account_id: string
          basis: string
          effective_from: string | null
          effective_to: string | null
          entity_id: string | null
          fs_line_id: string
          id: string
          org_id: string
        }
        Insert: {
          account_id: string
          basis?: string
          effective_from?: string | null
          effective_to?: string | null
          entity_id?: string | null
          fs_line_id: string
          id?: string
          org_id: string
        }
        Update: {
          account_id?: string
          basis?: string
          effective_from?: string | null
          effective_to?: string | null
          entity_id?: string | null
          fs_line_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coa_map_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_map_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_map_fs_line_id_fkey"
            columns: ["fs_line_id"]
            isOneToOne: false
            referencedRelation: "fs_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coa_map_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profile_drafts: {
        Row: {
          checklist_id: string | null
          created_at: string
          extracted: Json
          id: string
          org_id: string
          provenance: Json
          updated_at: string
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          extracted?: Json
          id?: string
          org_id: string
          provenance?: Json
          updated_at?: string
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          extracted?: Json
          id?: string
          org_id?: string
          provenance?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_profile_drafts_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profile_drafts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      control_tests: {
        Row: {
          attributes: Json
          control_id: string
          id: string
          org_id: string
          performed_at: string
          performed_by: string | null
          result: Database["public"]["Enums"]["control_test_result"]
          sample_plan_ref: string | null
        }
        Insert: {
          attributes: Json
          control_id: string
          id?: string
          org_id: string
          performed_at?: string
          performed_by?: string | null
          result: Database["public"]["Enums"]["control_test_result"]
          sample_plan_ref?: string | null
        }
        Update: {
          attributes?: Json
          control_id?: string
          id?: string
          org_id?: string
          performed_at?: string
          performed_by?: string | null
          result?: Database["public"]["Enums"]["control_test_result"]
          sample_plan_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_tests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      control_walkthroughs: {
        Row: {
          control_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          org_id: string
          result: Database["public"]["Enums"]["control_walkthrough_result"]
          walkthrough_date: string
        }
        Insert: {
          control_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          org_id: string
          result: Database["public"]["Enums"]["control_walkthrough_result"]
          walkthrough_date: string
        }
        Update: {
          control_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          result?: Database["public"]["Enums"]["control_walkthrough_result"]
          walkthrough_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_walkthroughs_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_walkthroughs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      controls: {
        Row: {
          created_at: string
          cycle: string
          description: string
          engagement_id: string
          frequency: Database["public"]["Enums"]["control_frequency"]
          id: string
          key: boolean
          objective: string
          org_id: string
          owner: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle: string
          description: string
          engagement_id: string
          frequency?: Database["public"]["Enums"]["control_frequency"]
          id?: string
          key?: boolean
          objective: string
          org_id: string
          owner?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle?: string
          description?: string
          engagement_id?: string
          frequency?: Database["public"]["Enums"]["control_frequency"]
          id?: string
          key?: boolean
          objective?: string
          org_id?: string
          owner?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conv_messages_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      curated_knowledge_base: {
        Row: {
          auto_classified: boolean | null
          citation_count: number | null
          classification_confidence: number | null
          classification_source: string | null
          created_at: string | null
          created_by: string | null
          domain: string | null
          effective_date: string | null
          embed_model: string | null
          embedding: string | null
          expiry_date: string | null
          full_text: string
          id: string
          is_active: boolean | null
          is_outdated: boolean | null
          jurisdiction: string[] | null
          last_cited_at: string | null
          metadata: Json | null
          organization_id: string | null
          quality_score: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          section_key: string | null
          slug: string
          source_document_id: string | null
          source_priority: Database["public"]["Enums"]["knowledge_source_priority"]
          source_url: string | null
          standard_type: Database["public"]["Enums"]["knowledge_standard_type"]
          summary: string | null
          superseded_by: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          verification_level: Database["public"]["Enums"]["knowledge_verification_level"]
          version: string | null
        }
        Insert: {
          auto_classified?: boolean | null
          citation_count?: number | null
          classification_confidence?: number | null
          classification_source?: string | null
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          effective_date?: string | null
          embed_model?: string | null
          embedding?: string | null
          expiry_date?: string | null
          full_text: string
          id?: string
          is_active?: boolean | null
          is_outdated?: boolean | null
          jurisdiction?: string[] | null
          last_cited_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          quality_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_key?: string | null
          slug: string
          source_document_id?: string | null
          source_priority?: Database["public"]["Enums"]["knowledge_source_priority"]
          source_url?: string | null
          standard_type: Database["public"]["Enums"]["knowledge_standard_type"]
          summary?: string | null
          superseded_by?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          verification_level?: Database["public"]["Enums"]["knowledge_verification_level"]
          version?: string | null
        }
        Update: {
          auto_classified?: boolean | null
          citation_count?: number | null
          classification_confidence?: number | null
          classification_source?: string | null
          created_at?: string | null
          created_by?: string | null
          domain?: string | null
          effective_date?: string | null
          embed_model?: string | null
          embedding?: string | null
          expiry_date?: string | null
          full_text?: string
          id?: string
          is_active?: boolean | null
          is_outdated?: boolean | null
          jurisdiction?: string[] | null
          last_cited_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          quality_score?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_key?: string | null
          slug?: string
          source_document_id?: string | null
          source_priority?: Database["public"]["Enums"]["knowledge_source_priority"]
          source_url?: string | null
          standard_type?: Database["public"]["Enums"]["knowledge_standard_type"]
          summary?: string | null
          superseded_by?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          verification_level?: Database["public"]["Enums"]["knowledge_verification_level"]
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_knowledge_base_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_knowledge_base_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_knowledge_base_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "curated_knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      dac6_arrangements: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          disclosure_due_date: string | null
          first_step_date: string | null
          id: string
          org_id: string
          reference: string
          status: Database["public"]["Enums"]["dac6_submission_status"]
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          disclosure_due_date?: string | null
          first_step_date?: string | null
          id?: string
          org_id: string
          reference: string
          status?: Database["public"]["Enums"]["dac6_submission_status"]
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          disclosure_due_date?: string | null
          first_step_date?: string | null
          id?: string
          org_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["dac6_submission_status"]
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dac6_arrangements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dac6_arrangements_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      dac6_filings: {
        Row: {
          arrangement_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payload: Json
          submission_reference: string | null
          submitted_at: string | null
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          submission_reference?: string | null
          submitted_at?: string | null
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          submission_reference?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dac6_filings_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "dac6_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      dac6_hallmarks: {
        Row: {
          arrangement_id: string
          category: Database["public"]["Enums"]["dac6_hallmark_category"]
          code: string
          created_at: string
          description: string | null
          id: string
          main_benefit_test: boolean | null
          metadata: Json
        }
        Insert: {
          arrangement_id: string
          category: Database["public"]["Enums"]["dac6_hallmark_category"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          main_benefit_test?: boolean | null
          metadata?: Json
        }
        Update: {
          arrangement_id?: string
          category?: Database["public"]["Enums"]["dac6_hallmark_category"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          main_benefit_test?: boolean | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dac6_hallmarks_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "dac6_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      dac6_participants: {
        Row: {
          arrangement_id: string
          created_at: string
          id: string
          jurisdiction: string | null
          metadata: Json
          name: string
          role: string
          tin: string | null
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          id?: string
          jurisdiction?: string | null
          metadata?: Json
          name: string
          role: string
          tin?: string | null
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          id?: string
          jurisdiction?: string | null
          metadata?: Json
          name?: string
          role?: string
          tin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dac6_participants_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "dac6_arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_examples: {
        Row: {
          added_at: string | null
          dataset_id: string
          example_id: string
          id: string
          split: string | null
          weight: number | null
        }
        Insert: {
          added_at?: string | null
          dataset_id: string
          example_id: string
          id?: string
          split?: string | null
          weight?: number | null
        }
        Update: {
          added_at?: string | null
          dataset_id?: string
          example_id?: string
          id?: string
          split?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dataset_examples_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataset_examples_example_id_fkey"
            columns: ["example_id"]
            isOneToOne: false
            referencedRelation: "learning_examples"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_search_sources: {
        Row: {
          api_endpoint: string | null
          auth_config: Json | null
          auto_classified: boolean | null
          base_url: string | null
          classification_confidence: number | null
          classification_source: string | null
          created_at: string | null
          description: string | null
          domains: string[] | null
          id: string
          is_active: boolean | null
          jurisdictions: string[] | null
          last_synced_at: string | null
          name: string
          next_sync_at: string | null
          requires_auth: boolean | null
          source_priority: Database["public"]["Enums"]["knowledge_source_priority"]
          source_type: string
          sync_enabled: boolean | null
          sync_frequency_hours: number | null
          trust_score: number | null
          updated_at: string | null
          verification_level: Database["public"]["Enums"]["knowledge_verification_level"]
        }
        Insert: {
          api_endpoint?: string | null
          auth_config?: Json | null
          auto_classified?: boolean | null
          base_url?: string | null
          classification_confidence?: number | null
          classification_source?: string | null
          created_at?: string | null
          description?: string | null
          domains?: string[] | null
          id?: string
          is_active?: boolean | null
          jurisdictions?: string[] | null
          last_synced_at?: string | null
          name: string
          next_sync_at?: string | null
          requires_auth?: boolean | null
          source_priority: Database["public"]["Enums"]["knowledge_source_priority"]
          source_type: string
          sync_enabled?: boolean | null
          sync_frequency_hours?: number | null
          trust_score?: number | null
          updated_at?: string | null
          verification_level: Database["public"]["Enums"]["knowledge_verification_level"]
        }
        Update: {
          api_endpoint?: string | null
          auth_config?: Json | null
          auto_classified?: boolean | null
          base_url?: string | null
          classification_confidence?: number | null
          classification_source?: string | null
          created_at?: string | null
          description?: string | null
          domains?: string[] | null
          id?: string
          is_active?: boolean | null
          jurisdictions?: string[] | null
          last_synced_at?: string | null
          name?: string
          next_sync_at?: string | null
          requires_auth?: boolean | null
          source_priority?: Database["public"]["Enums"]["knowledge_source_priority"]
          source_type?: string
          sync_enabled?: boolean | null
          sync_frequency_hours?: number | null
          trust_score?: number | null
          updated_at?: string | null
          verification_level?: Database["public"]["Enums"]["knowledge_verification_level"]
        }
        Relationships: []
      }
      deficiencies: {
        Row: {
          control_id: string | null
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          recommendation: string
          severity: Database["public"]["Enums"]["deficiency_severity"]
          status: Database["public"]["Enums"]["deficiency_status"]
          updated_at: string
        }
        Insert: {
          control_id?: string | null
          created_at?: string
          engagement_id: string
          id?: string
          org_id: string
          recommendation: string
          severity: Database["public"]["Enums"]["deficiency_severity"]
          status?: Database["public"]["Enums"]["deficiency_status"]
          updated_at?: string
        }
        Update: {
          control_id?: string | null
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          recommendation?: string
          severity?: Database["public"]["Enums"]["deficiency_severity"]
          status?: Database["public"]["Enums"]["deficiency_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deficiencies_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencies_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      denylist_deboost: {
        Row: {
          action: Database["public"]["Enums"]["denylist_action"]
          activated_at: string
          id: string
          juris_code: string | null
          org_id: string | null
          pattern: string
          policy_version_id: string | null
          reason: string | null
          weight: number | null
        }
        Insert: {
          action?: Database["public"]["Enums"]["denylist_action"]
          activated_at?: string
          id?: string
          juris_code?: string | null
          org_id?: string | null
          pattern: string
          policy_version_id?: string | null
          reason?: string | null
          weight?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["denylist_action"]
          activated_at?: string
          id?: string
          juris_code?: string | null
          org_id?: string | null
          pattern?: string
          policy_version_id?: string | null
          reason?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "denylist_deboost_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "denylist_deboost_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "agent_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string
          extractor_name: string
          extractor_version: string
          fields: Json
          id: string
          provenance: Json
          status: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id: string
          extractor_name: string
          extractor_version?: string
          fields?: Json
          id?: string
          provenance?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string
          extractor_name?: string
          extractor_version?: string
          fields?: Json
          id?: string
          provenance?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_index: {
        Row: {
          created_at: string
          document_id: string
          extracted_meta: Json | null
          id: string
          tokens: unknown
        }
        Insert: {
          created_at?: string
          document_id: string
          extracted_meta?: Json | null
          id?: string
          tokens?: unknown
        }
        Update: {
          created_at?: string
          document_id?: string
          extracted_meta?: Json | null
          id?: string
          tokens?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "document_index_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          checksum: string | null
          classification: string
          content: string
          created_at: string
          deleted: boolean
          embedding: string | null
          entity_id: string | null
          file_size: number | null
          filename: string
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          ocr_status: string
          org_id: string | null
          organization_id: string | null
          parse_status: string
          repo_folder: string
          source: string
          storage_path: string
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          classification?: string
          content: string
          created_at?: string
          deleted?: boolean
          embedding?: string | null
          entity_id?: string | null
          file_size?: number | null
          filename: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          ocr_status?: string
          org_id?: string | null
          organization_id?: string | null
          parse_status?: string
          repo_folder?: string
          source?: string
          storage_path: string
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          classification?: string
          content?: string
          created_at?: string
          deleted?: boolean
          embedding?: string | null
          entity_id?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          ocr_status?: string
          org_id?: string | null
          organization_id?: string | null
          parse_status?: string
          repo_folder?: string
          source?: string
          storage_path?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          budget: number | null
          client_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          eqr_required: boolean | null
          frf: string | null
          id: string
          independence_checked: boolean | null
          independence_conclusion: string | null
          independence_conclusion_note: string | null
          is_audit_client: boolean | null
          materiality_set_id: string | null
          non_audit_services: Json | null
          org_id: string
          requires_eqr: boolean | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          eqr_required?: boolean | null
          frf?: string | null
          id?: string
          independence_checked?: boolean | null
          independence_conclusion?: string | null
          independence_conclusion_note?: string | null
          is_audit_client?: boolean | null
          materiality_set_id?: string | null
          non_audit_services?: Json | null
          org_id: string
          requires_eqr?: boolean | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          eqr_required?: boolean | null
          frf?: string | null
          id?: string
          independence_checked?: boolean | null
          independence_conclusion?: string | null
          independence_conclusion_note?: string | null
          is_audit_client?: boolean | null
          materiality_set_id?: string | null
          non_audit_services?: Json | null
          org_id?: string
          requires_eqr?: boolean | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          country: string | null
          created_at: string
          display_name: string
          entity_type: string
          id: string
          metadata: Json
          org_id: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name: string
          entity_type?: string
          id?: string
          metadata?: Json
          org_id: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string
          entity_type?: string
          id?: string
          metadata?: Json
          org_id?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      errors: {
        Row: {
          created_at: string
          id: string
          message: string | null
          org_id: string
          stack: string | null
          workflow: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          org_id: string
          stack?: string | null
          workflow?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          org_id?: string
          stack?: string | null
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "errors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_register: {
        Row: {
          basis: string | null
          caption: string
          created_at: string
          created_by_user_id: string
          description: string | null
          engagement_id: string
          id: string
          management_assessment: string | null
          org_id: string
          uncertainty_level: Database["public"]["Enums"]["estimate_uncertainty_level"]
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          basis?: string | null
          caption: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          engagement_id: string
          id?: string
          management_assessment?: string | null
          org_id: string
          uncertainty_level?: Database["public"]["Enums"]["estimate_uncertainty_level"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          basis?: string | null
          caption?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          engagement_id?: string
          id?: string
          management_assessment?: string | null
          org_id?: string
          uncertainty_level?: Database["public"]["Enums"]["estimate_uncertainty_level"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_register_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_register_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_annotations: {
        Row: {
          annotation_data: Json
          annotation_type: string
          clarity: number | null
          completeness: number | null
          created_at: string | null
          expert_id: string
          id: string
          improvement_suggestions: string | null
          is_verified: boolean | null
          learning_example_id: string
          notes: string | null
          professional_quality: number | null
          technical_accuracy: number | null
          verified_by: string | null
        }
        Insert: {
          annotation_data?: Json
          annotation_type: string
          clarity?: number | null
          completeness?: number | null
          created_at?: string | null
          expert_id: string
          id?: string
          improvement_suggestions?: string | null
          is_verified?: boolean | null
          learning_example_id: string
          notes?: string | null
          professional_quality?: number | null
          technical_accuracy?: number | null
          verified_by?: string | null
        }
        Update: {
          annotation_data?: Json
          annotation_type?: string
          clarity?: number | null
          completeness?: number | null
          created_at?: string | null
          expert_id?: string
          id?: string
          improvement_suggestions?: string | null
          is_verified?: boolean | null
          learning_example_id?: string
          notes?: string | null
          professional_quality?: number | null
          technical_accuracy?: number | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_annotations_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_annotations_learning_example_id_fkey"
            columns: ["learning_example_id"]
            isOneToOne: false
            referencedRelation: "learning_examples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_annotations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_loop_metrics: {
        Row: {
          avg_rating_improvement: number | null
          avg_similarity_improvement: number | null
          classifications_improved: number | null
          cost_reduction_pct: number | null
          date: string
          events_by_type: Json | null
          id: number
          knowledge_sources_added: number | null
          rag_optimizations_applied: number | null
          total_learning_events: number | null
          training_examples_added: number | null
        }
        Insert: {
          avg_rating_improvement?: number | null
          avg_similarity_improvement?: number | null
          classifications_improved?: number | null
          cost_reduction_pct?: number | null
          date: string
          events_by_type?: Json | null
          id?: number
          knowledge_sources_added?: number | null
          rag_optimizations_applied?: number | null
          total_learning_events?: number | null
          training_examples_added?: number | null
        }
        Update: {
          avg_rating_improvement?: number | null
          avg_similarity_improvement?: number | null
          classifications_improved?: number | null
          cost_reduction_pct?: number | null
          date?: string
          events_by_type?: Json | null
          id?: number
          knowledge_sources_added?: number | null
          rag_optimizations_applied?: number | null
          total_learning_events?: number | null
          training_examples_added?: number | null
        }
        Relationships: []
      }
      fiscal_unity_computations: {
        Row: {
          adjustment_amount: number
          closing_tax_account: number
          consolidated_cit: number
          created_at: string
          created_by: string | null
          id: string
          members: Json
          net_tax_payable: number
          notes: string | null
          org_id: string
          parent_tax_entity_id: string
          period: string
          tax_rate: number
          total_adjustments: number
          total_chargeable_income: number
          total_tax_credits: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adjustment_amount: number
          closing_tax_account: number
          consolidated_cit: number
          created_at?: string
          created_by?: string | null
          id?: string
          members: Json
          net_tax_payable: number
          notes?: string | null
          org_id: string
          parent_tax_entity_id: string
          period: string
          tax_rate: number
          total_adjustments: number
          total_chargeable_income: number
          total_tax_credits: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adjustment_amount?: number
          closing_tax_account?: number
          consolidated_cit?: number
          created_at?: string
          created_by?: string | null
          id?: string
          members?: Json
          net_tax_payable?: number
          notes?: string | null
          org_id?: string
          parent_tax_entity_id?: string
          period?: string
          tax_rate?: number
          total_adjustments?: number
          total_chargeable_income?: number
          total_tax_credits?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_unity_computations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_unity_computations_parent_tax_entity_id_fkey"
            columns: ["parent_tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_plan_actions: {
        Row: {
          action: string
          created_at: string
          created_by_user_id: string | null
          engagement_id: string
          fraud_plan_id: string
          id: string
          metadata: Json
          notes: string | null
          org_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by_user_id?: string | null
          engagement_id: string
          fraud_plan_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          org_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by_user_id?: string | null
          engagement_id?: string
          fraud_plan_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_plan_actions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_plan_actions_fraud_plan_id_fkey"
            columns: ["fraud_plan_id"]
            isOneToOne: false
            referencedRelation: "fraud_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_plan_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_plans: {
        Row: {
          analytics_strategy: Json
          brainstorming_notes: string | null
          created_at: string
          created_by_user_id: string | null
          engagement_id: string
          fraud_responses: Json
          id: string
          inherent_fraud_risks: Json
          locked_at: string | null
          org_id: string
          override_assessment: Json
          status: Database["public"]["Enums"]["fraud_plan_status"]
          submitted_at: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          analytics_strategy?: Json
          brainstorming_notes?: string | null
          created_at?: string
          created_by_user_id?: string | null
          engagement_id: string
          fraud_responses?: Json
          id?: string
          inherent_fraud_risks?: Json
          locked_at?: string | null
          org_id: string
          override_assessment?: Json
          status?: Database["public"]["Enums"]["fraud_plan_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          analytics_strategy?: Json
          brainstorming_notes?: string | null
          created_at?: string
          created_by_user_id?: string | null
          engagement_id?: string
          fraud_responses?: Json
          id?: string
          inherent_fraud_risks?: Json
          locked_at?: string | null
          org_id?: string
          override_assessment?: Json
          status?: Database["public"]["Enums"]["fraud_plan_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_plans_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_plans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fs_lines: {
        Row: {
          basis: string
          code: string
          created_at: string
          id: string
          label: string
          ordering: number
          org_id: string
          parent_id: string | null
          statement: string
        }
        Insert: {
          basis?: string
          code: string
          created_at?: string
          id?: string
          label: string
          ordering: number
          org_id: string
          parent_id?: string | null
          statement: string
        }
        Update: {
          basis?: string
          code?: string
          created_at?: string
          id?: string
          label?: string
          ordering?: number
          org_id?: string
          parent_id?: string | null
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "fs_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fs_lines_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "fs_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_change_queue: {
        Row: {
          change_type: string
          connector_id: string
          created_at: string
          error: string | null
          file_id: string
          file_name: string | null
          id: string
          mime_type: string | null
          org_id: string
          processed_at: string | null
          raw_payload: Json | null
        }
        Insert: {
          change_type: string
          connector_id: string
          created_at?: string
          error?: string | null
          file_id: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          org_id: string
          processed_at?: string | null
          raw_payload?: Json | null
        }
        Update: {
          change_type?: string
          connector_id?: string
          created_at?: string
          error?: string | null
          file_id?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          org_id?: string
          processed_at?: string | null
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_change_queue_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "gdrive_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdrive_change_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_connectors: {
        Row: {
          created_at: string
          cursor_page_token: string | null
          folder_id: string
          id: string
          knowledge_source_id: string | null
          last_backfill_at: string | null
          last_error: string | null
          last_sync_at: string | null
          org_id: string
          service_account_email: string
          shared_drive_id: string | null
          start_page_token: string | null
          updated_at: string
          watch_channel_id: string | null
          watch_expires_at: string | null
          watch_resource_id: string | null
        }
        Insert: {
          created_at?: string
          cursor_page_token?: string | null
          folder_id: string
          id?: string
          knowledge_source_id?: string | null
          last_backfill_at?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          org_id: string
          service_account_email: string
          shared_drive_id?: string | null
          start_page_token?: string | null
          updated_at?: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
        }
        Update: {
          created_at?: string
          cursor_page_token?: string | null
          folder_id?: string
          id?: string
          knowledge_source_id?: string | null
          last_backfill_at?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          org_id?: string
          service_account_email?: string
          shared_drive_id?: string | null
          start_page_token?: string | null
          updated_at?: string
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_connectors_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdrive_connectors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_documents: {
        Row: {
          checksum: string | null
          connector_id: string
          created_at: string | null
          document_id: string
          file_id: string
          last_synced_at: string | null
          metadata: Json | null
          mime_type: string | null
          org_id: string
          size_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          checksum?: string | null
          connector_id: string
          created_at?: string | null
          document_id: string
          file_id: string
          last_synced_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          org_id: string
          size_bytes?: number | null
          updated_at?: string | null
        }
        Update: {
          checksum?: string | null
          connector_id?: string
          created_at?: string | null
          document_id?: string
          file_id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          org_id?: string
          size_bytes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_documents_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "gdrive_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdrive_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gdrive_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gdrive_file_metadata: {
        Row: {
          allowlisted_domain: boolean | null
          created_at: string | null
          file_id: string
          metadata: Json
          org_id: string
          updated_at: string | null
        }
        Insert: {
          allowlisted_domain?: boolean | null
          created_at?: string | null
          file_id: string
          metadata: Json
          org_id: string
          updated_at?: string | null
        }
        Update: {
          allowlisted_domain?: boolean | null
          created_at?: string | null
          file_id?: string
          metadata?: Json
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gdrive_file_metadata_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      going_concern_worksheets: {
        Row: {
          assessment: Database["public"]["Enums"]["going_concern_assessment"]
          conclusion: string | null
          created_at: string
          created_by_user_id: string
          engagement_id: string
          id: string
          indicators: Json
          mitigation_actions: string | null
          org_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          assessment?: Database["public"]["Enums"]["going_concern_assessment"]
          conclusion?: string | null
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          id?: string
          indicators?: Json
          mitigation_actions?: string | null
          org_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          assessment?: Database["public"]["Enums"]["going_concern_assessment"]
          conclusion?: string | null
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          id?: string
          indicators?: Json
          mitigation_actions?: string | null
          org_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "going_concern_worksheets_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "going_concern_worksheets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          org_id: string
          request_id: string | null
          resource: string
          response: Json
          status_code: number
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          org_id: string
          request_id?: string | null
          resource: string
          response: Json
          status_code: number
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          org_id?: string
          request_id?: string | null
          resource?: string
          response?: Json
          status_code?: number
        }
        Relationships: []
      }
      independence_assessments: {
        Row: {
          client_id: string
          conclusion: Database["public"]["Enums"]["independence_conclusion"]
          id: string
          org_id: string
          prepared_at: string
          prepared_by_user_id: string | null
          safeguards: Json
          threats: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          conclusion?: Database["public"]["Enums"]["independence_conclusion"]
          id?: string
          org_id: string
          prepared_at?: string
          prepared_by_user_id?: string | null
          safeguards?: Json
          threats?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          conclusion?: Database["public"]["Enums"]["independence_conclusion"]
          id?: string
          org_id?: string
          prepared_at?: string
          prepared_by_user_id?: string | null
          safeguards?: Json
          threats?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "independence_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "independence_assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      independence_checks: {
        Row: {
          client_id: string
          conclusion: string | null
          created_at: string
          id: string
          org_id: string
          safeguards: Json
          threats: Json
        }
        Insert: {
          client_id: string
          conclusion?: string | null
          created_at?: string
          id?: string
          org_id: string
          safeguards?: Json
          threats?: Json
        }
        Update: {
          client_id?: string
          conclusion?: string | null
          created_at?: string
          id?: string
          org_id?: string
          safeguards?: Json
          threats?: Json
        }
        Relationships: [
          {
            foreignKeyName: "independence_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          org_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          org_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_files: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          metadata: Json | null
          page_count: number | null
          status: string
          uri: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          page_count?: number | null
          status?: string
          uri: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          page_count?: number | null
          status?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          source_id: string | null
          started_at: string | null
          stats: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          source_id?: string | null
          started_at?: string | null
          stats?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          source_id?: string | null
          started_at?: string | null
          stats?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      interest_limitation_computations: {
        Row: {
          adjustment_amount: number
          allowed_interest: number
          carryforward_capacity: number | null
          carryforward_interest: number | null
          created_at: string
          created_by: string | null
          disallowed_carryforward: number | null
          disallowed_interest: number
          exceeding_borrowing_costs: number
          id: string
          notes: string | null
          org_id: string
          period: string
          safe_harbour_amount: number | null
          standalone_allowance: number | null
          tax_ebitda: number
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
          updated_carryforward_capacity: number
          updated_carryforward_interest: number
        }
        Insert: {
          adjustment_amount: number
          allowed_interest: number
          carryforward_capacity?: number | null
          carryforward_interest?: number | null
          created_at?: string
          created_by?: string | null
          disallowed_carryforward?: number | null
          disallowed_interest: number
          exceeding_borrowing_costs: number
          id?: string
          notes?: string | null
          org_id: string
          period: string
          safe_harbour_amount?: number | null
          standalone_allowance?: number | null
          tax_ebitda: number
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
          updated_carryforward_capacity: number
          updated_carryforward_interest: number
        }
        Update: {
          adjustment_amount?: number
          allowed_interest?: number
          carryforward_capacity?: number | null
          carryforward_interest?: number | null
          created_at?: string
          created_by?: string | null
          disallowed_carryforward?: number | null
          disallowed_interest?: number
          exceeding_borrowing_costs?: number
          id?: string
          notes?: string | null
          org_id?: string
          period?: string
          safe_harbour_amount?: number | null
          standalone_allowance?: number | null
          tax_ebitda?: number
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
          updated_carryforward_capacity?: number
          updated_carryforward_interest?: number
        }
        Relationships: [
          {
            foreignKeyName: "interest_limitation_computations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interest_limitation_computations_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      itgc_groups: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          notes: string | null
          org_id: string
          scope: string
          type: Database["public"]["Enums"]["itgc_group_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          notes?: string | null
          org_id: string
          scope: string
          type: Database["public"]["Enums"]["itgc_group_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          scope?: string
          type?: Database["public"]["Enums"]["itgc_group_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itgc_groups_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itgc_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      je_control_alerts: {
        Row: {
          batch_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          id: string
          org_id: string
          period_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by_user_id: string | null
          rule: Database["public"]["Enums"]["je_control_rule"]
          severity: Database["public"]["Enums"]["je_control_severity"]
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: string
          org_id: string
          period_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          rule: Database["public"]["Enums"]["je_control_rule"]
          severity: Database["public"]["Enums"]["je_control_severity"]
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: string
          org_id?: string
          period_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          rule?: Database["public"]["Enums"]["je_control_rule"]
          severity?: Database["public"]["Enums"]["je_control_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "je_control_alerts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "journal_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_control_alerts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_control_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "je_control_alerts_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      job_schedules: {
        Row: {
          active: boolean
          created_at: string
          cron_expression: string
          id: string
          kind: string
          metadata: Json
          org_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cron_expression: string
          id?: string
          kind: string
          metadata?: Json
          org_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cron_expression?: string
          id?: string
          kind?: string
          metadata?: Json
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          finished_at: string | null
          id: string
          kind: string
          org_id: string
          payload: Json
          scheduled_at: string
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          kind: string
          org_id: string
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          finished_at?: string | null
          id?: string
          kind?: string
          org_id?: string
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_batches: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          note: string | null
          org_id: string
          period_id: string | null
          posted_at: string | null
          prepared_by_user_id: string | null
          reference: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          note?: string | null
          org_id: string
          period_id?: string | null
          posted_at?: string | null
          prepared_by_user_id?: string | null
          reference?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          note?: string | null
          org_id?: string
          period_id?: string | null
          posted_at?: string | null
          prepared_by_user_id?: string | null
          reference?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_batches_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          org_id: string
          posted_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          org_id: string
          posted_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          org_id?: string
          posted_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_strategies: {
        Row: {
          analytics_link: Json
          created_at: string
          created_by_user_id: string | null
          engagement_id: string
          filters: Json
          id: string
          org_id: string
          owner_user_id: string | null
          schedule: Json
          scope: Json
          thresholds: Json
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          analytics_link?: Json
          created_at?: string
          created_by_user_id?: string | null
          engagement_id: string
          filters?: Json
          id?: string
          org_id: string
          owner_user_id?: string | null
          schedule?: Json
          scope?: Json
          thresholds?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          analytics_link?: Json
          created_at?: string
          created_by_user_id?: string | null
          engagement_id?: string
          filters?: Json
          id?: string
          org_id?: string
          owner_user_id?: string | null
          schedule?: Json
          scope?: Json
          thresholds?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_strategies_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_strategies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          credit: number
          debit: number
          entry_id: string
          id: string
          memo: string | null
          org_id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          memo?: string | null
          org_id: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          memo?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdictions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      kam_candidates: {
        Row: {
          created_at: string
          created_by_user_id: string
          engagement_id: string
          estimate_id: string | null
          going_concern_id: string | null
          id: string
          org_id: string
          rationale: string | null
          risk_id: string | null
          source: Database["public"]["Enums"]["kam_candidate_source"]
          status: Database["public"]["Enums"]["kam_candidate_status"]
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          estimate_id?: string | null
          going_concern_id?: string | null
          id?: string
          org_id: string
          rationale?: string | null
          risk_id?: string | null
          source?: Database["public"]["Enums"]["kam_candidate_source"]
          status?: Database["public"]["Enums"]["kam_candidate_status"]
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          estimate_id?: string | null
          going_concern_id?: string | null
          id?: string
          org_id?: string
          rationale?: string | null
          risk_id?: string | null
          source?: Database["public"]["Enums"]["kam_candidate_source"]
          status?: Database["public"]["Enums"]["kam_candidate_status"]
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kam_candidates_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kam_candidates_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimate_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kam_candidates_going_concern_id_fkey"
            columns: ["going_concern_id"]
            isOneToOne: false
            referencedRelation: "going_concern_worksheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kam_candidates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kam_candidates_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      kam_drafts: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          candidate_id: string
          created_at: string
          created_by_user_id: string
          engagement_id: string
          eqr_approved_at: string | null
          eqr_approved_by_user_id: string | null
          evidence_refs: Json
          heading: string
          how_addressed: string | null
          id: string
          org_id: string
          procedures_refs: Json
          results_summary: string | null
          status: Database["public"]["Enums"]["kam_draft_status"]
          submitted_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          why_kam: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          candidate_id: string
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
          evidence_refs?: Json
          heading: string
          how_addressed?: string | null
          id?: string
          org_id: string
          procedures_refs?: Json
          results_summary?: string | null
          status?: Database["public"]["Enums"]["kam_draft_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          why_kam?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          candidate_id?: string
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
          evidence_refs?: Json
          heading?: string
          how_addressed?: string | null
          id?: string
          org_id?: string
          procedures_refs?: Json
          results_summary?: string | null
          status?: Database["public"]["Enums"]["kam_draft_status"]
          submitted_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          why_kam?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kam_drafts_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "kam_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kam_drafts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kam_drafts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kams: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          rationale: string | null
          ref_links: Json | null
          title: string | null
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          org_id: string
          rationale?: string | null
          ref_links?: Json | null
          title?: string | null
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          rationale?: string | null
          ref_links?: Json | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kams_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          category: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          jurisdiction: string | null
          metadata: Json | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          jurisdiction?: string | null
          metadata?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          jurisdiction?: string | null
          metadata?: Json | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          content_hash: string
          created_at: string | null
          document_id: string
          embed_model: string
          embedding: string | null
          end_offset: number | null
          id: string
          index_name: string | null
          knowledge_source_id: string
          metadata: Json | null
          organization_id: string
          start_offset: number | null
          tags: string[] | null
        }
        Insert: {
          chunk_index: number
          content: string
          content_hash: string
          created_at?: string | null
          document_id: string
          embed_model: string
          embedding?: string | null
          end_offset?: number | null
          id?: string
          index_name?: string | null
          knowledge_source_id: string
          metadata?: Json | null
          organization_id: string
          start_offset?: number | null
          tags?: string[] | null
        }
        Update: {
          chunk_index?: number
          content?: string
          content_hash?: string
          created_at?: string | null
          document_id?: string
          embed_model?: string
          embedding?: string | null
          end_offset?: number | null
          id?: string
          index_name?: string | null
          knowledge_source_id?: string
          metadata?: Json | null
          organization_id?: string
          start_offset?: number | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_corpora: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          is_default: boolean | null
          jurisdiction: string[] | null
          name: string
          org_id: string
          retention: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          is_default?: boolean | null
          jurisdiction?: string[] | null
          name: string
          org_id: string
          retention?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          is_default?: boolean | null
          jurisdiction?: string[] | null
          name?: string
          org_id?: string
          retention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_corpora_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          chunk_count: number | null
          content_hash: string | null
          content_type: string | null
          created_at: string | null
          external_id: string | null
          file_path: string | null
          file_size: number | null
          id: string
          knowledge_source_id: string
          metadata: Json | null
          name: string
          organization_id: string
          processed_at: string | null
          processing_error: string | null
          repo_folder: string | null
          status: string | null
          token_count: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          chunk_count?: number | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string | null
          external_id?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          knowledge_source_id: string
          metadata?: Json | null
          name: string
          organization_id: string
          processed_at?: string | null
          processing_error?: string | null
          repo_folder?: string | null
          status?: string | null
          token_count?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          chunk_count?: number | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string | null
          external_id?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          knowledge_source_id?: string
          metadata?: Json | null
          name?: string
          organization_id?: string
          processed_at?: string | null
          processing_error?: string | null
          repo_folder?: string | null
          status?: string | null
          token_count?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_id: string
          embedding: string
          id: number
        }
        Insert: {
          chunk_id: string
          embedding: string
          id?: number
        }
        Update: {
          chunk_id?: string
          embedding?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: true
            referencedRelation: "knowledge_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_events: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          payload: Json
          run_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          payload: Json
          run_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          payload?: Json
          run_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "learning_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_search_analytics: {
        Row: {
          agent_id: string | null
          created_at: string | null
          fallback_used: boolean | null
          id: string
          knowledge_sources: string[] | null
          latency_ms: number | null
          organization_id: string
          query_embedding: string | null
          query_text: string
          rerank_used: boolean | null
          result_clicked: string | null
          results: Json | null
          results_count: number | null
          retrieval_strategy: string | null
          session_id: string | null
          top_k: number | null
          user_feedback: string | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          fallback_used?: boolean | null
          id?: string
          knowledge_sources?: string[] | null
          latency_ms?: number | null
          organization_id: string
          query_embedding?: string | null
          query_text: string
          rerank_used?: boolean | null
          result_clicked?: string | null
          results?: Json | null
          results_count?: number | null
          retrieval_strategy?: string | null
          session_id?: string | null
          top_k?: number | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          fallback_used?: boolean | null
          id?: string
          knowledge_sources?: string[] | null
          latency_ms?: number | null
          organization_id?: string
          query_embedding?: string | null
          query_text?: string
          rerank_used?: boolean | null
          result_clicked?: string | null
          results?: Json | null
          results_count?: number | null
          retrieval_strategy?: string | null
          session_id?: string | null
          top_k?: number | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      knowledge_source_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string
          gap_analysis: Json | null
          id: number
          knowledge_source_id: string | null
          learning_event_id: number | null
          query_patterns: string[] | null
          reason: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_category: string
          suggested_jurisdiction: string | null
          suggested_tags: string[] | null
          suggested_url: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          gap_analysis?: Json | null
          id?: number
          knowledge_source_id?: string | null
          learning_event_id?: number | null
          query_patterns?: string[] | null
          reason: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_category: string
          suggested_jurisdiction?: string | null
          suggested_tags?: string[] | null
          suggested_url: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          gap_analysis?: Json | null
          id?: number
          knowledge_source_id?: string | null
          learning_event_id?: number | null
          query_patterns?: string[] | null
          reason?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_category?: string
          suggested_jurisdiction?: string | null
          suggested_tags?: string[] | null
          suggested_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_source_suggestions_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_web_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_source_suggestions_learning_event_id_fkey"
            columns: ["learning_event_id"]
            isOneToOne: false
            referencedRelation: "agent_learning_events"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_source_templates: {
        Row: {
          category: string | null
          created_at: string | null
          default_config: Json
          description: string | null
          icon: string | null
          id: string
          is_public: boolean | null
          name: string
          schema: Json | null
          source_type: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_config: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          schema?: Json | null
          source_type: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_config?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          schema?: Json | null
          source_type?: string
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          auto_sync: boolean | null
          chunk_count: number | null
          chunk_overlap: number | null
          chunk_size: number | null
          chunking_strategy: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_count: number | null
          embedding_model: string | null
          id: string
          index_name: string | null
          last_synced_at: string | null
          metadata: Json | null
          name: string
          next_sync_at: string | null
          organization_id: string
          slug: string
          source_config: Json
          source_type: string
          status: string | null
          sync_error: string | null
          sync_frequency: string | null
          sync_schedule: Json | null
          tags: string[] | null
          total_size_bytes: number | null
          total_tokens: number | null
          updated_at: string | null
          vector_store_id: string | null
        }
        Insert: {
          auto_sync?: boolean | null
          chunk_count?: number | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          chunking_strategy?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_count?: number | null
          embedding_model?: string | null
          id?: string
          index_name?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          name: string
          next_sync_at?: string | null
          organization_id: string
          slug: string
          source_config?: Json
          source_type: string
          status?: string | null
          sync_error?: string | null
          sync_frequency?: string | null
          sync_schedule?: Json | null
          tags?: string[] | null
          total_size_bytes?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          vector_store_id?: string | null
        }
        Update: {
          auto_sync?: boolean | null
          chunk_count?: number | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          chunking_strategy?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_count?: number | null
          embedding_model?: string | null
          id?: string
          index_name?: string | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string
          next_sync_at?: string | null
          organization_id?: string
          slug?: string
          source_config?: Json
          source_type?: string
          status?: string | null
          sync_error?: string | null
          sync_frequency?: string | null
          sync_schedule?: Json | null
          tags?: string[] | null
          total_size_bytes?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          vector_store_id?: string | null
        }
        Relationships: []
      }
      knowledge_sync_jobs: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          created_at: string | null
          documents_added: number | null
          documents_deleted: number | null
          documents_updated: number | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          failed_items: number | null
          id: string
          job_type: string
          knowledge_source_id: string
          processed_items: number | null
          progress_percent: number | null
          started_at: string | null
          status: string | null
          total_items: number | null
          triggered_by: string | null
          triggered_by_user: string | null
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          created_at?: string | null
          documents_added?: number | null
          documents_deleted?: number | null
          documents_updated?: number | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          job_type: string
          knowledge_source_id: string
          processed_items?: number | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          total_items?: number | null
          triggered_by?: string | null
          triggered_by_user?: string | null
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          created_at?: string | null
          documents_added?: number | null
          documents_deleted?: number | null
          documents_updated?: number | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          job_type?: string
          knowledge_source_id?: string
          processed_items?: number | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          total_items?: number | null
          triggered_by?: string | null
          triggered_by_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sync_jobs_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_web_pages: {
        Row: {
          content_type: string | null
          created_at: string
          fetch_error: string | null
          http_status: number | null
          id: string
          last_fetched_at: string | null
          sha256_hash: string | null
          source_id: string
          status: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          fetch_error?: string | null
          http_status?: number | null
          id?: string
          last_fetched_at?: string | null
          sha256_hash?: string | null
          source_id: string
          status?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          fetch_error?: string | null
          http_status?: number | null
          id?: string
          last_fetched_at?: string | null
          sha256_hash?: string | null
          source_id?: string
          status?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_web_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_web_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_web_sources: {
        Row: {
          authority_level: string
          category: string
          created_at: string
          created_by: string | null
          domain: string
          id: string
          jurisdiction_code: string | null
          last_crawled_at: string | null
          name: string
          notes: string | null
          priority: number
          status: string
          tags: string[] | null
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          authority_level?: string
          category: string
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          jurisdiction_code?: string | null
          last_crawled_at?: string | null
          name: string
          notes?: string | null
          priority?: number
          status?: string
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          authority_level?: string
          category?: string
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          jurisdiction_code?: string | null
          last_crawled_at?: string | null
          name?: string
          notes?: string | null
          priority?: number
          status?: string
          tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      learning_examples: {
        Row: {
          agent_id: string
          complexity: number | null
          confidence_score: number | null
          created_at: string | null
          domain: string | null
          example_type: string
          expected_output: string
          id: string
          input_context: Json
          input_text: string
          is_active: boolean | null
          jurisdictions: Json | null
          last_used_at: string | null
          organization_id: string | null
          original_output: string | null
          output_a: string | null
          output_b: string | null
          preference_strength: number | null
          preferred_output: string | null
          quality_score: number | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_execution_id: string | null
          source_type: string
          source_user_id: string | null
          tags: Json | null
          task_type: string | null
          times_used_in_training: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          complexity?: number | null
          confidence_score?: number | null
          created_at?: string | null
          domain?: string | null
          example_type: string
          expected_output: string
          id?: string
          input_context?: Json
          input_text: string
          is_active?: boolean | null
          jurisdictions?: Json | null
          last_used_at?: string | null
          organization_id?: string | null
          original_output?: string | null
          output_a?: string | null
          output_b?: string | null
          preference_strength?: number | null
          preferred_output?: string | null
          quality_score?: number | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_execution_id?: string | null
          source_type: string
          source_user_id?: string | null
          tags?: Json | null
          task_type?: string | null
          times_used_in_training?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          complexity?: number | null
          confidence_score?: number | null
          created_at?: string | null
          domain?: string | null
          example_type?: string
          expected_output?: string
          id?: string
          input_context?: Json
          input_text?: string
          is_active?: boolean | null
          jurisdictions?: Json | null
          last_used_at?: string | null
          organization_id?: string | null
          original_output?: string | null
          output_a?: string | null
          output_b?: string | null
          preference_strength?: number | null
          preferred_output?: string | null
          quality_score?: number | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_execution_id?: string | null
          source_type?: string
          source_user_id?: string | null
          tags?: Json | null
          task_type?: string | null
          times_used_in_training?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_examples_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_examples_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_examples_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_experiments: {
        Row: {
          agent_id: string
          control_config: Json
          control_metrics: Json | null
          control_percentage: number | null
          created_at: string | null
          created_by: string | null
          current_control_samples: number | null
          current_treatment_samples: number | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_notes: string | null
          description: string | null
          ended_at: string | null
          hypothesis: string | null
          id: string
          min_duration_hours: number | null
          min_sample_size: number | null
          name: string
          organization_id: string | null
          started_at: string | null
          statistical_significance: number | null
          status: string | null
          treatment_config: Json
          treatment_metrics: Json | null
          treatment_percentage: number | null
          winner: string | null
        }
        Insert: {
          agent_id: string
          control_config?: Json
          control_metrics?: Json | null
          control_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          current_control_samples?: number | null
          current_treatment_samples?: number | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_notes?: string | null
          description?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          min_duration_hours?: number | null
          min_sample_size?: number | null
          name: string
          organization_id?: string | null
          started_at?: string | null
          statistical_significance?: number | null
          status?: string | null
          treatment_config?: Json
          treatment_metrics?: Json | null
          treatment_percentage?: number | null
          winner?: string | null
        }
        Update: {
          agent_id?: string
          control_config?: Json
          control_metrics?: Json | null
          control_percentage?: number | null
          created_at?: string | null
          created_by?: string | null
          current_control_samples?: number | null
          current_treatment_samples?: number | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_notes?: string | null
          description?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          min_duration_hours?: number | null
          min_sample_size?: number | null
          name?: string
          organization_id?: string | null
          started_at?: string | null
          statistical_significance?: number | null
          status?: string | null
          treatment_config?: Json
          treatment_metrics?: Json | null
          treatment_percentage?: number | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_experiments_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_experiments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_metrics: {
        Row: {
          computed_at: string
          dims: Json | null
          id: string
          metric: string
          org_id: string
          value: number
          window_name: string
        }
        Insert: {
          computed_at?: string
          dims?: Json | null
          id?: string
          metric: string
          org_id: string
          value: number
          window_name: string
        }
        Update: {
          computed_at?: string
          dims?: Json | null
          id?: string
          metric?: string
          org_id?: string
          value?: number
          window_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_runs: {
        Row: {
          agent_kind: string
          finished_at: string | null
          id: string
          mode: string
          org_id: string
          started_at: string | null
          stats: Json | null
          status: string
        }
        Insert: {
          agent_kind: string
          finished_at?: string | null
          id?: string
          mode: string
          org_id: string
          started_at?: string | null
          stats?: Json | null
          status?: string
        }
        Update: {
          agent_kind?: string
          finished_at?: string | null
          id?: string
          mode?: string
          org_id?: string
          started_at?: string | null
          stats?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_signals: {
        Row: {
          created_at: string
          id: string
          kind: string
          org_id: string
          payload: Json | null
          run_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          org_id: string
          payload?: Json | null
          run_id?: string | null
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          org_id?: string
          payload?: Json | null
          run_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          entity_id: string | null
          id: string
          name: string
          org_id: string
          parent_account_id: string | null
          type: Database["public"]["Enums"]["ledger_account_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency?: string
          entity_id?: string | null
          id?: string
          name: string
          org_id: string
          parent_account_id?: string | null
          type: Database["public"]["Enums"]["ledger_account_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          entity_id?: string | null
          id?: string
          name?: string
          org_id?: string
          parent_account_id?: string | null
          type?: Database["public"]["Enums"]["ledger_account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          batch_id: string | null
          created_at: string
          created_by_user_id: string | null
          credit: number
          currency: string
          debit: number
          description: string | null
          entity_id: string | null
          entry_date: string
          fx_rate: number | null
          id: string
          org_id: string
          period_id: string | null
          source: string
        }
        Insert: {
          account_id: string
          batch_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          credit?: number
          currency?: string
          debit?: number
          description?: string | null
          entity_id?: string | null
          entry_date: string
          fx_rate?: number | null
          id?: string
          org_id: string
          period_id?: string | null
          source?: string
        }
        Update: {
          account_id?: string
          batch_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          credit?: number
          currency?: string
          debit?: number
          description?: string | null
          entity_id?: string | null
          entry_date?: string
          fx_rate?: number | null
          id?: string
          org_id?: string
          period_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "journal_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      materiality_sets: {
        Row: {
          basis: string | null
          basis_amount: number | null
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          pm: number | null
          rationale: string | null
          te_threshold: number | null
        }
        Insert: {
          basis?: string | null
          basis_amount?: number | null
          created_at?: string
          engagement_id: string
          id?: string
          org_id: string
          pm?: number | null
          rationale?: string | null
          te_threshold?: number | null
        }
        Update: {
          basis?: string | null
          basis_amount?: number | null
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          pm?: number | null
          rationale?: string | null
          te_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materiality_sets_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiality_sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      memberships: {
        Row: {
          autonomy_ceiling: Database["public"]["Enums"]["autonomy_level"]
          autonomy_floor: Database["public"]["Enums"]["autonomy_level"]
          client_portal_allowed_repos: string[]
          client_portal_denied_actions: string[]
          created_at: string | null
          id: string
          is_service_account: boolean
          org_id: string
          role: Database["public"]["Enums"]["role_level"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          autonomy_ceiling?: Database["public"]["Enums"]["autonomy_level"]
          autonomy_floor?: Database["public"]["Enums"]["autonomy_level"]
          client_portal_allowed_repos?: string[]
          client_portal_denied_actions?: string[]
          created_at?: string | null
          id?: string
          is_service_account?: boolean
          org_id: string
          role?: Database["public"]["Enums"]["role_level"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          autonomy_ceiling?: Database["public"]["Enums"]["autonomy_level"]
          autonomy_floor?: Database["public"]["Enums"]["autonomy_level"]
          client_portal_allowed_repos?: string[]
          client_portal_denied_actions?: string[]
          created_at?: string | null
          id?: string
          is_service_account?: boolean
          org_id?: string
          role?: Database["public"]["Enums"]["role_level"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      misstatements: {
        Row: {
          amount: number | null
          classification: string | null
          corrected: boolean
          created_at: string
          engagement_id: string
          id: string
          org_id: string
        }
        Insert: {
          amount?: number | null
          classification?: string | null
          corrected?: boolean
          created_at?: string
          engagement_id: string
          id?: string
          org_id: string
        }
        Update: {
          amount?: number | null
          classification?: string | null
          corrected?: boolean
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "misstatements_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "misstatements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nid_computations: {
        Row: {
          adjustment_amount: number
          cap_ratio: number | null
          capped_deduction: number
          chargeable_income_before_nid: number | null
          created_at: string
          created_by: string | null
          deduction_after_carryforward: number
          equity_base: number
          gross_deduction: number
          id: string
          notes: string | null
          org_id: string
          period: string
          prior_deduction: number | null
          reference_rate: number
          risk_free_rate: number | null
          risk_premium: number | null
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adjustment_amount: number
          cap_ratio?: number | null
          capped_deduction: number
          chargeable_income_before_nid?: number | null
          created_at?: string
          created_by?: string | null
          deduction_after_carryforward: number
          equity_base: number
          gross_deduction: number
          id?: string
          notes?: string | null
          org_id: string
          period: string
          prior_deduction?: number | null
          reference_rate: number
          risk_free_rate?: number | null
          risk_premium?: number | null
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adjustment_amount?: number
          cap_ratio?: number | null
          capped_deduction?: number
          chargeable_income_before_nid?: number | null
          created_at?: string
          created_by?: string | null
          deduction_after_carryforward?: number
          equity_base?: number
          gross_deduction?: number
          id?: string
          notes?: string | null
          org_id?: string
          period?: string
          prior_deduction?: number | null
          reference_rate?: number
          risk_free_rate?: number | null
          risk_premium?: number | null
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nid_computations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nid_computations_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatch_queue: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          notification_id: string
          org_id: string
          payload: Json
          processed_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id: string
          org_id: string
          payload: Json
          processed_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          notification_id?: string
          org_id?: string
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatch_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatch_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatch_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          org_id: string
          read: boolean
          title: string
          urgent: boolean
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          org_id: string
          read?: boolean
          title: string
          urgent?: boolean
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          org_id?: string
          read?: boolean
          title?: string
          urgent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          feedback: string | null
          id: string
          org_id: string
          score: number
          submitted_at: string
          user_id: string | null
        }
        Insert: {
          feedback?: string | null
          id?: string
          org_id: string
          score: number
          submitted_at?: string
          user_id?: string | null
        }
        Update: {
          feedback?: string | null
          id?: string
          org_id?: string
          score?: number
          submitted_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklist_items: {
        Row: {
          category: string
          checklist_id: string
          created_at: string
          document_id: string | null
          id: string
          label: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          checklist_id: string
          created_at?: string
          document_id?: string | null
          id?: string
          label: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          checklist_id?: string
          created_at?: string
          document_id?: string | null
          id?: string
          label?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "onboarding_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_checklist_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_checklists: {
        Row: {
          country: string
          created_at: string
          id: string
          industry: string
          org_id: string
          status: string
          temp_entity_id: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          industry: string
          org_id: string
          status?: string
          temp_entity_id: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          industry?: string
          org_id?: string
          status?: string
          temp_entity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_checklists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      openai_debug_events: {
        Row: {
          created_at: string
          debug: Json | null
          endpoint: string
          id: string
          metadata: Json
          model: string | null
          org_id: string | null
          request_id: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          debug?: Json | null
          endpoint: string
          id?: string
          metadata?: Json
          model?: string | null
          org_id?: string | null
          request_id: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          debug?: Json | null
          endpoint?: string
          id?: string
          metadata?: Json
          model?: string | null
          org_id?: string | null
          request_id?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "openai_debug_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      participation_exemptions: {
        Row: {
          conclusion: boolean
          created_at: string
          created_by_user_id: string | null
          event_ref: string | null
          id: string
          notes: string | null
          org_id: string
          tax_entity_id: string
          tests: Json
        }
        Insert: {
          conclusion?: boolean
          created_at?: string
          created_by_user_id?: string | null
          event_ref?: string | null
          id?: string
          notes?: string | null
          org_id: string
          tax_entity_id: string
          tests?: Json
        }
        Update: {
          conclusion?: boolean
          created_at?: string
          created_by_user_id?: string | null
          event_ref?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          tax_entity_id?: string
          tests?: Json
        }
        Relationships: [
          {
            foreignKeyName: "participation_exemptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_exemptions_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      patent_box_computations: {
        Row: {
          adjustment_amount: number
          created_at: string
          created_by: string | null
          deduction_amount: number
          deduction_base: number
          deduction_rate: number | null
          id: string
          nexus_fraction: number
          notes: string | null
          org_id: string
          overall_expenditure: number
          period: string
          qualifying_expenditure: number
          qualifying_ip_income: number
          routine_return: number
          routine_return_rate: number | null
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
          uplift: number
          uplift_cap: number | null
        }
        Insert: {
          adjustment_amount: number
          created_at?: string
          created_by?: string | null
          deduction_amount: number
          deduction_base: number
          deduction_rate?: number | null
          id?: string
          nexus_fraction: number
          notes?: string | null
          org_id: string
          overall_expenditure: number
          period: string
          qualifying_expenditure: number
          qualifying_ip_income: number
          routine_return: number
          routine_return_rate?: number | null
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
          uplift: number
          uplift_cap?: number | null
        }
        Update: {
          adjustment_amount?: number
          created_at?: string
          created_by?: string | null
          deduction_amount?: number
          deduction_base?: number
          deduction_rate?: number | null
          id?: string
          nexus_fraction?: number
          notes?: string | null
          org_id?: string
          overall_expenditure?: number
          period?: string
          qualifying_expenditure?: number
          qualifying_ip_income?: number
          routine_return?: number
          routine_return_rate?: number | null
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
          uplift?: number
          uplift_cap?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patent_box_computations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patent_box_computations_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      pbc_items: {
        Row: {
          created_at: string
          id: string
          label: string
          metadata: Json
          org_id: string
          request_id: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          metadata?: Json
          org_id: string
          request_id: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          metadata?: Json
          org_id?: string
          request_id?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pbc_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pbc_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pbc_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pbc_requests: {
        Row: {
          created_at: string
          due_on: string | null
          engagement_id: string
          id: string
          org_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_on?: string | null
          engagement_id: string
          id?: string
          org_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_on?: string | null
          engagement_id?: string
          id?: string
          org_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pbc_requests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pbc_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pillar_two_computations: {
        Row: {
          created_at: string
          created_by: string | null
          gir_payload: Json
          gir_reference: string | null
          id: string
          iir_top_up_tax: number
          input_payload: Json
          jurisdiction_results: Json
          metadata: Json
          notes: string | null
          org_id: string
          period: string
          qdmt_top_up_tax: number
          root_tax_entity_id: string
          total_top_up_tax: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gir_payload?: Json
          gir_reference?: string | null
          id?: string
          iir_top_up_tax?: number
          input_payload?: Json
          jurisdiction_results?: Json
          metadata?: Json
          notes?: string | null
          org_id: string
          period: string
          qdmt_top_up_tax?: number
          root_tax_entity_id: string
          total_top_up_tax?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gir_payload?: Json
          gir_reference?: string | null
          id?: string
          iir_top_up_tax?: number
          input_payload?: Json
          jurisdiction_results?: Json
          metadata?: Json
          notes?: string | null
          org_id?: string
          period?: string
          qdmt_top_up_tax?: number
          root_tax_entity_id?: string
          total_top_up_tax?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pillar_two_computations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pillar_two_computations_root_tax_entity_id_fkey"
            columns: ["root_tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_log: {
        Row: {
          changed_by_user_id: string
          created_at: string
          engagement_id: string
          id: string
          impact: Json
          org_id: string
          plan_id: string
          reason: string
        }
        Insert: {
          changed_by_user_id: string
          created_at?: string
          engagement_id: string
          id?: string
          impact?: Json
          org_id: string
          plan_id: string
          reason: string
        }
        Update: {
          changed_by_user_id?: string
          created_at?: string
          engagement_id?: string
          id?: string
          impact?: Json
          org_id?: string
          plan_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_log_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_log_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "audit_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          created_at: string
          expr_sql: string
          id: string
          name: string
          org_id: string
          severity: string
        }
        Insert: {
          created_at?: string
          expr_sql: string
          id?: string
          name: string
          org_id: string
          severity?: string
        }
        Update: {
          created_at?: string
          expr_sql?: string
          id?: string
          name?: string
          org_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sessions: {
        Row: {
          expires_at: string
          id: string
          org_id: string
          token: string
        }
        Insert: {
          expires_at: string
          id?: string
          org_id: string
          token: string
        }
        Update: {
          expires_at?: string
          id?: string
          org_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          metadata: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          metadata?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      query_hints: {
        Row: {
          activated_at: string
          hint_type: string
          id: string
          juris_code: string | null
          org_id: string | null
          phrase: string
          policy_version_id: string | null
          topic: string | null
          weight: number | null
        }
        Insert: {
          activated_at?: string
          hint_type: string
          id?: string
          juris_code?: string | null
          org_id?: string | null
          phrase: string
          policy_version_id?: string | null
          topic?: string | null
          weight?: number | null
        }
        Update: {
          activated_at?: string
          hint_type?: string
          id?: string
          juris_code?: string | null
          org_id?: string | null
          phrase?: string
          policy_version_id?: string | null
          topic?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "query_hints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_hints_policy_version_id_fkey"
            columns: ["policy_version_id"]
            isOneToOne: false
            referencedRelation: "agent_policy_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_search_optimizations: {
        Row: {
          ab_test_completed_at: string | null
          ab_test_results: Json | null
          ab_test_started_at: string | null
          agent_id: string | null
          applied_at: string | null
          avg_current_similarity: number | null
          avg_optimized_similarity: number | null
          based_on_queries: number | null
          category: string | null
          created_at: string
          current_chunk_limit: number | null
          current_similarity_threshold: number | null
          current_tags: string[] | null
          expected_improvement_pct: number | null
          id: number
          jurisdiction: string | null
          optimized_chunk_limit: number | null
          optimized_similarity_threshold: number | null
          optimized_tags: string[] | null
          status: string
        }
        Insert: {
          ab_test_completed_at?: string | null
          ab_test_results?: Json | null
          ab_test_started_at?: string | null
          agent_id?: string | null
          applied_at?: string | null
          avg_current_similarity?: number | null
          avg_optimized_similarity?: number | null
          based_on_queries?: number | null
          category?: string | null
          created_at?: string
          current_chunk_limit?: number | null
          current_similarity_threshold?: number | null
          current_tags?: string[] | null
          expected_improvement_pct?: number | null
          id?: number
          jurisdiction?: string | null
          optimized_chunk_limit?: number | null
          optimized_similarity_threshold?: number | null
          optimized_tags?: string[] | null
          status?: string
        }
        Update: {
          ab_test_completed_at?: string | null
          ab_test_results?: Json | null
          ab_test_started_at?: string | null
          agent_id?: string | null
          applied_at?: string | null
          avg_current_similarity?: number | null
          avg_optimized_similarity?: number | null
          based_on_queries?: number | null
          category?: string | null
          created_at?: string
          current_chunk_limit?: number | null
          current_similarity_threshold?: number | null
          current_tags?: string[] | null
          expected_improvement_pct?: number | null
          id?: number
          jurisdiction?: string | null
          optimized_chunk_limit?: number | null
          optimized_similarity_threshold?: number | null
          optimized_tags?: string[] | null
          status?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          org_id: string
          request_count: number
          resource: string
          window_start: string
        }
        Insert: {
          org_id: string
          request_count?: number
          resource: string
          window_start: string
        }
        Update: {
          org_id?: string
          request_count?: number
          resource?: string
          window_start?: string
        }
        Relationships: []
      }
      reconciliation_items: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["reconciliation_item_category"]
          created_at: string
          id: string
          note: string | null
          org_id: string
          reconciliation_id: string
          reference: string | null
          resolved: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["reconciliation_item_category"]
          created_at?: string
          id?: string
          note?: string | null
          org_id: string
          reconciliation_id: string
          reference?: string | null
          resolved?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["reconciliation_item_category"]
          created_at?: string
          id?: string
          note?: string | null
          org_id?: string
          reconciliation_id?: string
          reference?: string | null
          resolved?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          closed_at: string | null
          control_account_id: string | null
          created_at: string
          difference: number
          entity_id: string | null
          external_balance: number
          gl_balance: number
          id: string
          org_id: string
          period_id: string | null
          prepared_by_user_id: string | null
          reviewed_by_user_id: string | null
          schedule_document_id: string | null
          status: string
          type: Database["public"]["Enums"]["reconciliation_type"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          control_account_id?: string | null
          created_at?: string
          difference?: number
          entity_id?: string | null
          external_balance?: number
          gl_balance?: number
          id?: string
          org_id: string
          period_id?: string | null
          prepared_by_user_id?: string | null
          reviewed_by_user_id?: string | null
          schedule_document_id?: string | null
          status?: string
          type: Database["public"]["Enums"]["reconciliation_type"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          control_account_id?: string | null
          created_at?: string
          difference?: number
          entity_id?: string | null
          external_balance?: number
          gl_balance?: number
          id?: string
          org_id?: string
          period_id?: string | null
          prepared_by_user_id?: string | null
          reviewed_by_user_id?: string | null
          schedule_document_id?: string | null
          status?: string
          type?: Database["public"]["Enums"]["reconciliation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_control_account_id_fkey"
            columns: ["control_account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      retrieval_guardrails: {
        Row: {
          action_on_violation: string
          applies_to_domains: string[] | null
          applies_to_standards:
            | Database["public"]["Enums"]["knowledge_standard_type"][]
            | null
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_confidence_score: number | null
          name: string
          organization_id: string | null
          priority: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          action_on_violation: string
          applies_to_domains?: string[] | null
          applies_to_standards?:
            | Database["public"]["Enums"]["knowledge_standard_type"][]
            | null
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_confidence_score?: number | null
          name: string
          organization_id?: string | null
          priority?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          action_on_violation?: string
          applies_to_domains?: string[] | null
          applies_to_standards?:
            | Database["public"]["Enums"]["knowledge_standard_type"][]
            | null
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_confidence_score?: number | null
          name?: string
          organization_id?: string | null
          priority?: number | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_guardrails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      return_files: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          kind: string
          org_id: string
          payload_meta: Json
          period: string
          released_at: string | null
          status: string
          submitted_at: string | null
          tax_entity_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          kind: string
          org_id: string
          payload_meta?: Json
          period: string
          released_at?: string | null
          status?: string
          submitted_at?: string | null
          tax_entity_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          kind?: string
          org_id?: string
          payload_meta?: Json
          period?: string
          released_at?: string | null
          status?: string
          submitted_at?: string | null
          tax_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_files_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          assertion: string | null
          created_at: string
          description: string | null
          engagement_id: string
          id: string
          impact: number | null
          likelihood: number | null
          org_id: string
          response_plan: Json | null
          updated_at: string
        }
        Insert: {
          assertion?: string | null
          created_at?: string
          description?: string | null
          engagement_id: string
          id?: string
          impact?: number | null
          likelihood?: number | null
          org_id: string
          response_plan?: Json | null
          updated_at?: string
        }
        Update: {
          assertion?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string
          id?: string
          impact?: number | null
          likelihood?: number | null
          org_id?: string
          response_plan?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      samples: {
        Row: {
          created_at: string
          exception_reason: string | null
          id: string
          item_ref: string | null
          org_id: string
          result: string | null
          selected_by: string | null
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exception_reason?: string | null
          id?: string
          item_ref?: string | null
          org_id: string
          result?: string | null
          selected_by?: string | null
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exception_reason?: string | null
          id?: string
          item_ref?: string | null
          org_id?: string
          result?: string | null
          selected_by?: string | null
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "samples_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      supabase_migrations: {
        Row: {
          applied_at: string | null
          name: string | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          name?: string | null
          version: string
        }
        Update: {
          applied_at?: string | null
          name?: string | null
          version?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          chatkit_turn_config: Json | null
          created_at: string
          created_by_user_id: string | null
          id: string
          settings: Json
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          chatkit_turn_config?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          settings?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          chatkit_turn_config?: Json | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          settings?: Json
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          document_id: string
          id: string
          note: string | null
          org_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          note?: string | null
          org_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          note?: string | null
          org_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          org_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          org_id: string
          task_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          engagement_id: string | null
          id: string
          org_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          engagement_id?: string | null
          id?: string
          org_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          engagement_id?: string | null
          id?: string
          org_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax: {
        Row: {
          created_at: string | null
          id: string
          jurisdiction: string
          org_id: string | null
          rate: number
          reverse_charge: boolean | null
          rule: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          jurisdiction: string
          org_id?: string | null
          rate: number
          reverse_charge?: boolean | null
          rule: string
        }
        Update: {
          created_at?: string | null
          id?: string
          jurisdiction?: string
          org_id?: string | null
          rate?: number
          reverse_charge?: boolean | null
          rule?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["tax_account_type"]
          closing_balance: number
          id: string
          movements: Json
          opening_balance: number
          org_id: string
          tax_entity_id: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["tax_account_type"]
          closing_balance?: number
          id?: string
          movements?: Json
          opening_balance?: number
          org_id: string
          tax_entity_id: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["tax_account_type"]
          closing_balance?: number
          id?: string
          movements?: Json
          opening_balance?: number
          org_id?: string
          tax_entity_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_accounts_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_dispute_cases: {
        Row: {
          case_reference: string | null
          case_type: string
          counterparty_authority: string | null
          counterparty_jurisdiction: string
          created_at: string
          created_by: string | null
          expected_resolution: string | null
          id: string
          issue_summary: string | null
          metadata: Json
          notes: string | null
          opened_on: string
          org_id: string
          relief_amount: number | null
          status: Database["public"]["Enums"]["tax_dispute_status"]
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          case_reference?: string | null
          case_type: string
          counterparty_authority?: string | null
          counterparty_jurisdiction: string
          created_at?: string
          created_by?: string | null
          expected_resolution?: string | null
          id?: string
          issue_summary?: string | null
          metadata?: Json
          notes?: string | null
          opened_on?: string
          org_id: string
          relief_amount?: number | null
          status?: Database["public"]["Enums"]["tax_dispute_status"]
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          case_reference?: string | null
          case_type?: string
          counterparty_authority?: string | null
          counterparty_jurisdiction?: string
          created_at?: string
          created_by?: string | null
          expected_resolution?: string | null
          id?: string
          issue_summary?: string | null
          metadata?: Json
          notes?: string | null
          opened_on?: string
          org_id?: string
          relief_amount?: number | null
          status?: Database["public"]["Enums"]["tax_dispute_status"]
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_dispute_cases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_dispute_cases_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_dispute_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          dispute_id: string
          event_date: string
          event_type: string
          id: string
          metadata: Json
          org_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispute_id: string
          event_date: string
          event_type: string
          id?: string
          metadata?: Json
          org_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          dispute_id?: string
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "tax_dispute_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_dispute_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_entities: {
        Row: {
          created_at: string
          fiscal_end: string | null
          fiscal_start: string | null
          fiscal_year: string
          id: string
          jurisdiction: string
          listed: boolean | null
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fiscal_end?: string | null
          fiscal_start?: string | null
          fiscal_year: string
          id?: string
          jurisdiction?: string
          listed?: boolean | null
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fiscal_end?: string | null
          fiscal_start?: string | null
          fiscal_year?: string
          id?: string
          jurisdiction?: string
          listed?: boolean | null
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_entities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_entity_relationships: {
        Row: {
          child_tax_entity_id: string
          created_at: string
          created_by: string | null
          effective_date: string | null
          id: string
          notes: string | null
          org_id: string
          ownership_percentage: number
          parent_tax_entity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          child_tax_entity_id: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          notes?: string | null
          org_id: string
          ownership_percentage?: number
          parent_tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          child_tax_entity_id?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          ownership_percentage?: number
          parent_tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_entity_relationships_child_tax_entity_id_fkey"
            columns: ["child_tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entity_relationships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_entity_relationships_parent_tax_entity_id_fkey"
            columns: ["parent_tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_coverage_metrics: {
        Row: {
          computed_at: string
          coverage_ratio: number | null
          id: string
          measured_value: number
          metric: string
          module: string
          org_id: string | null
          period_end: string
          period_start: string
          population: number
        }
        Insert: {
          computed_at?: string
          coverage_ratio?: number | null
          id?: string
          measured_value?: number
          metric: string
          module: string
          org_id?: string | null
          period_end: string
          period_start: string
          population?: number
        }
        Update: {
          computed_at?: string
          coverage_ratio?: number | null
          id?: string
          measured_value?: number
          metric?: string
          module?: string
          org_id?: string | null
          period_end?: string
          period_start?: string
          population?: number
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_coverage_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_refusal_events: {
        Row: {
          count: number
          event: string
          id: string
          module: string
          occurred_at: string
          org_id: string | null
          reason: string | null
          severity: string | null
        }
        Insert: {
          count?: number
          event: string
          id?: string
          module: string
          occurred_at?: string
          org_id?: string | null
          reason?: string | null
          severity?: string | null
        }
        Update: {
          count?: number
          event?: string
          id?: string
          module?: string
          occurred_at?: string
          org_id?: string | null
          reason?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_refusal_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_service_levels: {
        Row: {
          breaches: number
          computed_at: string
          id: string
          last_breach_at: string | null
          module: string
          open_breaches: number
          org_id: string | null
          status: string
          target_hours: number
          workflow_event: string
        }
        Insert: {
          breaches?: number
          computed_at?: string
          id?: string
          last_breach_at?: string | null
          module: string
          open_breaches?: number
          org_id?: string | null
          status?: string
          target_hours: number
          workflow_event: string
        }
        Update: {
          breaches?: number
          computed_at?: string
          id?: string
          last_breach_at?: string | null
          module?: string
          open_breaches?: number
          org_id?: string | null
          status?: string
          target_hours?: number
          workflow_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_service_levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          approach: string | null
          control_id: string
          created_at: string
          id: string
          org_id: string
          sample_method: string | null
          sample_size: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          approach?: string | null
          control_id: string
          created_at?: string
          id?: string
          org_id: string
          sample_method?: string | null
          sample_size?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          approach?: string | null
          control_id?: string
          created_at?: string
          id?: string
          org_id?: string
          sample_method?: string | null
          sample_size?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_registry: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          label: string | null
          metadata: Json
          min_role: string
          org_id: string | null
          sensitive: boolean
          standards_refs: string[]
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          label?: string | null
          metadata?: Json
          min_role?: string
          org_id?: string | null
          sensitive?: boolean
          standards_refs?: string[]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          label?: string | null
          metadata?: Json
          min_role?: string
          org_id?: string | null
          sensitive?: boolean
          standards_refs?: string[]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_registry_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_datasets: {
        Row: {
          agent_ids: Json | null
          avg_quality_score: number | null
          correction_examples: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          domains: Json | null
          human_verified_percentage: number | null
          id: string
          last_used_at: string | null
          name: string
          negative_examples: number | null
          organization_id: string | null
          positive_examples: number | null
          status: string | null
          task_types: Json | null
          times_used: number | null
          total_examples: number | null
          updated_at: string | null
          version: string
        }
        Insert: {
          agent_ids?: Json | null
          avg_quality_score?: number | null
          correction_examples?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domains?: Json | null
          human_verified_percentage?: number | null
          id?: string
          last_used_at?: string | null
          name: string
          negative_examples?: number | null
          organization_id?: string | null
          positive_examples?: number | null
          status?: string | null
          task_types?: Json | null
          times_used?: number | null
          total_examples?: number | null
          updated_at?: string | null
          version: string
        }
        Update: {
          agent_ids?: Json | null
          avg_quality_score?: number | null
          correction_examples?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domains?: Json | null
          human_verified_percentage?: number | null
          id?: string
          last_used_at?: string | null
          name?: string
          negative_examples?: number | null
          organization_id?: string | null
          positive_examples?: number | null
          status?: string | null
          task_types?: Json | null
          times_used?: number | null
          total_examples?: number | null
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_datasets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_datasets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_runs: {
        Row: {
          agent_id: string
          best_metrics: Json | null
          completed_at: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          current_step: number | null
          dataset_id: string
          description: string | null
          hyperparameters: Json | null
          id: string
          logs_path: string | null
          metrics: Json | null
          model_artifact_path: string | null
          name: string
          organization_id: string | null
          progress_percentage: number | null
          prompt_artifact_path: string | null
          requires_review: boolean | null
          review_notes: string | null
          review_status: string | null
          reviewed_by: string | null
          started_at: string | null
          status: string | null
          total_steps: number | null
          training_type: string
        }
        Insert: {
          agent_id: string
          best_metrics?: Json | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          current_step?: number | null
          dataset_id: string
          description?: string | null
          hyperparameters?: Json | null
          id?: string
          logs_path?: string | null
          metrics?: Json | null
          model_artifact_path?: string | null
          name: string
          organization_id?: string | null
          progress_percentage?: number | null
          prompt_artifact_path?: string | null
          requires_review?: boolean | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          training_type: string
        }
        Update: {
          agent_id?: string
          best_metrics?: Json | null
          completed_at?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          current_step?: number | null
          dataset_id?: string
          description?: string | null
          hyperparameters?: Json | null
          id?: string
          logs_path?: string | null
          metrics?: Json | null
          model_artifact_path?: string | null
          name?: string
          organization_id?: string | null
          progress_percentage?: number | null
          prompt_artifact_path?: string | null
          requires_review?: boolean | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_runs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_runs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          confidence: number | null
          created_at: string
          currency: string
          date: string
          description: string | null
          id: string
          org_id: string
          source_ref: string | null
          vat_code: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string
          date: string
          description?: string | null
          id?: string
          org_id: string
          source_ref?: string | null
          vat_code?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          confidence?: number | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: string
          org_id?: string
          source_ref?: string | null
          vat_code?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      treaty_wht_calculations: {
        Row: {
          counterparty_jurisdiction: string
          created_at: string
          created_by: string | null
          domestic_rate: number
          gross_amount: number
          id: string
          metadata: Json
          notes: string | null
          org_id: string
          payment_type: string
          relief_amount: number
          relief_method: string
          tax_entity_id: string
          treaty_article: string | null
          treaty_rate: number
          updated_at: string
          updated_by: string | null
          withholding_after: number
          withholding_before: number
        }
        Insert: {
          counterparty_jurisdiction: string
          created_at?: string
          created_by?: string | null
          domestic_rate: number
          gross_amount: number
          id?: string
          metadata?: Json
          notes?: string | null
          org_id: string
          payment_type: string
          relief_amount: number
          relief_method: string
          tax_entity_id: string
          treaty_article?: string | null
          treaty_rate: number
          updated_at?: string
          updated_by?: string | null
          withholding_after: number
          withholding_before: number
        }
        Update: {
          counterparty_jurisdiction?: string
          created_at?: string
          created_by?: string | null
          domestic_rate?: number
          gross_amount?: number
          id?: string
          metadata?: Json
          notes?: string | null
          org_id?: string
          payment_type?: string
          relief_amount?: number
          relief_method?: string
          tax_entity_id?: string
          treaty_article?: string | null
          treaty_rate?: number
          updated_at?: string
          updated_by?: string | null
          withholding_after?: number
          withholding_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "treaty_wht_calculations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treaty_wht_calculations_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_balance_snapshots: {
        Row: {
          balances: Json
          entity_id: string | null
          id: string
          locked: boolean
          org_id: string
          period_id: string | null
          snapshot_at: string
          total_credits: number
          total_debits: number
        }
        Insert: {
          balances?: Json
          entity_id?: string | null
          id?: string
          locked?: boolean
          org_id: string
          period_id?: string | null
          snapshot_at?: string
          total_credits: number
          total_debits: number
        }
        Update: {
          balances?: Json
          entity_id?: string | null
          id?: string
          locked?: boolean
          org_id?: string
          period_id?: string | null
          snapshot_at?: string
          total_credits?: number
          total_debits?: number
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_snapshots_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      us_tax_overlay_calculations: {
        Row: {
          adjustment_amount: number
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          metadata: Json
          notes: string | null
          org_id: string
          overlay_type: Database["public"]["Enums"]["us_overlay_type"]
          period: string
          results: Json
          tax_entity_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adjustment_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          metadata?: Json
          notes?: string | null
          org_id: string
          overlay_type: Database["public"]["Enums"]["us_overlay_type"]
          period: string
          results?: Json
          tax_entity_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adjustment_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          metadata?: Json
          notes?: string | null
          org_id?: string
          overlay_type?: Database["public"]["Enums"]["us_overlay_type"]
          period?: string
          results?: Json
          tax_entity_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "us_tax_overlay_calculations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "us_tax_overlay_calculations_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          email_override: string | null
          org_id: string
          sms_enabled: boolean
          sms_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          email_override?: string | null
          org_id: string
          sms_enabled?: boolean
          sms_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          email_override?: string | null
          org_id?: string
          sms_enabled?: boolean
          sms_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_system_admin: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_system_admin?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_system_admin?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      variance_results: {
        Row: {
          baseline: number
          created_at: string
          delta_abs: number
          delta_pct: number
          entity_id: string | null
          explanation: string | null
          id: string
          org_id: string
          period_id: string | null
          rule_id: string
          status: string
          target_code: string
          updated_at: string
          value: number
        }
        Insert: {
          baseline: number
          created_at?: string
          delta_abs: number
          delta_pct: number
          entity_id?: string | null
          explanation?: string | null
          id?: string
          org_id: string
          period_id?: string | null
          rule_id: string
          status?: string
          target_code: string
          updated_at?: string
          value: number
        }
        Update: {
          baseline?: number
          created_at?: string
          delta_abs?: number
          delta_pct?: number
          entity_id?: string | null
          explanation?: string | null
          id?: string
          org_id?: string
          period_id?: string | null
          rule_id?: string
          status?: string
          target_code?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "variance_results_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_results_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_results_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_results_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "variance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      variance_rules: {
        Row: {
          active: boolean
          compare_to: string
          created_at: string
          entity_id: string | null
          id: string
          method: string
          org_id: string
          scope: string
          target_code: string
          threshold_abs: number | null
          threshold_pct: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          compare_to?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          method?: string
          org_id: string
          scope: string
          target_code: string
          threshold_abs?: number | null
          threshold_pct?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          compare_to?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          method?: string
          org_id?: string
          scope?: string
          target_code?: string
          threshold_abs?: number | null
          threshold_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variance_rules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variance_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_filings: {
        Row: {
          adjustment_amount: number
          created_at: string
          created_by: string | null
          filing_type: string
          id: string
          input_vat: number
          manual_adjustments: number
          net_payable_after_adjustments: number
          net_vat_due: number
          notes: string | null
          org_id: string
          output_vat: number
          payload: Json
          period: string
          tax_entity_id: string
          taxable_outputs: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adjustment_amount: number
          created_at?: string
          created_by?: string | null
          filing_type?: string
          id?: string
          input_vat: number
          manual_adjustments: number
          net_payable_after_adjustments: number
          net_vat_due: number
          notes?: string | null
          org_id: string
          output_vat: number
          payload: Json
          period: string
          tax_entity_id: string
          taxable_outputs: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adjustment_amount?: number
          created_at?: string
          created_by?: string | null
          filing_type?: string
          id?: string
          input_vat?: number
          manual_adjustments?: number
          net_payable_after_adjustments?: number
          net_vat_due?: number
          notes?: string | null
          org_id?: string
          output_vat?: number
          payload?: Json
          period?: string
          tax_entity_id?: string
          taxable_outputs?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_filings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vat_filings_tax_entity_id_fkey"
            columns: ["tax_entity_id"]
            isOneToOne: false
            referencedRelation: "tax_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_returns: {
        Row: {
          id: string
          org_id: string
          period_end: string
          period_start: string
          status: string
          totals: Json
          xml: string | null
        }
        Insert: {
          id?: string
          org_id: string
          period_end: string
          period_start: string
          status?: string
          totals?: Json
          xml?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          period_end?: string
          period_start?: string
          status?: string
          totals?: Json
          xml?: string | null
        }
        Relationships: []
      }
      vat_rules: {
        Row: {
          effective_from: string | null
          effective_to: string | null
          id: string
          jurisdiction: string | null
          name: string
          org_id: string
          rule: Json
        }
        Insert: {
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          jurisdiction?: string | null
          name: string
          org_id: string
          rule?: Json
        }
        Update: {
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          jurisdiction?: string | null
          name?: string
          org_id?: string
          rule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vat_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_category_mappings: {
        Row: {
          category_id: string
          confidence: number | null
          examples: Json
          id: string
          org_id: string
          updated_at: string
          vat_code: string | null
          vendor_id: string
        }
        Insert: {
          category_id: string
          confidence?: number | null
          examples?: Json
          id?: string
          org_id: string
          updated_at?: string
          vat_code?: string | null
          vendor_id: string
        }
        Update: {
          category_id?: string
          confidence?: number | null
          examples?: Json
          id?: string
          org_id?: string
          updated_at?: string
          vat_code?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_category_mappings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          country: string | null
          extra: Json
          id: string
          name: string
          org_id: string
          vat_number: string | null
        }
        Insert: {
          country?: string | null
          extra?: Json
          id?: string
          name: string
          org_id: string
          vat_number?: string | null
        }
        Update: {
          country?: string | null
          extra?: Json
          id?: string
          name?: string
          org_id?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vies_checks: {
        Row: {
          checked_at: string
          counterparty_vat: string
          id: string
          org_id: string
          result: Json
        }
        Insert: {
          checked_at?: string
          counterparty_vat: string
          id?: string
          org_id: string
          result: Json
        }
        Update: {
          checked_at?: string
          counterparty_vat?: string
          id?: string
          org_id?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vies_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      web_fetch_cache: {
        Row: {
          content: string | null
          content_hash: string | null
          fetched_at: string
          id: string
          inserted_at: string
          last_used_at: string
          metadata: Json | null
          status: string | null
          updated_at: string
          url: string
        }
        Insert: {
          content?: string | null
          content_hash?: string | null
          fetched_at?: string
          id?: string
          inserted_at?: string
          last_used_at?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          content?: string | null
          content_hash?: string | null
          fetched_at?: string
          id?: string
          inserted_at?: string
          last_used_at?: string
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      web_knowledge_sources: {
        Row: {
          auto_classified: boolean | null
          classification_confidence: number | null
          classification_source: string | null
          created_at: string | null
          domain: string | null
          id: string
          jurisdiction: string[] | null
          priority: number | null
          tags: string[] | null
          title: string
          url: string
        }
        Insert: {
          auto_classified?: boolean | null
          classification_confidence?: number | null
          classification_source?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          jurisdiction?: string[] | null
          priority?: number | null
          tags?: string[] | null
          title: string
          url: string
        }
        Update: {
          auto_classified?: boolean | null
          classification_confidence?: number | null
          classification_source?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          jurisdiction?: string[] | null
          priority?: number | null
          tags?: string[] | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      workpapers: {
        Row: {
          created_at: string
          drive_url: string | null
          engagement_id: string
          id: string
          linked_evidence: Json | null
          org_id: string
          type: string | null
        }
        Insert: {
          created_at?: string
          drive_url?: string | null
          engagement_id: string
          id?: string
          linked_evidence?: Json | null
          org_id: string
          type?: string | null
        }
        Update: {
          created_at?: string
          drive_url?: string | null
          engagement_id?: string
          id?: string
          linked_evidence?: Json | null
          org_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workpapers_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workpapers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_error_analysis: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          error_count: number | null
          error_message: string | null
          last_occurrence: string | null
          sample_queries: string[] | null
        }
        Relationships: []
      }
      agent_execution_stats: {
        Row: {
          agent_id: string | null
          avg_execution_time_ms: number | null
          engine: string | null
          last_execution_at: string | null
          total_executions: number | null
          total_tool_calls: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance: {
        Row: {
          agent_name: string | null
          avg_latency_ms: number | null
          high_confidence_count: number | null
          low_confidence_count: number | null
          low_confidence_pct: number | null
          median_latency_ms: number | null
          p95_latency_ms: number | null
          query_date: string | null
          total_queries: number | null
        }
        Relationships: []
      }
      agent_performance_summary: {
        Row: {
          agent_id: string | null
          avg_latency_ms: number | null
          avg_rating: number | null
          satisfaction_rate: number | null
          total_cost: number | null
          total_executions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_execution_metrics: {
        Row: {
          agent_id: string | null
          avg_latency: number | null
          daily_cost: number | null
          date: string | null
          execution_count: number | null
          total_tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_stats: {
        Row: {
          active_documents: number | null
          avg_latency_ms_24h: number | null
          primary_sources: number | null
          queries_last_24h: number | null
          secondary_sources: number | null
          total_chunks: number | null
          total_documents: number | null
          total_embeddings: number | null
          total_jurisdictions: number | null
          total_sources: number | null
        }
        Relationships: []
      }
      rag_coverage_analysis: {
        Row: {
          agents_using: string[] | null
          avg_similarity: number | null
          low_similarity_count: number | null
          no_results_count: number | null
          query_count: number | null
          search_category: string | null
          search_jurisdiction: string | null
        }
        Relationships: []
      }
      web_fetch_cache_metrics: {
        Row: {
          fetched_last_24h: number | null
          newest_fetched_at: string | null
          newest_last_used_at: string | null
          oldest_fetched_at: string | null
          oldest_last_used_at: string | null
          total_bytes: number | null
          total_chars: number | null
          total_rows: number | null
          used_last_24h: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_agent_daily_stats: {
        Args: { target_date: string }
        Returns: undefined
      }
      apply_learning_event: {
        Args: { p_applied_by?: string; p_event_id: number }
        Returns: boolean
      }
      complete_agent_execution: {
        Args: {
          p_duration_ms: number
          p_log_id: number
          p_response_data?: Json
          p_status: string
        }
        Returns: undefined
      }
      create_learning_event: {
        Args: {
          p_action_params?: Json
          p_event_type: string
          p_execution_log_id: number
          p_suggested_action: string
          p_trigger_condition: string
        }
        Returns: number
      }
      current_user_id: { Args: never; Returns: string }
      detect_knowledge_gaps: {
        Args: never
        Returns: {
          avg_similarity: number
          category: string
          jurisdiction: string
          query_count: number
          query_pattern: string
        }[]
      }
      enforce_rate_limit: {
        Args: {
          p_limit: number
          p_org_id: string
          p_resource: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          request_count: number
        }[]
      }
      get_context_chunks: {
        Args: {
          after_count?: number
          before_count?: number
          target_chunk_id: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          heading: string
          section_path: string
        }[]
      }
      get_document_context: {
        Args: { context_window?: number; target_chunk_id: string }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          distance_from_target: number
          heading: string
          section_path: string
        }[]
      }
      get_ingestion_stats: {
        Args: { job_id_param?: string }
        Returns: {
          chunks_count: number
          duration_seconds: number
          embeddings_count: number
          files_count: number
          finished_at: string
          job_id: string
          source_name: string
          started_at: string
          status: string
        }[]
      }
      get_learning_stats: { Args: { org_id: string }; Returns: Json }
      has_min_role:
        | {
            Args: { min: Database["public"]["Enums"]["org_role"]; org: string }
            Returns: boolean
          }
        | {
            Args: {
              min: Database["public"]["Enums"]["role_level"]
              org: string
            }
            Returns: boolean
          }
      hybrid_search_chunks: {
        Args: {
          p_knowledge_sources?: string[]
          p_limit?: number
          p_org_id: string
          p_query_embedding: string
          p_query_text: string
          p_semantic_weight?: number
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          combined_score: number
          content: string
          document_id: string
          document_name: string
          keyword_score: number
          knowledge_source_id: string
          metadata: Json
          semantic_score: number
          source_name: string
        }[]
      }
      is_member_of: { Args: { org: string }; Returns: boolean }
      keyword_search_chunks: {
        Args: {
          filter_jurisdiction_id?: string
          match_count?: number
          search_query: string
        }
        Returns: {
          authority_level: string
          chunk_id: string
          content: string
          document_code: string
          document_title: string
          rank: number
          section_path: string
          source_name: string
        }[]
      }
      log_agent_execution: {
        Args: {
          p_agent_category: string
          p_agent_id: string
          p_agent_name: string
          p_agent_version: string
          p_organization_id?: string
          p_session_id?: string
          p_user_id?: string
          p_user_query: string
        }
        Returns: number
      }
      log_agent_query: {
        Args: {
          p_agent_name: string
          p_jurisdiction_id?: string
          p_latency_ms?: number
          p_metadata?: Json
          p_query_text: string
          p_response_summary: string
          p_top_chunk_ids: string[]
          p_user_id: string
        }
        Returns: number
      }
      log_reasoning_trace: {
        Args: {
          p_agent_id: string
          p_citations: Json
          p_confidence_score: number
          p_deep_search_triggered?: boolean
          p_final_answer: string
          p_guardrail_actions?: Json
          p_guardrails_triggered?: string[]
          p_org_id: string
          p_query_text: string
          p_reasoning_steps: Json
          p_sources_consulted: string[]
        }
        Returns: string
      }
      match_kb_documents: {
        Args: {
          filter_category?: string
          filter_jurisdictions?: string[]
          filter_tags?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          jurisdiction: string
          metadata: Json
          similarity: number
          tags: string[]
        }[]
      }
      match_knowledge_chunks:
        | {
            Args: {
              filter?: Json
              match_count?: number
              query_embedding: string
            }
            Returns: {
              authority_level: string
              chunk_id: string
              content: string
              document_code: string
              document_id: string
              document_title: string
              effective_from: string
              effective_to: string
              heading: string
              jurisdiction_code: string
              section_path: string
              similarity: number
              source_name: string
              source_type: string
            }[]
          }
        | {
            Args: {
              filter_category?: string
              filter_jurisdiction?: string
              match_count: number
              query_embedding: string
            }
            Returns: {
              category: string
              chunk_index: number
              content: string
              id: number
              jurisdiction_code: string
              page_id: string
              page_url: string
              similarity: number
              source_id: string
              source_name: string
              tags: string[]
            }[]
          }
      match_vectors: {
        Args: {
          filter?: Json
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
      optimize_rag_parameters: {
        Args: { p_agent_id: string }
        Returns: {
          current_limit: number
          current_threshold: number
          expected_improvement_pct: number
          optimized_limit: number
          optimized_threshold: number
        }[]
      }
      refresh_agent_performance_metrics: { Args: never; Returns: undefined }
      search_curated_knowledge: {
        Args: {
          p_domains?: string[]
          p_jurisdictions?: string[]
          p_limit?: number
          p_min_similarity?: number
          p_org_id: string
          p_query_embedding: string
          p_standard_types?: Database["public"]["Enums"]["knowledge_standard_type"][]
        }
        Returns: {
          full_text: string
          is_outdated: boolean
          jurisdiction: string[]
          knowledge_id: string
          section_key: string
          similarity_score: number
          source_priority: Database["public"]["Enums"]["knowledge_source_priority"]
          source_url: string
          standard_type: Database["public"]["Enums"]["knowledge_standard_type"]
          summary: string
          tags: string[]
          title: string
          verification_level: Database["public"]["Enums"]["knowledge_verification_level"]
        }[]
      }
      search_knowledge_chunks: {
        Args: {
          filter_jurisdiction_id?: string
          filter_types?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          authority_level: string
          chunk_id: string
          content: string
          document_code: string
          document_id: string
          document_title: string
          jurisdiction_code: string
          section_path: string
          similarity: number
          source_name: string
          source_type: string
        }[]
      }
      search_knowledge_chunks_keyword: {
        Args: { filter?: Json; match_count?: number; search_query: string }
        Returns: {
          authority_level: string
          chunk_id: string
          content: string
          document_code: string
          document_id: string
          document_title: string
          heading: string
          jurisdiction_code: string
          section_path: string
          source_name: string
          source_type: string
        }[]
      }
      search_knowledge_semantic: {
        Args: {
          filter_authority_levels?: string[]
          filter_jurisdiction_id?: string
          filter_types?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          authority_level: string
          chunk_id: string
          content: string
          document_code: string
          document_id: string
          document_title: string
          heading: string
          jurisdiction_code: string
          section_path: string
          similarity: number
          source_name: string
          source_type: string
        }[]
      }
      semantic_search_chunks: {
        Args: {
          p_knowledge_sources?: string[]
          p_limit?: number
          p_org_id: string
          p_query_embedding: string
          p_similarity_threshold?: number
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_name: string
          knowledge_source_id: string
          metadata: Json
          similarity_score: number
          source_name: string
        }[]
      }
      should_trigger_deep_search: {
        Args: {
          p_domain: string
          p_has_jurisdiction_match?: boolean
          p_max_source_age_days?: number
          p_org_id: string
          p_sources_found: number
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      suggest_classification_improvements: {
        Args: never
        Returns: {
          confidence: number
          current_category: string
          query: string
          reason: string
          suggested_category: string
        }[]
      }
      update_ckb_usage: {
        Args: { p_knowledge_ids: string[] }
        Returns: undefined
      }
      update_dataset_stats: {
        Args: { dataset_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      acceptance_decision: "ACCEPT" | "DECLINE"
      acceptance_status: "DRAFT" | "APPROVED" | "REJECTED"
      ada_exception_disposition: "OPEN" | "INVESTIGATING" | "RESOLVED"
      ada_run_kind: "JE" | "RATIO" | "VARIANCE" | "DUPLICATE" | "BENFORD"
      agent_action_status: "PENDING" | "SUCCESS" | "ERROR" | "BLOCKED"
      agent_orchestration_status:
        | "PENDING"
        | "RUNNING"
        | "WAITING_APPROVAL"
        | "COMPLETED"
        | "FAILED"
      agent_run_state: "PLANNING" | "EXECUTING" | "DONE" | "ERROR"
      agent_task_status:
        | "PENDING"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "AWAITING_APPROVAL"
        | "COMPLETED"
        | "FAILED"
      agent_trace_type: "INFO" | "TOOL" | "ERROR"
      approval_stage: "MANAGER" | "PARTNER" | "EQR"
      approval_status:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "CANCELLED"
        | "CHANGES_REQUESTED"
      audit_risk_category:
        | "FINANCIAL_STATEMENT"
        | "FRAUD"
        | "CONTROL"
        | "IT"
        | "GOING_CONCERN"
        | "COMPLIANCE"
        | "ESTIMATE"
        | "OTHER"
      autonomy_level: "L0" | "L1" | "L2" | "L3"
      background_risk_rating: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
      cit_refund_profile: "6_7" | "5_7" | "2_3" | "NONE"
      close_period_status:
        | "OPEN"
        | "SUBSTANTIVE_REVIEW"
        | "READY_TO_LOCK"
        | "LOCKED"
      control_frequency:
        | "DAILY"
        | "WEEKLY"
        | "MONTHLY"
        | "QUARTERLY"
        | "ANNUAL"
        | "EVENT_DRIVEN"
      control_test_result: "PASS" | "EXCEPTIONS"
      control_walkthrough_result:
        | "DESIGNED"
        | "NOT_DESIGNED"
        | "IMPLEMENTED"
        | "NOT_IMPLEMENTED"
      dac6_hallmark_category: "A" | "B" | "C" | "D" | "E"
      dac6_submission_status:
        | "DRAFT"
        | "READY_FOR_SUBMISSION"
        | "SUBMITTED"
        | "REJECTED"
      deficiency_severity: "LOW" | "MEDIUM" | "HIGH"
      deficiency_status: "OPEN" | "MONITORING" | "CLOSED"
      denylist_action: "deny" | "deboost"
      engagement_status: "planned" | "active" | "completed" | "archived"
      estimate_uncertainty_level: "LOW" | "MODERATE" | "HIGH" | "SIGNIFICANT"
      fraud_plan_status: "DRAFT" | "READY_FOR_APPROVAL" | "LOCKED"
      going_concern_assessment:
        | "STABLE"
        | "SIGNIFICANT_DOUBT"
        | "MATERIAL_UNCERTAINTY"
      independence_conclusion: "OK" | "SAFEGUARDS_REQUIRED" | "PROHIBITED"
      itgc_group_type: "ACCESS" | "CHANGE" | "OPERATIONS"
      je_control_rule:
        | "LATE_POSTING"
        | "WEEKEND_USER"
        | "ROUND_AMOUNT"
        | "MANUAL_TO_SENSITIVE"
        | "MISSING_ATTACHMENT"
      je_control_severity: "LOW" | "MEDIUM" | "HIGH"
      kam_candidate_source: "RISK" | "ESTIMATE" | "GOING_CONCERN" | "OTHER"
      kam_candidate_status: "CANDIDATE" | "SELECTED" | "EXCLUDED"
      kam_draft_status: "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "REJECTED"
      knowledge_source_priority:
        | "authoritative"
        | "regulatory"
        | "interpretive"
        | "supplementary"
      knowledge_standard_type:
        | "IFRS"
        | "IAS"
        | "IFRIC"
        | "ISA"
        | "GAAP"
        | "TAX_LAW"
        | "ACCA"
        | "CPA"
        | "OECD"
        | "INTERNAL"
        | "SECONDARY"
        | "REGULATORY"
        | "CASE_STUDY"
        | "TEMPLATE"
        | "CALCULATOR"
      knowledge_verification_level: "primary" | "secondary" | "tertiary"
      learning_job_kind:
        | "query_hint_add"
        | "guardrail_tune"
        | "canonicalizer_update"
        | "denylist_update"
        | "rollback_policy"
      learning_job_status:
        | "PENDING"
        | "READY"
        | "IN_PROGRESS"
        | "APPLIED"
        | "FAILED"
        | "ROLLED_BACK"
      ledger_account_type:
        | "ASSET"
        | "LIABILITY"
        | "EQUITY"
        | "REVENUE"
        | "EXPENSE"
      org_role: "admin" | "manager" | "staff" | "client"
      reconciliation_item_category:
        | "DIT"
        | "OC"
        | "UNAPPLIED_RECEIPT"
        | "UNAPPLIED_PAYMENT"
        | "TIMING"
        | "ERROR"
        | "OTHER"
      reconciliation_status:
        | "DRAFT"
        | "IN_PROGRESS"
        | "READY_FOR_REVIEW"
        | "CLOSED"
      reconciliation_type: "BANK" | "AR" | "AP" | "GRNI" | "PAYROLL" | "OTHER"
      response_status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      response_type:
        | "CONTROL"
        | "SUBSTANTIVE"
        | "ANALYTICS"
        | "SAMPLING"
        | "OTHER"
      risk_rating: "LOW" | "MODERATE" | "HIGH" | "SIGNIFICANT"
      risk_status: "OPEN" | "MONITORED" | "CLOSED"
      role_level: "EMPLOYEE" | "MANAGER" | "SYSTEM_ADMIN"
      severity_level: "info" | "warn" | "error"
      tax_account_type: "MTA" | "FIA" | "IPA" | "FTA" | "UA"
      tax_dispute_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "RESOLVED"
        | "CLOSED"
      us_overlay_type: "GILTI" | "163J" | "CAMT" | "EXCISE_4501"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      acceptance_decision: ["ACCEPT", "DECLINE"],
      acceptance_status: ["DRAFT", "APPROVED", "REJECTED"],
      ada_exception_disposition: ["OPEN", "INVESTIGATING", "RESOLVED"],
      ada_run_kind: ["JE", "RATIO", "VARIANCE", "DUPLICATE", "BENFORD"],
      agent_action_status: ["PENDING", "SUCCESS", "ERROR", "BLOCKED"],
      agent_orchestration_status: [
        "PENDING",
        "RUNNING",
        "WAITING_APPROVAL",
        "COMPLETED",
        "FAILED",
      ],
      agent_run_state: ["PLANNING", "EXECUTING", "DONE", "ERROR"],
      agent_task_status: [
        "PENDING",
        "ASSIGNED",
        "IN_PROGRESS",
        "AWAITING_APPROVAL",
        "COMPLETED",
        "FAILED",
      ],
      agent_trace_type: ["INFO", "TOOL", "ERROR"],
      approval_stage: ["MANAGER", "PARTNER", "EQR"],
      approval_status: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "CHANGES_REQUESTED",
      ],
      audit_risk_category: [
        "FINANCIAL_STATEMENT",
        "FRAUD",
        "CONTROL",
        "IT",
        "GOING_CONCERN",
        "COMPLIANCE",
        "ESTIMATE",
        "OTHER",
      ],
      autonomy_level: ["L0", "L1", "L2", "L3"],
      background_risk_rating: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
      cit_refund_profile: ["6_7", "5_7", "2_3", "NONE"],
      close_period_status: [
        "OPEN",
        "SUBSTANTIVE_REVIEW",
        "READY_TO_LOCK",
        "LOCKED",
      ],
      control_frequency: [
        "DAILY",
        "WEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "ANNUAL",
        "EVENT_DRIVEN",
      ],
      control_test_result: ["PASS", "EXCEPTIONS"],
      control_walkthrough_result: [
        "DESIGNED",
        "NOT_DESIGNED",
        "IMPLEMENTED",
        "NOT_IMPLEMENTED",
      ],
      dac6_hallmark_category: ["A", "B", "C", "D", "E"],
      dac6_submission_status: [
        "DRAFT",
        "READY_FOR_SUBMISSION",
        "SUBMITTED",
        "REJECTED",
      ],
      deficiency_severity: ["LOW", "MEDIUM", "HIGH"],
      deficiency_status: ["OPEN", "MONITORING", "CLOSED"],
      denylist_action: ["deny", "deboost"],
      engagement_status: ["planned", "active", "completed", "archived"],
      estimate_uncertainty_level: ["LOW", "MODERATE", "HIGH", "SIGNIFICANT"],
      fraud_plan_status: ["DRAFT", "READY_FOR_APPROVAL", "LOCKED"],
      going_concern_assessment: [
        "STABLE",
        "SIGNIFICANT_DOUBT",
        "MATERIAL_UNCERTAINTY",
      ],
      independence_conclusion: ["OK", "SAFEGUARDS_REQUIRED", "PROHIBITED"],
      itgc_group_type: ["ACCESS", "CHANGE", "OPERATIONS"],
      je_control_rule: [
        "LATE_POSTING",
        "WEEKEND_USER",
        "ROUND_AMOUNT",
        "MANUAL_TO_SENSITIVE",
        "MISSING_ATTACHMENT",
      ],
      je_control_severity: ["LOW", "MEDIUM", "HIGH"],
      kam_candidate_source: ["RISK", "ESTIMATE", "GOING_CONCERN", "OTHER"],
      kam_candidate_status: ["CANDIDATE", "SELECTED", "EXCLUDED"],
      kam_draft_status: ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "REJECTED"],
      knowledge_source_priority: [
        "authoritative",
        "regulatory",
        "interpretive",
        "supplementary",
      ],
      knowledge_standard_type: [
        "IFRS",
        "IAS",
        "IFRIC",
        "ISA",
        "GAAP",
        "TAX_LAW",
        "ACCA",
        "CPA",
        "OECD",
        "INTERNAL",
        "SECONDARY",
        "REGULATORY",
        "CASE_STUDY",
        "TEMPLATE",
        "CALCULATOR",
      ],
      knowledge_verification_level: ["primary", "secondary", "tertiary"],
      learning_job_kind: [
        "query_hint_add",
        "guardrail_tune",
        "canonicalizer_update",
        "denylist_update",
        "rollback_policy",
      ],
      learning_job_status: [
        "PENDING",
        "READY",
        "IN_PROGRESS",
        "APPLIED",
        "FAILED",
        "ROLLED_BACK",
      ],
      ledger_account_type: [
        "ASSET",
        "LIABILITY",
        "EQUITY",
        "REVENUE",
        "EXPENSE",
      ],
      org_role: ["admin", "manager", "staff", "client"],
      reconciliation_item_category: [
        "DIT",
        "OC",
        "UNAPPLIED_RECEIPT",
        "UNAPPLIED_PAYMENT",
        "TIMING",
        "ERROR",
        "OTHER",
      ],
      reconciliation_status: [
        "DRAFT",
        "IN_PROGRESS",
        "READY_FOR_REVIEW",
        "CLOSED",
      ],
      reconciliation_type: ["BANK", "AR", "AP", "GRNI", "PAYROLL", "OTHER"],
      response_status: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      response_type: [
        "CONTROL",
        "SUBSTANTIVE",
        "ANALYTICS",
        "SAMPLING",
        "OTHER",
      ],
      risk_rating: ["LOW", "MODERATE", "HIGH", "SIGNIFICANT"],
      risk_status: ["OPEN", "MONITORED", "CLOSED"],
      role_level: ["EMPLOYEE", "MANAGER", "SYSTEM_ADMIN"],
      severity_level: ["info", "warn", "error"],
      tax_account_type: ["MTA", "FIA", "IPA", "FTA", "UA"],
      tax_dispute_status: [
        "OPEN",
        "IN_PROGRESS",
        "SUBMITTED",
        "RESOLVED",
        "CLOSED",
      ],
      us_overlay_type: ["GILTI", "163J", "CAMT", "EXCISE_4501"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.67.1 (currently installed v2.65.5)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
