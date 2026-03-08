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
    const email = claimsData.claims.email as string;

    // Service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all user data in parallel
    const [
      profile,
      messages,
      dmThreads,
      groupMembers,
      serverMembers,
      friendships,
      notifications,
      blockedUsers,
      blockedByUsers,
      purchases,
      equipped,
      customStickers,
      callSessions,
      messageReports,
      profileNotes,
      reactions,
      pinnedChats,
      serverFolders,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("messages").select("id, content, created_at, edited_at, file_url, file_name, file_type, thread_id, group_thread_id, channel_id, is_forwarded, is_pinned, type").eq("author_id", userId).order("created_at", { ascending: false }).limit(10000),
      supabase.from("dm_threads").select("*").or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      supabase.from("group_members").select("*, group_threads(id, name)").eq("user_id", userId),
      supabase.from("server_members").select("server_id, role, joined_at, servers(name)").eq("user_id", userId),
      supabase.from("friendships").select("*").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
      supabase.from("blocked_users").select("*").eq("blocker_id", userId),
      supabase.from("blocked_users").select("*").eq("blocked_id", userId),
      supabase.from("user_purchases").select("*").eq("user_id", userId),
      supabase.from("user_equipped").select("*").eq("user_id", userId),
      supabase.from("custom_stickers").select("*").eq("user_id", userId),
      supabase.from("call_sessions").select("*").or(`caller_id.eq.${userId},callee_id.eq.${userId}`).order("created_at", { ascending: false }).limit(1000),
      supabase.from("message_reports").select("*").eq("reporter_id", userId),
      supabase.from("profile_notes").select("*").eq("author_id", userId),
      supabase.from("message_reactions").select("*").eq("user_id", userId).limit(5000),
      supabase.from("pinned_chats").select("*").eq("user_id", userId),
      supabase.from("server_folders").select("*, server_folder_items(*)").eq("user_id", userId),
    ]);

    const exportData = {
      _meta: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email,
        format: "GDPR Data Export",
      },
      profile: profile.data,
      messages: messages.data || [],
      dm_threads: dmThreads.data || [],
      group_memberships: groupMembers.data || [],
      server_memberships: serverMembers.data || [],
      friendships: friendships.data || [],
      notifications: notifications.data || [],
      blocked_users: blockedUsers.data || [],
      blocked_by: blockedByUsers.data || [],
      purchases: purchases.data || [],
      equipped_items: equipped.data || [],
      custom_stickers: customStickers.data || [],
      call_sessions: callSessions.data || [],
      message_reports: messageReports.data || [],
      profile_notes: profileNotes.data || [],
      reactions: reactions.data || [],
      pinned_chats: pinnedChats.data || [],
      server_folders: serverFolders.data || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="mshb-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
