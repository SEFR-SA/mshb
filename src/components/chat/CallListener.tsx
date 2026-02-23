import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useNavigate } from "react-router-dom";
import { startLoop, stopLoop, stopAllLoops, playSound } from "@/lib/soundManager";
import IncomingCallDialog from "./IncomingCallDialog";
import VoiceCallUI from "./VoiceCallUI";

const CALL_TIMEOUT_SECONDS = 180; // 3 minutes

interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  threadId: string;
}

/** Insert a call_notification system message into a DM thread */
async function insertCallSystemMessage(
  threadId: string,
  authorId: string,
  content: string
) {
  try {
    await supabase.from("messages").insert({
      thread_id: threadId,
      author_id: authorId,
      content,
      type: 'call_notification',
    } as any);
    await supabase
      .from("dm_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);
  } catch {
    // ignore
  }
}

function formatDurationText(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CallListener = () => {
  const { user } = useAuth();
  const { globalMuted, globalDeafened } = useAudioSettings();
  const { voiceChannel, disconnectVoice } = useVoiceChannel();
  const navigate = useNavigate();

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherAvatar, setOtherAvatar] = useState<string | undefined>(undefined);

  // Track call start time for duration on end
  const callStartRef = useRef<number | null>(null);
  // Timeout ref for 3-minute auto-cancel
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep threadId accessible in cleanup
  const activeThreadRef = useRef<string | null>(null);
  const callerIdRef = useRef<string | null>(null);

  activeThreadRef.current = activeThreadId;

  const clearTimeout_ = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleCallEnded = useCallback(async () => {
    stopAllLoops();
    playSound("call_end");
    clearTimeout_();

    const threadId = activeThreadRef.current;
    const startTime = callStartRef.current;

    if (threadId && user) {
      if (startTime) {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const durationText = formatDurationText(duration);
        await insertCallSystemMessage(
          threadId,
          user.id,
          `Call ended · ${durationText}`
        );
      }
    }

    callStartRef.current = null;
    setActiveSession(null);
    setActiveThreadId(null);
    setIncomingCall(null);
    setIsCaller(false);
    setOtherName("");
    setOtherAvatar(undefined);
  }, [user]);

  const { callState, isMuted, isDeafened, callDuration, isScreenSharing, remoteScreenStream, isCameraOn, localCameraStream, remoteCameraStream, startCall, answerCall, endCall, toggleMute, toggleDeafen, startScreenShare, stopScreenShare, startCamera, stopCamera } = useWebRTC({
    sessionId: activeSession,
    isCaller,
    onEnded: handleCallEnded,
    initialMuted: globalMuted,
    initialDeafened: globalDeafened,
  });

  // Track when call connects to record start time
  useEffect(() => {
    if (callState === "connected" && !callStartRef.current) {
      callStartRef.current = Date.now();
      stopAllLoops(); // Stop ringtone when connected
    }
  }, [callState]);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("call-listener-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `callee_id=eq.${user.id}`,
        },
        async (payload) => {
          const session = payload.new as any;
          if (session.status !== "ringing") return;
          if (activeSession) return; // already in a call

          // Fetch caller profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("user_id", session.caller_id)
            .maybeSingle();

          callerIdRef.current = session.caller_id;

          setIncomingCall({
            sessionId: session.id,
            callerId: session.caller_id,
            callerName: profile?.display_name || profile?.username || "User",
            callerAvatar: profile?.avatar_url || undefined,
            threadId: session.thread_id,
          });

          // Play incoming ring
          startLoop("incoming_ring");

          // Auto-decline after 3 minutes
          timeoutRef.current = setTimeout(async () => {
            stopAllLoops();
            const callerName = profile?.display_name || profile?.username || "User";
            // Insert missed call message
            if (session.thread_id && user) {
              await insertCallSystemMessage(
                session.thread_id,
                user.id,
                `Missed call from ${callerName}`
              );
            }
            await supabase
              .from("call_sessions")
              .update({ status: "missed", ended_at: new Date().toISOString() } as any)
              .eq("id", session.id);
            setIncomingCall(null);
          }, CALL_TIMEOUT_SECONDS * 1000);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, activeSession]);

  // Watch for caller's call being declined/timed-out (for missed call message insertion by caller)
  useEffect(() => {
    if (!activeSession || !isCaller) return;
    const channel = supabase
      .channel(`call-status-caller-${activeSession}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
        filter: `id=eq.${activeSession}`,
      }, async (payload) => {
        const status = (payload.new as any).status;
        if (status === "ended" || status === "declined") {
          stopAllLoops();
          endCall();
        } else if (status === "missed") {
          stopAllLoops();
          playSound("call_end");
          // Insert missed call message for caller side
          const threadId = activeThreadRef.current;
          if (threadId && user) {
            const otherN = otherName;
            await insertCallSystemMessage(
              threadId,
              user.id,
              `${otherN} missed your call`
            );
          }
          endCall();
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [activeSession, isCaller, endCall, user, otherName]);

  // Watch for callee-side status changes (ended/declined from caller)
  useEffect(() => {
    if (!activeSession || isCaller) return;
    const channel = supabase
      .channel(`call-status-callee-${activeSession}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
        filter: `id=eq.${activeSession}`,
      }, (payload) => {
        const status = (payload.new as any).status;
        if (status === "ended" || status === "declined") {
          endCall();
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [activeSession, isCaller, endCall]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    clearTimeout_();
    stopLoop("incoming_ring");

    // Auto-disconnect from server voice channel if in one
    if (voiceChannel) {
      try {
        await supabase
          .from("voice_channel_participants")
          .delete()
          .eq("channel_id", voiceChannel.id)
          .eq("user_id", user!.id);
      } catch {}
      disconnectVoice();
    }

    setActiveSession(incomingCall.sessionId);
    setActiveThreadId(incomingCall.threadId);
    setIsCaller(false);
    setOtherName(incomingCall.callerName);
    setOtherAvatar(incomingCall.callerAvatar);

    await supabase
      .from("call_sessions")
      .update({ status: "connected", started_at: new Date().toISOString() } as any)
      .eq("id", incomingCall.sessionId);

    const threadId = incomingCall.threadId;
    setIncomingCall(null);
    answerCall(incomingCall.sessionId);

    // Navigate to DM chat
    if (threadId) {
      navigate(`/chat/${threadId}`);
    }
  }, [incomingCall, answerCall, voiceChannel, disconnectVoice, user, navigate]);

  const handleDecline = useCallback(async () => {
    if (!incomingCall) return;
    clearTimeout_();
    stopAllLoops();

    const { threadId, callerId, callerName } = incomingCall;

    await supabase
      .from("call_sessions")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", incomingCall.sessionId);

    // Insert declined system message
    if (threadId && user) {
      await insertCallSystemMessage(
        threadId,
        user.id,
        `Declined call from ${callerName}`
      );
    }

    setIncomingCall(null);
  }, [incomingCall, user]);

  const handleEndCall = useCallback(async () => {
    if (!activeSession) return;
    clearTimeout_();
    stopAllLoops();

    await supabase
      .from("call_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() } as any)
      .eq("id", activeSession);
    endCall();
  }, [activeSession, endCall]);

  // Wrap toggleMute/Deafen with sounds
  const handleToggleMute = useCallback(() => {
    playSound(isMuted ? "unmute" : "mute");
    toggleMute();
  }, [isMuted, toggleMute]);

  const handleToggleDeafen = useCallback(() => {
    playSound(isDeafened ? "undeafen" : "deafen");
    toggleDeafen();
  }, [isDeafened, toggleDeafen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllLoops();
      clearTimeout_();
    };
  }, []);

  return (
    <>
      {incomingCall && !activeSession && (
        <IncomingCallDialog
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
      {activeSession && callState !== "idle" && callState !== "ended" && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <VoiceCallUI
            callState={callState}
            isMuted={isMuted}
            isDeafened={isDeafened}
            callDuration={callDuration}
            otherName={otherName}
            otherAvatar={otherAvatar}
            onEndCall={handleEndCall}
            onToggleMute={handleToggleMute}
            onToggleDeafen={handleToggleDeafen}
            isScreenSharing={isScreenSharing}
            remoteScreenStream={remoteScreenStream}
            onStartScreenShare={(settings) => startScreenShare(settings)}
            onStopScreenShare={stopScreenShare}
            isCameraOn={isCameraOn}
            localCameraStream={localCameraStream}
            remoteCameraStream={remoteCameraStream}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
          />
        </div>
      )}
    </>
  );
};

export { CallListener };
export default CallListener;
