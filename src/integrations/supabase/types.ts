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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_call_history: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          provider_id: string
          request_mode: string
          request_snapshot: Json
          response_snapshot: string | null
          response_status: number | null
          selected_model: string | null
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          provider_id: string
          request_mode?: string
          request_snapshot?: Json
          response_snapshot?: string | null
          response_status?: number | null
          selected_model?: string | null
          success?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          provider_id?: string
          request_mode?: string
          request_snapshot?: Json
          response_snapshot?: string | null
          response_status?: number | null
          selected_model?: string | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_call_history_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "api_call_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_providers: {
        Row: {
          api_key: string
          auth_header_name: string | null
          auth_mode: string
          base_url: string
          created_at: string
          defaults: Json
          enabled: boolean
          favorite_models: Json
          id: string
          name: string
          request_schema: Json
          sample_snippets: Json
          sort_order: number
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          api_key: string
          auth_header_name?: string | null
          auth_mode?: string
          base_url: string
          created_at?: string
          defaults?: Json
          enabled?: boolean
          favorite_models?: Json
          id?: string
          name: string
          request_schema?: Json
          sample_snippets?: Json
          sort_order?: number
          updated_at?: string
          user_id: string
          vendor_id?: string
        }
        Update: {
          api_key?: string
          auth_header_name?: string | null
          auth_mode?: string
          base_url?: string
          created_at?: string
          defaults?: Json
          enabled?: boolean
          favorite_models?: Json
          id?: string
          name?: string
          request_schema?: Json
          sample_snippets?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      doc_catalog_overrides: {
        Row: {
          applied_by: string | null
          created_at: string
          entity_key: string
          id: string
          override_type: string
          payload: Json
          scope: string
          source_run_id: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          entity_key: string
          id?: string
          override_type: string
          payload?: Json
          scope: string
          source_run_id?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          entity_key?: string
          id?: string
          override_type?: string
          payload?: Json
          scope?: string
          source_run_id?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_catalog_overrides_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "doc_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_refresh_diff_items: {
        Row: {
          baseline_payload: Json
          candidate_payload: Json
          created_at: string
          diff_kind: string
          entity_key: string
          id: string
          review_action: string
          review_status: string
          resolved_at: string | null
          run_id: string
          similar_candidates: Json
          similarity_score: number | null
          scope: string
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          baseline_payload?: Json
          candidate_payload?: Json
          created_at?: string
          diff_kind: string
          entity_key: string
          id?: string
          review_action?: string
          review_status?: string
          resolved_at?: string | null
          run_id: string
          similar_candidates?: Json
          similarity_score?: number | null
          scope: string
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          baseline_payload?: Json
          candidate_payload?: Json
          created_at?: string
          diff_kind?: string
          entity_key?: string
          id?: string
          review_action?: string
          review_status?: string
          resolved_at?: string | null
          run_id?: string
          similar_candidates?: Json
          similarity_score?: number | null
          scope?: string
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_refresh_diff_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "doc_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_refresh_runs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          page_route: string
          scope: string
          source_mode: string
          started_at: string
          status: string
          summary_counts: Json
          updated_at: string
          user_id: string
          vendor_ids: Json
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          page_route: string
          scope: string
          source_mode?: string
          started_at?: string
          status?: string
          summary_counts?: Json
          updated_at?: string
          user_id: string
          vendor_ids?: Json
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          page_route?: string
          scope?: string
          source_mode?: string
          started_at?: string
          status?: string
          summary_counts?: Json
          updated_at?: string
          user_id?: string
          vendor_ids?: Json
        }
        Relationships: []
      }
      doc_refresh_snapshots: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          normalized_payload: Json
          raw_markdown: string
          run_id: string
          scope: string
          source_url: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          normalized_payload?: Json
          raw_markdown: string
          run_id: string
          scope: string
          source_url: string
          user_id: string
          vendor_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          normalized_payload?: Json
          raw_markdown?: string
          run_id?: string
          scope?: string
          source_url?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_refresh_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "doc_refresh_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_refresh_user_settings: {
        Row: {
          created_at: string
          firecrawl_key_ciphertext: string | null
          firecrawl_key_mask: string | null
          firecrawl_last_verified_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firecrawl_key_ciphertext?: string | null
          firecrawl_key_mask?: string | null
          firecrawl_last_verified_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firecrawl_key_ciphertext?: string | null
          firecrawl_key_mask?: string | null
          firecrawl_last_verified_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_servers: {
        Row: {
          app_bindings: Json | null
          args: Json | null
          command: string | null
          created_at: string
          enabled: boolean
          env: Json | null
          id: string
          name: string
          transport_type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          app_bindings?: Json | null
          args?: Json | null
          command?: string | null
          created_at?: string
          enabled?: boolean
          env?: Json | null
          id?: string
          name: string
          transport_type?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          app_bindings?: Json | null
          args?: Json | null
          command?: string | null
          created_at?: string
          enabled?: boolean
          env?: Json | null
          id?: string
          name?: string
          transport_type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_optimize_history: {
        Row: {
          action: string
          analysis: string | null
          created_at: string
          feedback: string | null
          id: string
          mode: string
          optimized_prompt: string
          original_prompt: string
          prompt_id: string | null
          template: string
          user_id: string
        }
        Insert: {
          action?: string
          analysis?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          mode?: string
          optimized_prompt: string
          original_prompt: string
          prompt_id?: string | null
          template?: string
          user_id: string
        }
        Update: {
          action?: string
          analysis?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          mode?: string
          optimized_prompt?: string
          original_prompt?: string
          prompt_id?: string | null
          template?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          target_file: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          target_file?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          target_file?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          api_key: string | null
          app_type: string
          base_url: string | null
          created_at: string
          enabled: boolean
          endpoints: Json | null
          id: string
          model_config: Json | null
          name: string
          provider_type: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          app_type?: string
          base_url?: string | null
          created_at?: string
          enabled?: boolean
          endpoints?: Json | null
          id?: string
          model_config?: Json | null
          name: string
          provider_type?: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          app_type?: string
          base_url?: string | null
          created_at?: string
          enabled?: boolean
          endpoints?: Json | null
          id?: string
          model_config?: Json | null
          name?: string
          provider_type?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          installed: boolean
          name: string
          repo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          installed?: boolean
          name: string
          repo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          installed?: boolean
          name?: string
          repo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "skills_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_repos: {
        Row: {
          branch: string
          created_at: string
          id: string
          is_default: boolean
          owner: string
          repo: string
          subdirectory: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string
          created_at?: string
          id?: string
          is_default?: boolean
          owner: string
          repo: string
          subdirectory?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          is_default?: boolean
          owner?: string
          repo?: string
          subdirectory?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
