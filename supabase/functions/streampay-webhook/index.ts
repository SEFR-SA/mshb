import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Verify StreamPay webhook signature ───────────────────────────────────────
// StreamPay sends: x-webhook-signature: t=<timestamp>,v1=<hex-hmac>
// Signed payload = "<timestamp>.<rawBody>"
async function verifySignature(
  signatureHeader: string,
  rawBody: string,
  secret: string
): Promise<boolean> {
  let timestamp = "";
  let providedHash = "";

  for (const part of signatureHeader.split(",")) {
    if (part.startsWith("t=")) timestamp = part.substring(2);
    else if (part.startsWith("v1=")) providedHash = part.substring(3);
  }

  if (!timestamp || !providedHash) {
    console.error("Invalid signature format:", signatureHeader);
    return false;
  }

  // Optional: reject timestamps older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (isNaN(age) || age > 300) {
    console.warn(`Webhook timestamp too old (${age}s)`);
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison
  if (expected.length !== providedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ providedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rawBody = await req.text();

  try {
    // ── 1. Read StreamPay headers ────────────────────────────────────────────
    const signatureHeader = req.headers.get("x-webhook-signature");
    const eventType = req.headers.get("x-webhook-event");
    const entityId = req.headers.get("x-webhook-entity-id");
    const webhookSecret = Deno.env.get("STREAMPAY_SECRET_KEY");

    if (!signatureHeader || !webhookSecret) {
      console.error("Missing signature header or STREAMPAY_SECRET_KEY");
      return new Response("Unauthorized", { status: 401 });
    }

    // ── 2. Verify signature ─────────────────────────────────────────────────
    const valid = await verifySignature(signatureHeader, rawBody, webhookSecret);
    if (!valid) {
      console.warn("Signature verification failed");
      console.warn("Headers:", JSON.stringify(Object.fromEntries(req.headers)));
      return new Response("Invalid signature", { status: 403 });
    }

    // ── 3. Parse body & extract metadata ────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log full body on first successful verification for debugging
    console.log("Webhook verified — event:", eventType, "entity:", entityId);
    console.log("Body keys:", Object.keys(body));

    const data = body.data as Record<string, unknown> | undefined;
    console.log("Body.data keys:", Object.keys(data ?? {}));
    const customMetadata = (data?.custom_metadata ?? data?.metadata) as Record<string, string> | undefined;
    console.log("customMetadata:", JSON.stringify(customMetadata));
    const userId = customMetadata?.userId;
    const serverId = customMetadata?.serverId;
    console.log("Extracted userId:", userId, "serverId:", serverId);
    const transactionId = entityId || (body.id as string | undefined);

    // ── 4. Init service-role Supabase client ────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 5. Route on event type ──────────────────────────────────────────────

    if (eventType === "PAYMENT_SUCCEEDED") {
      const paymentType = customMetadata?.type; // 'pro' or 'boost' (or undefined for legacy)

      if (paymentType === "pro") {
        // ── PRO SUBSCRIPTION FLOW ─────────────────────────────────────
        if (!transactionId || !userId) {
          console.error("PAYMENT_SUCCEEDED (pro) missing required fields:", { transactionId, userId });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Idempotency check on user_subscriptions
        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("streampay_transaction_id", transactionId)
          .maybeSingle();

        if (existingSub) {
          console.log(`Duplicate pro webhook for tx=${transactionId} — skipping`);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert subscription
        const { error: subError } = await supabase.from("user_subscriptions").insert({
          user_id: userId,
          tier: "pro",
          status: "active",
          streampay_transaction_id: transactionId,
        });

        if (subError) {
          console.error("Failed to insert user_subscription:", subError);
          return new Response(
            JSON.stringify({ error: "Failed to record subscription" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Grant 2 inventory boosts (server_id = NULL)
        const boostInserts = [
          { user_id: userId, server_id: null, status: "active", streampay_transaction_id: transactionId },
          { user_id: userId, server_id: null, status: "active", streampay_transaction_id: transactionId },
        ];
        const { error: boostErr } = await supabase.from("user_boosts").insert(boostInserts);
        if (boostErr) {
          console.error("Failed to insert inventory boosts:", boostErr);
          // Non-fatal — subscription was already recorded
        }

        console.log(`Pro subscription recorded: user=${userId} tx=${transactionId} (+2 inventory boosts)`);

      } else {
        // ── SERVER BOOST FLOW (legacy / type=boost) ──────────────────
        if (!transactionId || !userId || !serverId) {
          console.error("PAYMENT_SUCCEEDED missing required fields:", {
            transactionId, userId, serverId,
          });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Idempotency: skip if already recorded
        const { data: existing } = await supabase
          .from("user_boosts")
          .select("id")
          .eq("streampay_transaction_id", transactionId)
          .maybeSingle();

        if (existing) {
          console.log(`Duplicate webhook for tx=${transactionId} — skipping`);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert boost — DB trigger handles boost_count/level/is_booster
        const { error: insertError } = await supabase.from("user_boosts").insert({
          user_id: userId,
          server_id: serverId,
          status: "active",
          streampay_transaction_id: transactionId,
        });

        if (insertError) {
          console.error("Failed to insert user_boost:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to record boost" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Boost recorded: user=${userId} server=${serverId} tx=${transactionId}`);

        // Insert boost announcement (non-fatal)
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("user_id", userId)
            .maybeSingle();
          const displayName =
            (profile as any)?.display_name || (profile as any)?.username || "Someone";

          const { data: channel } = await supabase
            .from("channels")
            .select("id")
            .eq("server_id", serverId)
            .eq("type", "text")
            .order("position")
            .limit(1)
            .maybeSingle();

          if (channel) {
            await supabase.from("messages").insert({
              channel_id: channel.id,
              author_id: userId,
              content: displayName,
              type: "boost",
            });
          }
        } catch (msgErr) {
          console.error("Failed to insert boost announcement:", msgErr);
        }
      }

    } else if (eventType === "PAYMENT_FAILED" || eventType === "PAYMENT_REFUNDED") {
      if (!transactionId) {
        console.error(`${eventType} missing transaction ID`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newStatus = eventType === "PAYMENT_REFUNDED" ? "canceled" : "past_due";

      const { error: updateError } = await supabase
        .from("user_boosts")
        .update({ status: newStatus, canceled_at: new Date().toISOString() })
        .eq("streampay_transaction_id", transactionId);

      if (updateError) {
        console.error(`Failed to update boost for tx=${transactionId}:`, updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update boost status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Boost ${newStatus}: tx=${transactionId}`);
    } else {
      console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("streampay-webhook unhandled error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
