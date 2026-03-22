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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find active subscription
    const { data: sub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, started_at, expires_at, streampay_transaction_id, auto_renew, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError || !sub) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate expiry: 30 days from started_at
    const startedAt = new Date(sub.started_at);
    const expiresAt = sub.expires_at
      ? new Date(sub.expires_at)
      : new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update subscription
    const { error: updateSubError } = await supabase
      .from("user_subscriptions")
      .update({
        auto_renew: false,
        status: "canceling",
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", sub.id);

    if (updateSubError) {
      console.error("Failed to cancel subscription:", updateSubError);
      return new Response(
        JSON.stringify({ error: "Failed to cancel subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also set expires_at on linked Pro boosts (same transaction)
    if (sub.streampay_transaction_id) {
      const { error: boostError } = await supabase
        .from("user_boosts")
        .update({
          auto_renew: false,
          expires_at: expiresAt.toISOString(),
        })
        .eq("user_id", userId)
        .eq("streampay_transaction_id", sub.streampay_transaction_id)
        .eq("status", "active");

      if (boostError) {
        console.error("Failed to update linked boosts:", boostError);
      }
    }

    console.log(`Pro subscription canceled: sub_id=${sub.id} user=${userId} expires_at=${expiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt.toISOString() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cancel-pro-subscription error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
