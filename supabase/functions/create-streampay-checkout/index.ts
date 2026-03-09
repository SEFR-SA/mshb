import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// StreamPay payment amount for one Server Boost (monthly)
// 15 SAR expressed in Halalas (smallest currency unit)
const BOOST_AMOUNT_HALALAS = 1500;

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
    let body: { server_id?: string; success_url?: string; cancel_url?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { server_id, success_url, cancel_url } = body;

    if (!server_id) {
      return new Response(JSON.stringify({ error: "server_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "success_url and cancel_url are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 3. Verify user is a member of the target server ───────────────────
    // Use service role to bypass RLS for this lookup
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: membership, error: memberError } = await supabase
      .from("server_members")
      .select("id")
      .eq("server_id", server_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this server" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 4. Create StreamPay checkout session ──────────────────────────────
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

    const streampayResponse = await fetch(
      `${STREAMPAY_API_BASE_URL}/v1/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STREAMPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: BOOST_AMOUNT_HALALAS,
          currency: "SAR",
          description: "MSHB Server Boost — 1 month",
          success_url,
          cancel_url,
          metadata: {
            userId,
            serverId: server_id,
          },
        }),
      }
    );

    if (!streampayResponse.ok) {
      const errText = await streampayResponse.text();
      console.error(
        `StreamPay API error [${streampayResponse.status}]:`,
        errText
      );
      return new Response(
        JSON.stringify({ error: "Failed to create payment session" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const streampayData = await streampayResponse.json();

    // StreamPay returns the hosted payment page URL in data.payment_url
    const paymentUrl = streampayData?.data?.payment_url;
    if (!paymentUrl) {
      console.error("StreamPay response missing data.payment_url:", JSON.stringify(streampayData));
      return new Response(
        JSON.stringify({ error: "Payment URL not returned by gateway" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 5. Return the checkout URL to the frontend ─────────────────────────
    return new Response(JSON.stringify({ payment_url: paymentUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-streampay-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
