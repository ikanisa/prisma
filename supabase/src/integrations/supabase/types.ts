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
    PostgrestVersion: "13.0.4"
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
      agent_feedback: {
        Row: {
          agent_kind: string
          comment: string | null
          corrective_action: Json | null
          created_at: string | null
          id: string
          org_id: string
          rating: number | null
          session_id: string | null
          tags: string[] | null
        }
        Insert: {
          agent_kind: string
          comment?: string | null
          corrective_action?: Json | null
          created_at?: string | null
          id?: string
          org_id: string
          rating?: number | null
          session_id?: string | null
          tags?: string[] | null
        }
        Update: {
          agent_kind?: string
          comment?: string | null
          corrective_action?: Json | null
          created_at?: string | null
          id?: string
          org_id?: string
          rating?: number | null
          session_id?: string | null
          tags?: string[] | null
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
      agent_sessions: {
        Row: {
          ended_at: string | null
          id: string
          kind: string | null
          org_id: string
          started_at: string
          user_id: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          kind?: string | null
          org_id: string
          started_at?: string
          user_id?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          kind?: string | null
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
      controls: {
        Row: {
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          key_control: boolean
          org_id: string
          owner: string | null
          process: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          key_control?: boolean
          org_id: string
          owner?: string | null
          process?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          key_control?: boolean
          org_id?: string
          owner?: string | null
          process?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          engagement_id: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          org_id: string
          task_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          engagement_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          org_id: string
          task_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          engagement_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          org_id?: string
          task_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
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
            foreignKeyName: "documents_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          materiality_set_id: string | null
          org_id: string
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
          materiality_set_id?: string | null
          org_id: string
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
          materiality_set_id?: string | null
          org_id?: string
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
      idempotency_keys: {
        Row: {
          created_at: string
          key: string
          org_id: string
          route: string
        }
        Insert: {
          created_at?: string
          key: string
          org_id: string
          route: string
        }
        Update: {
          created_at?: string
          key?: string
          org_id?: string
          route?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_org_id_fkey"
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
      knowledge_sources: {
        Row: {
          checksum: string | null
          corpus_id: string
          created_at: string | null
          id: string
          last_sync_at: string | null
          provider: string
          source_uri: string
          state: Json | null
        }
        Insert: {
          checksum?: string | null
          corpus_id: string
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider: string
          source_uri: string
          state?: Json | null
        }
        Update: {
          checksum?: string | null
          corpus_id?: string
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: string
          source_uri?: string
          state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_corpus_id_fkey"
            columns: ["corpus_id"]
            isOneToOne: false
            referencedRelation: "knowledge_corpora"
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
          created_at: string | null
          id: string
          org_id: string
          role: Database["public"]["Enums"]["role_level"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["role_level"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          org_id: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          org_id: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          org_id?: string
          read?: boolean | null
          title?: string
          type?: string | null
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
      organizations: {
        Row: {
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string | null
          id: string
          name: string
          plan: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          id?: string
          name: string
          plan?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          id?: string
          name?: string
          plan?: string | null
          slug?: string
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
      pillar_two_computations: {
        Row: {
          created_at: string
          created_by: string | null
          gir_payload: Json
          gir_reference: string | null
          id: string
          input_payload: Json
          iir_top_up_tax: number
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
          input_payload?: Json
          iir_top_up_tax?: number
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
          input_payload?: Json
          iir_top_up_tax?: number
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
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          engagement_id: string | null
          id: string
          org_id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          engagement_id?: string | null
          id?: string
          org_id: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          engagement_id?: string | null
          id?: string
          org_id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
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
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      web_knowledge_sources: {
        Row: {
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
      workflow_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          input: Json | null
          org_id: string
          output: Json | null
          run_id: string
          status: string
          step_index: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          input?: Json | null
          org_id: string
          output?: Json | null
          run_id: string
          status?: string
          step_index: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          input?: Json | null
          org_id?: string
          output?: Json | null
          run_id?: string
          status?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          approvals: Json | null
          completed_at: string | null
          created_at: string
          current_step_index: number
          id: string
          org_id: string
          outputs: Json | null
          required_documents: Json | null
          started_at: string
          status: string
          total_steps: number
          trigger: string | null
          triggered_by: string | null
          updated_at: string
          workflow: string
        }
        Insert: {
          approvals?: Json | null
          completed_at?: string | null
          created_at?: string
          current_step_index?: number
          id?: string
          org_id: string
          outputs?: Json | null
          required_documents?: Json | null
          started_at?: string
          status?: string
          total_steps?: number
          trigger?: string | null
          triggered_by?: string | null
          updated_at?: string
          workflow: string
        }
        Update: {
          approvals?: Json | null
          completed_at?: string | null
          created_at?: string
          current_step_index?: number
          id?: string
          org_id?: string
          outputs?: Json | null
          required_documents?: Json | null
          started_at?: string
          status?: string
          total_steps?: number
          trigger?: string | null
          triggered_by?: string | null
          updated_at?: string
          workflow?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_min_role: {
        Args: { min: Database["public"]["Enums"]["role_level"]; org: string }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_member_of: {
        Args: { org: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      audit_risk_category:
        | "FINANCIAL_STATEMENT"
        | "FRAUD"
        | "CONTROL"
        | "IT"
        | "GOING_CONCERN"
        | "COMPLIANCE"
        | "ESTIMATE"
        | "OTHER"
      cit_refund_profile: "6_7" | "5_7" | "2_3" | "NONE"
      close_period_status:
        | "OPEN"
        | "SUBSTANTIVE_REVIEW"
        | "READY_TO_LOCK"
        | "LOCKED"
      engagement_status: "planned" | "active" | "completed" | "archived"
      fraud_plan_status: "DRAFT" | "READY_FOR_APPROVAL" | "LOCKED"
      je_control_rule:
        | "LATE_POSTING"
        | "WEEKEND_USER"
        | "ROUND_AMOUNT"
        | "MANUAL_TO_SENSITIVE"
        | "MISSING_ATTACHMENT"
      je_control_severity: "LOW" | "MEDIUM" | "HIGH"
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
      tax_dispute_status: "OPEN" | "IN_PROGRESS" | "SUBMITTED" | "RESOLVED" | "CLOSED"
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
      cit_refund_profile: ["6_7", "5_7", "2_3", "NONE"],
      close_period_status: [
        "OPEN",
        "SUBSTANTIVE_REVIEW",
        "READY_TO_LOCK",
        "LOCKED",
      ],
      engagement_status: ["planned", "active", "completed", "archived"],
      fraud_plan_status: ["DRAFT", "READY_FOR_APPROVAL", "LOCKED"],
      je_control_rule: [
        "LATE_POSTING",
        "WEEKEND_USER",
        "ROUND_AMOUNT",
        "MANUAL_TO_SENSITIVE",
        "MISSING_ATTACHMENT",
      ],
      je_control_severity: ["LOW", "MEDIUM", "HIGH"],
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
    },
  },
} as const
