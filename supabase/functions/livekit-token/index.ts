import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { AccessToken } from "npm:livekit-server-sdk@2.9.1";
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

    // Service client for permission checks (bypasses RLS, uses _user_id param)
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

    // Parse request body
    const { roomName, participantName, participantIdentity } = await req.json();

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "roomName and participantName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's Pro status and boost level, plus voice permissions for server channels
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

      boostPromise = supabase
        .from("channels")
        .select("server_id")
        .eq("id", channelId)
        .single()
        .then(async ({ data: channel }) => {
          if (!channel?.server_id) return 0;
          const { data: server } = await supabase
            .from("servers")
            .select("boost_level")
            .eq("id", channel.server_id)
            .single();
          return server?.boost_level ?? 0;
        });

      // Check connect, speak, video permissions via service client (skips defaults for restricted channels)
      connectPromise = serviceClient
        .rpc("has_channel_permission" as any, {
          _user_id: userId,
          _channel_id: channelId,
          _permission: "connect",
        } as any)
        .then(({ data }) => data ?? true);

      speakPromise = serviceClient
        .rpc("has_channel_permission" as any, {
          _user_id: userId,
          _channel_id: channelId,
          _permission: "speak",
        } as any)
        .then(({ data }) => data ?? true);

      videoPromise = serviceClient
        .rpc("has_channel_permission" as any, {
          _user_id: userId,
          _channel_id: channelId,
          _permission: "video",
        } as any)
        .then(({ data }) => data ?? true);
    }

    const [{ data: profile }, boostLevel, canConnect, canSpeak, canVideo] =
      await Promise.all([profilePromise, boostPromise, connectPromise, speakPromise, videoPromise]);

    // Block token entirely if user cannot connect
    if (!canConnect) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to join this voice channel" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPro = profile?.is_pro ?? false;

    // Generate LiveKit access token with permission-aware grants
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity || userId,
      name: participantName,
      metadata: JSON.stringify({ isPro, boostLevel, userId }),
      ttl: "24h",
    });

    // canPublish: false blocks all track publishing (mic + camera)
    // canPublishSources: when video is denied but speak is allowed, restrict to mic/screen only
    const grantOptions: Record<string, unknown> = {
      room: roomName,
      roomJoin: true,
      canPublish: canSpeak || canVideo, // false only if both are denied
      canSubscribe: true,
      canPublishData: true,
    };

    // If speak is denied, they cannot publish at all regardless of video
    if (!canSpeak) {
      grantOptions.canPublish = false;
    } else if (!canVideo) {
      // Speak allowed but video denied — restrict sources to mic + screen share only
      grantOptions.canPublishSources = ["microphone", "screen_share", "screen_share_audio"];
    }

    at.addGrant(grantOptions as any);

    const jwt = await at.toJwt();

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
