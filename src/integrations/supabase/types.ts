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
      close_pbc_items: {
        Row: {
          area: string
          assignee_user_id: string | null
          created_at: string
          document_id: string | null
          due_at: string | null
          entity_id: string
          id: string
          note: string | null
          org_id: string
          period_id: string
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
          entity_id: string
          id?: string
          note?: string | null
          org_id: string
          period_id: string
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
          entity_id?: string
          id?: string
          note?: string | null
          org_id?: string
          period_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_pbc_items_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_pbc_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_pbc_items_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          end_date: string
          entity_id: string
          id: string
          locked_at: string | null
          locked_by_user_id: string | null
          name: string
          org_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          entity_id: string
          id?: string
          locked_at?: string | null
          locked_by_user_id?: string | null
          name: string
          org_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          entity_id?: string
          id?: string
          locked_at?: string | null
          locked_by_user_id?: string | null
          name?: string
          org_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "close_periods_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "close_periods_locked_by_user_id_fkey"
            columns: ["locked_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          created_at: string
          effective_from: string | null
          effective_to: string | null
          entity_id: string
          fs_line_id: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          basis?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          entity_id: string
          fs_line_id: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          basis?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          entity_id?: string
          fs_line_id?: string
          id?: string
          org_id?: string
          updated_at?: string
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
            referencedRelation: "clients"
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
      fs_lines: {
        Row: {
          basis: string
          code: string
          id: string
          label: string
          org_id: string
          parent_id: string | null
          sort_order: number
          statement: string
        }
        Insert: {
          basis?: string
          code: string
          id?: string
          label: string
          org_id: string
          parent_id?: string | null
          sort_order?: number
          statement: string
        }
        Update: {
          basis?: string
          code?: string
          id?: string
          label?: string
          org_id?: string
          parent_id?: string | null
          sort_order?: number
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
      journal_batches: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          attachment_id: string | null
          created_at: string
          entity_id: string
          id: string
          note: string | null
          org_id: string
          period_id: string | null
          posted_at: string | null
          prepared_by_user_id: string
          ref: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          attachment_id?: string | null
          created_at?: string
          entity_id: string
          id?: string
          note?: string | null
          org_id: string
          period_id?: string | null
          posted_at?: string | null
          prepared_by_user_id: string
          ref?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          attachment_id?: string | null
          created_at?: string
          entity_id?: string
          id?: string
          note?: string | null
          org_id?: string
          period_id?: string | null
          posted_at?: string | null
          prepared_by_user_id?: string
          ref?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_batches_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_batches_prepared_by_user_id_fkey"
            columns: ["prepared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      je_control_alerts: {
        Row: {
          batch_id: string | null
          created_at: string
          details: Json
          entity_id: string
          id: string
          org_id: string
          period_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by_user_id: string | null
          rule: string
          severity: string
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          details: Json
          entity_id: string
          id?: string
          org_id: string
          period_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          rule: string
          severity: string
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string
          id?: string
          org_id?: string
          period_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          rule?: string
          severity?: string
          updated_at?: string
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
            referencedRelation: "clients"
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
          {
            foreignKeyName: "je_control_alerts_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          id: string
          org_id: string
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          client_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          org_id: string
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          client_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          org_id?: string
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
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
      kams: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          org_id: string
          rationale: string | null
          references: Json | null
          title: string | null
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          org_id: string
          rationale?: string | null
          references?: Json | null
          title?: string | null
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          org_id?: string
          rationale?: string | null
          references?: Json | null
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
          type: string
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
          type: string
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
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          date: string
          debit: number
          description: string | null
          entity_id: string
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
          date: string
          debit?: number
          description?: string | null
          entity_id: string
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
          date?: string
          debit?: number
          description?: string | null
          entity_id?: string
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
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
      reconciliations: {
        Row: {
          closed_at: string | null
          control_account_id: string | null
          created_at: string
          difference: number
          entity_id: string
          external_balance: number
          gl_balance: number
          id: string
          org_id: string
          period_id: string
          prepared_by_user_id: string | null
          reviewed_by_user_id: string | null
          schedule_document_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          control_account_id?: string | null
          created_at?: string
          difference?: number
          entity_id: string
          external_balance?: number
          gl_balance?: number
          id?: string
          org_id: string
          period_id: string
          prepared_by_user_id?: string | null
          reviewed_by_user_id?: string | null
          schedule_document_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          control_account_id?: string | null
          created_at?: string
          difference?: number
          entity_id?: string
          external_balance?: number
          gl_balance?: number
          id?: string
          org_id?: string
          period_id?: string
          prepared_by_user_id?: string | null
          reviewed_by_user_id?: string | null
          schedule_document_id?: string | null
          status?: string
          type?: string
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
            referencedRelation: "clients"
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
          {
            foreignKeyName: "reconciliations_prepared_by_user_id_fkey"
            columns: ["prepared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_schedule_document_id_fkey"
            columns: ["schedule_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_items: {
        Row: {
          amount: number
          category: string
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
          category: string
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
          category?: string
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
          by_account: Json
          created_by_user_id: string | null
          entity_id: string
          id: string
          locked: boolean
          org_id: string
          period_id: string
          snapshot_at: string
          total_credits: number
          total_debits: number
        }
        Insert: {
          by_account: Json
          created_by_user_id?: string | null
          entity_id: string
          id?: string
          locked?: boolean
          org_id: string
          period_id: string
          snapshot_at?: string
          total_credits: number
          total_debits: number
        }
        Update: {
          by_account?: Json
          created_by_user_id?: string | null
          entity_id?: string
          id?: string
          locked?: boolean
          org_id?: string
          period_id?: string
          snapshot_at?: string
          total_credits?: number
          total_debits?: number
        }
        Relationships: [
          {
            foreignKeyName: "trial_balance_snapshots_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_snapshots_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_balance_snapshots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "close_periods"
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
          entity_id: string
          id: string
          org_id: string
          period_id: string
          rule_id: string
          status: string
          target_code: string
          updated_at: string
          value: number
          explanation: string | null
        }
        Insert: {
          baseline: number
          created_at?: string
          delta_abs: number
          delta_pct: number
          entity_id: string
          explanation?: string | null
          id?: string
          org_id: string
          period_id: string
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
          entity_id?: string
          explanation?: string | null
          id?: string
          org_id?: string
          period_id?: string
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
            referencedRelation: "clients"
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
          basis: string
          code: string
          compare_to: string
          created_at: string
          entity_id: string | null
          id: string
          label: string
          org_id: string
          scope: string
          threshold_abs: number | null
          threshold_pct: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          basis: string
          code: string
          compare_to: string
          created_at?: string
          entity_id?: string | null
          id?: string
          label: string
          org_id: string
          scope: string
          threshold_abs?: number | null
          threshold_pct?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          basis?: string
          code?: string
          compare_to?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          label?: string
          org_id?: string
          scope?: string
          threshold_abs?: number | null
          threshold_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variance_rules_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      webhook_events: {
        Row: {
          created_at: string
          hash: string
          id: number
        }
        Insert: {
          created_at?: string
          hash: string
          id?: number
        }
        Update: {
          created_at?: string
          hash?: string
          id?: number
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
      deficiency_severity: "LOW" | "MEDIUM" | "HIGH"
      ada_exception_disposition: "OPEN" | "INVESTIGATING" | "RESOLVED"
      ada_run_kind: "JE" | "RATIO" | "VARIANCE" | "DUPLICATE" | "BENFORD"
      deficiency_status: "OPEN" | "MONITORING" | "CLOSED"
      engagement_status: "planned" | "active" | "completed" | "archived"
      itgc_group_type: "ACCESS" | "CHANGE" | "OPERATIONS"
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
      ada_exception_disposition: ["OPEN", "INVESTIGATING", "RESOLVED"],
      ada_run_kind: ["JE", "RATIO", "VARIANCE", "DUPLICATE", "BENFORD"],
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
      deficiency_severity: ["LOW", "MEDIUM", "HIGH"],
      deficiency_status: ["OPEN", "MONITORING", "CLOSED"],
      engagement_status: ["planned", "active", "completed", "archived"],
      itgc_group_type: ["ACCESS", "CHANGE", "OPERATIONS"],
      org_role: ["admin", "manager", "staff", "client"],
      role_level: ["EMPLOYEE", "MANAGER", "SYSTEM_ADMIN"],
      severity_level: ["info", "warn", "error"],
    },
  },
} as const
