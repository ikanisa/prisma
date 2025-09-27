      group_components: {
        Row: {
          component_code: string | null
          component_name: string
          component_type: string | null
          created_at: string | null
          engagement_id: string
          id: string
          jurisdiction: string | null
          lead_auditor: string | null
          materiality_scope: string | null
          metadata: Json | null
          org_id: string
          risk_level: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          component_code?: string | null
          component_name: string
          component_type?: string | null
          created_at?: string | null
          engagement_id: string
          id?: string
          jurisdiction?: string | null
          lead_auditor?: string | null
          materiality_scope?: string | null
          metadata?: Json | null
          org_id: string
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          component_code?: string | null
          component_name?: string
          component_type?: string | null
          created_at?: string | null
          engagement_id?: string
          id?: string
          jurisdiction?: string | null
          lead_auditor?: string | null
          materiality_scope?: string | null
          metadata?: Json | null
          org_id?: string
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_components_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_components_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      },

      group_instructions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          component_id: string
          created_at: string | null
          due_at: string | null
          engagement_id: string
          id: string
          instruction_body: string | null
          instruction_title: string
          metadata: Json | null
          org_id: string
          sent_at: string | null
          sent_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          component_id: string
          created_at?: string | null
          due_at?: string | null
          engagement_id: string
          id?: string
          instruction_body?: string | null
          instruction_title: string
          metadata?: Json | null
          org_id: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          component_id?: string
          created_at?: string | null
          due_at?: string | null
          engagement_id?: string
          id?: string
          instruction_body?: string | null
          instruction_title?: string
          metadata?: Json | null
          org_id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_instructions_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "group_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_instructions_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_instructions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      },

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
      },
