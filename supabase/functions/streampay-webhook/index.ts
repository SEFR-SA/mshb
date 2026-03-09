import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Layered webhook authentication ───────────────────────────────────────────
//
// StreamPay does not provide a separate webhook secret. This function therefore
// tries two authentication paths in order:
//
//   Path A (preferred): HMAC-SHA256 signature
//     StreamPay computes HMAC-SHA256(rawBody, STREAMPAY_SECRET_KEY) and sends
//     the hex digest in the X-StreamPay-Signature header. We verify it with the
//     same key. This is cryptographically strong.
//
//   Path B (fallback): x-api-key header comparison
//     If StreamPay does not send a signature header, it may instead include the
//     x-api-key value in an "x-api-key" request header. We compare it against
//     our stored STREAMPAY_X_API_KEY. Simpler but still guards against
//     unauthenticated callers.
//
// If Path A signature is PRESENT but WRONG → hard 403 (possible forgery; do not
// fall through to Path B).
//
// If the signature header is ABSENT → try Path B.
//
// On any failure, all received headers are logged so you can inspect exactly
// what StreamPay sends in production and tune this function accordingly.
//
async function isRequestAuthentic(req: Request, rawBody: string): Promise<boolean> {
  const secretKey = Deno.env.get("STREAMPAY_SECRET_KEY");
  const xApiKey   = Deno.env.get("STREAMPAY_X_API_KEY");

  if (!secretKey) {
    console.error("STREAMPAY_SECRET_KEY is not set — cannot authenticate webhook");
    return false;
  }

  // ── Path A: HMAC-SHA256 signature ────────────────────────────────────────
  const receivedSig = req.headers.get("X-StreamPay-Signature");

  if (receivedSig) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(rawBody)
    );
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison to prevent timing attacks
    if (expected.length === receivedSig.length) {
      let mismatch = 0;
      for (let i = 0; i < expected.length; i++) {
        mismatch |= expected.charCodeAt(i) ^ receivedSig.charCodeAt(i);
      }
      if (mismatch === 0) return true;
    }

    // Signature was provided but didn't match — hard reject.
    // Do NOT fall through to Path B: a wrong signature indicates either a
    // misconfigured key or a spoofing attempt, not a different auth scheme.
    console.warn("HMAC signature present but INVALID — rejecting request");
    console.warn("Received headers:", JSON.stringify(Object.fromEntries(req.headers)));
    return false;
  }

  // ── Path B: x-api-key header comparison ──────────────────────────────────
  // Only attempted when StreamPay sends no signature header at all.
  if (xApiKey) {
    const receivedKey = req.headers.get("x-api-key");
    if (receivedKey === xApiKey) return true;
    console.warn("x-api-key header mismatch or absent");
  }

  // Neither path passed — log all headers to diagnose what StreamPay is sending.
  // This log will tell you exactly which header to use, allowing you to
  // simplify or correct this auth logic after your first real webhook delivery.
  console.warn(
    "Webhook authentication failed. Received headers:",
    JSON.stringify(Object.fromEntries(req.headers))
  );
  return false;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── 1. Read raw body FIRST — the stream can only be consumed once ─────────
  // Both HMAC verification and JSON parsing need this content.
  // Using req.text() here; never call req.json() after this.
  const rawBody = await req.text();

  try {
    // ── 2. Authenticate the request ──────────────────────────────────────────
    const authentic = await isRequestAuthentic(req, rawBody);
    if (!authentic) {
      return new Response("Forbidden", { status: 403 });
    }

    // ── 3. Parse the webhook event ───────────────────────────────────────────
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // StreamPay webhook shape:
    //   event.type              — "payment.paid" | "payment.failed" | "payment.refunded"
    //   event.data.id           — StreamPay transaction ID
    //   event.data.metadata.userId   — injected by create-streampay-checkout
    //   event.data.metadata.serverId — injected by create-streampay-checkout
    const eventType     = event.type as string;
    const data          = event.data as Record<string, unknown> | undefined;
    const transactionId = data?.id as string | undefined;
    const metadata      = data?.metadata as Record<string, string> | undefined;
    const userId        = metadata?.userId;
    const serverId      = metadata?.serverId;

    // ── 4. Initialize service role Supabase client ───────────────────────────
    // Service role bypasses RLS — required because authenticated users have
    // no write access to user_boosts (intentional, prevents free boosts).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 5. Route on event type ────────────────────────────────────────────────

    if (eventType === "payment.paid") {
      // All three fields are required; without them we cannot attribute the boost.
      if (!transactionId || !userId || !serverId) {
        console.error("payment.paid event missing required fields:", {
          transactionId,
          userId,
          serverId,
        });
        // Return 200 so StreamPay doesn't retry — malformed payloads won't
        // become valid on retry.
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency guard: StreamPay retries on timeout/5xx. If this transaction
      // was already recorded, skip the insert to prevent double-counting.
      const { data: existing } = await supabase
        .from("user_boosts")
        .select("id")
        .eq("streampay_transaction_id", transactionId)
        .maybeSingle();

      if (existing) {
        console.log(
          `Duplicate webhook for transaction ${transactionId} — skipping insert`
        );
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert the confirmed boost.
      // The Phase 1 DB trigger (handle_boost_change → recalculate_server_boost)
      // fires automatically on this insert, updating:
      //   • servers.boost_count and servers.boost_level
      //   • server_members.is_booster and boosted_at
      //   • server_audit_logs (boost_started + level_changed if applicable)
      const { error: insertError } = await supabase.from("user_boosts").insert({
        user_id:                  userId,
        server_id:                serverId,
        status:                   "active",
        streampay_transaction_id: transactionId,
      });

      if (insertError) {
        console.error("Failed to insert user_boost:", insertError);
        // Return 500 so StreamPay retries — this is a genuine DB failure.
        return new Response(
          JSON.stringify({ error: "Failed to record boost" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(
        `Boost recorded: user=${userId} server=${serverId} tx=${transactionId}`
      );

    } else if (eventType === "payment.failed" || eventType === "payment.refunded") {
      if (!transactionId) {
        console.error(`${eventType} event missing transaction ID`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Map event → status:
      //   payment.refunded → "canceled" (money returned; boost permanently revoked)
      //   payment.failed   → "past_due" (payment issue; may be retried by the user)
      const newStatus =
        eventType === "payment.refunded" ? "canceled" : "past_due";

      const { error: updateError } = await supabase
        .from("user_boosts")
        .update({
          status:      newStatus,
          canceled_at: new Date().toISOString(),
        })
        .eq("streampay_transaction_id", transactionId);

      if (updateError) {
        console.error(
          `Failed to update boost status for tx=${transactionId}:`,
          updateError
        );
        return new Response(
          JSON.stringify({ error: "Failed to update boost status" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`Boost ${newStatus}: tx=${transactionId}`);

    } else {
      // Unknown event type — acknowledge with 200 to prevent retries.
      // Log it in case we need to add handling for it later.
      console.log(`Unhandled StreamPay event type: ${eventType}`);
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
