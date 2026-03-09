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
    // ── 1. Verify caller is authenticated ─────────────────────────────────
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

    // ── 2. Parse request body ──────────────────────────────────────────────
    let body: { boost_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { boost_id } = body;
    if (!boost_id) {
      return new Response(JSON.stringify({ error: "boost_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Verify ownership and active status ─────────────────────────────
    // Service role bypasses RLS — needed because authenticated users cannot
    // UPDATE user_boosts (intentional, prevents self-service fraud).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: boost, error: fetchError } = await supabase
      .from("user_boosts")
      .select("id, user_id, status, streampay_transaction_id")
      .eq("id", boost_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (fetchError || !boost) {
      return new Response(
        JSON.stringify({ error: "Boost not found or not cancellable" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transactionId = (boost as any).streampay_transaction_id as string | null;

    // ── 4. Call StreamPay cancel endpoint ─────────────────────────────────
    const STREAMPAY_SECRET_KEY = Deno.env.get("STREAMPAY_SECRET_KEY");
    const STREAMPAY_API_BASE_URL =
      Deno.env.get("STREAMPAY_API_BASE_URL") ?? "https://api.streampay.sa";

    if (!STREAMPAY_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (transactionId) {
      const cancelResponse = await fetch(
        `${STREAMPAY_API_BASE_URL}/v1/payments/${transactionId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STREAMPAY_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!cancelResponse.ok) {
        const errText = await cancelResponse.text();
        console.error(
          `StreamPay cancel API error [${cancelResponse.status}]:`,
          errText
        );
        return new Response(
          JSON.stringify({ error: "Failed to cancel subscription with payment provider" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`StreamPay cancel confirmed for tx=${transactionId}`);
    } else {
      // No transaction ID recorded (e.g. manual/test boost) — skip gateway call
      console.warn(`Boost ${boost_id} has no streampay_transaction_id — skipping gateway cancel`);
    }

    // ── 5. Update the DB row ──────────────────────────────────────────────
    // The Phase 1 DB trigger (handle_boost_change → recalculate_server_boost)
    // fires automatically on this UPDATE, decrementing boost_count/level.
    const { error: updateError } = await supabase
      .from("user_boosts")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
      })
      .eq("id", boost_id);

    if (updateError) {
      console.error("Failed to update boost status after StreamPay cancel:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to record cancellation" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Boost canceled: id=${boost_id} user=${userId}`);

    return new Response(JSON.stringify({ success: true }), {
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
