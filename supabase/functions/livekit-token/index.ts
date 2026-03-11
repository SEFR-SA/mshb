import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { AccessToken } from "npm:livekit-server-sdk@2.9.1";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse request body
    const { roomName, participantName, participantIdentity } = await req.json();

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "roomName and participantName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's Pro status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("user_id", userId)
      .single();

    const isPro = profile?.is_pro ?? false;

    // If this is a server voice channel room, fetch boost level
    let boostLevel = 0;
    if (roomName.startsWith("server-voice:")) {
      const channelId = roomName.replace("server-voice:", "");
      const { data: channel } = await supabase
        .from("channels")
        .select("server_id")
        .eq("id", channelId)
        .single();

      if (channel?.server_id) {
        const { data: server } = await supabase
          .from("servers")
          .select("boost_level")
          .eq("id", channel.server_id)
          .single();
        boostLevel = server?.boost_level ?? 0;
      }
    }

    // Generate LiveKit access token
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity || userId,
      name: participantName,
      metadata: JSON.stringify({ isPro, boostLevel, userId }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

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
