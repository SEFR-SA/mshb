import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import * as jose from "https://deno.land/x/jose@v5.2.2/index.ts";
import { isRateLimited, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Generate a LiveKit-compatible JWT (replaces livekit-server-sdk AccessToken) */
async function createLiveKitToken(
  apiKey: string,
  apiSecret: string,
  opts: {
    identity: string;
    name: string;
    metadata?: string;
    ttlSeconds?: number;
    grants: Record<string, unknown>;
  }
): Promise<string> {
  const secret = new TextEncoder().encode(apiSecret);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (opts.ttlSeconds ?? 86400); // default 24h

  const payload: Record<string, unknown> = {
    iss: apiKey,
    sub: opts.identity,
    name: opts.name,
    nbf: now,
    exp,
    iat: now,
    jti: opts.identity,
    video: opts.grants,
  };

  if (opts.metadata) {
    payload.metadata = opts.metadata;
  }

  return await new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secret);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIVEKIT_API_KEY = Deno.env.get("LIVEKIT_API_KEY");
    const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET");
    const LIVEKIT_WS_URL = Deno.env.get("LIVEKIT_WS_URL");

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
      throw new Error("LiveKit environment variables not configured");
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    if (isRateLimited(userId, 10, 60_000)) return rateLimitResponse();

    const { roomName, participantName, participantIdentity } = await req.json();

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "roomName and participantName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profilePromise = supabase
      .from("profiles")
      .select("is_pro")
      .eq("user_id", userId)
      .single();

    let boostPromise: Promise<number> = Promise.resolve(0);
    let connectPromise: Promise<boolean> = Promise.resolve(true);
    let speakPromise: Promise<boolean> = Promise.resolve(true);
    let videoPromise: Promise<boolean> = Promise.resolve(true);

    if (roomName.startsWith("server-voice:")) {
      const channelId = roomName.replace("server-voice:", "");

      boostPromise = Promise.resolve(supabase
        .from("channels")
        .select("server_id")
        .eq("id", channelId)
        .single()
        .then(async ({ data: channel }: any) => {
          if (!channel?.server_id) return 0;
          const { data: server } = await supabase
            .from("servers")
            .select("boost_level")
            .eq("id", channel.server_id)
            .single();
          return server?.boost_level ?? 0;
        }));

      connectPromise = Promise.resolve(serviceClient
        .rpc("has_channel_permission" as any, {
          _user_id: userId,
          _channel_id: channelId,
          _permission: "connect",
        } as any)
        .then(({ data }: any) => data ?? true));

      speakPromise = Promise.resolve(serviceClient
        .rpc("has_channel_permission" as any, {
          _user_id: userId,
          _channel_id: channelId,
          _permission: "speak",
        } as any)
        .then(({ data }: any) => data ?? true));

      videoPromise = Promise.resolve(serviceClient
        .rpc("has_channel_permission" as any, {
          _user_id: userId,
          _channel_id: channelId,
          _permission: "video",
        } as any)
        .then(({ data }: any) => data ?? true));
    }

    const [{ data: profile }, boostLevel, canConnect, canSpeak, canVideo] =
      await Promise.all([profilePromise, boostPromise, connectPromise, speakPromise, videoPromise]);

    if (!canConnect) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to join this voice channel" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPro = profile?.is_pro ?? false;

    const grants: Record<string, unknown> = {
      room: roomName,
      roomJoin: true,
      canPublish: canSpeak || canVideo,
      canSubscribe: true,
      canPublishData: true,
    };

    if (!canSpeak) {
      grants.canPublish = false;
    } else if (!canVideo) {
      grants.canPublishSources = ["microphone", "screen_share", "screen_share_audio"];
    }

    const jwt = await createLiveKitToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity || userId,
      name: participantName,
      metadata: JSON.stringify({ isPro, boostLevel, userId }),
      ttlSeconds: 86400,
      grants,
    });

    return new Response(
      JSON.stringify({ token: jwt, wsUrl: LIVEKIT_WS_URL }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("LiveKit token error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
