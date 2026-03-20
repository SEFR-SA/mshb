import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Leetspeak normalization ───────────────────────────────────────────────────
const LEET: Record<string, string> = {
  "3": "e", "4": "a", "1": "l", "0": "o", "5": "s",
  "@": "a", "$": "s", "!": "i", "+": "t", "|": "i", "7": "t",
};
function normalizeLeet(s: string): string {
  return s.replace(/[3410@$!+|7]/g, (c) => LEET[c] ?? c);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a regex for a single blocked word.
 *  - English: word-boundary match on the original + leet-normalized content
 *  - Arabic:  optional morphological prefixes + suffixes, Arabic char boundary via lookaround
 */
function buildPattern(word: string, lang: string): RegExp {
  const esc = escapeRegex(word.toLowerCase());
  if (lang === "ar") {
    // Common connective prefixes: ال، و، ف، ب، ل، ك، م
    const PRE = "(?:\u0627\u0644|\u0648|\u0641|\u0628|\u0644|\u0643|\u0645)?";
    // Common inflection suffixes: ون، ين، ة، ات، ها، هم، هن، كم، كن، نا، ي، ك، ه، وا
    const SUF =
      "(?:\u0648\u0646|\u064A\u0646|\u0629|\u0627\u062A|\u0647\u0627|\u0647\u0645|\u0647\u0646|\u0643\u0645|\u0643\u0646|\u0646\u0627|\u064A|\u0643|\u0647|\u0648\u0627)?";
    // Arabic word boundary: not preceded/followed by another Arabic character (U+0600–U+06FF)
    return new RegExp(
      `(?<![\\u0600-\\u06FF])${PRE}${esc}${SUF}(?![\\u0600-\\u06FF])`,
      "gu"
    );
  }
  return new RegExp(`\\b${esc}\\b`, "gi");
}

const SEVERITY: Record<string, number> = { block: 3, censor: 2, flag: 1 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: jsonHeaders,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const serviceClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: jsonHeaders,
      });
    }
    const userId = claimsData.claims.sub as string;

    // ── Parse body ──────────────────────────────────────────────────────────
    const {
      content = "",
      channel_id,
      reply_to_id = null,
      file_url = null,
      file_name = null,
      file_type = null,
      file_size = null,
      type: msgType = null,
      metadata = null,
    } = await req.json();

    if (!channel_id) {
      return new Response(
        JSON.stringify({ error: "channel_id is required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // ── Derive server_id + restricted_permissions from channel ───────────────
    const { data: channel, error: chanErr } = await serviceClient
      .from("channels")
      .select("server_id, restricted_permissions")
      .eq("id", channel_id)
      .single();

    if (chanErr || !channel) {
      return new Response(JSON.stringify({ error: "Channel not found" }), {
        status: 404, headers: jsonHeaders,
      });
    }
    const server_id: string = (channel as any).server_id;
    const restrictedPerms: string[] = (channel as any).restricted_permissions ?? [];

    // ── Permission checks (channel-level restrictions) ───────────────────────
    const checkPerm = async (perm: string): Promise<boolean> => {
      if (!restrictedPerms.includes(perm)) return true;
      const { data } = await serviceClient.rpc("has_role_permission" as any, {
        _user_id: userId, _server_id: server_id, _permission: perm,
      } as any);
      return !!data;
    };

    if (!(await checkPerm("send_messages"))) {
      return new Response(JSON.stringify({ error: "Missing send_messages permission" }), {
        status: 403, headers: jsonHeaders,
      });
    }

    if (file_url && !(await checkPerm("attach_files"))) {
      return new Response(JSON.stringify({ error: "Missing attach_files permission" }), {
        status: 403, headers: jsonHeaders,
      });
    }

    if (typeof content === "string" && (content.includes("@all") || content.includes("@everyone"))) {
      if (!(await checkPerm("mention_everyone"))) {
        return new Response(JSON.stringify({ error: "Missing mention_everyone permission" }), {
          status: 403, headers: jsonHeaders,
        });
      }
    }

    // ── Step 1: Immunity check ───────────────────────────────────────────────
    let shouldFilter = false;

    if (server_id && content.trim()) {
      const { data: server } = await serviceClient
        .from("servers")
        .select("automod_enabled")
        .eq("id", server_id)
        .single();

      if ((server as any)?.automod_enabled) {
        const { data: membership } = await serviceClient
          .from("server_members")
          .select("role")
          .eq("server_id", server_id)
          .eq("user_id", userId)
          .maybeSingle();

        const role = (membership as any)?.role;
        shouldFilter = role !== "admin" && role !== "owner";
      }
    }

    let finalContent = content;
    let automodStatus: string | null = null;
    let eventRuleId: string | null = null;
    let eventServerRuleId: string | null = null;
    let topAction: string | null = null;

    if (shouldFilter) {
      // ── Step 2: Dictionary assembly (parallel) ───────────────────────────
      const [globalRes, allowedRes, serverRes] = await Promise.all([
        serviceClient
          .from("global_blocked_words")
          .select("id, word, action_type, language")
          .eq("is_active", true),
        serviceClient
          .from("server_allowed_words")
          .select("word")
          .eq("server_id", server_id),
        serviceClient
          .from("server_blocked_words")
          .select("id, word, action_type")
          .eq("server_id", server_id),
      ]);

      const allowedSet = new Set<string>(
        ((allowedRes.data ?? []) as any[]).map((r) => r.word.toLowerCase())
      );

      // Global words minus the server whitelist, then append server-specific words
      const rules: Array<{
        id: string;
        word: string;
        action_type: string;
        language: string;
        source: "global" | "server";
      }> = [
        ...((globalRes.data ?? []) as any[])
          .filter((r) => !allowedSet.has(r.word.toLowerCase()))
          .map((r) => ({ ...r, language: r.language ?? "en", source: "global" as const })),
        ...((serverRes.data ?? []) as any[]).map((r) => ({
          ...r, language: "en", source: "server" as const,
        })),
      ];

      // ── Step 3: Multi-language regex scan ───────────────────────────────
      const leetContent = normalizeLeet(content.toLowerCase());
      let topRuleId: string | null = null;
      let topSource: "global" | "server" | null = null;
      let topPattern: RegExp | null = null;

      for (const rule of rules) {
        const pattern = buildPattern(rule.word, rule.language);
        // For English, scan both original and leet-normalized content
        const testContent =
          rule.language === "ar" ? content : `${content} ${leetContent}`;

        pattern.lastIndex = 0;
        if (pattern.test(testContent)) {
          if (!topAction || SEVERITY[rule.action_type] > SEVERITY[topAction]) {
            topAction = rule.action_type;
            topRuleId = rule.id;
            topSource = rule.source;
            topPattern = buildPattern(rule.word, rule.language);
          }
        }
      }

      // ── Step 4: Action routing ───────────────────────────────────────────
      if (topAction === "block") {
        return new Response(
          JSON.stringify({
            error: "Message blocked by AutoMod",
            code: "AUTOMOD_BLOCK",
          }),
          { status: 400, headers: jsonHeaders }
        );
      }

      if (topAction === "censor" && topPattern) {
        topPattern.lastIndex = 0;
        finalContent = content.replace(topPattern, "****");
        automodStatus = "censored";
      } else if (topAction === "flag") {
        automodStatus = "flagged";
      }

      if (topRuleId && topSource) {
        if (topSource === "global") eventRuleId = topRuleId;
        else eventServerRuleId = topRuleId;
      }
    }

    // ── Insert message (service role bypasses RLS) ──────────────────────────
    const { data: message, error: insertErr } = await serviceClient
      .from("messages")
      .insert({
        channel_id,
        author_id: userId,
        content: finalContent,
        reply_to_id,
        file_url,
        file_name,
        file_type,
        file_size,
        type: msgType,
        metadata,
        automod_status: automodStatus,
      } as any)
      .select()
      .single();

    if (insertErr || !message) {
      console.error("[send-message] insert error:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to insert message" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // ── Log automod event (censor / flag only) ──────────────────────────────
    if (shouldFilter && automodStatus) {
      await serviceClient.from("automod_events").insert({
        rule_id: eventRuleId,
        server_rule_id: eventServerRuleId,
        message_id: (message as any).id,
        action_type: topAction,
        server_id,
        channel_id,
        user_id: userId,
      } as any);
    }

    return new Response(JSON.stringify({ message }), {
      status: 200, headers: jsonHeaders,
    });
  } catch (err) {
    console.error("[send-message] unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
