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
      call_sessions: {
        Row: {
          callee_id: string
          caller_id: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          thread_id: string | null
        }
        Insert: {
          callee_id: string
          caller_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          thread_id?: string | null
        }
        Update: {
          callee_id?: string
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          added_at: string
          channel_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          channel_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          channel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_read_status: {
        Row: {
          channel_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_read_status_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          category: string
          created_at: string
          id: string
          is_private: boolean
          name: string
          position: number
          server_id: string
          type: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_private?: boolean
          name: string
          position?: number
          server_id: string
          type?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_private?: boolean
          name?: string
          position?: number
          server_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_stickers: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          name: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          name: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      group_threads: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_message_at: string | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_message_at?: string | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_message_at?: string | null
          name?: string
        }
        Relationships: []
      }
      message_hidden: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_hidden_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          channel_id: string | null
          content: string
          created_at: string
          deleted_for_everyone: boolean
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          group_thread_id: string | null
          id: string
          reply_to_id: string | null
          thread_id: string | null
        }
        Insert: {
          author_id: string
          channel_id?: string | null
          content?: string
          created_at?: string
          deleted_for_everyone?: boolean
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_thread_id?: string | null
          id?: string
          reply_to_id?: string | null
          thread_id?: string | null
        }
        Update: {
          author_id?: string
          channel_id?: string | null
          content?: string
          created_at?: string
          deleted_for_everyone?: boolean
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_thread_id?: string | null
          id?: string
          reply_to_id?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_group_thread_id_fkey"
            columns: ["group_thread_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      pinned_chats: {
        Row: {
          group_thread_id: string | null
          id: string
          pinned_at: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          group_thread_id?: string | null
          id?: string
          pinned_at?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          group_thread_id?: string | null
          id?: string
          pinned_at?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_chats_group_thread_id_fkey"
            columns: ["group_thread_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_chats_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          banner_url: string | null
          color_theme: string | null
          created_at: string
          display_name: string | null
          id: string
          language: string | null
          last_seen: string | null
          name_gradient_end: string | null
          name_gradient_start: string | null
          status: string
          status_text: string | null
          status_until: string | null
          theme: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          color_theme?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string | null
          last_seen?: string | null
          name_gradient_end?: string | null
          name_gradient_start?: string | null
          status?: string
          status_text?: string | null
          status_until?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          color_theme?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          language?: string | null
          last_seen?: string | null
          name_gradient_end?: string | null
          name_gradient_start?: string | null
          status?: string
          status_text?: string | null
          status_until?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      server_folder_items: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          position: number
          server_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          position?: number
          server_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          position?: number
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "server_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      server_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      server_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          server_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          server_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          banner_url: string | null
          created_at: string
          icon_url: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          icon_url?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      thread_read_status: {
        Row: {
          group_thread_id: string | null
          id: string
          last_read_at: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          group_thread_id?: string | null
          id?: string
          last_read_at?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          group_thread_id?: string | null
          id?: string
          last_read_at?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_read_status_group_thread_id_fkey"
            columns: ["group_thread_id"]
            isOneToOne: false
            referencedRelation: "group_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_read_status_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_channel_participants: {
        Row: {
          channel_id: string
          id: string
          is_deafened: boolean
          is_muted: boolean
          is_screen_sharing: boolean
          is_speaking: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_deafened?: boolean
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_speaking?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_deafened?: boolean
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_speaking?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_channel_participants_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: { Args: never; Returns: string }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_server_id_by_invite: { Args: { p_code: string }; Returns: string }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_channel_private: { Args: { _channel_id: string }; Returns: boolean }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_admin: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
