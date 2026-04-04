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
      admin_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      automod_events: {
        Row: {
          action_type: string
          channel_id: string | null
          id: string
          message_id: string | null
          rule_id: string | null
          server_id: string | null
          server_rule_id: string | null
          triggered_at: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          channel_id?: string | null
          id?: string
          message_id?: string | null
          rule_id?: string | null
          server_id?: string | null
          server_rule_id?: string | null
          triggered_at?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          channel_id?: string | null
          id?: string
          message_id?: string | null
          rule_id?: string | null
          server_id?: string | null
          server_rule_id?: string | null
          triggered_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automod_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automod_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automod_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "global_blocked_words"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automod_events_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automod_events_server_rule_id_fkey"
            columns: ["server_rule_id"]
            isOneToOne: false
            referencedRelation: "server_blocked_words"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      bot_posted_games: {
        Row: {
          game_id: string
          id: string
          posted_at: string | null
          server_id: string
        }
        Insert: {
          game_id: string
          id?: string
          posted_at?: string | null
          server_id: string
        }
        Update: {
          game_id?: string
          id?: string
          posted_at?: string | null
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_posted_games_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          item_id: string
        }
        Insert: {
          bundle_id: string
          item_id: string
        }
        Update: {
          bundle_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
      channel_notification_prefs: {
        Row: {
          channel_id: string
          level: string
          user_id: string
        }
        Insert: {
          channel_id: string
          level?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          level?: string
          user_id?: string
        }
        Relationships: []
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
          description: string | null
          id: string
          is_announcement: boolean
          is_private: boolean
          is_rules: boolean
          name: string
          position: number
          restricted_permissions: string[]
          server_id: string
          support_role_ids: string[] | null
          type: string
          user_limit: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_announcement?: boolean
          is_private?: boolean
          is_rules?: boolean
          name: string
          position?: number
          restricted_permissions?: string[]
          server_id: string
          support_role_ids?: string[] | null
          type?: string
          user_limit?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_announcement?: boolean
          is_private?: boolean
          is_rules?: boolean
          name?: string
          position?: number
          restricted_permissions?: string[]
          server_id?: string
          support_role_ids?: string[] | null
          type?: string
          user_limit?: number
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
      dm_thread_visibility: {
        Row: {
          closed_at: string | null
          id: string
          is_visible: boolean
          thread_id: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          id?: string
          is_visible?: boolean
          thread_id: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          id?: string
          is_visible?: boolean
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_thread_visibility_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
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
      global_blocked_words: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          language: string
          match_type: string
          word: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          match_type?: string
          word: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          match_type?: string
          word?: string
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
      invites: {
        Row: {
          code: string
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          max_uses: number | null
          server_id: string
          temporary: boolean
          use_count: number
        }
        Insert: {
          code?: string
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          server_id: string
          temporary?: boolean
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          server_id?: string
          temporary?: boolean
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          asset_url: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          id: string
          price_sar: number
          status: string
          thumbnail_url: string | null
          title: string
          type: string
        }
        Insert: {
          asset_url?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          price_sar?: number
          status?: string
          thumbnail_url?: string | null
          title: string
          type: string
        }
        Update: {
          asset_url?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          price_sar?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      member_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          server_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          server_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "server_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_roles_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
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
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reports: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          message_id: string
          notes: string | null
          reporter_id: string
          status: string
          subcategories: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          id?: string
          message_id: string
          notes?: string | null
          reporter_id: string
          status?: string
          subcategories?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message_id?: string
          notes?: string | null
          reporter_id?: string
          status?: string
          subcategories?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_message_id_fkey"
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
          automod_status: string | null
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
          is_forwarded: boolean
          is_pinned: boolean
          metadata: Json | null
          reply_to_id: string | null
          thread_id: string | null
          type: string | null
        }
        Insert: {
          author_id: string
          automod_status?: string | null
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
          is_forwarded?: boolean
          is_pinned?: boolean
          metadata?: Json | null
          reply_to_id?: string | null
          thread_id?: string | null
          type?: string | null
        }
        Update: {
          author_id?: string
          automod_status?: string | null
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
          is_forwarded?: boolean
          is_pinned?: boolean
          metadata?: Json | null
          reply_to_id?: string | null
          thread_id?: string | null
          type?: string | null
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
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          is_read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      poll_answers: {
        Row: {
          emoji: string | null
          id: string
          poll_id: string
          position: number
          text: string
        }
        Insert: {
          emoji?: string | null
          id?: string
          poll_id: string
          position?: number
          text: string
        }
        Update: {
          emoji?: string | null
          id?: string
          poll_id?: string
          position?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_answers_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          answer_id: string
          created_at: string
          id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          answer_id: string
          created_at?: string
          id?: string
          poll_id: string
          user_id: string
        }
        Update: {
          answer_id?: string
          created_at?: string
          id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "poll_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          created_at: string
          expires_at: string
          id: string
          message_id: string
          question: string
        }
        Insert: {
          allow_multiple?: boolean
          created_at?: string
          expires_at: string
          id?: string
          message_id: string
          question: string
        }
        Update: {
          allow_multiple?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          message_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_notes: {
        Row: {
          author_id: string
          note: string
          target_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          note?: string
          target_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          note?: string
          target_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about_me: string | null
          active_server_tag_id: string | null
          avatar_decoration_url: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_until: string | null
          banner_url: string | null
          color_theme: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          gender: string | null
          id: string
          is_banned: boolean
          is_bot: boolean | null
          is_pro: boolean
          language: string | null
          last_seen: string | null
          name_effect: string | null
          name_font: string | null
          name_gradient_end: string | null
          name_gradient_start: string | null
          nameplate_url: string | null
          profile_accent_color: string | null
          profile_effect_url: string | null
          profile_primary_color: string | null
          status: string
          status_text: string | null
          status_until: string | null
          theme: string | null
          updated_at: string
          user_id: string
          username: string | null
          username_changed_at: string | null
        }
        Insert: {
          about_me?: string | null
          active_server_tag_id?: string | null
          avatar_decoration_url?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          banner_url?: string | null
          color_theme?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean
          is_bot?: boolean | null
          is_pro?: boolean
          language?: string | null
          last_seen?: string | null
          name_effect?: string | null
          name_font?: string | null
          name_gradient_end?: string | null
          name_gradient_start?: string | null
          nameplate_url?: string | null
          profile_accent_color?: string | null
          profile_effect_url?: string | null
          profile_primary_color?: string | null
          status?: string
          status_text?: string | null
          status_until?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          username_changed_at?: string | null
        }
        Update: {
          about_me?: string | null
          active_server_tag_id?: string | null
          avatar_decoration_url?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_until?: string | null
          banner_url?: string | null
          color_theme?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          is_banned?: boolean
          is_bot?: boolean | null
          is_pro?: boolean
          language?: string | null
          last_seen?: string | null
          name_effect?: string | null
          name_font?: string | null
          name_gradient_end?: string | null
          name_gradient_start?: string | null
          nameplate_url?: string | null
          profile_accent_color?: string | null
          profile_effect_url?: string | null
          profile_primary_color?: string | null
          status?: string
          status_text?: string | null
          status_until?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          username_changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_server_tag_id_fkey"
            columns: ["active_server_tag_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_reports: {
        Row: {
          created_at: string
          id: string
          main_reason: string
          reported_elements: string[]
          reported_id: string
          reporter_id: string
          status: string
          sub_reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          main_reason: string
          reported_elements?: string[]
          reported_id: string
          reporter_id: string
          status?: string
          sub_reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          main_reason?: string
          reported_elements?: string[]
          reported_id?: string
          reporter_id?: string
          status?: string
          sub_reason?: string | null
        }
        Relationships: []
      }
      server_allowed_words: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          server_id: string
          word: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          server_id: string
          word: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          server_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_allowed_words_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_audit_logs: {
        Row: {
          action_type: string
          actor_id: string
          changes: Json | null
          created_at: string
          id: string
          server_id: string
          target_id: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          changes?: Json | null
          created_at?: string
          id?: string
          server_id: string
          target_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          server_id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      server_bans: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          reason: string | null
          server_id: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          reason?: string | null
          server_id: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_bans_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_blocked_words: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          id: string
          match_type: string
          server_id: string
          word: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          match_type?: string
          server_id: string
          word: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          match_type?: string
          server_id?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_blocked_words_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_emojis: {
        Row: {
          created_at: string
          id: string
          name: string
          server_id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          server_id: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          server_id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_emojis_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
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
          boosted_at: string | null
          entrance_sound_id: string | null
          id: string
          is_booster: boolean
          joined_at: string
          role: string
          server_id: string
          user_id: string
        }
        Insert: {
          boosted_at?: string | null
          entrance_sound_id?: string | null
          id?: string
          is_booster?: boolean
          joined_at?: string
          role?: string
          server_id: string
          user_id: string
        }
        Update: {
          boosted_at?: string | null
          entrance_sound_id?: string | null
          id?: string
          is_booster?: boolean
          joined_at?: string
          role?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_entrance_sound_id_fkey"
            columns: ["entrance_sound_id"]
            isOneToOne: false
            referencedRelation: "server_soundboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_notification_prefs: {
        Row: {
          level: string
          server_id: string
          user_id: string
        }
        Insert: {
          level?: string
          server_id: string
          user_id: string
        }
        Update: {
          level?: string
          server_id?: string
          user_id?: string
        }
        Relationships: []
      }
      server_roles: {
        Row: {
          color: string
          created_at: string
          icon_url: string | null
          id: string
          name: string
          permissions: Json
          position: number
          server_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          permissions?: Json
          position?: number
          server_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          permissions?: Json
          position?: number
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_roles_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_soundboard: {
        Row: {
          created_at: string
          id: string
          name: string
          server_id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          server_id: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          server_id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_soundboard_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_stickers: {
        Row: {
          created_at: string
          format: string
          id: string
          name: string
          server_id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          name: string
          server_id: string
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          name?: string
          server_id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_stickers_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          automod_enabled: boolean
          banner_url: string | null
          boost_count: number
          boost_level: number
          created_at: string
          default_notification_level: string
          description: string | null
          free_games_channel_id: string | null
          icon_url: string | null
          id: string
          inactive_channel_id: string | null
          inactive_timeout: number | null
          invite_code: string
          is_community: boolean
          name: string
          owner_id: string
          public_updates_channel_id: string | null
          rules_channel_id: string | null
          server_tag_badge: string | null
          server_tag_color: string | null
          server_tag_container_color: string | null
          server_tag_name: string | null
          show_boost_count: boolean
          show_member_count: boolean
          show_online_count: boolean
          show_role_count: boolean
          system_message_channel_id: string | null
          welcome_message_enabled: boolean
        }
        Insert: {
          automod_enabled?: boolean
          banner_url?: string | null
          boost_count?: number
          boost_level?: number
          created_at?: string
          default_notification_level?: string
          description?: string | null
          free_games_channel_id?: string | null
          icon_url?: string | null
          id?: string
          inactive_channel_id?: string | null
          inactive_timeout?: number | null
          invite_code?: string
          is_community?: boolean
          name: string
          owner_id: string
          public_updates_channel_id?: string | null
          rules_channel_id?: string | null
          server_tag_badge?: string | null
          server_tag_color?: string | null
          server_tag_container_color?: string | null
          server_tag_name?: string | null
          show_boost_count?: boolean
          show_member_count?: boolean
          show_online_count?: boolean
          show_role_count?: boolean
          system_message_channel_id?: string | null
          welcome_message_enabled?: boolean
        }
        Update: {
          automod_enabled?: boolean
          banner_url?: string | null
          boost_count?: number
          boost_level?: number
          created_at?: string
          default_notification_level?: string
          description?: string | null
          free_games_channel_id?: string | null
          icon_url?: string | null
          id?: string
          inactive_channel_id?: string | null
          inactive_timeout?: number | null
          invite_code?: string
          is_community?: boolean
          name?: string
          owner_id?: string
          public_updates_channel_id?: string | null
          rules_channel_id?: string | null
          server_tag_badge?: string | null
          server_tag_color?: string | null
          server_tag_container_color?: string | null
          server_tag_name?: string | null
          show_boost_count?: boolean
          show_member_count?: boolean
          show_online_count?: boolean
          show_role_count?: boolean
          system_message_channel_id?: string | null
          welcome_message_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "servers_free_games_channel_id_fkey"
            columns: ["free_games_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servers_inactive_channel_id_fkey"
            columns: ["inactive_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servers_public_updates_channel_id_fkey"
            columns: ["public_updates_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servers_rules_channel_id_fkey"
            columns: ["rules_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servers_system_message_channel_id_fkey"
            columns: ["system_message_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
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
      ticket_sequences: {
        Row: {
          last_ticket_number: number
          server_id: string
        }
        Insert: {
          last_ticket_number?: number
          server_id: string
        }
        Update: {
          last_ticket_number?: number
          server_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          channel_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          owner_id: string
          server_id: string
          status: string
          support_channel_id: string | null
          ticket_number: number
          transcript_url: string | null
        }
        Insert: {
          channel_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          owner_id: string
          server_id: string
          status?: string
          support_channel_id?: string | null
          ticket_number: number
          transcript_url?: string | null
        }
        Update: {
          channel_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          server_id?: string
          status?: string
          support_channel_id?: string | null
          ticket_number?: number
          transcript_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_support_channel_id_fkey"
            columns: ["support_channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_boosts: {
        Row: {
          auto_renew: boolean
          canceled_at: string | null
          expires_at: string | null
          id: string
          server_id: string | null
          started_at: string
          status: string
          streampay_transaction_id: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          canceled_at?: string | null
          expires_at?: string | null
          id?: string
          server_id?: string | null
          started_at?: string
          status?: string
          streampay_transaction_id?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          canceled_at?: string | null
          expires_at?: string | null
          id?: string
          server_id?: string | null
          started_at?: string
          status?: string
          streampay_transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_boosts_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          browser: string
          created_at: string
          device_id: string
          id: string
          ip_address: string | null
          last_active: string
          location: string | null
          os: string
          user_id: string
        }
        Insert: {
          browser?: string
          created_at?: string
          device_id: string
          id?: string
          ip_address?: string | null
          last_active?: string
          location?: string | null
          os?: string
          user_id: string
        }
        Update: {
          browser?: string
          created_at?: string
          device_id?: string
          id?: string
          ip_address?: string | null
          last_active?: string
          location?: string | null
          os?: string
          user_id?: string
        }
        Relationships: []
      }
      user_equipped: {
        Row: {
          category: string
          equipped_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          category: string
          equipped_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          category?: string
          equipped_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          id: string
          item_id: string
          purchased_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          expires_at: string | null
          id: string
          started_at: string
          status: string
          streampay_transaction_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          streampay_transaction_id?: string | null
          tier?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          streampay_transaction_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: []
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
          pending_move_channel_id: string | null
          pending_move_channel_name: string | null
          server_deafened: boolean
          server_muted: boolean
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
          pending_move_channel_id?: string | null
          pending_move_channel_name?: string | null
          server_deafened?: boolean
          server_muted?: boolean
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
          pending_move_channel_id?: string | null
          pending_move_channel_name?: string | null
          server_deafened?: boolean
          server_muted?: boolean
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
      admin_grant_boost: {
        Args: { p_server_id?: string; p_user_id: string }
        Returns: undefined
      }
      apply_inventory_boost: { Args: { p_server_id: string }; Returns: boolean }
      ban_server_member: {
        Args: { p_reason?: string; p_server_id: string; p_user_id: string }
        Returns: undefined
      }
      calculate_server_boost_stats: {
        Args: { p_server_id: string }
        Returns: undefined
      }
      cast_poll_vote: {
        Args: { p_answer_id: string; p_poll_id: string }
        Returns: undefined
      }
      change_username: {
        Args: { p_new_username: string; p_password: string }
        Returns: Json
      }
      check_server_tag_available: {
        Args: { p_current_server_id: string; p_tag: string }
        Returns: boolean
      }
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
      cleanup_closed_tickets: { Args: never; Returns: number }
      close_ticket: { Args: { p_ticket_id: string }; Returns: undefined }
      create_ticket: {
        Args: { p_server_id: string; p_support_channel_id: string }
        Returns: {
          channel_id: string
          ticket_number: number
        }[]
      }
      delete_channel_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      delete_ticket: { Args: { p_ticket_id: string }; Returns: undefined }
      disable_community: { Args: { p_server_id: string }; Returns: undefined }
      disconnect_voice_user: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: undefined
      }
      enable_community: {
        Args: {
          p_rules_channel_id?: string
          p_server_id: string
          p_updates_channel_id?: string
        }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      get_admin_role_for: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          granted_by: string
          id: string
          role: string
          user_id: string
        }[]
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_server_id_by_invite: { Args: { p_code: string }; Returns: string }
      get_server_id_by_invite_link: {
        Args: { p_code: string }
        Returns: string
      }
      get_server_preview_by_invite: {
        Args: { p_code: string }
        Returns: {
          banner_url: string
          expires_at: string
          icon_url: string
          id: string
          max_uses: number
          member_count: number
          name: string
          online_count: number
          server_created_at: string
          use_count: number
        }[]
      }
      get_server_stats: { Args: { p_server_id: string }; Returns: Json }
      get_user_permissions: { Args: { _server_id: string }; Returns: Json }
      get_user_permissions_strict: {
        Args: { _server_id: string }
        Returns: Json
      }
      has_channel_permission: {
        Args: { _channel_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role_permission: {
        Args: {
          _permission: string
          _server_id: string
          _skip_defaults?: boolean
          _user_id: string
        }
        Returns: boolean
      }
      insert_boost_audit_log: {
        Args: {
          p_action: string
          p_actor_id: string
          p_changes: Json
          p_server_id: string
          p_target_id: string
        }
        Returns: undefined
      }
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
      is_platform_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_server_admin: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      is_server_member: {
        Args: { _server_id: string; _user_id: string }
        Returns: boolean
      }
      move_voice_user: {
        Args: {
          p_from_channel_id: string
          p_to_channel_id: string
          p_to_channel_name: string
          p_user_id: string
        }
        Returns: Json
      }
      recalculate_server_boost: {
        Args: { p_server_id: string }
        Returns: undefined
      }
      remove_poll_votes: { Args: { p_poll_id: string }; Returns: undefined }
      reopen_ticket: { Args: { p_ticket_id: string }; Returns: undefined }
      server_moderate_voice_user: {
        Args: {
          p_channel_id: string
          p_server_deafened?: boolean
          p_server_muted?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      toggle_message_pin: { Args: { p_message_id: string }; Returns: boolean }
      transfer_boost: {
        Args: { p_boost_id: string; p_new_server_id: string }
        Returns: boolean
      }
      unban_server_member: {
        Args: { p_server_id: string; p_user_id: string }
        Returns: undefined
      }
      update_entrance_sound: {
        Args: { p_server_id: string; p_sound_id: string }
        Returns: undefined
      }
      use_invite: { Args: { p_code: string }; Returns: string }
      validate_invite: { Args: { p_code: string }; Returns: Json }
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
