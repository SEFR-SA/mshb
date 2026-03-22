import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitResponse } from "../_shared/rateLimiter.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    if (isRateLimited(userId, 10, 60_000)) return rateLimitResponse();

    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for full access
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ticket
    const { data: ticket, error: ticketErr } = await adminClient
      .from("tickets")
      .select("id, server_id, channel_id, owner_id, ticket_number, status, transcript_url, created_at, closed_at")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a server member
    const { data: membership } = await adminClient
      .from("server_members")
      .select("id")
      .eq("server_id", ticket.server_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a server member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If transcript already exists, return it
    if (ticket.transcript_url) {
      return new Response(JSON.stringify({ url: ticket.transcript_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all messages for the channel
    const { data: messages, error: msgsErr } = await adminClient
      .from("messages")
      .select("content, author_id, created_at, type, file_url, file_name")
      .eq("channel_id", ticket.channel_id)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (msgsErr) {
      return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect unique author IDs and fetch profiles
    const authorIds = [...new Set((messages || []).map((m: any) => m.author_id))];
    const profileMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", authorIds);
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.user_id, p.display_name || p.username || "Unknown");
      });
    }

    // Generate HTML transcript
    const ticketName = `ticket-${String(ticket.ticket_number).padStart(4, "0")}`;
    const createdDate = new Date(ticket.created_at).toLocaleString("en-US");
    const closedDate = ticket.closed_at ? new Date(ticket.closed_at).toLocaleString("en-US") : "N/A";

    let messagesHtml = "";
    for (const msg of messages || []) {
      const authorName = profileMap.get(msg.author_id) || "Unknown";
      const timestamp = new Date(msg.created_at).toLocaleString("en-US");
      const isSystem = msg.type === "system" || msg.type === "welcome";

      if (isSystem) {
        messagesHtml += `<div style="padding:6px 12px;color:#888;font-style:italic;border-left:3px solid #555;margin:4px 0;">${escapeHtml(msg.content)} <span style="font-size:11px;color:#666;">${timestamp}</span></div>`;
      } else {
        let content = escapeHtml(msg.content || "");
        if (msg.file_url) {
          content += ` <a href="${escapeHtml(msg.file_url)}" target="_blank">[${escapeHtml(msg.file_name || "attachment")}]</a>`;
        }
        messagesHtml += `<div style="padding:6px 12px;margin:2px 0;"><strong style="color:#7289da;">${escapeHtml(authorName)}</strong> <span style="font-size:11px;color:#666;">${timestamp}</span><br/>${content}</div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Transcript: #${ticketName}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1e1e2e;color:#cdd6f4;margin:0;padding:20px;}
.header{background:#313244;padding:20px;border-radius:8px;margin-bottom:20px;}
h1{margin:0 0 8px;color:#89b4fa;font-size:20px;}
.meta{color:#a6adc8;font-size:13px;}
.messages{background:#181825;border-radius:8px;padding:8px 0;}
a{color:#89b4fa;}
</style></head>
<body>
<div class="header">
<h1>#${ticketName} — Transcript</h1>
<div class="meta">Created: ${createdDate} | Closed: ${closedDate} | Messages: ${(messages || []).length}</div>
</div>
<div class="messages">${messagesHtml}</div>
</body></html>`;

    // Upload to storage
    const filePath = `${ticket.server_id}/${ticket.id}.html`;
    const { error: uploadErr } = await adminClient.storage
      .from("ticket_transcripts")
      .upload(filePath, new Blob([html], { type: "text/html" }), {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadErr) {
      return new Response(JSON.stringify({ error: "Upload failed: " + uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = adminClient.storage
      .from("ticket_transcripts")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update ticket with transcript_url
    await adminClient
      .from("tickets")
      .update({ transcript_url: publicUrl })
      .eq("id", ticket.id);

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
