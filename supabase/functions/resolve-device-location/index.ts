import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isRateLimited, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    if (ip && isRateLimited(ip, 10, 60_000)) return rateLimitResponse();

    if (!ip) {
      return new Response(
        JSON.stringify({ ip: null, city: null, country: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geo = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,country`
    );
    const data = await geo.json();

    if (data.status === "success") {
      return new Response(
        JSON.stringify({ ip, city: data.city, country: data.country }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ip, city: null, country: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("resolve-device-location error:", err);
    return new Response(
      JSON.stringify({ ip: null, city: null, country: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
