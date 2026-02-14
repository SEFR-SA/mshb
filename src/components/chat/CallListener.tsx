import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import IncomingCallDialog from "./IncomingCallDialog";
import VoiceCallUI from "./VoiceCallUI";

interface IncomingCall {
  sessionId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  threadId: string;
}

const CallListener = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isCaller, setIsCaller] = useState(false);
  const [otherName, setOtherName] = useState("");

  const handleCallEnded = useCallback(() => {
    setActiveSession(null);
    setIncomingCall(null);
    setIsCaller(false);
    setOtherName("");
  }, []);

  const { callState, isMuted, callDuration, startCall, answerCall, endCall, toggleMute } = useWebRTC({
    sessionId: activeSession,
    isCaller,
    onEnded: handleCallEnded,
  });

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("call-listener")
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

          setIncomingCall({
            sessionId: session.id,
            callerId: session.caller_id,
            callerName: profile?.display_name || profile?.username || "User",
            callerAvatar: profile?.avatar_url || undefined,
            threadId: session.thread_id,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, activeSession]);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    setActiveSession(incomingCall.sessionId);
    setIsCaller(false);
    setOtherName(incomingCall.callerName);

    await supabase
      .from("call_sessions")
      .update({ status: "connected", started_at: new Date().toISOString() } as any)
      .eq("id", incomingCall.sessionId);

    setIncomingCall(null);
    // Pass session ID directly to bypass stale closure
    answerCall(incomingCall.sessionId);
  }, [incomingCall, answerCall]);

  const handleDecline = useCallback(async () => {
    if (!incomingCall) return;
    await supabase
      .from("call_sessions")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", incomingCall.sessionId);
    setIncomingCall(null);
  }, [incomingCall]);

  const handleEndCall = useCallback(async () => {
    if (!activeSession) return;
    await supabase
      .from("call_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() } as any)
      .eq("id", activeSession);
    endCall();
  }, [activeSession, endCall]);

  // Listen for the other side ending/declining the call via DB status
  useEffect(() => {
    if (!activeSession) return;
    const channel = supabase
      .channel(`call-status-${activeSession}`)
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
  }, [activeSession, endCall]);

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
            callDuration={callDuration}
            otherName={otherName}
            onEndCall={handleEndCall}
            onToggleMute={toggleMute}
          />
        </div>
      )}
    </>
  );
};

export { CallListener };
export default CallListener;
