/**
 * free-games-bot — Supabase Edge Function
 *
 * Fetches 100%-off free games from GamerPower and posts rich cards into
 * each server that has `free_games_channel_id` configured.
 *
 * Invocation: HTTP POST (from a cron trigger or Supabase Dashboard scheduled function)
 *
 * Cron setup options:
 *   Option A — pg_cron (Supabase Dashboard > Database > Extensions > pg_cron):
 *     SELECT cron.schedule('free-games-bot', '0 * * * *', $$
 *       SELECT net.http_post(
 *         url := 'https://<project-ref>.supabase.co/functions/v1/free-games-bot',
 *         headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *       );
 *     $$);
 *
 *   Option B — External cron (GitHub Actions, Railway, etc.) hitting:
 *     POST https://<project-ref>.supabase.co/functions/v1/free-games-bot
 *     Authorization: Bearer <service-role-key>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

const GAMERPOWER_URL =
  "https://www.gamerpower.com/api/filter?platform=epic-games-store.steam&type=game&sort-by=popularity";

interface GamerPowerGame {
  id: number;
  title: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  worth: string; // e.g. "$59.99"
  open_giveaway_url: string;
  giveaway_url: string;
  platforms: string;
  end_date: string;
  status: string;
  type: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // ── Fetch free games ────────────────────────────────────────────────────
    const gpRes = await fetch(GAMERPOWER_URL, {
      headers: { "Accept": "application/json" },
    });

    if (!gpRes.ok) {
      return new Response(
        JSON.stringify({ error: "GamerPower fetch failed", status: gpRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const games: GamerPowerGame[] = await gpRes.json();
    // Only include active giveaways
    const activeGames = games.filter((g) => g.status === "Active");

    if (activeGames.length === 0) {
      return new Response(
        JSON.stringify({ posted: 0, message: "No active free games found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Fetch servers with a free games channel configured ──────────────────
    const { data: servers, error: serversError } = await service
      .from("servers")
      .select("id, free_games_channel_id")
      .not("free_games_channel_id", "is", null);

    if (serversError) throw serversError;
    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({ posted: 0, message: "No servers have configured a free games channel" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalPosted = 0;

    for (const server of servers) {
      const { id: serverId, free_games_channel_id: channelId } = server as any;

      // Ensure bot is a member of this server (upsert — no-op if already joined)
      await service.from("server_members").upsert(
        { server_id: serverId, user_id: BOT_USER_ID, role: "member" },
        { onConflict: "server_id,user_id", ignoreDuplicates: true },
      );

      for (const game of activeGames) {
        const gameId = String(game.id);

        // Skip if already posted to this server
        const { data: existing } = await service
          .from("bot_posted_games")
          .select("id")
          .eq("server_id", serverId)
          .eq("game_id", gameId)
          .maybeSingle();

        if (existing) continue;

        // Insert the free game card message
        const { error: msgError } = await service.from("messages").insert({
          author_id:  BOT_USER_ID,
          channel_id: channelId,
          type:       "free_game",
          content:    `Free game for you @all: ${game.title} ${game.platforms} Giveaway`,
          metadata: {
            title:            game.title,
            thumbnail:        game.image || game.thumbnail,
            description:      game.description,
            instructions:     game.instructions,
            worth:            game.worth,
            end_date:         game.end_date,
            open_giveaway_url: game.open_giveaway_url || game.giveaway_url,
            platforms:        game.platforms,
          },
        } as any);

        if (msgError) {
          console.error(`Failed to post game ${game.title} to server ${serverId}:`, msgError);
          continue;
        }

        // Mark as posted
        await service.from("bot_posted_games").insert({
          server_id: serverId,
          game_id:   gameId,
        } as any);

        totalPosted++;
      }
    }

    return new Response(
      JSON.stringify({ posted: totalPosted, servers: servers.length, games: activeGames.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("free-games-bot error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
