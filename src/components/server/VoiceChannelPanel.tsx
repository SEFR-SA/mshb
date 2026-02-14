import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";

interface Participant {
  user_id: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    status: string;
  };
}

interface Props {
  channelId: string;
  channelName: string;
  serverId: string;
}

const VoiceChannelPanel = ({ channelId, channelName, serverId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);

  const loadParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("voice_channel_participants" as any)
      .select("user_id")
      .eq("channel_id", channelId);
    if (!data) return;
    const userIds = (data as any[]).map((p) => p.user_id);
    setIsJoined(!!user && userIds.includes(user.id));
    if (userIds.length === 0) { setParticipants([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, status")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    setParticipants(userIds.map((uid) => ({ user_id: uid, profile: profileMap.get(uid) })));
  }, [channelId, user]);

  useEffect(() => {
    loadParticipants();
    const channel = supabase
      .channel(`voice-presence-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants", filter: `channel_id=eq.${channelId}` }, () => loadParticipants())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [channelId, loadParticipants]);

  const setupSignaling = useCallback(() => {
    if (channelRef.current) return;
    const ch = supabase.channel(`voice-signal-${channelId}`);
    channelRef.current = ch;

    ch.on("broadcast", { event: "voice-offer" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      const pc = createPeerConnection(payload.senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ch.send({ type: "broadcast", event: "voice-answer", payload: { sdp: answer, senderId: user.id, targetId: payload.senderId } });
    })
    .on("broadcast", { event: "voice-answer" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      const pc = peerConnectionsRef.current.get(payload.senderId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    })
    .on("broadcast", { event: "voice-ice" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      const pc = peerConnectionsRef.current.get(payload.senderId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    })
    .on("broadcast", { event: "voice-leave" }, ({ payload }) => {
      const pc = peerConnectionsRef.current.get(payload.userId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(payload.userId); }
    })
    .subscribe();
  }, [channelId, user]);

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnectionsRef.current.set(peerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play().catch(() => {});
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && user) {
        channelRef.current?.send({
          type: "broadcast", event: "voice-ice",
          payload: { candidate: e.candidate, senderId: user.id, targetId: peerId },
        });
      }
    };

    return pc;
  }, [user]);

  const joinVoice = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setupSignaling();

      await supabase.from("voice_channel_participants" as any).insert({ channel_id: channelId, user_id: user.id } as any);
      setIsJoined(true);

      // Connect to existing participants
      setTimeout(async () => {
        const { data } = await supabase.from("voice_channel_participants" as any).select("user_id").eq("channel_id", channelId);
        const others = ((data as any[]) || []).filter((p) => p.user_id !== user.id);
        for (const other of others) {
          const pc = createPeerConnection(other.user_id);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channelRef.current?.send({
            type: "broadcast", event: "voice-offer",
            payload: { sdp: offer, senderId: user.id, targetId: other.user_id },
          });
        }
      }, 500);
    } catch {
      // Microphone permission denied
    }
  };

  const leaveVoice = async () => {
    if (!user) return;
    channelRef.current?.send({ type: "broadcast", event: "voice-leave", payload: { userId: user.id } });
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    await supabase.from("voice_channel_participants" as any).delete().eq("channel_id", channelId).eq("user_id", user.id);
    setIsJoined(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setIsMuted((prev) => !prev);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined && user) {
        supabase.from("voice_channel_participants" as any).delete().eq("channel_id", channelId).eq("user_id", user.id).then();
        peerConnectionsRef.current.forEach((pc) => pc.close());
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        channelRef.current?.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-w-0 flex-1">
      {/* Header */}
      <header className="flex items-center gap-2 p-3 glass border-b border-border/50">
        <Volume2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold flex-1">{channelName}</h2>
        <span className="text-xs text-muted-foreground">
          {participants.length} {t("servers.connected")}
        </span>
      </header>

      {/* Participants grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Volume2 className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t("servers.voiceEmpty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {participants.map((p) => {
              const name = p.profile?.display_name || p.profile?.username || "User";
              const isMe = p.user_id === user?.id;
              return (
                <div key={p.user_id} className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${isMe ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30"}`}>
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={p.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary text-lg">{name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <StatusBadge status="online" size="sm" className="absolute bottom-0 end-0" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-full">{name}</span>
                  {isMe && isMuted && <MicOff className="h-3.5 w-3.5 text-destructive" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border/50 flex items-center justify-center gap-3">
        {isJoined ? (
          <>
            <Button variant="outline" size="icon" onClick={toggleMute} className="h-12 w-12 rounded-full">
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button variant="destructive" size="icon" onClick={leaveVoice} className="h-12 w-12 rounded-full">
              <PhoneOff className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <Button onClick={joinVoice} className="gap-2">
            <PhoneCall className="h-4 w-4" />
            {t("servers.joinVoice")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceChannelPanel;
