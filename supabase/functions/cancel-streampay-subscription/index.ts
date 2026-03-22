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

    const token = authHeader.replace("Bearer ", "");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } =
      await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    if (isRateLimited(userId, 5, 60_000)) return rateLimitResponse();

    let body: { boost_id?: string; resume?: boolean };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { boost_id, resume } = body;
    if (!boost_id) {
      return new Response(JSON.stringify({ error: "boost_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: boost, error: fetchError } = await supabase
      .from("user_boosts")
      .select("id, user_id, status, started_at, auto_renew, expires_at, streampay_transaction_id")
      .eq("id", boost_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (fetchError || !boost) {
      return new Response(
        JSON.stringify({ error: "Boost not found or not manageable" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resume) {
      // Resume auto-renew: clear expires_at, set auto_renew = true
      const { error: updateError } = await supabase
        .from("user_boosts")
        .update({ auto_renew: true, expires_at: null })
        .eq("id", boost_id);

      if (updateError) {
        console.error("Failed to resume auto-renew:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to resume" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Boost auto-renew resumed: id=${boost_id} user=${userId}`);
      return new Response(JSON.stringify({ success: true, auto_renew: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel auto-renew: set auto_renew = false, set expires_at 30 days from started_at
    const startedAt = new Date(boost.started_at);
    const expiresAt = boost.expires_at
      ? new Date(boost.expires_at)
      : new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error: updateError } = await supabase
      .from("user_boosts")
      .update({
        auto_renew: false,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", boost_id);

    if (updateError) {
      console.error("Failed to cancel auto-renew:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to record cancellation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Boost auto-renew canceled: id=${boost_id} user=${userId} expires_at=${expiresAt.toISOString()}`);

    return new Response(JSON.stringify({ success: true, auto_renew: false, expires_at: expiresAt.toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cancel-streampay-subscription error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
