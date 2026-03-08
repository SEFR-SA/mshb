import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user via anon client
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Service role client to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete in FK-safe order
    // 1. Voice participants
    await supabase.from("voice_channel_participants").delete().eq("user_id", userId);

    // 2. Message reactions by user
    await supabase.from("message_reactions").delete().eq("user_id", userId);

    // 3. Message hidden
    await supabase.from("message_hidden").delete().eq("user_id", userId);

    // 4. Messages authored (set deleted_for_everyone instead of hard-delete to preserve thread integrity)
    await supabase.from("messages").update({ content: "[deleted]", deleted_for_everyone: true, file_url: null, file_name: null, file_type: null, file_size: null }).eq("author_id", userId);

    // 5. Read statuses
    await supabase.from("channel_read_status").delete().eq("user_id", userId);
    await supabase.from("thread_read_status").delete().eq("user_id", userId);

    // 6. Channel members
    await supabase.from("channel_members").delete().eq("user_id", userId);

    // 7. Server-related
    await supabase.from("server_audit_logs").delete().eq("actor_id", userId);
    await supabase.from("member_roles").delete().eq("user_id", userId);
    await supabase.from("server_members").delete().eq("user_id", userId);

    // 8. Server folder items (need to get folder ids first)
    const { data: folders } = await supabase.from("server_folders").select("id").eq("user_id", userId);
    if (folders && folders.length > 0) {
      const folderIds = folders.map((f: any) => f.id);
      await supabase.from("server_folder_items").delete().in("folder_id", folderIds);
    }
    await supabase.from("server_folders").delete().eq("user_id", userId);

    // 9. DM visibility & pinned chats
    await supabase.from("dm_thread_visibility").delete().eq("user_id", userId);
    await supabase.from("pinned_chats").delete().eq("user_id", userId);

    // 10. Profile notes (both directions)
    await supabase.from("profile_notes").delete().eq("author_id", userId);
    await supabase.from("profile_notes").delete().eq("target_id", userId);

    // 11. Notifications
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("notifications").delete().eq("actor_id", userId);

    // 12. Blocked users (both directions)
    await supabase.from("blocked_users").delete().eq("blocker_id", userId);
    await supabase.from("blocked_users").delete().eq("blocked_id", userId);

    // 13. Friendships (both directions)
    await supabase.from("friendships").delete().eq("requester_id", userId);
    await supabase.from("friendships").delete().eq("addressee_id", userId);

    // 14. Group members
    await supabase.from("group_members").delete().eq("user_id", userId);

    // 15. User equipped & purchases
    await supabase.from("user_equipped").delete().eq("user_id", userId);
    await supabase.from("user_purchases").delete().eq("user_id", userId);

    // 16. Custom stickers
    await supabase.from("custom_stickers").delete().eq("user_id", userId);

    // 17. Call sessions (both directions)
    await supabase.from("call_sessions").delete().eq("caller_id", userId);
    await supabase.from("call_sessions").delete().eq("callee_id", userId);

    // 18. Message reports
    await supabase.from("message_reports").delete().eq("reporter_id", userId);

    // 19. Servers owned by user - delete channels, invites, roles, emojis, stickers, soundboard first
    const { data: ownedServers } = await supabase.from("servers").select("id").eq("owner_id", userId);
    if (ownedServers && ownedServers.length > 0) {
      const serverIds = ownedServers.map((s: any) => s.id);
      // Delete all server sub-resources
      await supabase.from("server_emojis").delete().in("server_id", serverIds);
      await supabase.from("server_stickers").delete().in("server_id", serverIds);
      await supabase.from("server_soundboard").delete().in("server_id", serverIds);
      await supabase.from("server_audit_logs").delete().in("server_id", serverIds);
      await supabase.from("member_roles").delete().in("server_id", serverIds);
      await supabase.from("server_roles").delete().in("server_id", serverIds);
      await supabase.from("invites").delete().in("server_id", serverIds);
      // Get channel ids for these servers
      const { data: channels } = await supabase.from("channels").select("id").in("server_id", serverIds);
      if (channels && channels.length > 0) {
        const channelIds = channels.map((c: any) => c.id);
        await supabase.from("voice_channel_participants").delete().in("channel_id", channelIds);
        await supabase.from("channel_members").delete().in("channel_id", channelIds);
        await supabase.from("channel_read_status").delete().in("channel_id", channelIds);
        // Delete messages in these channels
        await supabase.from("messages").delete().in("channel_id", channelIds);
      }
      await supabase.from("channels").delete().in("server_id", serverIds);
      await supabase.from("server_members").delete().in("server_id", serverIds);
      // Clear self-referencing FKs before delete
      await supabase.from("servers").update({ system_message_channel_id: null, inactive_channel_id: null }).in("id", serverIds);
      await supabase.from("servers").delete().in("id", serverIds);
    }

    // 20. Group threads created by user
    const { data: ownedGroups } = await supabase.from("group_threads").select("id").eq("created_by", userId);
    if (ownedGroups && ownedGroups.length > 0) {
      const groupIds = ownedGroups.map((g: any) => g.id);
      await supabase.from("group_members").delete().in("group_id", groupIds);
      await supabase.from("messages").delete().in("group_thread_id", groupIds);
      await supabase.from("pinned_chats").delete().in("group_thread_id", groupIds);
      await supabase.from("thread_read_status").delete().in("group_thread_id", groupIds);
      await supabase.from("group_threads").delete().in("id", groupIds);
    }

    // 21. DM threads
    await supabase.from("dm_threads").delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // 22. Profile
    await supabase.from("profiles").delete().eq("user_id", userId);

    // 23. Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete auth user: " + deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
