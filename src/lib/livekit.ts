import { supabase } from "@/integrations/supabase/client";

export interface LiveKitTokenResponse {
  token: string;
  wsUrl: string;
}

/**
 * Request a LiveKit access token from the backend edge function.
 *
 * @param roomName       - Room to join. Use helpers below for naming conventions.
 * @param participantName - Display name shown to other participants.
 * @param participantIdentity - Unique identity (defaults to userId on the server).
 */
export async function fetchLiveKitToken(
  roomName: string,
  participantName: string,
  participantIdentity?: string
): Promise<LiveKitTokenResponse> {
  const { data, error } = await supabase.functions.invoke("livekit-token", {
    body: { roomName, participantName, participantIdentity },
  });

  if (error) throw new Error(error.message ?? "Failed to fetch LiveKit token");
  if (!data?.token || !data?.wsUrl) throw new Error("Invalid token response");

  return { token: data.token, wsUrl: data.wsUrl };
}

/** Room name for a server voice channel. */
export const serverVoiceRoom = (channelId: string) =>
  `server-voice:${channelId}`;

/** Room name for a DM call session. */
export const dmCallRoom = (sessionId: string) => `dm-call:${sessionId}`;
