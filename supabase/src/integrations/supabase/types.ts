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
      approval_queue: {
        Row: {
          assignee_user_id: string | null
          candidate_id: string | null
          created_at: string
          created_by_user_id: string
          draft_id: string | null
          engagement_id: string
          id: string
          kind: string
          org_id: string
          payload: Json
          resolved_at: string | null
          resolved_by_user_id: string | null
          resolution_note: string | null
          stage: Database["public"]["Enums"]["approval_stage"]
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          updated_by_user_id: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          assignee_user_id?: string | null
          candidate_id?: string | null
          created_at?: string
          created_by_user_id: string
          draft_id?: string | null
          engagement_id: string
          id?: string
          kind: string
          org_id: string
          payload?: Json
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          resolution_note?: string | null
          stage: Database["public"]["Enums"]["approval_stage"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          updated_by_user_id?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          assignee_user_id?: string | null
          candidate_id?: string | null
          created_at?: string
          created_by_user_id?: string
          draft_id?: string | null
          engagement_id?: string
          id?: string
          kind?: string
          org_id?: string
          payload?: Json
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          resolution_note?: string | null
          stage?: Database["public"]["Enums"]["approval_stage"]
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          updated_by_user_id?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
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
        ]
      }
      audit_evidence: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          engagement_id: string
          id: string
          obtained_at: string | null
          org_id: string
          procedure_id: string | null
          updated_at: string
          updated_by_user_id: string | null
          workpaper_id: string | null
          document_id: string | null
          prepared_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          engagement_id: string
          id?: string
          obtained_at?: string | null
          org_id: string
          procedure_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          workpaper_id?: string | null
          document_id?: string | null
          prepared_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          engagement_id?: string
          id?: string
          obtained_at?: string | null
          org_id?: string
          procedure_id?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          workpaper_id?: string | null
          document_id?: string | null
          prepared_by_user_id?: string | null
        }
        Relationships: [
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
          {
            foreignKeyName: "audit_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_report_drafts: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          basis_for_opinion: string | null
          created_at: string
          created_by_user_id: string
          draft_html: string | null
          engagement_id: string
          eqr_approved_at: string | null
          eqr_approved_by_user_id: string | null
          gc_disclosure_required: boolean
          id: string
          include_eom: boolean
          include_om: boolean
          incorporate_kams: boolean
          kam_ids: string[]
          om_text: string | null
          opinion: Database["public"]["Enums"]["audit_opinion"]
          org_id: string
          status: string
          updated_at: string
          updated_by_user_id: string | null
          eom_text: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          basis_for_opinion?: string | null
          created_at?: string
          created_by_user_id: string
          draft_html?: string | null
          engagement_id: string
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
          gc_disclosure_required?: boolean
          id?: string
          include_eom?: boolean
          include_om?: boolean
          incorporate_kams?: boolean
          kam_ids?: string[]
          om_text?: string | null
          opinion?: Database["public"]["Enums"]["audit_opinion"]
          org_id: string
          status?: string
          updated_at?: string
          updated_by_user_id?: string | null
          eom_text?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          basis_for_opinion?: string | null
          created_at?: string
          created_by_user_id?: string
          draft_html?: string | null
          engagement_id?: string
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
          gc_disclosure_required?: boolean
          id?: string
          include_eom?: boolean
          include_om?: boolean
          incorporate_kams?: boolean
          kam_ids?: string[]
          om_text?: string | null
          opinion?: Database["public"]["Enums"]["audit_opinion"]
          org_id?: string
          status?: string
          updated_at?: string
          updated_by_user_id?: string | null
          eom_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_report_drafts_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_report_drafts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_archives: {
        Row: {
          created_at: string
          engagement_id: string
          id: string
          manifest: Json
          org_id: string
          sha256: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          engagement_id: string
          id?: string
          manifest?: Json
          org_id: string
          sha256?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          engagement_id?: string
          id?: string
          manifest?: Json
          org_id?: string
          sha256?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_archives_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_archives_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      controls: {
        Row: {
          cycle: string
          created_at: string
          created_by_user_id: string
          description: string | null
          engagement_id: string
          frequency: string | null
          id: string
          key: boolean
          objective: string
          org_id: string
          owner: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          cycle: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          engagement_id: string
          frequency?: string | null
          id?: string
          key?: boolean
          objective: string
          org_id: string
          owner?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          cycle?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          engagement_id?: string
          frequency?: string | null
          id?: string
          key?: boolean
          objective?: string
          org_id?: string
          owner?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
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
      control_walkthroughs: {
        Row: {
          control_id: string
          created_at: string
          created_by_user_id: string
          engagement_id: string
          id: string
          notes: string | null
          org_id: string
          procedure_id: string | null
          result: Database["public"]["Enums"]["control_walkthrough_result"]
          walk_date: string
        }
        Insert: {
          control_id: string
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          id?: string
          notes?: string | null
          org_id: string
          procedure_id?: string | null
          result: Database["public"]["Enums"]["control_walkthrough_result"]
          walk_date: string
        }
        Update: {
          control_id?: string
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          procedure_id?: string | null
          result?: Database["public"]["Enums"]["control_walkthrough_result"]
          walk_date?: string
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
            foreignKeyName: "control_walkthroughs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_walkthroughs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_walkthroughs_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_planned_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      control_tests: {
        Row: {
          attributes: Json
          control_id: string
          created_at: string
          created_by_user_id: string
          engagement_id: string
          id: string
          org_id: string
          procedure_id: string | null
          result: Database["public"]["Enums"]["control_test_result"]
          sample_plan_ref: string | null
        }
        Insert: {
          attributes?: Json
          control_id: string
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          id?: string
          org_id: string
          procedure_id?: string | null
          result: Database["public"]["Enums"]["control_test_result"]
          sample_plan_ref?: string | null
        }
        Update: {
          attributes?: Json
          control_id?: string
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          id?: string
          org_id?: string
          procedure_id?: string | null
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
            foreignKeyName: "control_tests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_tests_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_planned_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      itgc_groups: {
        Row: {
          created_at: string
          created_by_user_id: string
          engagement_id: string | null
          id: string
          notes: string | null
          org_id: string
          scope: string | null
          type: Database["public"]["Enums"]["itgc_type"]
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          engagement_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          scope?: string | null
          type: Database["public"]["Enums"]["itgc_type"]
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          scope?: string | null
          type?: Database["public"]["Enums"]["itgc_type"]
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
      client_background_checks: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          notes: string | null
          org_id: string
          risk_rating: Database["public"]["Enums"]["background_risk_rating"]
          screenings: Json
          client_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          notes?: string | null
          org_id: string
          risk_rating?: Database["public"]["Enums"]["background_risk_rating"]
          screenings?: Json
          client_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          risk_rating?: Database["public"]["Enums"]["background_risk_rating"]
          screenings?: Json
          client_id?: string
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
      deficiencies: {
        Row: {
          control_id: string | null
          created_at: string
          created_by_user_id: string
          engagement_id: string
          id: string
          org_id: string
          recommendation: string
          severity: Database["public"]["Enums"]["deficiency_severity"]
          status: Database["public"]["Enums"]["deficiency_status"]
          updated_at: string
          procedure_id: string | null
        }
        Insert: {
          control_id?: string | null
          created_at?: string
          created_by_user_id: string
          engagement_id: string
          id?: string
          org_id: string
          recommendation: string
          severity: Database["public"]["Enums"]["deficiency_severity"]
          status?: Database["public"]["Enums"]["deficiency_status"]
          updated_at?: string
          procedure_id?: string | null
        }
        Update: {
          control_id?: string | null
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
          id?: string
          org_id?: string
          recommendation?: string
          severity?: Database["public"]["Enums"]["deficiency_severity"]
          status?: Database["public"]["Enums"]["deficiency_status"]
          updated_at?: string
          procedure_id?: string | null
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
          {
            foreignKeyName: "deficiencies_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_planned_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      independence_assessments: {
        Row: {
          conclusion: Database["public"]["Enums"]["independence_conclusion"]
          id: string
          org_id: string
          client_id: string
          prepared_at: string
          prepared_by_user_id: string
          safeguards: Json
          threats: Json
          updated_at: string
        }
        Insert: {
          conclusion?: Database["public"]["Enums"]["independence_conclusion"]
          id?: string
          org_id: string
          client_id: string
          prepared_at?: string
          prepared_by_user_id: string
          safeguards?: Json
          threats?: Json
          updated_at?: string
        }
        Update: {
          conclusion?: Database["public"]["Enums"]["independence_conclusion"]
          id?: string
          org_id?: string
          client_id?: string
          prepared_at?: string
          prepared_by_user_id?: string
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
          {
            foreignKeyName: "engagements_materiality_set_id_fkey"
            columns: ["materiality_set_id"]
            isOneToOne: false
            referencedRelation: "materiality_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      acceptance_decisions: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          created_at: string
          created_by_user_id: string
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
          created_by_user_id: string
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
          created_by_user_id?: string
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
            isOneToOne: false
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
          eqr_approved_at: string | null
          eqr_approved_by_user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          candidate_id: string
          created_at?: string
          created_by_user_id: string
          engagement_id: string
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
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          candidate_id?: string
          created_at?: string
          created_by_user_id?: string
          engagement_id?: string
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
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
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
      tcwg_packs: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          corrected_misstatements: Json
          created_at: string
          created_by_user_id: string
          deficiencies: Json
          engagement_id: string
          eqr_approved_at: string | null
          eqr_approved_by_user_id: string | null
          going_concern_summary: Json
          id: string
          independence_statement: string | null
          kam_summary: Json
          org_id: string
          other_matters: string | null
          pdf_document_id: string | null
          report_draft_id: string | null
          scope_summary: string | null
          significant_difficulties: string | null
          significant_findings: string | null
          status: Database["public"]["Enums"]["tcwg_pack_status"]
          subsequent_events_summary: Json
          uncorrected_misstatements: Json
          updated_at: string
          updated_by_user_id: string | null
          zip_document_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          corrected_misstatements?: Json
          created_at?: string
          created_by_user_id: string
          deficiencies?: Json
          engagement_id: string
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
          going_concern_summary?: Json
          id?: string
          independence_statement?: string | null
          kam_summary?: Json
          org_id: string
          other_matters?: string | null
          pdf_document_id?: string | null
          report_draft_id?: string | null
          scope_summary?: string | null
          significant_difficulties?: string | null
          significant_findings?: string | null
          status?: Database["public"]["Enums"]["tcwg_pack_status"]
          subsequent_events_summary?: Json
          uncorrected_misstatements?: Json
          updated_at?: string
          updated_by_user_id?: string | null
          zip_document_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          corrected_misstatements?: Json
          created_at?: string
          created_by_user_id?: string
          deficiencies?: Json
          engagement_id?: string
          eqr_approved_at?: string | null
          eqr_approved_by_user_id?: string | null
          going_concern_summary?: Json
          id?: string
          independence_statement?: string | null
          kam_summary?: Json
          org_id?: string
          other_matters?: string | null
          pdf_document_id?: string | null
          report_draft_id?: string | null
          scope_summary?: string | null
          significant_difficulties?: string | null
          significant_findings?: string | null
          status?: Database["public"]["Enums"]["tcwg_pack_status"]
          subsequent_events_summary?: Json
          uncorrected_misstatements?: Json
          updated_at?: string
          updated_by_user_id?: string | null
          zip_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tcwg_packs_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcwg_packs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tcwg_packs_report_draft_id_fkey"
            columns: ["report_draft_id"]
            isOneToOne: false
            referencedRelation: "audit_report_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      pbc_requests: {
        Row: {
          assignee_client_user_id: string | null
          created_at: string
          created_by_user_id: string
          cycle: string
          description: string | null
          due_at: string | null
          engagement_id: string
          id: string
          item: string
          org_id: string
          procedure_id: string | null
          status: Database["public"]["Enums"]["pbc_request_status"]
          updated_at: string
        }
        Insert: {
          assignee_client_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          cycle: string
          description?: string | null
          due_at?: string | null
          engagement_id: string
          id?: string
          item: string
          org_id: string
          procedure_id?: string | null
          status?: Database["public"]["Enums"]["pbc_request_status"]
          updated_at?: string
        }
        Update: {
          assignee_client_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          cycle?: string
          description?: string | null
          due_at?: string | null
          engagement_id?: string
          id?: string
          item?: string
          org_id?: string
          procedure_id?: string | null
          status?: Database["public"]["Enums"]["pbc_request_status"]
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
          {
            foreignKeyName: "pbc_requests_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "audit_planned_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      pbc_deliveries: {
        Row: {
          created_at: string
          created_by_user_id: string
          delivered_at: string
          document_id: string | null
          id: string
          note: string | null
          org_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          delivered_at?: string
          document_id?: string | null
          id?: string
          note?: string | null
          org_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          delivered_at?: string
          document_id?: string | null
          id?: string
          note?: string | null
          org_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pbc_deliveries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pbc_deliveries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pbc_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pbc_deliveries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
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
      risks: {
        Row: {
          assertion: string | null
          area: string | null
          created_at: string
          description: string | null
          engagement_id: string
          id: string
          is_fraud_risk: boolean
          is_significant: boolean
          impact: number | null
          likelihood: number | null
          org_id: string
          response_plan: Json | null
          updated_at: string
        }
        Insert: {
          assertion?: string | null
          area?: string | null
          created_at?: string
          description?: string | null
          engagement_id: string
          id?: string
          is_fraud_risk?: boolean
          is_significant?: boolean
          impact?: number | null
          likelihood?: number | null
          org_id: string
          response_plan?: Json | null
          updated_at?: string
        }
        Update: {
          assertion?: string | null
          area?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string
          id?: string
          is_fraud_risk?: boolean
          is_significant?: boolean
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
      audit_opinion: "UNMODIFIED" | "QUALIFIED" | "ADVERSE" | "DISCLAIMER"
      audit_opinion: "UNMODIFIED" | "QUALIFIED" | "ADVERSE" | "DISCLAIMER"
      approval_stage: "MANAGER" | "PARTNER" | "EQR"
      approval_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
      engagement_status: "planned" | "active" | "completed" | "archived"
      org_role: "admin" | "manager" | "staff" | "client"
      role_level: "EMPLOYEE" | "MANAGER" | "SYSTEM_ADMIN"
      severity_level: "info" | "warn" | "error"
      estimate_uncertainty_level: "LOW" | "MODERATE" | "HIGH" | "SIGNIFICANT"
      going_concern_assessment: "STABLE" | "SIGNIFICANT_DOUBT" | "MATERIAL_UNCERTAINTY"
      kam_candidate_source: "RISK" | "ESTIMATE" | "GOING_CONCERN" | "OTHER"
      kam_candidate_status: "CANDIDATE" | "SELECTED" | "EXCLUDED"
      kam_draft_status: "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "REJECTED"
      tcwg_pack_status: "DRAFT" | "READY_FOR_REVIEW" | "APPROVED" | "SENT"
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
      audit_opinion: ["UNMODIFIED", "QUALIFIED", "ADVERSE", "DISCLAIMER"],
      acceptance_decision: ["ACCEPT", "DECLINE"],
      acceptance_status: ["DRAFT", "APPROVED", "REJECTED"],
      approval_stage: ["MANAGER", "PARTNER", "EQR"],
      approval_status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      engagement_status: ["planned", "active", "completed", "archived"],
      background_risk_rating: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"],
      org_role: ["admin", "manager", "staff", "client"],
      role_level: ["EMPLOYEE", "MANAGER", "SYSTEM_ADMIN"],
      severity_level: ["info", "warn", "error"],
      estimate_uncertainty_level: ["LOW", "MODERATE", "HIGH", "SIGNIFICANT"],
      going_concern_assessment: ["STABLE", "SIGNIFICANT_DOUBT", "MATERIAL_UNCERTAINTY"],
      kam_candidate_source: ["RISK", "ESTIMATE", "GOING_CONCERN", "OTHER"],
      kam_candidate_status: ["CANDIDATE", "SELECTED", "EXCLUDED"],
      kam_draft_status: ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "REJECTED"],
      independence_conclusion: ["OK", "SAFEGUARDS_REQUIRED", "PROHIBITED"],
      tcwg_pack_status: ["DRAFT", "READY_FOR_REVIEW", "APPROVED", "SENT"],
      control_walkthrough_result: ["DESIGNED", "NOT_DESIGNED", "IMPLEMENTED", "NOT_IMPLEMENTED"],
      control_test_result: ["PASS", "EXCEPTIONS"],
      itgc_type: ["ACCESS", "CHANGE", "OPERATIONS"],
      deficiency_severity: ["LOW", "MEDIUM", "HIGH"],
      deficiency_status: ["OPEN", "REMEDIATION", "CLOSED"],
      pbc_request_status: ["REQUESTED", "RECEIVED", "REJECTED", "OBSOLETE"],
    },
  },
} as const
