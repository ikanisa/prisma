export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_configs: {
        Row: {
          active: boolean | null
          assistant_id: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          system_prompt: string | null
          temperature: number | null
          tools_json: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          assistant_id: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          system_prompt?: string | null
          temperature?: number | null
          tools_json?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          assistant_id?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          system_prompt?: string | null
          temperature?: number | null
          tools_json?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_conversations: {
        Row: {
          id: string
          message: string | null
          role: string | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          message?: string | null
          role?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string | null
          role?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_documents: {
        Row: {
          agent_id: string | null
          created_at: string | null
          drive_file_id: string | null
          drive_mime: string | null
          embedding_ok: boolean | null
          id: string
          storage_path: string | null
          title: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          drive_mime?: string | null
          embedding_ok?: boolean | null
          id?: string
          storage_path?: string | null
          title?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          drive_mime?: string | null
          embedding_ok?: boolean | null
          id?: string
          storage_path?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_execution_log: {
        Row: {
          error_details: string | null
          execution_time_ms: number | null
          function_name: string | null
          id: string
          input_data: Json | null
          model_used: string | null
          success_status: boolean | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          error_details?: string | null
          execution_time_ms?: number | null
          function_name?: string | null
          id?: string
          input_data?: Json | null
          model_used?: string | null
          success_status?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          error_details?: string | null
          execution_time_ms?: number | null
          function_name?: string | null
          id?: string
          input_data?: Json | null
          model_used?: string | null
          success_status?: boolean | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_learning: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          source_detail: string | null
          source_type: string | null
          vectorize: boolean | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          source_detail?: string | null
          source_type?: string | null
          vectorize?: boolean | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          source_detail?: string | null
          source_type?: string | null
          vectorize?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_learning_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          agent_id: string | null
          created_at: string | null
          event: string | null
          id: string
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          event?: string | null
          id?: string
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          event?: string | null
          id?: string
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          id: string
          memory_type: string | null
          memory_value: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          memory_type?: string | null
          memory_value?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          memory_type?: string | null
          memory_value?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      agent_memory_enhanced: {
        Row: {
          agent_id: string | null
          confidence_score: number | null
          created_at: string
          expires_at: string | null
          id: string
          importance_weight: number | null
          memory_key: string
          memory_type: string
          memory_value: Json
          updated_at: string
          user_id: string
          vector_embedding: string | null
        }
        Insert: {
          agent_id?: string | null
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_weight?: number | null
          memory_key: string
          memory_type: string
          memory_value: Json
          updated_at?: string
          user_id: string
          vector_embedding?: string | null
        }
        Update: {
          agent_id?: string | null
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_weight?: number | null
          memory_key?: string
          memory_type?: string
          memory_value?: Json
          updated_at?: string
          user_id?: string
          vector_embedding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_enhanced_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_metrics: {
        Row: {
          agent_id: string | null
          id: string
          measurement_period: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          timestamp: string
        }
        Insert: {
          agent_id?: string | null
          id?: string
          measurement_period: string
          metadata?: Json | null
          metric_type: string
          metric_value: number
          timestamp?: string
        }
        Update: {
          agent_id?: string | null
          id?: string
          measurement_period?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_metrics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_personas: {
        Row: {
          agent_id: string | null
          id: string
          instructions: string | null
          language: string | null
          personality: string | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          id?: string
          instructions?: string | null
          language?: string | null
          personality?: string | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          id?: string
          instructions?: string | null
          language?: string | null
          personality?: string | null
          tone?: string | null
          updated_at?: string | null
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
      agent_runs: {
        Row: {
          agent_code: string
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          openai_run_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string | null
          updated_at: string | null
          wa_message_id: string | null
        }
        Insert: {
          agent_code: string
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          openai_run_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
        }
        Update: {
          agent_code?: string
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          openai_run_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          updated_at?: string | null
          wa_message_id?: string | null
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          active: boolean | null
          agent_id: string | null
          created_at: string | null
          id: string
          name: string | null
          tool_input_json: Json | null
          tool_name: string | null
          trigger_type: string | null
          trigger_value: string | null
        }
        Insert: {
          active?: boolean | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          tool_input_json?: Json | null
          tool_name?: string | null
          trigger_type?: string | null
          trigger_value?: string | null
        }
        Update: {
          active?: boolean | null
          agent_id?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          tool_input_json?: Json | null
          tool_name?: string | null
          trigger_type?: string | null
          trigger_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_calls: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          id: string
          run_id: string | null
          tool_args: Json | null
          tool_name: string
          tool_result: Json | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          run_id?: string | null
          tool_args?: Json | null
          tool_name: string
          tool_result?: Json | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          run_id?: string | null
          tool_args?: Json | null
          tool_name?: string
          tool_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      ai_models: {
        Row: {
          configuration: Json
          cost_per_token: number | null
          created_at: string
          created_by: string | null
          id: string
          model_type: string
          name: string
          performance_metrics: Json | null
          status: string
          version: string
        }
        Insert: {
          configuration?: Json
          cost_per_token?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_type: string
          name: string
          performance_metrics?: Json | null
          status?: string
          version: string
        }
        Update: {
          configuration?: Json
          cost_per_token?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          model_type?: string
          name?: string
          performance_metrics?: Json | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      alert_configurations: {
        Row: {
          alert_types: string[]
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_channels: Json
          severity_levels: string[]
          throttle_minutes: number | null
        }
        Insert: {
          alert_types: string[]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_channels: Json
          severity_levels: string[]
          throttle_minutes?: number | null
        }
        Update: {
          alert_types?: string[]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_channels?: Json
          severity_levels?: string[]
          throttle_minutes?: number | null
        }
        Relationships: []
      }
      assistant_configs: {
        Row: {
          assistant_id: string | null
          created_at: string | null
          id: string
          instructions: string | null
          model: string | null
          name: string
          status: string | null
          temperature: number | null
          tools: Json | null
          updated_at: string | null
        }
        Insert: {
          assistant_id?: string | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          name: string
          status?: string | null
          temperature?: number | null
          tools?: Json | null
          updated_at?: string | null
        }
        Update: {
          assistant_id?: string | null
          created_at?: string | null
          id?: string
          instructions?: string | null
          model?: string | null
          name?: string
          status?: string | null
          temperature?: number | null
          tools?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bar_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          id: string
          patron_id: string | null
          rating: number | null
          tab_id: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          patron_id?: string | null
          rating?: number | null
          tab_id?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          patron_id?: string | null
          rating?: number | null
          tab_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_feedback_patron_id_fkey"
            columns: ["patron_id"]
            isOneToOne: false
            referencedRelation: "bar_patrons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_feedback_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "bar_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_patrons: {
        Row: {
          first_seen: string | null
          id: string
          preferred_lang: string | null
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          first_seen?: string | null
          id?: string
          preferred_lang?: string | null
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          first_seen?: string | null
          id?: string
          preferred_lang?: string | null
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      bar_tabs: {
        Row: {
          bar_id: string | null
          closed_at: string | null
          created_at: string | null
          id: string
          patron_id: string | null
          status: string | null
          subtotal: number | null
          table_code: string
          tip: number | null
          total: number | null
        }
        Insert: {
          bar_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          patron_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_code: string
          tip?: number | null
          total?: number | null
        }
        Update: {
          bar_id?: string | null
          closed_at?: string | null
          created_at?: string | null
          id?: string
          patron_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_code?: string
          tip?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_tabs_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_tabs_patron_id_fkey"
            columns: ["patron_id"]
            isOneToOne: false
            referencedRelation: "bar_patrons"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          channel: string | null
          created_at: string | null
          driver_trip_id: string | null
          fare_rwf: number | null
          id: string
          passenger_id: string | null
          passenger_intent_id: string | null
          status: string | null
          trip_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          driver_trip_id?: string | null
          fare_rwf?: number | null
          id?: string
          passenger_id?: string | null
          passenger_intent_id?: string | null
          status?: string | null
          trip_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          driver_trip_id?: string | null
          fare_rwf?: number | null
          id?: string
          passenger_id?: string | null
          passenger_intent_id?: string | null
          status?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_trip_id_fkey"
            columns: ["driver_trip_id"]
            isOneToOne: false
            referencedRelation: "driver_trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_passenger_intent_id_fkey"
            columns: ["passenger_intent_id"]
            isOneToOne: false
            referencedRelation: "passenger_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_spatial: {
        Row: {
          channel: string | null
          created_at: string | null
          driver_trip_id: string | null
          fare_rwf: number | null
          id: string
          passenger_intent_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          driver_trip_id?: string | null
          fare_rwf?: number | null
          id?: string
          passenger_intent_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          driver_trip_id?: string | null
          fare_rwf?: number | null
          id?: string
          passenger_intent_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_spatial_driver_trip_id_fkey"
            columns: ["driver_trip_id"]
            isOneToOne: false
            referencedRelation: "driver_trips_spatial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_spatial_passenger_intent_id_fkey"
            columns: ["passenger_intent_id"]
            isOneToOne: false
            referencedRelation: "passenger_intents_spatial"
            referencedColumns: ["id"]
          },
        ]
      }
      bridge_conversations: {
        Row: {
          bridge_id: string | null
          created_at: string | null
          id: string
          message: string
          message_type: string | null
          sender_phone: string
          sender_role: string
        }
        Insert: {
          bridge_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          message_type?: string | null
          sender_phone: string
          sender_role: string
        }
        Update: {
          bridge_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          message_type?: string | null
          sender_phone?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "bridge_conversations_bridge_id_fkey"
            columns: ["bridge_id"]
            isOneToOne: false
            referencedRelation: "conversation_bridges"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["business_type"] | null
          created_at: string | null
          google_place_id: string | null
          id: string
          location_gps: unknown | null
          momo_code: string
          name: string
          owner_user_id: string | null
          phone_number: string | null
          pos_system_config: Json | null
          rating: number | null
          reviews_count: number | null
          status: string | null
          subscription_status: string | null
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          google_place_id?: string | null
          id?: string
          location_gps?: unknown | null
          momo_code: string
          name: string
          owner_user_id?: string | null
          phone_number?: string | null
          pos_system_config?: Json | null
          rating?: number | null
          reviews_count?: number | null
          status?: string | null
          subscription_status?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          google_place_id?: string | null
          id?: string
          location_gps?: unknown | null
          momo_code?: string
          name?: string
          owner_user_id?: string | null
          phone_number?: string | null
          pos_system_config?: Json | null
          rating?: number | null
          reviews_count?: number | null
          status?: string | null
          subscription_status?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses_backup: {
        Row: {
          category: Database["public"]["Enums"]["business_type"] | null
          created_at: string | null
          id: string | null
          location_gps: unknown | null
          momo_code: string | null
          name: string | null
          owner_user_id: string | null
          pos_system_config: Json | null
          status: string | null
          subscription_status: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          id?: string | null
          location_gps?: unknown | null
          momo_code?: string | null
          name?: string | null
          owner_user_id?: string | null
          pos_system_config?: Json | null
          status?: string | null
          subscription_status?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          id?: string | null
          location_gps?: unknown | null
          momo_code?: string | null
          name?: string | null
          owner_user_id?: string | null
          pos_system_config?: Json | null
          status?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      campaign_messages: {
        Row: {
          attempt_count: number | null
          campaign_id: string | null
          delivered_at: string | null
          error_details: string | null
          id: string
          message_content: string
          metadata: Json | null
          phone_number: string
          responded_at: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          attempt_count?: number | null
          campaign_id?: string | null
          delivered_at?: string | null
          error_details?: string | null
          id?: string
          message_content: string
          metadata?: Json | null
          phone_number: string
          responded_at?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          attempt_count?: number | null
          campaign_id?: string | null
          delivered_at?: string | null
          error_details?: string | null
          id?: string
          message_content?: string
          metadata?: Json | null
          phone_number?: string
          responded_at?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_segments: {
        Row: {
          campaign_id: string | null
          description: string | null
          id: string
          last_count: number | null
          name: string | null
          segment_sql: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          description?: string | null
          id?: string
          last_count?: number | null
          name?: string | null
          segment_sql?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          description?: string | null
          id?: string
          last_count?: number | null
          name?: string | null
          segment_sql?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_segments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_subscribers: {
        Row: {
          campaign_id: string | null
          id: string
          lang: string | null
          last_sent_at: string | null
          send_count: number | null
          status: string | null
          wa_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          lang?: string | null
          last_sent_at?: string | null
          send_count?: number | null
          status?: string | null
          wa_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          lang?: string | null
          last_sent_at?: string | null
          send_count?: number | null
          status?: string | null
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_subscribers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_locations: {
        Row: {
          address: string | null
          category: string | null
          data_source: string | null
          geom: unknown | null
          google_rating: number | null
          id: string
          imported_at: string | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          place_id: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          data_source?: string | null
          geom?: unknown | null
          google_rating?: number | null
          id?: string
          imported_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          place_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          data_source?: string | null
          geom?: unknown | null
          google_rating?: number | null
          id?: string
          imported_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          place_id?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string | null
          created_at: string | null
          id: string
          product_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          qty: number
          unit_price: number
        }
        Update: {
          cart_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          buyer_phone: string
          created_at: string | null
          id: string
          status: string | null
          total: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          buyer_phone: string
          created_at?: string | null
          id?: string
          status?: string | null
          total?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          buyer_phone?: string
          created_at?: string | null
          id?: string
          status?: string | null
          total?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      centralized_documents: {
        Row: {
          agent_scope: string | null
          content: string | null
          created_at: string | null
          document_type: string | null
          file_purpose: string | null
          file_url: string | null
          id: string
          openai_file_id: string | null
          status: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          agent_scope?: string | null
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          file_purpose?: string | null
          file_url?: string | null
          id?: string
          openai_file_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          agent_scope?: string | null
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          file_purpose?: string | null
          file_url?: string | null
          id?: string
          openai_file_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      circuit_breakers: {
        Row: {
          failure_count: number | null
          failure_threshold: number | null
          id: string
          last_failure_time: string | null
          metadata: Json | null
          recovery_timeout_seconds: number | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          failure_count?: number | null
          failure_threshold?: number | null
          id?: string
          last_failure_time?: string | null
          metadata?: Json | null
          recovery_timeout_seconds?: number | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          failure_count?: number | null
          failure_threshold?: number | null
          id?: string
          last_failure_time?: string | null
          metadata?: Json | null
          recovery_timeout_seconds?: number | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_limits: {
        Row: {
          created_at: string | null
          daily_count: number | null
          id: string
          is_opted_out: boolean | null
          last_reset_daily: string | null
          last_reset_monthly: string | null
          last_reset_weekly: string | null
          monthly_count: number | null
          opt_out_at: string | null
          opt_out_reason: string | null
          phone_number: string
          updated_at: string | null
          weekly_count: number | null
        }
        Insert: {
          created_at?: string | null
          daily_count?: number | null
          id?: string
          is_opted_out?: boolean | null
          last_reset_daily?: string | null
          last_reset_monthly?: string | null
          last_reset_weekly?: string | null
          monthly_count?: number | null
          opt_out_at?: string | null
          opt_out_reason?: string | null
          phone_number: string
          updated_at?: string | null
          weekly_count?: number | null
        }
        Update: {
          created_at?: string | null
          daily_count?: number | null
          id?: string
          is_opted_out?: boolean | null
          last_reset_daily?: string | null
          last_reset_monthly?: string | null
          last_reset_weekly?: string | null
          monthly_count?: number | null
          opt_out_at?: string | null
          opt_out_reason?: string | null
          phone_number?: string
          updated_at?: string | null
          weekly_count?: number | null
        }
        Relationships: []
      }
      contact_timing_patterns: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          engagement_score: number | null
          id: string
          response_rate: number | null
          success_rate: number | null
          time_of_day: number | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          engagement_score?: number | null
          id?: string
          response_rate?: number | null
          success_rate?: number | null
          time_of_day?: number | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          engagement_score?: number | null
          id?: string
          response_rate?: number | null
          success_rate?: number | null
          time_of_day?: number | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          contact_type: string | null
          conversion_status: string | null
          created_at: string | null
          first_contact_date: string | null
          id: string
          is_online: boolean | null
          is_typing: boolean | null
          last_interaction: string | null
          location: string | null
          name: string | null
          phone_number: string
          preferred_channel: string | null
          status: string | null
          total_conversations: number | null
        }
        Insert: {
          avatar_url?: string | null
          contact_type?: string | null
          conversion_status?: string | null
          created_at?: string | null
          first_contact_date?: string | null
          id?: string
          is_online?: boolean | null
          is_typing?: boolean | null
          last_interaction?: string | null
          location?: string | null
          name?: string | null
          phone_number: string
          preferred_channel?: string | null
          status?: string | null
          total_conversations?: number | null
        }
        Update: {
          avatar_url?: string | null
          contact_type?: string | null
          conversion_status?: string | null
          created_at?: string | null
          first_contact_date?: string | null
          id?: string
          is_online?: boolean | null
          is_typing?: boolean | null
          last_interaction?: string | null
          location?: string | null
          name?: string | null
          phone_number?: string
          preferred_channel?: string | null
          status?: string | null
          total_conversations?: number | null
        }
        Relationships: []
      }
      content_safety_rules: {
        Row: {
          action: string
          created_at: string
          id: string
          is_active: boolean | null
          rule_config: Json
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_config: Json
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_config?: Json
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_analytics: {
        Row: {
          agent_messages: number | null
          avg_response_time_ms: number | null
          conversion_event: string | null
          created_at: string | null
          first_message_at: string | null
          flow_completed: boolean | null
          id: string
          last_message_at: string | null
          phone_number: string
          satisfaction_rating: number | null
          session_duration_minutes: number | null
          session_id: string | null
          total_messages: number | null
          updated_at: string | null
          user_messages: number | null
        }
        Insert: {
          agent_messages?: number | null
          avg_response_time_ms?: number | null
          conversion_event?: string | null
          created_at?: string | null
          first_message_at?: string | null
          flow_completed?: boolean | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          satisfaction_rating?: number | null
          session_duration_minutes?: number | null
          session_id?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_messages?: number | null
        }
        Update: {
          agent_messages?: number | null
          avg_response_time_ms?: number | null
          conversion_event?: string | null
          created_at?: string | null
          first_message_at?: string | null
          flow_completed?: boolean | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          satisfaction_rating?: number | null
          session_duration_minutes?: number | null
          session_id?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_messages?: number | null
        }
        Relationships: []
      }
      conversation_bridges: {
        Row: {
          buyer_phone: string
          completed_at: string | null
          completion_reason: string | null
          created_at: string | null
          id: string
          initial_message: string | null
          item_id: string
          item_type: string
          last_message_at: string | null
          message_count: number | null
          seller_phone: string
          status: string | null
        }
        Insert: {
          buyer_phone: string
          completed_at?: string | null
          completion_reason?: string | null
          created_at?: string | null
          id?: string
          initial_message?: string | null
          item_id: string
          item_type: string
          last_message_at?: string | null
          message_count?: number | null
          seller_phone: string
          status?: string | null
        }
        Update: {
          buyer_phone?: string
          completed_at?: string | null
          completion_reason?: string | null
          created_at?: string | null
          id?: string
          initial_message?: string | null
          item_id?: string
          item_type?: string
          last_message_at?: string | null
          message_count?: number | null
          seller_phone?: string
          status?: string | null
        }
        Relationships: []
      }
      conversation_evaluations: {
        Row: {
          clarity_score: number | null
          conversation_id: string | null
          created_at: string | null
          evaluated_at: string | null
          evaluation_notes: string | null
          helpfulness_score: number | null
          id: string
          message_id: string | null
          model_used: string | null
          overall_score: number | null
          phone_number: string | null
          style_score: number | null
        }
        Insert: {
          clarity_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluation_notes?: string | null
          helpfulness_score?: number | null
          id?: string
          message_id?: string | null
          model_used?: string | null
          overall_score?: number | null
          phone_number?: string | null
          style_score?: number | null
        }
        Update: {
          clarity_score?: number | null
          conversation_id?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          evaluation_notes?: string | null
          helpfulness_score?: number | null
          id?: string
          message_id?: string | null
          model_used?: string | null
          overall_score?: number | null
          phone_number?: string | null
          style_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_evaluations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_flows: {
        Row: {
          completed_at: string | null
          current_step: string
          flow_data: Json | null
          flow_name: string
          id: string
          phone_number: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step: string
          flow_data?: Json | null
          flow_name: string
          id?: string
          phone_number: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step?: string
          flow_data?: Json | null
          flow_name?: string
          id?: string
          phone_number?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      conversation_learning_log: {
        Row: {
          confidence_level: number | null
          id: string
          improvement_note: string | null
          learning_summary: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          confidence_level?: number | null
          id?: string
          improvement_note?: string | null
          learning_summary?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          confidence_level?: number | null
          id?: string
          improvement_note?: string | null
          learning_summary?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          channel: string | null
          confidence_score: number | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          message_text: string | null
          message_type: string | null
          metadata: Json | null
          model_used: string | null
          phone_number: string | null
          reactions: Json | null
          reply_to: string | null
          sender: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          confidence_score?: number | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          model_used?: string | null
          phone_number?: string | null
          reactions?: Json | null
          reply_to?: string | null
          sender?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          confidence_score?: number | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          model_used?: string | null
          phone_number?: string | null
          reactions?: Json | null
          reply_to?: string | null
          sender?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_quality: {
        Row: {
          automated_checks: Json | null
          confidence_score: number
          conversation_id: string | null
          created_at: string
          human_feedback: Json | null
          id: string
          message_id: string | null
          phone_number: string
          quality_scores: Json
          response_text: string
          safety_flags: Json | null
        }
        Insert: {
          automated_checks?: Json | null
          confidence_score: number
          conversation_id?: string | null
          created_at?: string
          human_feedback?: Json | null
          id?: string
          message_id?: string | null
          phone_number: string
          quality_scores: Json
          response_text: string
          safety_flags?: Json | null
        }
        Update: {
          automated_checks?: Json | null
          confidence_score?: number
          conversation_id?: string | null
          created_at?: string
          human_feedback?: Json | null
          id?: string
          message_id?: string | null
          phone_number?: string
          quality_scores?: Json
          response_text?: string
          safety_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_quality_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          phone_number: string
          status: string | null
          thread_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number: string
          status?: string | null
          thread_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          phone_number?: string
          status?: string | null
          thread_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string | null
          assigned_agent_id: string | null
          channel: string
          contact_id: string
          contact_phone: string | null
          conversation_duration_minutes: number | null
          created_at: string | null
          ended_at: string | null
          handoff_at: string | null
          handoff_reason: string | null
          handoff_requested: boolean | null
          id: string
          message_count: number | null
          metadata: Json | null
          model_used: string | null
          resolved_at: string | null
          started_at: string | null
          status: string | null
          thread_id: string | null
        }
        Insert: {
          agent_id?: string | null
          assigned_agent_id?: string | null
          channel: string
          contact_id: string
          contact_phone?: string | null
          conversation_duration_minutes?: number | null
          created_at?: string | null
          ended_at?: string | null
          handoff_at?: string | null
          handoff_reason?: string | null
          handoff_requested?: boolean | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          model_used?: string | null
          resolved_at?: string | null
          started_at?: string | null
          status?: string | null
          thread_id?: string | null
        }
        Update: {
          agent_id?: string | null
          assigned_agent_id?: string | null
          channel?: string
          contact_id?: string
          contact_phone?: string | null
          conversation_duration_minutes?: number | null
          created_at?: string | null
          ended_at?: string | null
          handoff_at?: string | null
          handoff_reason?: string | null
          handoff_requested?: boolean | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          model_used?: string | null
          resolved_at?: string | null
          started_at?: string | null
          status?: string | null
          thread_id?: string | null
        }
        Relationships: []
      }
      cron_executions: {
        Row: {
          completed_at: string | null
          error_details: string | null
          execution_time_ms: number | null
          id: string
          job_id: string | null
          result_data: Json | null
          retry_attempt: number | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_details?: string | null
          execution_time_ms?: number | null
          id?: string
          job_id?: string | null
          result_data?: Json | null
          retry_attempt?: number | null
          started_at?: string | null
          status: string
        }
        Update: {
          completed_at?: string | null
          error_details?: string | null
          execution_time_ms?: number | null
          id?: string
          job_id?: string | null
          result_data?: Json | null
          retry_attempt?: number | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cron_executions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cron_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_jobs: {
        Row: {
          created_at: string | null
          description: string | null
          execution_count: number | null
          failure_count: number | null
          function_name: string
          id: string
          is_active: boolean | null
          last_execution: string | null
          max_retries: number | null
          name: string
          next_execution: string | null
          parameters: Json | null
          schedule_expression: string
          timeout_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          function_name: string
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          max_retries?: number | null
          name: string
          next_execution?: string | null
          parameters?: Json | null
          schedule_expression: string
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          failure_count?: number | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          last_execution?: string | null
          max_retries?: number | null
          name?: string
          next_execution?: string | null
          parameters?: Json | null
          schedule_expression?: string
          timeout_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_satisfaction: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          id: string
          order_id: string | null
          phone_number: string | null
          processed_at: string | null
          rating: number | null
          user_id: string | null
          vertical: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          order_id?: string | null
          phone_number?: string | null
          processed_at?: string | null
          rating?: number | null
          user_id?: string | null
          vertical?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          order_id?: string | null
          phone_number?: string | null
          processed_at?: string | null
          rating?: number | null
          user_id?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_satisfaction_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sync_runs: {
        Row: {
          api_quota_used: number | null
          completed_at: string | null
          created_by: string | null
          deleted_at: string | null
          error_details: string | null
          id: string
          metadata: Json | null
          records_failed: number | null
          records_processed: number | null
          records_successful: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          api_quota_used?: number | null
          completed_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          error_details?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          records_successful?: number | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          api_quota_used?: number | null
          completed_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          error_details?: string | null
          id?: string
          metadata?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          records_successful?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          driver_id: string | null
          id: string
          mode: string | null
          order_id: string | null
          pickup_eta: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          mode?: string | null
          order_id?: string | null
          pickup_eta?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          mode?: string | null
          order_id?: string | null
          pickup_eta?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number | null
          enrolled_at: string | null
          id: string
          metadata: Json | null
          next_message_at: string | null
          phone_number: string
          sequence_id: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          metadata?: Json | null
          next_message_at?: string | null
          phone_number: string
          sequence_id?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          metadata?: Json | null
          next_message_at?: string | null
          phone_number?: string
          sequence_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      drip_sequences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_conditions: Json | null
          trigger_event: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_conditions?: Json | null
          trigger_event: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_conditions?: Json | null
          trigger_event?: string
        }
        Relationships: []
      }
      drip_steps: {
        Row: {
          conditions: Json | null
          delay_hours: number
          id: string
          is_active: boolean | null
          message_template: string
          sequence_id: string | null
          step_order: number
          template_variables: Json | null
        }
        Insert: {
          conditions?: Json | null
          delay_hours: number
          id?: string
          is_active?: boolean | null
          message_template: string
          sequence_id?: string | null
          step_order: number
          template_variables?: Json | null
        }
        Update: {
          conditions?: Json | null
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          message_template?: string
          sequence_id?: string | null
          step_order?: number
          template_variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "drip_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_sessions: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          created_at: string | null
          driver_id: string | null
          ended_at: string | null
          id: string
          last_location: unknown | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string | null
          driver_id?: string | null
          ended_at?: string | null
          id?: string
          last_location?: unknown | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string | null
          driver_id?: string | null
          ended_at?: string | null
          id?: string
          last_location?: unknown | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_trips: {
        Row: {
          created_at: string | null
          departure_time: string | null
          destination: unknown | null
          driver_id: string | null
          driver_phone: string | null
          from_geom: unknown | null
          from_text: string | null
          id: string
          inserted_at: string | null
          origin: unknown | null
          price_rwf: number | null
          seats: number | null
          status: string | null
          to_geom: unknown | null
          to_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          departure_time?: string | null
          destination?: unknown | null
          driver_id?: string | null
          driver_phone?: string | null
          from_geom?: unknown | null
          from_text?: string | null
          id?: string
          inserted_at?: string | null
          origin?: unknown | null
          price_rwf?: number | null
          seats?: number | null
          status?: string | null
          to_geom?: unknown | null
          to_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          departure_time?: string | null
          destination?: unknown | null
          driver_id?: string | null
          driver_phone?: string | null
          from_geom?: unknown | null
          from_text?: string | null
          id?: string
          inserted_at?: string | null
          origin?: unknown | null
          price_rwf?: number | null
          seats?: number | null
          status?: string | null
          to_geom?: unknown | null
          to_text?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_trips_spatial: {
        Row: {
          created_at: string | null
          departure_time: string | null
          destination: unknown
          driver_id: string | null
          driver_phone: string | null
          from_text: string
          id: string
          metadata: Json | null
          origin: unknown
          price_rwf: number
          seats: number
          status: string
          to_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          departure_time?: string | null
          destination: unknown
          driver_id?: string | null
          driver_phone?: string | null
          from_text: string
          id?: string
          metadata?: Json | null
          origin: unknown
          price_rwf: number
          seats?: number
          status?: string
          to_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          departure_time?: string | null
          destination?: unknown
          driver_id?: string | null
          driver_phone?: string | null
          from_text?: string
          id?: string
          metadata?: Json | null
          origin?: unknown
          price_rwf?: number
          seats?: number
          status?: string
          to_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_wallet: {
        Row: {
          balance: number | null
          created_at: string | null
          driver_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_wallet_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          driver_kind: Database["public"]["Enums"]["driver_type"] | null
          full_name: string | null
          id: string
          is_online: boolean | null
          location_gps: unknown | null
          logbook_url: string | null
          momo_code: string
          momo_number: string | null
          plate_number: string | null
          subscription_status: string | null
          user_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          created_at?: string | null
          driver_kind?: Database["public"]["Enums"]["driver_type"] | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          location_gps?: unknown | null
          logbook_url?: string | null
          momo_code: string
          momo_number?: string | null
          plate_number?: string | null
          subscription_status?: string | null
          user_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          created_at?: string | null
          driver_kind?: Database["public"]["Enums"]["driver_type"] | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          location_gps?: unknown | null
          logbook_url?: string | null
          momo_code?: string
          momo_number?: string | null
          plate_number?: string | null
          subscription_status?: string | null
          user_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          function_name: string
          id: string
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          function_name: string
          id?: string
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          function_name?: string
          id?: string
        }
        Relationships: []
      }
      evaluation_results: {
        Row: {
          actual_output: string | null
          created_at: string | null
          eval_name: string
          execution_time_ms: number | null
          expected_output: string | null
          id: string
          model_used: string | null
          passed: boolean | null
          score: number | null
          test_prompt: string
        }
        Insert: {
          actual_output?: string | null
          created_at?: string | null
          eval_name: string
          execution_time_ms?: number | null
          expected_output?: string | null
          id?: string
          model_used?: string | null
          passed?: boolean | null
          score?: number | null
          test_prompt: string
        }
        Update: {
          actual_output?: string | null
          created_at?: string | null
          eval_name?: string
          execution_time_ms?: number | null
          expected_output?: string | null
          id?: string
          model_used?: string | null
          passed?: boolean | null
          score?: number | null
          test_prompt?: string
        }
        Relationships: []
      }
      evaluation_test_cases: {
        Row: {
          created_at: string | null
          expected_output: string | null
          id: string
          last_run_at: string | null
          last_score: number | null
          model_version: string | null
          status: string | null
          test_category: string
          test_name: string
          test_prompt: string
        }
        Insert: {
          created_at?: string | null
          expected_output?: string | null
          id?: string
          last_run_at?: string | null
          last_score?: number | null
          model_version?: string | null
          status?: string | null
          test_category: string
          test_name: string
          test_prompt: string
        }
        Update: {
          created_at?: string | null
          expected_output?: string | null
          id?: string
          last_run_at?: string | null
          last_score?: number | null
          model_version?: string | null
          status?: string | null
          test_category?: string
          test_name?: string
          test_prompt?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          external_source: string | null
          gps_location: unknown | null
          id: string
          image_url: string | null
          location: string | null
          organizer_user_id: string | null
          price: number | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          external_source?: string | null
          gps_location?: unknown | null
          id?: string
          image_url?: string | null
          location?: string | null
          organizer_user_id?: string | null
          price?: number | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          external_source?: string | null
          gps_location?: unknown | null
          id?: string
          image_url?: string | null
          location?: string | null
          organizer_user_id?: string | null
          price?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_user_id_fkey"
            columns: ["organizer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_assignments: {
        Row: {
          assigned_at: string | null
          experiment_id: string | null
          id: string
          phone_number: string
          variant: string
        }
        Insert: {
          assigned_at?: string | null
          experiment_id?: string | null
          id?: string
          phone_number: string
          variant: string
        }
        Update: {
          assigned_at?: string | null
          experiment_id?: string | null
          id?: string
          phone_number?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          control_variant: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          success_metric: string | null
          test_variant: Json | null
          traffic_split: number | null
          updated_at: string | null
        }
        Insert: {
          control_variant?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          success_metric?: string | null
          test_variant?: Json | null
          traffic_split?: number | null
          updated_at?: string | null
        }
        Update: {
          control_variant?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          success_metric?: string | null
          test_variant?: Json | null
          traffic_split?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fallback_activity_log: {
        Row: {
          created_at: string | null
          fallback_model: string | null
          id: string
          original_model: string | null
          success: boolean | null
          task_type: string | null
          trigger_reason: string | null
        }
        Insert: {
          created_at?: string | null
          fallback_model?: string | null
          id?: string
          original_model?: string | null
          success?: boolean | null
          task_type?: string | null
          trigger_reason?: string | null
        }
        Update: {
          created_at?: string | null
          fallback_model?: string | null
          id?: string
          original_model?: string | null
          success?: boolean | null
          task_type?: string | null
          trigger_reason?: string | null
        }
        Relationships: []
      }
      farmers: {
        Row: {
          created_at: string | null
          crops: string[] | null
          district: string | null
          id: string
          listings_count: number | null
          name: string
          status: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          crops?: string[] | null
          district?: string | null
          id?: string
          listings_count?: number | null
          name: string
          status?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          crops?: string[] | null
          district?: string | null
          id?: string
          listings_count?: number | null
          name?: string
          status?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      file_uploads: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          phone_number: string
          storage_path: string
          updated_at: string | null
          upload_status: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          phone_number: string
          storage_path: string
          updated_at?: string | null
          upload_status?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          phone_number?: string
          storage_path?: string
          updated_at?: string | null
          upload_status?: string | null
        }
        Relationships: []
      }
      fine_tune_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          fine_tuned_model: string | null
          id: string
          model_name: string | null
          openai_job_id: string | null
          status: string | null
          training_file_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          fine_tuned_model?: string | null
          id?: string
          model_name?: string | null
          openai_job_id?: string | null
          status?: string | null
          training_file_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          fine_tuned_model?: string | null
          id?: string
          model_name?: string | null
          openai_job_id?: string | null
          status?: string | null
          training_file_id?: string | null
        }
        Relationships: []
      }
      google_places_businesses: {
        Row: {
          agent_verified: boolean | null
          category: string | null
          country: string | null
          created_at: string | null
          google_maps_url: string | null
          id: string
          location_gps: unknown | null
          momo_code: string | null
          name: string | null
          place_id: string | null
          region: string | null
        }
        Insert: {
          agent_verified?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          google_maps_url?: string | null
          id?: string
          location_gps?: unknown | null
          momo_code?: string | null
          name?: string | null
          place_id?: string | null
          region?: string | null
        }
        Update: {
          agent_verified?: boolean | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          google_maps_url?: string | null
          id?: string
          location_gps?: unknown | null
          momo_code?: string | null
          name?: string | null
          place_id?: string | null
          region?: string | null
        }
        Relationships: []
      }
      hardware_vendors: {
        Row: {
          api_endpoint: string | null
          api_key: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          id: string
          last_sync_at: string | null
          name: string
          products_count: number | null
          status: string | null
          sync_enabled: boolean | null
          updated_at: string
          website: string | null
        }
        Insert: {
          api_endpoint?: string | null
          api_key?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          products_count?: number | null
          status?: string | null
          sync_enabled?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          api_endpoint?: string | null
          api_key?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          products_count?: number | null
          status?: string | null
          sync_enabled?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      i18n_messages: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          language_code: string
          message_key: string
          message_text: string
          updated_at: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          language_code?: string
          message_key: string
          message_text: string
          updated_at?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          language_code?: string
          message_key?: string
          message_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      incoming_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          phone_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          phone_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          phone_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ingestion_pipeline: {
        Row: {
          completed_at: string | null
          id: number
          log: string | null
          module_id: string | null
          stage: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: number
          log?: string | null
          module_id?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: number
          log?: string | null
          module_id?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_pipeline_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          confidence: number | null
          content: string
          content_type: string
          created_at: string
          id: string
          source: string | null
          tags: string[] | null
          topic: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
          vector_embedding: string | null
          version: number
        }
        Insert: {
          confidence?: number | null
          content: string
          content_type?: string
          created_at?: string
          id?: string
          source?: string | null
          tags?: string[] | null
          topic: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
          vector_embedding?: string | null
          version?: number
        }
        Update: {
          confidence?: number | null
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          source?: string | null
          tags?: string[] | null
          topic?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
          vector_embedding?: string | null
          version?: number
        }
        Relationships: []
      }
      learning_gap_instances: {
        Row: {
          context_excerpt: string | null
          conversation_id: string | null
          created_at: string | null
          gap_category: string | null
          gap_description: string | null
          id: string
          severity_level: string | null
          status: string | null
          suggested_improvement: string | null
        }
        Insert: {
          context_excerpt?: string | null
          conversation_id?: string | null
          created_at?: string | null
          gap_category?: string | null
          gap_description?: string | null
          id?: string
          severity_level?: string | null
          status?: string | null
          suggested_improvement?: string | null
        }
        Update: {
          context_excerpt?: string | null
          conversation_id?: string | null
          created_at?: string | null
          gap_category?: string | null
          gap_description?: string | null
          id?: string
          severity_level?: string | null
          status?: string | null
          suggested_improvement?: string | null
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          agent_scope: string | null
          auto_tags: string[] | null
          content: string | null
          created_at: string | null
          id: string
          relevance_score: number | null
          source_path: string | null
          source_type: string | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
          vector_count: number | null
          vector_ns: string | null
        }
        Insert: {
          agent_scope?: string | null
          auto_tags?: string[] | null
          content?: string | null
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          source_path?: string | null
          source_type?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          vector_count?: number | null
          vector_ns?: string | null
        }
        Update: {
          agent_scope?: string | null
          auto_tags?: string[] | null
          content?: string | null
          created_at?: string | null
          id?: string
          relevance_score?: number | null
          source_path?: string | null
          source_type?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          vector_count?: number | null
          vector_ns?: string | null
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          district: string | null
          id: string
          price_per_kg: number | null
          product_name: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          district?: string | null
          id?: string
          price_per_kg?: number | null
          product_name?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          district?: string | null
          id?: string
          price_per_kg?: number | null
          product_name?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
          interval_min: number | null
          max_sends: number | null
          name: string
          owner_id: string | null
          start_at: string | null
          status: string | null
          template_text: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          interval_min?: number | null
          max_sends?: number | null
          name: string
          owner_id?: string | null
          start_at?: string | null
          status?: string | null
          template_text?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          interval_min?: number | null
          max_sends?: number | null
          name?: string
          owner_id?: string | null
          start_at?: string | null
          status?: string | null
          template_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_gate_log: {
        Row: {
          avg_csat: number | null
          check_time: string | null
          gate_passed: boolean | null
          id: string
          marketing_enabled: boolean | null
          response_count: number | null
        }
        Insert: {
          avg_csat?: number | null
          check_time?: string | null
          gate_passed?: boolean | null
          id?: string
          marketing_enabled?: boolean | null
          response_count?: number | null
        }
        Update: {
          avg_csat?: number | null
          check_time?: string | null
          gate_passed?: boolean | null
          id?: string
          marketing_enabled?: boolean | null
          response_count?: number | null
        }
        Relationships: []
      }
      mcp_model_registry: {
        Row: {
          created_at: string | null
          fallback_model: string | null
          id: string
          primary_model: string | null
          prompt_prefix: string | null
          secondary_model: string | null
          task_name: string | null
        }
        Insert: {
          created_at?: string | null
          fallback_model?: string | null
          id?: string
          primary_model?: string | null
          prompt_prefix?: string | null
          secondary_model?: string | null
          task_name?: string | null
        }
        Update: {
          created_at?: string | null
          fallback_model?: string | null
          id?: string
          primary_model?: string | null
          prompt_prefix?: string | null
          secondary_model?: string | null
          task_name?: string | null
        }
        Relationships: []
      }
      memory_consolidation_log: {
        Row: {
          consolidated_at: string | null
          conversation_id: string | null
          id: string
          key_insights: Json | null
          pinecone_id: string | null
          summary_text: string
          user_id: string | null
          vector_stored: boolean | null
        }
        Insert: {
          consolidated_at?: string | null
          conversation_id?: string | null
          id?: string
          key_insights?: Json | null
          pinecone_id?: string | null
          summary_text: string
          user_id?: string | null
          vector_stored?: boolean | null
        }
        Update: {
          consolidated_at?: string | null
          conversation_id?: string | null
          id?: string
          key_insights?: Json | null
          pinecone_id?: string | null
          summary_text?: string
          user_id?: string | null
          vector_stored?: boolean | null
        }
        Relationships: []
      }
      message_logs: {
        Row: {
          contact_name: string | null
          created_at: string | null
          id: string
          message_content: string
          message_id: string | null
          metadata: Json | null
          platform: string
          processed: boolean | null
          sender_id: string
          timestamp: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          id?: string
          message_content: string
          message_id?: string | null
          metadata?: Json | null
          platform: string
          processed?: boolean | null
          sender_id: string
          timestamp: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          id?: string
          message_content?: string
          message_id?: string | null
          metadata?: Json | null
          platform?: string
          processed?: boolean | null
          sender_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      message_safety_log: {
        Row: {
          action_taken: string | null
          created_at: string | null
          flagged_content: string[] | null
          id: string
          message_content: string
          phone_number: string
          safety_score: number | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          flagged_content?: string[] | null
          id?: string
          message_content: string
          phone_number: string
          safety_score?: number | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          flagged_content?: string[] | null
          id?: string
          message_content?: string
          phone_number?: string
          safety_score?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string | null
          sender_type: string
          status: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          sender_type: string
          status?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string | null
          sender_type?: string
          status?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      model_benchmarks: {
        Row: {
          benchmark_date: string
          benchmark_type: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number
          model_id: string | null
          test_dataset: string | null
        }
        Insert: {
          benchmark_date?: string
          benchmark_type: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value: number
          model_id?: string | null
          test_dataset?: string | null
        }
        Update: {
          benchmark_date?: string
          benchmark_type?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number
          model_id?: string | null
          test_dataset?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_benchmarks_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_experiments: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          model_a_id: string | null
          model_b_id: string | null
          name: string
          results: Json | null
          start_date: string
          status: string
          success_metrics: Json | null
          traffic_split: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          model_a_id?: string | null
          model_b_id?: string | null
          name: string
          results?: Json | null
          start_date?: string
          status?: string
          success_metrics?: Json | null
          traffic_split?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          model_a_id?: string | null
          model_b_id?: string | null
          name?: string
          results?: Json | null
          start_date?: string
          status?: string
          success_metrics?: Json | null
          traffic_split?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_experiments_model_a_id_fkey"
            columns: ["model_a_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_experiments_model_b_id_fkey"
            columns: ["model_b_id"]
            isOneToOne: false
            referencedRelation: "ai_models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_output_logs: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          id: string
          model_used: string | null
          prompt_text: string | null
          response_quality: string | null
          response_text: string | null
          task_id: string | null
          token_usage: number | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          model_used?: string | null
          prompt_text?: string | null
          response_quality?: string | null
          response_text?: string | null
          task_id?: string | null
          token_usage?: number | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          id?: string
          model_used?: string | null
          prompt_text?: string | null
          response_quality?: string | null
          response_text?: string | null
          task_id?: string | null
          token_usage?: number | null
        }
        Relationships: []
      }
      module_reviews: {
        Row: {
          decided_at: string | null
          decision: string | null
          id: number
          module_id: string | null
          notes: string | null
          reviewer_id: string | null
        }
        Insert: {
          decided_at?: string | null
          decision?: string | null
          id?: number
          module_id?: string | null
          notes?: string | null
          reviewer_id?: string | null
        }
        Update: {
          decided_at?: string | null
          decision?: string | null
          id?: number
          module_id?: string | null
          notes?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_reviews_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          phone_number: string | null
          priority: string | null
          read_at: string | null
          status: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          phone_number?: string | null
          priority?: string | null
          read_at?: string | null
          status?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          phone_number?: string | null
          priority?: string | null
          read_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      opt_outs: {
        Row: {
          channel: string | null
          created_at: string | null
          reason: string | null
          wa_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          reason?: string | null
          wa_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          reason?: string | null
          wa_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          business_id: string | null
          cart_id: string | null
          created_at: string | null
          delivery: boolean | null
          delivery_fee: number | null
          driver_id: string | null
          extras: Json | null
          farmer_id: string | null
          fulfilment_mode: string | null
          id: string
          items: Json | null
          payment_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_price: number | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          cart_id?: string | null
          created_at?: string | null
          delivery?: boolean | null
          delivery_fee?: number | null
          driver_id?: string | null
          extras?: Json | null
          farmer_id?: string | null
          fulfilment_mode?: string | null
          id?: string
          items?: Json | null
          payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_price?: number | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          cart_id?: string | null
          created_at?: string | null
          delivery?: boolean | null
          delivery_fee?: number | null
          driver_id?: string | null
          extras?: Json | null
          farmer_id?: string | null
          fulfilment_mode?: string | null
          id?: string
          items?: Json | null
          payment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_price?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_queue: {
        Row: {
          channel: string | null
          created_at: string | null
          failed_reason: string | null
          id: string
          max_retries: number | null
          message_text: string
          metadata: Json | null
          next_attempt_at: string | null
          phone_number: string
          priority: number | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          failed_reason?: string | null
          id?: string
          max_retries?: number | null
          message_text: string
          metadata?: Json | null
          next_attempt_at?: string | null
          phone_number: string
          priority?: number | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          failed_reason?: string | null
          id?: string
          max_retries?: number | null
          message_text?: string
          metadata?: Json | null
          next_attempt_at?: string | null
          phone_number?: string
          priority?: number | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      outgoing_messages: {
        Row: {
          created_at: string | null
          id: string
          message_text: string
          status: string | null
          timestamp: string | null
          to_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_text: string
          status?: string | null
          timestamp?: string | null
          to_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_text?: string
          status?: string | null
          timestamp?: string | null
          to_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      passenger_intents: {
        Row: {
          created_at: string | null
          dropoff: unknown | null
          dropoff_address: string | null
          from_geom: unknown | null
          from_text: string | null
          id: string
          inserted_at: string | null
          max_fare_rwf: number | null
          max_price_rwf: number | null
          passenger_phone: string
          pickup: unknown | null
          pickup_address: string | null
          seats: number | null
          seats_needed: number | null
          status: string | null
          to_geom: unknown | null
          to_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dropoff?: unknown | null
          dropoff_address?: string | null
          from_geom?: unknown | null
          from_text?: string | null
          id?: string
          inserted_at?: string | null
          max_fare_rwf?: number | null
          max_price_rwf?: number | null
          passenger_phone: string
          pickup?: unknown | null
          pickup_address?: string | null
          seats?: number | null
          seats_needed?: number | null
          status?: string | null
          to_geom?: unknown | null
          to_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dropoff?: unknown | null
          dropoff_address?: string | null
          from_geom?: unknown | null
          from_text?: string | null
          id?: string
          inserted_at?: string | null
          max_fare_rwf?: number | null
          max_price_rwf?: number | null
          passenger_phone?: string
          pickup?: unknown | null
          pickup_address?: string | null
          seats?: number | null
          seats_needed?: number | null
          status?: string | null
          to_geom?: unknown | null
          to_text?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      passenger_intents_spatial: {
        Row: {
          created_at: string | null
          dropoff: unknown
          from_text: string
          id: string
          max_price_rwf: number | null
          passenger_phone: string
          pickup: unknown
          seats_needed: number
          status: string
          to_text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dropoff: unknown
          from_text: string
          id?: string
          max_price_rwf?: number | null
          passenger_phone: string
          pickup: unknown
          seats_needed?: number
          status?: string
          to_text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dropoff?: unknown
          from_text?: string
          id?: string
          max_price_rwf?: number | null
          passenger_phone?: string
          pickup?: unknown
          seats_needed?: number
          status?: string
          to_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      passenger_promos: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          passenger_id: string | null
          promo_code: string
          redeemed: boolean | null
          redeemed_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          passenger_id?: string | null
          promo_code: string
          redeemed?: boolean | null
          redeemed_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          passenger_id?: string | null
          promo_code?: string
          redeemed?: boolean | null
          redeemed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passenger_promos_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      passengers: {
        Row: {
          avg_rating_given: number | null
          created_at: string | null
          full_name: string | null
          id: string
          preferred_lang: string | null
          total_rides: number | null
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avg_rating_given?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          preferred_lang?: string | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avg_rating_given?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          preferred_lang?: string | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          amount: number | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          payment_id: string | null
          phone_number: string
          qr_data: string | null
          session_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          phone_number: string
          qr_data?: string | null
          session_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          payment_id?: string | null
          phone_number?: string
          qr_data?: string | null
          session_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          momo_code: string
          momo_tx: string | null
          order_id: string | null
          paid_at: string | null
          payment_type: string | null
          qr_code_url: string | null
          qr_data: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          user_id: string | null
          ussd_code: string
          ussd_link: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          momo_code: string
          momo_tx?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_type?: string | null
          qr_code_url?: string | null
          qr_data?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string | null
          ussd_code: string
          ussd_link?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          momo_code?: string
          momo_tx?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_type?: string | null
          qr_code_url?: string | null
          qr_data?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string | null
          ussd_code?: string
          ussd_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          driver_id: string | null
          id: string
          momo_txn_id: string | null
          paid_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          driver_id?: string | null
          id?: string
          momo_txn_id?: string | null
          paid_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          driver_id?: string | null
          id?: string
          momo_txn_id?: string | null
          paid_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_benchmarks: {
        Row: {
          concurrent_requests: number | null
          cpu_usage_percent: number | null
          environment: string | null
          error_details: string | null
          execution_time_ms: number
          function_name: string
          id: string
          memory_usage_mb: number | null
          request_count: number | null
          success_rate: number | null
          test_timestamp: string | null
          test_type: string
        }
        Insert: {
          concurrent_requests?: number | null
          cpu_usage_percent?: number | null
          environment?: string | null
          error_details?: string | null
          execution_time_ms: number
          function_name: string
          id?: string
          memory_usage_mb?: number | null
          request_count?: number | null
          success_rate?: number | null
          test_timestamp?: string | null
          test_type: string
        }
        Update: {
          concurrent_requests?: number | null
          cpu_usage_percent?: number | null
          environment?: string | null
          error_details?: string | null
          execution_time_ms?: number
          function_name?: string
          id?: string
          memory_usage_mb?: number | null
          request_count?: number | null
          success_rate?: number | null
          test_timestamp?: string | null
          test_type?: string
        }
        Relationships: []
      }
      pharmacy_order_items: {
        Row: {
          created_at: string | null
          id: number
          order_id: string | null
          product_id: string | null
          qty: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          order_id?: string | null
          product_id?: string | null
          qty?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          order_id?: string | null
          product_id?: string | null
          qty?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          created_at: string | null
          delivery_address: string | null
          delivery_eta: string | null
          delivery_fee: number | null
          id: string
          shopper_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_eta?: string | null
          delivery_fee?: number | null
          id?: string
          shopper_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_eta?: string | null
          delivery_fee?: number | null
          id?: string
          shopper_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_orders_shopper_id_fkey"
            columns: ["shopper_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_shoppers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_shoppers: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          preferred_lang: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          preferred_lang?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          preferred_lang?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      pos_sync_log: {
        Row: {
          bar_id: string | null
          created_at: string | null
          id: string
          items_failed: number | null
          items_processed: number | null
          items_updated: number | null
          sync_details: Json | null
          sync_type: string
        }
        Insert: {
          bar_id?: string | null
          created_at?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          sync_details?: Json | null
          sync_type: string
        }
        Update: {
          bar_id?: string | null
          created_at?: string | null
          id?: string
          items_failed?: number | null
          items_processed?: number | null
          items_updated?: number | null
          sync_details?: Json | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sync_log_bar_id_fkey"
            columns: ["bar_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_accuracy: {
        Row: {
          accuracy: boolean | null
          actual_value: string | null
          id: string
          predicted_value: string | null
          prediction_date: string | null
          prediction_type: string | null
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          accuracy?: boolean | null
          actual_value?: string | null
          id?: string
          predicted_value?: string | null
          prediction_date?: string | null
          prediction_type?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          accuracy?: boolean | null
          actual_value?: string | null
          id?: string
          predicted_value?: string | null
          prediction_date?: string | null
          prediction_type?: string | null
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      prescription_images: {
        Row: {
          created_at: string | null
          detected_items: Json | null
          id: string
          ocr_text: string | null
          order_id: string | null
          shopper_id: string | null
          storage_path: string | null
        }
        Insert: {
          created_at?: string | null
          detected_items?: Json | null
          id?: string
          ocr_text?: string | null
          order_id?: string | null
          shopper_id?: string | null
          storage_path?: string | null
        }
        Update: {
          created_at?: string | null
          detected_items?: Json | null
          id?: string
          ocr_text?: string | null
          order_id?: string | null
          shopper_id?: string | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_images_shopper_id_fkey"
            columns: ["shopper_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_shoppers"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_drafts: {
        Row: {
          created_at: string | null
          farmer_id: string | null
          id: string
          photo_url: string | null
          price: number | null
          product_name: string | null
          quantity: number | null
          status: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          farmer_id?: string | null
          id?: string
          photo_url?: string | null
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          farmer_id?: string | null
          id?: string
          photo_url?: string | null
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produce_drafts_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_listings: {
        Row: {
          created_at: string | null
          expires_at: string | null
          farmer_id: string | null
          grade: string | null
          id: string
          matched_order_id: string | null
          photo_url: string | null
          price: number | null
          product_name: string | null
          quantity: number | null
          status: string | null
          unit: string | null
          views: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          farmer_id?: string | null
          grade?: string | null
          id?: string
          matched_order_id?: string | null
          photo_url?: string | null
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          views?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          farmer_id?: string | null
          grade?: string | null
          id?: string
          matched_order_id?: string | null
          photo_url?: string | null
          price?: number | null
          product_name?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produce_listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_matches: {
        Row: {
          buyer_id: string | null
          id: string
          listing_id: string | null
          matched_at: string | null
          required_qty: number | null
          status: string | null
        }
        Insert: {
          buyer_id?: string | null
          id?: string
          listing_id?: string | null
          matched_at?: string | null
          required_qty?: number | null
          status?: string | null
        }
        Update: {
          buyer_id?: string | null
          id?: string
          listing_id?: string | null
          matched_at?: string | null
          required_qty?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produce_matches_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          last_pos_sync: string | null
          min_stock_level: number | null
          name: string | null
          price: number | null
          sku: string | null
          stock_qty: number | null
          stock_quantity: number | null
          unit: string | null
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          last_pos_sync?: string | null
          min_stock_level?: number | null
          name?: string | null
          price?: number | null
          sku?: string | null
          stock_qty?: number | null
          stock_quantity?: number | null
          unit?: string | null
        }
        Update: {
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          last_pos_sync?: string | null
          min_stock_level?: number | null
          name?: string | null
          price?: number | null
          sku?: string | null
          stock_qty?: number | null
          stock_quantity?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          description: string | null
          external_id: string | null
          geom: unknown | null
          id: string
          lat: number | null
          lng: number | null
          photos: Json | null
          price_usd: number | null
          source: string | null
          title: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          geom?: unknown | null
          id?: string
          lat?: number | null
          lng?: number | null
          photos?: Json | null
          price_usd?: number | null
          source?: string | null
          title?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          geom?: unknown | null
          id?: string
          lat?: number | null
          lng?: number | null
          photos?: Json | null
          price_usd?: number | null
          source?: string | null
          title?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      property_sync_log: {
        Row: {
          action: string
          created_at: string
          data_after: Json | null
          data_before: Json | null
          error_message: string | null
          id: string
          processed_at: string
          property_id: string | null
          source: string
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          error_message?: string | null
          id?: string
          processed_at?: string
          property_id?: string | null
          source: string
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          data_after?: Json | null
          data_before?: Json | null
          error_message?: string | null
          id?: string
          processed_at?: string
          property_id?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      qa_performance_benchmarks: {
        Row: {
          category: string | null
          created_at: string
          expected_value: number
          id: string
          metric_name: string
          test_name: string
          tolerance_percent: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expected_value: number
          id?: string
          metric_name: string
          test_name: string
          tolerance_percent?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expected_value?: number
          id?: string
          metric_name?: string
          test_name?: string
          tolerance_percent?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_test_cases: {
        Row: {
          created_at: string
          description: string | null
          expected_result: Json | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
          retry_count: number | null
          suite_id: string | null
          tags: string[] | null
          test_data: Json | null
          test_steps: string[] | null
          timeout_ms: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expected_result?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
          retry_count?: number | null
          suite_id?: string | null
          tags?: string[] | null
          test_data?: Json | null
          test_steps?: string[] | null
          timeout_ms?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expected_result?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
          retry_count?: number | null
          suite_id?: string | null
          tags?: string[] | null
          test_data?: Json | null
          test_steps?: string[] | null
          timeout_ms?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_test_cases_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "qa_test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_test_fixtures: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          fixture_data: Json
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          fixture_data?: Json
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          fixture_data?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_test_mocks: {
        Row: {
          created_at: string
          description: string | null
          endpoint_pattern: string | null
          id: string
          is_active: boolean | null
          mock_config: Json
          name: string
          response_data: Json | null
          response_delay_ms: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          endpoint_pattern?: string | null
          id?: string
          is_active?: boolean | null
          mock_config?: Json
          name: string
          response_data?: Json | null
          response_delay_ms?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          endpoint_pattern?: string | null
          id?: string
          is_active?: boolean | null
          mock_config?: Json
          name?: string
          response_data?: Json | null
          response_delay_ms?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      qa_test_reports: {
        Row: {
          created_at: string
          details: Json | null
          generated_at: string | null
          generated_by: string | null
          id: string
          report_type: string | null
          run_id: string | null
          suite_id: string | null
          summary: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_type?: string | null
          run_id?: string | null
          suite_id?: string | null
          summary?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          report_type?: string | null
          run_id?: string | null
          suite_id?: string | null
          summary?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_test_reports_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "qa_test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_test_runs: {
        Row: {
          actual_result: Json | null
          completed_at: string | null
          created_at: string
          environment: string | null
          error_details: string | null
          execution_time_ms: number | null
          id: string
          logs: string | null
          started_at: string | null
          status: string
          suite_id: string | null
          test_case_id: string | null
          triggered_by: string | null
        }
        Insert: {
          actual_result?: Json | null
          completed_at?: string | null
          created_at?: string
          environment?: string | null
          error_details?: string | null
          execution_time_ms?: number | null
          id?: string
          logs?: string | null
          started_at?: string | null
          status?: string
          suite_id?: string | null
          test_case_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          actual_result?: Json | null
          completed_at?: string | null
          created_at?: string
          environment?: string | null
          error_details?: string | null
          execution_time_ms?: number | null
          id?: string
          logs?: string | null
          started_at?: string | null
          status?: string
          suite_id?: string | null
          test_case_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_test_runs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "qa_test_suites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_test_runs_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "qa_test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_test_scenarios: {
        Row: {
          created_at: string | null
          description: string | null
          expected_result: string | null
          id: string
          pilot_location: string | null
          priority: string | null
          scenario_name: string
          test_steps: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expected_result?: string | null
          id: string
          pilot_location?: string | null
          priority?: string | null
          scenario_name: string
          test_steps?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expected_result?: string | null
          id?: string
          pilot_location?: string | null
          priority?: string | null
          scenario_name?: string
          test_steps?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      qa_test_suites: {
        Row: {
          average_duration_ms: number | null
          category: string
          created_at: string
          description: string | null
          failed_tests: number | null
          id: string
          last_run_at: string | null
          name: string
          passed_tests: number | null
          status: string
          total_tests: number | null
          updated_at: string
        }
        Insert: {
          average_duration_ms?: number | null
          category?: string
          created_at?: string
          description?: string | null
          failed_tests?: number | null
          id?: string
          last_run_at?: string | null
          name: string
          passed_tests?: number | null
          status?: string
          total_tests?: number | null
          updated_at?: string
        }
        Update: {
          average_duration_ms?: number | null
          category?: string
          created_at?: string
          description?: string | null
          failed_tests?: number | null
          id?: string
          last_run_at?: string | null
          name?: string
          passed_tests?: number | null
          status?: string
          total_tests?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          created_at: string | null
          id: string
          request_identifier: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_identifier: string
        }
        Update: {
          created_at?: string | null
          id?: string
          request_identifier?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_user_id: string | null
          referrer_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_user_id?: string | null
          referrer_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_user_id?: string | null
          referrer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_bookings: {
        Row: {
          agreed_price: number | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          driver_id: string | null
          id: string
          passenger_id: string | null
          request_id: string | null
          state: Database["public"]["Enums"]["booking_state"] | null
          trip_id: string | null
        }
        Insert: {
          agreed_price?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          passenger_id?: string | null
          request_id?: string | null
          state?: Database["public"]["Enums"]["booking_state"] | null
          trip_id?: string | null
        }
        Update: {
          agreed_price?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          passenger_id?: string | null
          request_id?: string | null
          state?: Database["public"]["Enums"]["booking_state"] | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          created_at: string | null
          destination: unknown | null
          destination_address: string | null
          expired_at: string | null
          fare_estimate: number | null
          id: string
          matched_at: string | null
          origin: unknown | null
          origin_address: string | null
          passenger_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          destination?: unknown | null
          destination_address?: string | null
          expired_at?: string | null
          fare_estimate?: number | null
          id?: string
          matched_at?: string | null
          origin?: unknown | null
          origin_address?: string | null
          passenger_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          destination?: unknown | null
          destination_address?: string | null
          expired_at?: string | null
          fare_estimate?: number | null
          id?: string
          matched_at?: string | null
          origin?: unknown | null
          origin_address?: string | null
          passenger_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          source_ip: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shopper_promos: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          promo_code: string | null
          redeemed: boolean | null
          shopper_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          promo_code?: string | null
          redeemed?: boolean | null
          shopper_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          promo_code?: string | null
          redeemed?: boolean | null
          shopper_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopper_promos_shopper_id_fkey"
            columns: ["shopper_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_shoppers"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      split_payments: {
        Row: {
          amount: number
          id: string
          momo_ref: string | null
          paid_at: string | null
          status: string | null
          tab_id: string | null
          whatsapp: string
        }
        Insert: {
          amount: number
          id?: string
          momo_ref?: string | null
          paid_at?: string | null
          status?: string | null
          tab_id?: string | null
          whatsapp: string
        }
        Update: {
          amount?: number
          id?: string
          momo_ref?: string | null
          paid_at?: string | null
          status?: string | null
          tab_id?: string | null
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_payments_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "bar_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      stress_test_results: {
        Row: {
          config: Json
          created_at: string
          id: string
          results: Json
          test_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          results: Json
          test_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          results?: Json
          test_id?: string
        }
        Relationships: []
      }
      subscriber_events: {
        Row: {
          created_at: string | null
          event: Database["public"]["Enums"]["evt"] | null
          id: number
          meta: Json | null
          subscriber_id: string | null
        }
        Insert: {
          created_at?: string | null
          event?: Database["public"]["Enums"]["evt"] | null
          id?: number
          meta?: Json | null
          subscriber_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: Database["public"]["Enums"]["evt"] | null
          id?: number
          meta?: Json | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_events_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "campaign_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          sub_type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          sub_type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          sub_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          topic: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          topic?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          current_value: number | null
          description: string | null
          id: string
          metadata: Json | null
          metric_name: string | null
          resolved_at: string | null
          severity: string
          source_function: string | null
          status: string | null
          threshold_value: number | null
          title: string
          triggered_at: string | null
        }
        Insert: {
          alert_type: string
          current_value?: number | null
          description?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string | null
          resolved_at?: string | null
          severity: string
          source_function?: string | null
          status?: string | null
          threshold_value?: number | null
          title: string
          triggered_at?: string | null
        }
        Update: {
          alert_type?: string
          current_value?: number | null
          description?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string | null
          resolved_at?: string | null
          severity?: string
          source_function?: string | null
          status?: string | null
          threshold_value?: number | null
          title?: string
          triggered_at?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_type: string | null
          metric_value: number | null
          recorded_at: string | null
          tags: Json | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_type?: string | null
          metric_value?: number | null
          recorded_at?: string | null
          tags?: Json | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_type?: string | null
          metric_value?: number | null
          recorded_at?: string | null
          tags?: Json | null
        }
        Relationships: []
      }
      tab_items: {
        Row: {
          id: number
          product_id: string | null
          qty: number
          served_at: string | null
          status: string | null
          tab_id: string | null
          unit_price: number
        }
        Insert: {
          id?: number
          product_id?: string | null
          qty: number
          served_at?: string | null
          status?: string | null
          tab_id?: string | null
          unit_price: number
        }
        Update: {
          id?: number
          product_id?: string | null
          qty?: number
          served_at?: string | null
          status?: string | null
          tab_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "tab_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tab_items_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "bar_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      tbl_listing_reviews: {
        Row: {
          created_at: string | null
          decided_at: string | null
          decision: string | null
          id: number
          listing_id: string
          listing_type: string
          notes: string | null
          reviewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          id?: number
          listing_id: string
          listing_type: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          decided_at?: string | null
          decision?: string | null
          id?: number
          listing_id?: string
          listing_type?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Relationships: []
      }
      tbl_properties: {
        Row: {
          action: Database["public"]["Enums"]["property_action"]
          bathrooms: number | null
          bedrooms: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          district: string | null
          furnished: boolean | null
          id: string
          imgs: string[] | null
          owner_phone: string
          price_month: number | null
          price_total: number | null
          sector: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          title: string
          updated_at: string | null
          vector_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["property_action"]
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          district?: string | null
          furnished?: boolean | null
          id?: string
          imgs?: string[] | null
          owner_phone: string
          price_month?: number | null
          price_total?: number | null
          sector?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          title: string
          updated_at?: string | null
          vector_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["property_action"]
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          district?: string | null
          furnished?: boolean | null
          id?: string
          imgs?: string[] | null
          owner_phone?: string
          price_month?: number | null
          price_total?: number | null
          sector?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          title?: string
          updated_at?: string | null
          vector_id?: string | null
        }
        Relationships: []
      }
      tbl_vehicles: {
        Row: {
          action: Database["public"]["Enums"]["vehicle_action"]
          created_at: string | null
          currency: string | null
          daily_rate: number | null
          description: string | null
          fuel_type: string | null
          id: string
          imgs: string[] | null
          make: string | null
          mileage_km: number | null
          model: string | null
          owner_phone: string
          sale_price: number | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          title: string
          transmission: string | null
          updated_at: string | null
          vector_id: string | null
          year: number | null
        }
        Insert: {
          action: Database["public"]["Enums"]["vehicle_action"]
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          description?: string | null
          fuel_type?: string | null
          id?: string
          imgs?: string[] | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          owner_phone: string
          sale_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          title: string
          transmission?: string | null
          updated_at?: string | null
          vector_id?: string | null
          year?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["vehicle_action"]
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          description?: string | null
          fuel_type?: string | null
          id?: string
          imgs?: string[] | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          owner_phone?: string
          sale_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          title?: string
          transmission?: string | null
          updated_at?: string | null
          vector_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      telegram_logs: {
        Row: {
          chat_id: string | null
          id: string
          message_content: string | null
          processed: boolean | null
          received_at: string | null
        }
        Insert: {
          chat_id?: string | null
          id?: string
          message_content?: string | null
          processed?: boolean | null
          received_at?: string | null
        }
        Update: {
          chat_id?: string | null
          id?: string
          message_content?: string | null
          processed?: boolean | null
          received_at?: string | null
        }
        Relationships: []
      }
      test_cases: {
        Row: {
          created_at: string | null
          description: string | null
          expected_result: Json | null
          id: string
          name: string
          retry_count: number | null
          status: string | null
          suite_id: string | null
          test_data: Json | null
          test_function: string
          timeout_ms: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expected_result?: Json | null
          id?: string
          name: string
          retry_count?: number | null
          status?: string | null
          suite_id?: string | null
          test_data?: Json | null
          test_function: string
          timeout_ms?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expected_result?: Json | null
          id?: string
          name?: string
          retry_count?: number | null
          status?: string | null
          suite_id?: string | null
          test_data?: Json | null
          test_function?: string
          timeout_ms?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_fixtures: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          setup_sql: string | null
          teardown_sql: string | null
          test_data: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          setup_sql?: string | null
          teardown_sql?: string | null
          test_data?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          setup_sql?: string | null
          teardown_sql?: string | null
          test_data?: Json | null
        }
        Relationships: []
      }
      test_mocks: {
        Row: {
          active: boolean | null
          created_at: string | null
          endpoint_pattern: string
          id: string
          method: string | null
          mock_response: Json
          response_delay_ms: number | null
          service_name: string
          status_code: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          endpoint_pattern: string
          id?: string
          method?: string | null
          mock_response: Json
          response_delay_ms?: number | null
          service_name: string
          status_code?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          endpoint_pattern?: string
          id?: string
          method?: string | null
          mock_response?: Json
          response_delay_ms?: number | null
          service_name?: string
          status_code?: number | null
        }
        Relationships: []
      }
      test_runs: {
        Row: {
          actual_result: Json | null
          completed_at: string | null
          created_at: string | null
          error_details: string | null
          execution_id: string
          execution_time_ms: number | null
          id: string
          logs: string | null
          started_at: string | null
          status: string
          suite_id: string | null
          test_case_id: string | null
        }
        Insert: {
          actual_result?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: string | null
          execution_id: string
          execution_time_ms?: number | null
          id?: string
          logs?: string | null
          started_at?: string | null
          status: string
          suite_id?: string | null
          test_case_id?: string | null
        }
        Update: {
          actual_result?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: string | null
          execution_id?: string
          execution_time_ms?: number | null
          id?: string
          logs?: string | null
          started_at?: string | null
          status?: string
          suite_id?: string | null
          test_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tool_definitions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          implementation_function: string
          name: string
          parameters: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_function: string
          name: string
          parameters: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          implementation_function?: string
          name?: string
          parameters?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      training_data_export: {
        Row: {
          assistant_message: string
          conversation_id: string | null
          exported_at: string | null
          fine_tune_job_id: string | null
          id: string
          quality_score: number | null
          status: string | null
          user_message: string
        }
        Insert: {
          assistant_message: string
          conversation_id?: string | null
          exported_at?: string | null
          fine_tune_job_id?: string | null
          id?: string
          quality_score?: number | null
          status?: string | null
          user_message: string
        }
        Update: {
          assistant_message?: string
          conversation_id?: string | null
          exported_at?: string | null
          fine_tune_job_id?: string | null
          id?: string
          quality_score?: number | null
          status?: string | null
          user_message?: string
        }
        Relationships: []
      }
      trip_events: {
        Row: {
          event: string
          event_time: string | null
          id: number
          metadata: Json | null
          trip_id: string | null
        }
        Insert: {
          event: string
          event_time?: string | null
          id?: number
          metadata?: Json | null
          trip_id?: string | null
        }
        Update: {
          event?: string
          event_time?: string | null
          id?: number
          metadata?: Json | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_ratings: {
        Row: {
          created_at: string | null
          driver_id: string | null
          feedback: string | null
          id: string
          passenger_id: string | null
          stars: number | null
          tip_amount: number | null
          trip_id: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          feedback?: string | null
          id?: string
          passenger_id?: string | null
          stars?: number | null
          tip_amount?: number | null
          trip_id?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          feedback?: string | null
          id?: string
          passenger_id?: string | null
          stars?: number | null
          tip_amount?: number | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_ratings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_ratings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          completed_at: string | null
          created_at: string | null
          departure_time: string | null
          driver_id: string | null
          dropoff_coords: unknown | null
          dropoff_location: string | null
          fare_amount: number | null
          id: string
          passenger_id: string | null
          passenger_paid: boolean | null
          pickup_coords: unknown | null
          pickup_location: string | null
          price: number | null
          ride_request_id: string | null
          status: Database["public"]["Enums"]["trip_status"] | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          departure_time?: string | null
          driver_id?: string | null
          dropoff_coords?: unknown | null
          dropoff_location?: string | null
          fare_amount?: number | null
          id?: string
          passenger_id?: string | null
          passenger_paid?: boolean | null
          pickup_coords?: unknown | null
          pickup_location?: string | null
          price?: number | null
          ride_request_id?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          departure_time?: string | null
          driver_id?: string | null
          dropoff_coords?: unknown | null
          dropoff_location?: string | null
          fare_amount?: number | null
          id?: string
          passenger_id?: string | null
          passenger_paid?: boolean | null
          pickup_coords?: unknown | null
          pickup_location?: string | null
          price?: number | null
          ride_request_id?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "passengers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_ride_request_id_fkey"
            columns: ["ride_request_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_listings: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          featured: boolean | null
          id: string
          images: string[] | null
          listing_type: Database["public"]["Enums"]["listing_type_enum"]
          location_gps: unknown | null
          metadata: Json | null
          price: number | null
          status: string | null
          stock_quantity: number | null
          subcategory: string | null
          tags: string[] | null
          title: string
          unit_of_measure: string | null
          updated_at: string | null
          vendor_id: string | null
          visibility: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          listing_type: Database["public"]["Enums"]["listing_type_enum"]
          location_gps?: unknown | null
          metadata?: Json | null
          price?: number | null
          status?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          unit_of_measure?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          visibility?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          listing_type?: Database["public"]["Enums"]["listing_type_enum"]
          location_gps?: unknown | null
          metadata?: Json | null
          price?: number | null
          status?: string | null
          stock_quantity?: number | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          unit_of_measure?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      unified_orders: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          customer_phone: string
          delivery_address: Json | null
          delivery_fee: number | null
          delivery_method: string | null
          delivery_notes: string | null
          domain_metadata: Json | null
          id: string
          items: Json
          listing_ids: string[] | null
          notes: string | null
          order_type: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_phone: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_method?: string | null
          delivery_notes?: string | null
          domain_metadata?: Json | null
          id?: string
          items?: Json
          listing_ids?: string[] | null
          notes?: string | null
          order_type?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_phone?: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          delivery_method?: string | null
          delivery_notes?: string | null
          domain_metadata?: Json | null
          id?: string
          items?: Json
          listing_ids?: string[] | null
          notes?: string | null
          order_type?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      user_behavior_patterns: {
        Row: {
          behavioral_score: number | null
          id: string
          last_analyzed: string | null
          pattern_confidence: number | null
          pattern_data: Json | null
          pattern_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          behavioral_score?: number | null
          id?: string
          last_analyzed?: string | null
          pattern_confidence?: number | null
          pattern_data?: Json | null
          pattern_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          behavioral_score?: number | null
          id?: string
          last_analyzed?: string | null
          pattern_confidence?: number | null
          pattern_data?: Json | null
          pattern_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_contacts: {
        Row: {
          business_name: string | null
          category: string | null
          created_at: string | null
          id: string
          location: string | null
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          business_name?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          business_name?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          credits: number
          id: string
          momo_code: string | null
          phone: string
          referral_code: string | null
          referred_by: string | null
        }
        Insert: {
          created_at?: string | null
          credits?: number
          id?: string
          momo_code?: string | null
          phone: string
          referral_code?: string | null
          referred_by?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          id?: string
          momo_code?: string | null
          phone?: string
          referral_code?: string | null
          referred_by?: string | null
        }
        Relationships: []
      }
      vector_store: {
        Row: {
          chunk: string
          doc_id: string
          embedding: string | null
        }
        Insert: {
          chunk: string
          doc_id: string
          embedding?: string | null
        }
        Update: {
          chunk?: string
          doc_id?: string
          embedding?: string | null
        }
        Relationships: []
      }
      vehicle_listings: {
        Row: {
          created_at: string | null
          description: string | null
          external_id: string | null
          geom: unknown | null
          id: string
          lat: number | null
          lng: number | null
          make: string | null
          model: string | null
          photos: Json | null
          price_usd: number | null
          source: string | null
          usage: string | null
          whatsapp: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          geom?: unknown | null
          id?: string
          lat?: number | null
          lng?: number | null
          make?: string | null
          model?: string | null
          photos?: Json | null
          price_usd?: number | null
          source?: string | null
          usage?: string | null
          whatsapp?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_id?: string | null
          geom?: unknown | null
          id?: string
          lat?: number | null
          lng?: number | null
          make?: string | null
          model?: string | null
          photos?: Json | null
          price_usd?: number | null
          source?: string | null
          usage?: string | null
          whatsapp?: string | null
          year?: number | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          context_state: Json | null
          id: string
          last_agent_id: string | null
          last_message_at: string | null
          user_number: string
        }
        Insert: {
          context_state?: Json | null
          id?: string
          last_agent_id?: string | null
          last_message_at?: string | null
          user_number: string
        }
        Update: {
          context_state?: Json | null
          id?: string
          last_agent_id?: string | null
          last_message_at?: string | null
          user_number?: string
        }
        Relationships: []
      }
      whatsapp_delivery_metrics: {
        Row: {
          created_at: string | null
          delivered: boolean
          delivery_time_ms: number | null
          error_details: string | null
          id: string
          message_type: string | null
          phone_number: string
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          delivered?: boolean
          delivery_time_ms?: number | null
          error_details?: string | null
          id?: string
          message_type?: string | null
          phone_number: string
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          delivered?: boolean
          delivery_time_ms?: number | null
          error_details?: string | null
          id?: string
          message_type?: string | null
          phone_number?: string
          template_name?: string | null
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          contact_name: string | null
          media_id: string | null
          message_content: string | null
          message_id: string
          message_type: string | null
          phone_number: string | null
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
          timestamp: string | null
        }
        Insert: {
          contact_name?: string | null
          media_id?: string | null
          message_content?: string | null
          message_id: string
          message_type?: string | null
          phone_number?: string | null
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          timestamp?: string | null
        }
        Update: {
          contact_name?: string | null
          media_id?: string | null
          message_content?: string | null
          message_id?: string
          message_type?: string | null
          phone_number?: string | null
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          agent_id: string | null
          body: string | null
          created_at: string | null
          direction: string
          from_number: string
          id: string
          msg_type: string | null
          raw_json: Json | null
          status: string | null
          to_number: string
          wa_message_id: string | null
        }
        Insert: {
          agent_id?: string | null
          body?: string | null
          created_at?: string | null
          direction: string
          from_number: string
          id?: string
          msg_type?: string | null
          raw_json?: Json | null
          status?: string | null
          to_number: string
          wa_message_id?: string | null
        }
        Update: {
          agent_id?: string | null
          body?: string | null
          created_at?: string | null
          direction?: string
          from_number?: string
          id?: string
          msg_type?: string | null
          raw_json?: Json | null
          status?: string | null
          to_number?: string
          wa_message_id?: string | null
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          approved_by: string | null
          category: string
          content: string
          created_at: string
          id: string
          name: string
          rejection_reason: string | null
          status: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          approved_by?: string | null
          category: string
          content: string
          created_at?: string
          id?: string
          name: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          approved_by?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          name?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      conversation_summary: {
        Row: {
          last_message_at: string | null
          latest_message_time: string | null
          message_count: number | null
          user_number: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown | null
          f_table_catalog: unknown | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown | null
          f_table_catalog: string | null
          f_table_name: unknown | null
          f_table_schema: unknown | null
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown | null
          f_table_catalog?: string | null
          f_table_name?: unknown | null
          f_table_schema?: unknown | null
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { oldname: string; newname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { tbl: unknown; col: string }
        Returns: unknown
      }
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _postgis_selectivity: {
        Args: { tbl: unknown; att_name: string; geom: unknown; mode?: string }
        Returns: number
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_bestsrid: {
        Args: { "": unknown }
        Returns: number
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_pointoutside: {
        Args: { "": unknown }
        Returns: unknown
      }
      _st_sortablehash: {
        Args: { geom: unknown }
        Returns: number
      }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          g1: unknown
          clip?: unknown
          tolerance?: number
          return_polygons?: boolean
        }
        Returns: unknown
      }
      _st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      addauth: {
        Args: { "": string }
        Returns: boolean
      }
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
              new_srid_in: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              schema_name: string
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
          | {
              table_name: string
              column_name: string
              new_srid: number
              new_type: string
              new_dim: number
              use_typmod?: boolean
            }
        Returns: string
      }
      admin_exists: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      audit_security_compliance: {
        Args: Record<PropertyKey, never>
        Returns: {
          security_issue: string
          entity_name: string
          severity: string
          recommendation: string
        }[]
      }
      backfill_unified_orders: {
        Args: Record<PropertyKey, never>
        Returns: {
          orders_migrated: number
          carts_created: number
          payments_migrated: number
          deliveries_created: number
          migration_summary: string
        }[]
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      box: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box2d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box2df_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d: {
        Args: { "": unknown } | { "": unknown }
        Returns: unknown
      }
      box3d_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3d_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      box3dtobox: {
        Args: { "": unknown }
        Returns: unknown
      }
      bytea: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      check_function_exists: {
        Args: { function_name: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args:
          | {
              _identifier: string
              _endpoint: string
              _max_requests?: number
              _window_minutes?: number
            }
          | {
              identifier: string
              max_requests?: number
              window_seconds?: number
            }
        Returns: Json
      }
      clean_test_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_payment_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_rate_limit_log: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_security_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_admin_user: {
        Args: { user_email: string } | { user_id: string }
        Returns: Json
      }
      disablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string
              schema_name: string
              table_name: string
              column_name: string
            }
          | { schema_name: string; table_name: string; column_name: string }
          | { table_name: string; column_name: string }
        Returns: string
      }
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string }
        Returns: string
      }
      enablelongtransactions: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      final_security_assessment: {
        Args: Record<PropertyKey, never>
        Returns: {
          issue_type: string
          entity_name: string
          current_status: string
          explanation: string
          action_required: string
        }[]
      }
      find_nearby_drivers: {
        Args: { pickup_point: unknown; max_km: number }
        Returns: {
          id: string
          distance_km: number
        }[]
      }
      fn_admin_force_match: {
        Args: { p_trip_id: string }
        Returns: undefined
      }
      fn_find_matching_trips: {
        Args: { intent_id: string }
        Returns: {
          trip_id: string
          compatibility_score: number
        }[]
      }
      fn_get_nearby_drivers: {
        Args: { lat: number; lng: number; radius?: number }
        Returns: {
          trip_id: string
          driver_phone: string
          from_text: string
          to_text: string
          seats: number
          price_rwf: number
          distance_km: number
        }[]
      }
      fn_get_nearby_drivers_spatial: {
        Args: { lat: number; lng: number; radius?: number }
        Returns: {
          id: string
          driver_id: string
          driver_phone: string
          price_rwf: number
          seats: number
          distance_km: number
          origin_lat: number
          origin_lng: number
          destination_lat: number
          destination_lng: number
          from_text: string
          to_text: string
        }[]
      }
      fn_get_nearby_passengers: {
        Args: { lat: number; lng: number; radius?: number }
        Returns: {
          intent_id: string
          passenger_phone: string
          from_text: string
          to_text: string
          seats_needed: number
          max_price_rwf: number
          distance_km: number
        }[]
      }
      gdpr_delete_user_data: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      gdpr_export_user_data: {
        Args: { target_user_id: string }
        Returns: Json
      }
      generate_test_phone: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      geography: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      geography_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geography_gist_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_gist_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_send: {
        Args: { "": unknown }
        Returns: string
      }
      geography_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geography_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geography_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
        Returns: unknown
      }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_analyze: {
        Args: { "": unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_decompress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_hash: {
        Args: { "": unknown }
        Returns: number
      }
      geometry_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_send: {
        Args: { "": unknown }
        Returns: string
      }
      geometry_sortsupport: {
        Args: { "": unknown }
        Returns: undefined
      }
      geometry_spgist_compress_2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_3d: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_spgist_compress_nd: {
        Args: { "": unknown }
        Returns: unknown
      }
      geometry_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      geometry_typmod_out: {
        Args: { "": number }
        Returns: unknown
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometrytype: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      get_proj4_from_srid: {
        Args: { "": number }
        Returns: string
      }
      get_rls_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          rls_enabled: boolean
        }[]
      }
      get_security_functions: {
        Args: Record<PropertyKey, never>
        Returns: {
          function_name: string
          security_type: string
          has_search_path: boolean
        }[]
      }
      gettransactionid: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      gidx_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gidx_out: {
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
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
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
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_bar_staff: {
        Args: { bar_id: string }
        Returns: boolean
      }
      is_marketing_eligible: {
        Args: Record<PropertyKey, never>
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
      json: {
        Args: { "": unknown }
        Returns: Json
      }
      jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      list_farmers: {
        Args: { search_term: string }
        Returns: {
          created_at: string | null
          crops: string[] | null
          district: string | null
          id: string
          listings_count: number | null
          name: string
          status: string | null
          whatsapp: string | null
        }[]
      }
      log_security_event: {
        Args: { event_type: string; severity: string; details?: Json }
        Returns: undefined
      }
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      moderate_content: {
        Args: { content: string }
        Returns: Json
      }
      path: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_finalfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_asmvt_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown }
        Returns: string
      }
      point: {
        Args: { "": unknown }
        Returns: unknown
      }
      polygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      populate_geometry_columns: {
        Args:
          | { tbl_oid: unknown; use_typmod?: boolean }
          | { use_typmod?: boolean }
        Returns: string
      }
      postgis_addbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_constraint_dims: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomschema: string; geomtable: string; geomcolumn: string }
        Returns: string
      }
      postgis_dropbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_full_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_geos_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_geos_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_getbbox: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_hasbbox: {
        Args: { "": unknown }
        Returns: boolean
      }
      postgis_index_supportfn: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_lib_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_noop: {
        Args: { "": unknown }
        Returns: unknown
      }
      postgis_proj_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_svn_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_type_name: {
        Args: {
          geomname: string
          coord_dimension: number
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_typmod_dims: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_srid: {
        Args: { "": number }
        Returns: number
      }
      postgis_typmod_type: {
        Args: { "": number }
        Returns: string
      }
      postgis_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      security_compliance_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          compliance_area: string
          status: string
          details: string
        }[]
      }
      security_notes: {
        Args: Record<PropertyKey, never>
        Returns: {
          note_type: string
          description: string
        }[]
      }
      security_status_report: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          item_name: string
          status: string
          recommendation: string
        }[]
      }
      soft_delete_listing: {
        Args: { listing_id: string }
        Returns: boolean
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
      spheroid_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      spheroid_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlength: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dperimeter: {
        Args: { "": unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle: {
        Args:
          | { line1: unknown; line2: unknown }
          | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
        Returns: number
      }
      st_area: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_area2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_asbinary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              r: Record<string, unknown>
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
            }
        Returns: string
      }
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              version: number
              geog: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
          | {
              version: number
              geom: unknown
              maxdecimaldigits?: number
              options?: number
              nprefix?: string
              id?: string
            }
        Returns: string
      }
      st_ashexewkb: {
        Args: { "": unknown }
        Returns: string
      }
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
        Returns: string
      }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: {
        Args: { geom: unknown; format?: string }
        Returns: string
      }
      st_asmvtgeom: {
        Args: {
          geom: unknown
          bounds: unknown
          extent?: number
          buffer?: number
          clip_geom?: boolean
        }
        Returns: unknown
      }
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; rel?: number; maxdecimaldigits?: number }
          | { geom: unknown; rel?: number; maxdecimaldigits?: number }
        Returns: string
      }
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      st_astwkb: {
        Args:
          | {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
          | {
              geom: unknown
              prec?: number
              prec_z?: number
              prec_m?: number
              with_sizes?: boolean
              with_boxes?: boolean
            }
        Returns: string
      }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_boundary: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_boundingdiagonal: {
        Args: { geom: unknown; fits?: boolean }
        Returns: unknown
      }
      st_buffer: {
        Args:
          | { geom: unknown; radius: number; options?: string }
          | { geom: unknown; radius: number; quadsegs: number }
        Returns: unknown
      }
      st_buildarea: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_centroid: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      st_cleangeometry: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_clipbybox2d: {
        Args: { geom: unknown; box: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_clusterintersecting: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collectionextract: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_collectionhomogenize: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_concavehull: {
        Args: {
          param_geom: unknown
          param_pctconvex: number
          param_allow_holes?: boolean
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_convexhull: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_coorddim: {
        Args: { geometry: unknown }
        Returns: number
      }
      st_coveredby: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_covers: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_curvetoline: {
        Args: { geom: unknown; tol?: number; toltype?: number; flags?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { g1: unknown; tolerance?: number; flags?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_dimension: {
        Args: { "": unknown }
        Returns: number
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance: {
        Args:
          | { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
          | { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_distancesphere: {
        Args:
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; radius: number }
        Returns: number
      }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dump: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumppoints: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumprings: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dumpsegments: {
        Args: { "": unknown }
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][]
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_endpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_envelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_equals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { geom: unknown; dx: number; dy: number; dz?: number; dm?: number }
        Returns: unknown
      }
      st_exteriorring: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_flipcoordinates: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force2d: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_force3d: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; zvalue?: number; mvalue?: number }
        Returns: unknown
      }
      st_forcecollection: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcecurve: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygonccw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcepolygoncw: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcerhr: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_forcesfs: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_generatepoints: {
        Args:
          | { area: unknown; npoints: number }
          | { area: unknown; npoints: number; seed: number }
        Returns: unknown
      }
      st_geogfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geogfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geographyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geohash: {
        Args:
          | { geog: unknown; maxchars?: number }
          | { geom: unknown; maxchars?: number }
        Returns: string
      }
      st_geomcollfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomcollfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometricmedian: {
        Args: {
          g: unknown
          tolerance?: number
          max_iter?: number
          fail_if_not_converged?: boolean
        }
        Returns: unknown
      }
      st_geometryfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geometrytype: {
        Args: { "": unknown }
        Returns: string
      }
      st_geomfromewkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromewkt: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string }
        Returns: unknown
      }
      st_geomfromgml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromkml: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfrommarc21: {
        Args: { marc21xml: string }
        Returns: unknown
      }
      st_geomfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromtwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_geomfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_gmltosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_hasarc: {
        Args: { geometry: unknown }
        Returns: boolean
      }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects: {
        Args:
          | { geog1: unknown; geog2: unknown }
          | { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_isclosed: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_iscollection: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isempty: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygonccw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_ispolygoncw: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isring: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_issimple: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvalid: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_isvaliddetail: {
        Args: { geom: unknown; flags?: number }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
      }
      st_isvalidreason: {
        Args: { "": unknown }
        Returns: string
      }
      st_isvalidtrajectory: {
        Args: { "": unknown }
        Returns: boolean
      }
      st_length: {
        Args:
          | { "": string }
          | { "": unknown }
          | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_length2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_letters: {
        Args: { letters: string; font?: Json }
        Returns: unknown
      }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { txtin: string; nprecision?: number }
        Returns: unknown
      }
      st_linefrommultipoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_linefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linemerge: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_linestringfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_linetocurve: {
        Args: { geometry: unknown }
        Returns: unknown
      }
      st_locatealong: {
        Args: { geometry: unknown; measure: number; leftrightoffset?: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          geometry: unknown
          frommeasure: number
          tomeasure: number
          leftrightoffset?: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { geometry: unknown; fromelevation: number; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_m: {
        Args: { "": unknown }
        Returns: number
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makepolygon: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_maximuminscribedcircle: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_memsize: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_minimumboundingradius: {
        Args: { "": unknown }
        Returns: Record<string, unknown>
      }
      st_minimumclearance: {
        Args: { "": unknown }
        Returns: number
      }
      st_minimumclearanceline: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_mlinefromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mlinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_mpolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multi: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_multilinefromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multilinestringfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_multipolygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_ndims: {
        Args: { "": unknown }
        Returns: number
      }
      st_node: {
        Args: { g: unknown }
        Returns: unknown
      }
      st_normalize: {
        Args: { geom: unknown }
        Returns: unknown
      }
      st_npoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_nrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numgeometries: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorring: {
        Args: { "": unknown }
        Returns: number
      }
      st_numinteriorrings: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpatches: {
        Args: { "": unknown }
        Returns: number
      }
      st_numpoints: {
        Args: { "": unknown }
        Returns: number
      }
      st_offsetcurve: {
        Args: { line: unknown; distance: number; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_orientedenvelope: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_perimeter2d: {
        Args: { "": unknown }
        Returns: number
      }
      st_pointfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_pointm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointonsurface: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_points: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
          mcoordinate: number
          srid?: number
        }
        Returns: unknown
      }
      st_polyfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polyfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromtext: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonfromwkb: {
        Args: { "": string }
        Returns: unknown
      }
      st_polygonize: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      st_project: {
        Args: { geog: unknown; distance: number; azimuth: number }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_x: number
          prec_y?: number
          prec_z?: number
          prec_m?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: string
      }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_reverse: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number }
        Returns: unknown
      }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shiftlongitude: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; vertex_fraction: number; is_outer?: boolean }
        Returns: unknown
      }
      st_split: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_square: {
        Args: { size: number; cell_i: number; cell_j: number; origin?: unknown }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { size: number; bounds: unknown }
        Returns: Record<string, unknown>[]
      }
      st_srid: {
        Args: { geog: unknown } | { geom: unknown }
        Returns: number
      }
      st_startpoint: {
        Args: { "": unknown }
        Returns: unknown
      }
      st_subdivide: {
        Args: { geom: unknown; maxvertices?: number; gridsize?: number }
        Returns: unknown[]
      }
      st_summary: {
        Args: { "": unknown } | { "": unknown }
        Returns: string
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          zoom: number
          x: number
          y: number
          bounds?: unknown
          margin?: number
        }
        Returns: unknown
      }
      st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_transform: {
        Args:
          | { geom: unknown; from_proj: string; to_proj: string }
          | { geom: unknown; from_proj: string; to_srid: number }
          | { geom: unknown; to_proj: string }
        Returns: unknown
      }
      st_triangulatepolygon: {
        Args: { g1: unknown }
        Returns: unknown
      }
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number }
        Returns: unknown
      }
      st_voronoilines: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { g1: unknown; tolerance?: number; extend_to?: unknown }
        Returns: unknown
      }
      st_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_wkbtosql: {
        Args: { wkb: string }
        Returns: unknown
      }
      st_wkttosql: {
        Args: { "": string }
        Returns: unknown
      }
      st_wrapx: {
        Args: { geom: unknown; wrap: number; move: number }
        Returns: unknown
      }
      st_x: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_xmin: {
        Args: { "": unknown }
        Returns: number
      }
      st_y: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymax: {
        Args: { "": unknown }
        Returns: number
      }
      st_ymin: {
        Args: { "": unknown }
        Returns: number
      }
      st_z: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmax: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmflag: {
        Args: { "": unknown }
        Returns: number
      }
      st_zmin: {
        Args: { "": unknown }
        Returns: number
      }
      text: {
        Args: { "": unknown }
        Returns: string
      }
      unlockrows: {
        Args: { "": string }
        Returns: number
      }
      update_agent_assistant_id: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          schema_name: string
          table_name: string
          column_name: string
          new_srid_in: number
        }
        Returns: string
      }
      upsert_embedding: {
        Args: { doc_id: string; chunk: string; embedding: string }
        Returns: undefined
      }
      validate_webhook_signature: {
        Args: { payload: string; signature: string; secret: string }
        Returns: boolean
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
      app_role: "admin" | "pharmacist" | "driver" | "user"
      booking_state: "pending" | "confirmed" | "rejected" | "cancelled" | "done"
      business_type:
        | "bar"
        | "pharmacy"
        | "shop"
        | "produce"
        | "hardware"
        | "restaurant"
        | "hotel"
        | "gas_station"
        | "bank"
        | "school"
        | "hospital"
        | "store"
        | "salon"
        | "cosmetics"
      driver_type: "moto" | "cab" | "truck"
      evt: "sent" | "delivered" | "read" | "clicked" | "opt_out"
      listing_type_enum:
        | "product"
        | "produce"
        | "property"
        | "vehicle"
        | "hardware"
      order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "delivering"
        | "fulfilled"
        | "cancelled"
      payment_status: "pending" | "paid" | "failed"
      property_action: "rent" | "sale"
      property_status: "draft" | "published" | "archived" | "pending"
      source_type: "manual" | "upload" | "url" | "gdrive"
      trip_status: "scheduled" | "ongoing" | "completed" | "cancelled"
      vehicle_action: "rent" | "sale"
      vehicle_status: "draft" | "published" | "archived" | "pending"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown | null
      }
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
      app_role: ["admin", "pharmacist", "driver", "user"],
      booking_state: ["pending", "confirmed", "rejected", "cancelled", "done"],
      business_type: [
        "bar",
        "pharmacy",
        "shop",
        "produce",
        "hardware",
        "restaurant",
        "hotel",
        "gas_station",
        "bank",
        "school",
        "hospital",
        "store",
        "salon",
        "cosmetics",
      ],
      driver_type: ["moto", "cab", "truck"],
      evt: ["sent", "delivered", "read", "clicked", "opt_out"],
      listing_type_enum: [
        "product",
        "produce",
        "property",
        "vehicle",
        "hardware",
      ],
      order_status: [
        "pending",
        "paid",
        "preparing",
        "delivering",
        "fulfilled",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "failed"],
      property_action: ["rent", "sale"],
      property_status: ["draft", "published", "archived", "pending"],
      source_type: ["manual", "upload", "url", "gdrive"],
      trip_status: ["scheduled", "ongoing", "completed", "cancelled"],
      vehicle_action: ["rent", "sale"],
      vehicle_status: ["draft", "published", "archived", "pending"],
    },
  },
} as const
