import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the base URL for invite links.
 * Priority: VITE_APP_URL env var → window.location.origin (if not file://) → production fallback.
 */
export function getAppBaseUrl(): string {
  if (import.meta.env.VITE_APP_URL) return import.meta.env.VITE_APP_URL as string;
  if (typeof window !== "undefined" && !window.location.origin.startsWith("file://")) {
    return window.location.origin;
  }
  return "https://mshb.vercel.app";
}

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

  // Use validate_invite RPC — bypasses RLS, returns real-time status
  const { data, error } = await supabase.rpc("validate_invite" as any, { p_code: code });
  if (error || !data) return { isInvite: false };

  const result = data as any;
  if (result.status !== "valid") return { isInvite: false };

  return {
    isInvite: true,
    metadata: {
      server_id: result.server_id,
      invite_code: code,
      server_name: result.server_name,
      server_icon_url: result.server_icon_url ?? undefined,
      server_banner_url: result.server_banner_url ?? undefined,
      expires_at: result.expires_at ?? null,
      max_uses: result.max_uses ?? null,
    },
  };
}
