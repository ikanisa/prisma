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
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          org_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
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
          id: string
          org_id: string
          steps: Json
          tax_due: number | null
          year: number
        }
        Insert: {
          id?: string
          org_id: string
          steps?: Json
          tax_due?: number | null
          year: number
        }
        Update: {
          id?: string
          org_id?: string
          steps?: Json
          tax_due?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cit_computations_org_id_fkey"
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
      engagement_status: "planned" | "active" | "completed" | "archived"
      org_role: "admin" | "manager" | "staff" | "client"
      role_level: "EMPLOYEE" | "MANAGER" | "SYSTEM_ADMIN"
      severity_level: "info" | "warn" | "error"
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
  public: {
    Enums: {
      engagement_status: ["planned", "active", "completed", "archived"],
      org_role: ["admin", "manager", "staff", "client"],
      role_level: ["EMPLOYEE", "MANAGER", "SYSTEM_ADMIN"],
      severity_level: ["info", "warn", "error"],
    },
  },
} as const
