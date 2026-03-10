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
    // ── 1. Verify caller ──────────────────────────────────────────────────
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
    const userEmail = claimsData.claims.email as string | undefined;

    // ── 2. Parse body ─────────────────────────────────────────────────────
    let body: { success_url?: string; cancel_url?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { success_url, cancel_url } = body;
    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "success_url and cancel_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. StreamPay config ───────────────────────────────────────────────
    const STREAMPAY_X_API_KEY = Deno.env.get("STREAMPAY_X_API_KEY");
    const STREAMPAY_API_BASE =
      Deno.env.get("STREAMPAY_API_BASE_URL") ?? "https://stream-app-service.streampay.sa";
    const STREAMPAY_PRO_PRODUCT_ID = Deno.env.get("STREAMPAY_PRO_PRODUCT_ID");

    if (!STREAMPAY_X_API_KEY || !STREAMPAY_PRO_PRODUCT_ID) {
      console.error("Missing STREAMPAY_X_API_KEY or STREAMPAY_PRO_PRODUCT_ID");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const spHeaders = {
      "x-api-key": STREAMPAY_X_API_KEY,
      "Content-Type": "application/json",
    };

    // ── 4. Ensure StreamPay consumer ──────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const externalId = `mshb_${userId}`;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", userId)
      .single();

    const customerName = profile?.display_name || profile?.username || "MSHB User";

    const listRes = await fetch(
      `${STREAMPAY_API_BASE}/api/v2/consumers?external_id=${encodeURIComponent(externalId)}`,
      { headers: { "x-api-key": STREAMPAY_X_API_KEY } }
    );

    let consumerId: string | null = null;

    if (listRes.ok) {
      const listData = await listRes.json();
      const consumers = Array.isArray(listData)
        ? listData
        : listData?.results ?? listData?.data ?? [];
      if (consumers.length > 0) consumerId = consumers[0].id;
    }

    if (!consumerId) {
      const createConsumerRes = await fetch(
        `${STREAMPAY_API_BASE}/api/v2/consumers`,
        {
          method: "POST",
          headers: spHeaders,
          body: JSON.stringify({
            name: customerName,
            ...(userEmail ? { email: userEmail } : {}),
            external_id: externalId,
            communication_methods: userEmail ? ["EMAIL"] : [],
          }),
        }
      );

      if (!createConsumerRes.ok) {
        const errText = await createConsumerRes.text();
        console.error(`StreamPay create consumer error [${createConsumerRes.status}]:`, errText);

        if (errText.includes("DUPLICATE_CONSUMER")) {
          const retryList = await fetch(
            `${STREAMPAY_API_BASE}/api/v2/consumers?external_id=${encodeURIComponent(externalId)}`,
            { headers: { "x-api-key": STREAMPAY_X_API_KEY } }
          );
          if (retryList.ok) {
            const retryData = await retryList.json();
            const consumers = Array.isArray(retryData)
              ? retryData
              : retryData?.results ?? retryData?.data ?? [];
            if (consumers.length > 0) consumerId = consumers[0].id;
          }
        }

        if (!consumerId) {
          return new Response(
            JSON.stringify({ error: "Failed to create payment customer" }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const consumerData = await createConsumerRes.json();
        consumerId = consumerData.id;
      }
    }

    // ── 5. Create payment link ────────────────────────────────────────────
    const paymentLinkRes = await fetch(
      `${STREAMPAY_API_BASE}/api/v2/payment_links`,
      {
        method: "POST",
        headers: spHeaders,
        body: JSON.stringify({
          name: "Mshb Pro Subscription",
          description: "Mshb Pro — premium subscription with 2 server boosts",
          items: [{ product_id: STREAMPAY_PRO_PRODUCT_ID, quantity: 1 }],
          currency: "SAR",
          max_number_of_payments: 1,
          organization_consumer_id: consumerId,
          success_redirect_url: success_url,
          failure_redirect_url: cancel_url,
          custom_metadata: {
            userId,
            type: "pro",
          },
        }),
      }
    );

    if (!paymentLinkRes.ok) {
      const errText = await paymentLinkRes.text();
      console.error(`StreamPay payment link error [${paymentLinkRes.status}]:`, errText);
      return new Response(
        JSON.stringify({ error: "Failed to create payment session" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentLinkData = await paymentLinkRes.json();
    const paymentUrl = paymentLinkData?.url;

    if (!paymentUrl) {
      console.error("StreamPay response missing url:", JSON.stringify(paymentLinkData));
      return new Response(
        JSON.stringify({ error: "Payment URL not returned by gateway" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ payment_url: paymentUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-pro-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
