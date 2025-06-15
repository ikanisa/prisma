export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      insurance_quotes: {
        Row: {
          created_at: string | null
          id: string
          id_card_url: string | null
          logbook_url: string | null
          passport_url: string | null
          phone: string
          premium: number | null
          previous_insurance_url: string | null
          reviewed_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["quote_status"]
          type: Database["public"]["Enums"]["insurance_type"]
          updated_at: string | null
          user_data: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          id_card_url?: string | null
          logbook_url?: string | null
          passport_url?: string | null
          phone: string
          premium?: number | null
          previous_insurance_url?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["quote_status"]
          type: Database["public"]["Enums"]["insurance_type"]
          updated_at?: string | null
          user_data: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          id_card_url?: string | null
          logbook_url?: string | null
          passport_url?: string | null
          phone?: string
          premium?: number | null
          previous_insurance_url?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["quote_status"]
          type?: Database["public"]["Enums"]["insurance_type"]
          updated_at?: string | null
          user_data?: Json
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          momo_code: string | null
          phone_number: string
          session_id: string
          status: Database["public"]["Enums"]["payment_status"] | null
          ussd_string: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          momo_code?: string | null
          phone_number: string
          session_id: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          ussd_string: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          momo_code?: string | null
          phone_number?: string
          session_id?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          ussd_string?: string
        }
        Relationships: []
      }
      qr_history: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          phone_number: string
          qr_image_url: string | null
          session_id: string
          type: Database["public"]["Enums"]["qr_type"]
          ussd_string: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          phone_number: string
          qr_image_url?: string | null
          session_id: string
          type: Database["public"]["Enums"]["qr_type"]
          ussd_string: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          phone_number?: string
          qr_image_url?: string | null
          session_id?: string
          type?: Database["public"]["Enums"]["qr_type"]
          ussd_string?: string
        }
        Relationships: []
      }
      shared_links: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          id: string
          link_token: string
          phone_number: string
          session_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          link_token?: string
          phone_number: string
          session_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          link_token?: string
          phone_number?: string
          session_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          client_name: string
          created_at: string
          destination: string
          fare: number
          id: string
          session_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          destination: string
          fare: number
          id?: string
          session_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          destination?: string
          fare?: number
          id?: string
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      detect_payment_method: {
        Args: { input_value: string }
        Returns: Database["public"]["Enums"]["payment_method"]
      }
      generate_ussd_string: {
        Args: { input_value: string; amount: number }
        Returns: string
      }
      record_payment: {
        Args: { qr_content: string }
        Returns: string
      }
      set_config: {
        Args: {
          setting_name: string
          setting_value: string
          is_local?: boolean
        }
        Returns: undefined
      }
      start_trip: {
        Args: { name: string; destination: string; fare: number }
        Returns: string
      }
    }
    Enums: {
      insurance_type: "motor" | "travel" | "health"
      payment_method: "number" | "code"
      payment_status: "pending" | "sent" | "confirmed"
      qr_type: "scan" | "generate"
      quote_status: "draft" | "pending" | "approved" | "rejected" | "paid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      insurance_type: ["motor", "travel", "health"],
      payment_method: ["number", "code"],
      payment_status: ["pending", "sent", "confirmed"],
      qr_type: ["scan", "generate"],
      quote_status: ["draft", "pending", "approved", "rejected", "paid"],
    },
  },
} as const
