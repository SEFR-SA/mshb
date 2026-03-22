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
    if (isRateLimited(userId, 5, 60_000)) return rateLimitResponse();
    const userEmail = claimsData.claims.email as string | undefined;

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

    // ── 4. StreamPay configuration ────────────────────────────────────────
    const STREAMPAY_X_API_KEY = Deno.env.get("STREAMPAY_X_API_KEY");
    const STREAMPAY_API_BASE =
      Deno.env.get("STREAMPAY_API_BASE_URL") ?? "https://stream-app-service.streampay.sa";
    const STREAMPAY_BOOST_PRODUCT_ID = Deno.env.get("STREAMPAY_BOOST_PRODUCT_ID");

    if (!STREAMPAY_X_API_KEY || !STREAMPAY_BOOST_PRODUCT_ID) {
      console.error("Missing STREAMPAY_X_API_KEY or STREAMPAY_BOOST_PRODUCT_ID");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const spHeaders = {
      "x-api-key": STREAMPAY_X_API_KEY,
      "Content-Type": "application/json",
    };

    // ── 5. Ensure StreamPay consumer exists for this user ─────────────────
    // Try to find existing consumer by external_id, create if not found.
    const externalId = `mshb_${userId}`;

    // Look up user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", userId)
      .single();

    const customerName = profile?.display_name || profile?.username || "MSHB User";

    // Try to list consumers filtered by external_id
    const listRes = await fetch(
      `${STREAMPAY_API_BASE}/api/v2/consumers?external_id=${encodeURIComponent(externalId)}`,
      { headers: { "x-api-key": STREAMPAY_X_API_KEY } }
    );

    let consumerId: string | null = null;

    if (listRes.ok) {
      const listData = await listRes.json();
      // Response may be an array or have a results/data field
      const consumers = Array.isArray(listData)
        ? listData
        : listData?.results ?? listData?.data ?? [];
      if (consumers.length > 0) {
        consumerId = consumers[0].id;
      }
    }

    if (!consumerId) {
      // Create a new consumer
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

        // If DUPLICATE_CONSUMER, try list again
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
            if (consumers.length > 0) {
              consumerId = consumers[0].id;
            }
          }
        }

        if (!consumerId) {
          return new Response(
            JSON.stringify({ error: "Failed to create payment customer" }),
            {
              status: 502,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        const consumerData = await createConsumerRes.json();
        consumerId = consumerData.id;
      }
    }

    // ── 6. Create payment link ────────────────────────────────────────────
    const paymentLinkRes = await fetch(
      `${STREAMPAY_API_BASE}/api/v2/payment_links`,
      {
        method: "POST",
        headers: spHeaders,
        body: JSON.stringify({
          name: "MSHB Server Boost",
          description: "Server Boost — monthly subscription",
          items: [
            {
              product_id: STREAMPAY_BOOST_PRODUCT_ID,
              quantity: 1,
            },
          ],
          currency: "SAR",
          max_number_of_payments: 1,
          organization_consumer_id: consumerId,
          success_redirect_url: success_url,
          failure_redirect_url: cancel_url,
          custom_metadata: {
            userId,
            serverId: server_id,
          },
        }),
      }
    );

    if (!paymentLinkRes.ok) {
      const errText = await paymentLinkRes.text();
      console.error(
        `StreamPay payment link error [${paymentLinkRes.status}]:`,
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

    const paymentLinkData = await paymentLinkRes.json();
    const paymentUrl = paymentLinkData?.url;

    if (!paymentUrl) {
      console.error("StreamPay response missing url:", JSON.stringify(paymentLinkData));
      return new Response(
        JSON.stringify({ error: "Payment URL not returned by gateway" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 7. Return the checkout URL to the frontend ─────────────────────────
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
