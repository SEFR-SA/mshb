import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GIPHY_API_KEY = Deno.env.get("GIPHY_API_KEY");
  if (!GIPHY_API_KEY) {
    return new Response(JSON.stringify({ error: "GIPHY_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "gifs"; // gifs or stickers
    const q = url.searchParams.get("q") || "";
    const trending = url.searchParams.get("trending") === "true";
    const offset = url.searchParams.get("offset") || "0";
    const limit = url.searchParams.get("limit") || "25";

    let giphyUrl: string;

    if (trending || !q) {
      giphyUrl = `https://api.giphy.com/v1/${type}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=pg-13`;
    } else {
      giphyUrl = `https://api.giphy.com/v1/${type}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=pg-13`;
    }

    const response = await fetch(giphyUrl);
    if (!response.ok) {
      throw new Error(`GIPHY API error [${response.status}]: ${await response.text()}`);
    }

    const data = await response.json();

    // Return simplified data
    const results = data.data.map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.images.fixed_height.url,
      preview: item.images.fixed_height_small.url || item.images.preview_gif?.url || item.images.fixed_height.url,
      width: parseInt(item.images.fixed_height.width),
      height: parseInt(item.images.fixed_height.height),
    }));

    return new Response(JSON.stringify({ results, total: data.pagination?.total_count || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("GIPHY proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
