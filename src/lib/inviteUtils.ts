import { supabase } from "@/integrations/supabase/client";

export interface ServerInviteMetadata {
  server_id: string;
  invite_code: string;
  server_name: string;
  server_icon_url?: string;
  server_banner_url?: string;
  expires_at?: string | null;
  max_uses?: number | null;
}

// Matches https://host/invite/CODE (4–20 alphanumeric chars)
const INVITE_URL_REGEX = /https?:\/\/[^\s/]+\/invite\/([A-Za-z0-9]{4,20})/;

export async function detectInviteInMessage(
  content: string
): Promise<{ isInvite: true; metadata: ServerInviteMetadata } | { isInvite: false }> {
  const match = content.match(INVITE_URL_REGEX);
  if (!match) return { isInvite: false };

  const code = match[1];

  // Validate invite via existing RPC — returns server_id or null
  const { data: serverId } = await supabase.rpc("get_server_id_by_invite_link", { p_code: code });
  if (!serverId) return { isInvite: false };

  // Fetch invite record for expiry / max_uses snapshot
  const { data: invite } = await supabase
    .from("invites" as any)
    .select("expires_at, max_uses")
    .eq("code", code)
    .maybeSingle();

  // Fetch server details
  const { data: server } = await supabase
    .from("servers")
    .select("name, icon_url, banner_url")
    .eq("id", serverId)
    .maybeSingle();

  if (!server) return { isInvite: false };

  return {
    isInvite: true,
    metadata: {
      server_id: serverId,
      invite_code: code,
      server_name: (server as any).name,
      server_icon_url: (server as any).icon_url ?? undefined,
      server_banner_url: (server as any).banner_url ?? undefined,
      expires_at: (invite as any)?.expires_at ?? null,
      max_uses: (invite as any)?.max_uses ?? null,
    },
  };
}
