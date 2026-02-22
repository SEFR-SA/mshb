import React, { useEffect, useState, useRef, useCallback } from "react";
import { getEmojiClass } from "@/lib/emojiUtils";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2, X, Check, Upload, Pin, PinOff, UserRound, UserRoundX, Phone, PhoneOff, PhoneMissed } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import UserProfilePanel from "@/components/chat/UserProfilePanel";
import FileAttachmentButton from "@/components/chat/FileAttachmentButton";
import MessageFilePreview from "@/components/chat/MessageFilePreview";
import { Progress } from "@/components/ui/progress";
import { uploadChatFile } from "@/lib/uploadChatFile";
import VoiceCallUI from "@/components/chat/VoiceCallUI";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import EmojiPicker from "@/components/chat/EmojiPicker";
import GifPicker from "@/components/chat/GifPicker";
import StickerPicker from "@/components/chat/StickerPicker";
import ChatInputActions from "@/components/chat/ChatInputActions";
import { MessageSkeleton } from "@/components/skeletons/SkeletonLoaders";
import MessageContextMenu from "@/components/chat/MessageContextMenu";
import StyledDisplayName from "@/components/StyledDisplayName";
import ReplyPreview from "@/components/chat/ReplyPreview";
import ReplyInputBar from "@/components/chat/ReplyInputBar";
import MessageReactions from "@/components/chat/MessageReactions";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { startLoop, stopAllLoops, playSound } from "@/lib/soundManager";
type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

const PAGE_SIZE = 30;
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const Chat = () => {
  const { t } = useTranslation();
  const { threadId } = useParams<{ threadId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isOnline, getUserStatus } = usePresence();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [otherId, setOtherId] = useState<string>("");
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typingUser, setTypingUser] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [isCallerState, setIsCallerState] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  const callStartRef = useRef<number | null>(null);

  const handleCallEnded = useCallback(async () => {
    stopAllLoops();
    playSound("call_end");
    callStartRef.current = null;
    setCallSessionId(null);
    setIsCallerState(false);
  }, []);

  const { globalMuted, globalDeafened } = useAudioSettings();

  const { callState, isMuted, isDeafened, callDuration, isScreenSharing, remoteScreenStream, isCameraOn, localCameraStream, remoteCameraStream, startCall, endCall, toggleMute, toggleDeafen, startScreenShare, stopScreenShare, startCamera, stopCamera } = useWebRTC({
    sessionId: callSessionId,
    isCaller: isCallerState,
    onEnded: handleCallEnded,
    initialMuted: globalMuted,
    initialDeafened: globalDeafened,
  });

  // Track call start time for duration display
  useEffect(() => {
    if (callState === "connected" && !callStartRef.current) {
      callStartRef.current = Date.now();
      stopAllLoops();
    }
  }, [callState]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load thread info + pin status
  useEffect(() => {
    if (!threadId || !user) return;
    (async () => {
      const { data: thread } = await supabase
        .from("dm_threads")
        .select("*")
        .eq("id", threadId)
        .maybeSingle();
      if (!thread) { navigate("/"); return; }
      const oid = thread.user1_id === user.id ? thread.user2_id : thread.user1_id;
      setOtherId(oid);
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", oid).maybeSingle();
      setOtherProfile(prof);

      // Check pin status
      const { data: pin } = await supabase
        .from("pinned_chats")
        .select("id")
        .eq("user_id", user.id)
        .eq("thread_id", threadId)
        .maybeSingle();
      setIsPinned(!!pin);
    })();
  }, [threadId, user]);

  const togglePin = async () => {
    if (!threadId || !user) return;
    if (isPinned) {
      await supabase.from("pinned_chats").delete().eq("user_id", user.id).eq("thread_id", threadId);
      setIsPinned(false);
    } else {
      await supabase.from("pinned_chats").insert({ user_id: user.id, thread_id: threadId } as any);
      setIsPinned(true);
    }
  };

  const initiateCall = async () => {
    if (!threadId || !user || !otherId || callSessionId) return;
    const { data } = await supabase
      .from("call_sessions")
      .insert({ caller_id: user.id, callee_id: otherId, thread_id: threadId } as any)
      .select("id")
      .single();
    if (data) {
      setCallSessionId(data.id);
      setIsCallerState(true);
      // Start outgoing ring
      startLoop("outgoing_ring");
      startCall(data.id);
    }
  };

  // Auto-initiate call from ?call=true (from voice context menu)
  useEffect(() => {
    if (searchParams.get("call") === "true" && otherId && !callSessionId) {
      setSearchParams({}, { replace: true });
      initiateCall();
    }
  }, [otherId, searchParams]);

  const handleEndCall = async () => {
    stopAllLoops();
    if (callSessionId) {
      await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", callSessionId);
    }
    endCall();
  };

  // Wrapped toggles with sound feedback
  const handleToggleMute = useCallback(() => {
    playSound(isMuted ? "unmute" : "mute");
    toggleMute();
  }, [isMuted, toggleMute]);

  const handleToggleDeafen = useCallback(() => {
    playSound(isDeafened ? "undeafen" : "deafen");
    toggleDeafen();
  }, [isDeafened, toggleDeafen]);

  // Listen for callee declining/ending/missing the call via DB status
  useEffect(() => {
    if (!callSessionId) return;
    const channel = supabase
      .channel(`call-status-chat-${callSessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
        filter: `id=eq.${callSessionId}`,
      }, (payload) => {
        const status = (payload.new as any).status;
        if (status === "ended" || status === "declined" || status === "missed") {
          stopAllLoops();
          if (status !== "ended") playSound("call_end");
          endCall();
          setCallSessionId(null);
          setIsCallerState(false);
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [callSessionId, endCall, threadId, user, otherProfile]);

  // Load hidden message IDs
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("message_hidden")
        .select("message_id")
        .eq("user_id", user.id);
      setHiddenIds(new Set((data || []).map((h) => h.message_id)));
    })();
  }, [user]);

  // Load messages
  const loadMessages = useCallback(async (before?: string) => {
    if (!threadId) return;
    let query = supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (before) query = query.lt("created_at", before);

    const { data } = await query;
    if (!data) return;

    if (data.length < PAGE_SIZE) setHasMore(false);

    if (before) {
      setMessages((prev) => [...prev, ...data.reverse()].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    } else {
      setMessages(data.reverse());
      setMessagesLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [threadId]);

  useEffect(() => { setMessagesLoading(true); setHasMore(true); loadMessages(); }, [loadMessages]);

  // Mark thread as read on open
  useEffect(() => {
    if (!threadId || !user) return;
    supabase.from("thread_read_status").upsert(
      { user_id: user.id, thread_id: threadId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,thread_id" }
    ).then();
  }, [threadId, user]);

  // Realtime messages
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`chat-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (user && msg.author_id !== user.id) {
          supabase.from("thread_read_status").upsert(
            { user_id: user.id, thread_id: threadId, last_read_at: new Date().toISOString() },
            { onConflict: "user_id,thread_id" }
          ).then();
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [threadId]);

  // Typing indicator
  useEffect(() => {
    if (!threadId || !user) return;
    const channel = supabase.channel(`typing-${threadId}`);
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setTypingUser(true);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setTypingUser(false), 3000);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [threadId, user]);

  const broadcastTyping = () => {
    if (!threadId || !user) return;
    supabase.channel(`typing-${threadId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && !selectedFile) || !threadId || !user || sending) return;
    const content = newMsg.trim().slice(0, 5000);
    setSending(true);
    setNewMsg("");
    const file = selectedFile;
    setSelectedFile(null);

    try {
      let fileData: { file_url: string; file_name: string; file_type: string; file_size: number } | null = null;
      if (file) {
        setUploadProgress(0);
        const url = await uploadChatFile(user.id, file, (p) => setUploadProgress(p));
        fileData = { file_url: url, file_name: file.name, file_type: file.type, file_size: file.size };
        setUploadProgress(null);
      }
      const replyId = replyingTo?.id || null;
      setReplyingTo(null);
      await supabase.from("messages").insert({
        thread_id: threadId,
        author_id: user.id,
        content,
        ...(fileData || {}),
        ...(replyId ? { reply_to_id: replyId } : {}),
      } as any);
      await supabase.from("dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
    } catch {
      setUploadProgress(null);
      toast({ title: selectedFile ? t("files.uploadError") : t("common.error"), variant: "destructive" });
    }
    setSending(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: t("files.tooLarge"), variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const editMessage = async (msgId: string) => {
    if (!editContent.trim()) return;
    await supabase.from("messages").update({ content: editContent.trim().slice(0, 5000), edited_at: new Date().toISOString() }).eq("id", msgId);
    setEditingId(null);
    setEditContent("");
  };

  const deleteForEveryone = async (msgId: string) => {
    await supabase.from("messages").update({ deleted_for_everyone: true, content: "" }).eq("id", msgId);
  };

  const deleteForMe = async (msgId: string) => {
    if (!user) return;
    await supabase.from("message_hidden").insert({ user_id: user.id, message_id: msgId });
    setHiddenIds((prev) => new Set(prev).add(msgId));
  };

  const loadOlder = () => {
    if (messages.length > 0) loadMessages(messages[0].created_at);
  };

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));
  const { reactions, toggleReaction } = useMessageReactions(visibleMessages.map((m) => m.id));
  const otherStatus = getUserStatus(otherProfile);

  // Center chat panel content
  const chatPanel = (
    <div className="flex flex-col h-full min-w-0 flex-1 relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-10 w-10" />
            <span className="font-medium">{t("files.dropHere")}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="flex items-center gap-3 p-3 glass border-b border-border/50">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherProfile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {(otherProfile?.display_name || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <StatusBadge status={(otherStatus === "offline" ? "invisible" : otherStatus) as UserStatus} size="sm" className="absolute bottom-0 end-0" />
        </div>
        <div className="min-w-0 flex-1">
          <StyledDisplayName
            displayName={otherProfile?.display_name || otherProfile?.username || "User"}
            gradientStart={(otherProfile as any)?.name_gradient_start}
            gradientEnd={(otherProfile as any)?.name_gradient_end}
            className="font-medium truncate"
          />
          <p className="text-xs text-muted-foreground">
            {otherStatus !== "offline"
              ? t(`status.${otherStatus}`)
              : otherProfile?.last_seen
                ? t("presence.lastSeen", { time: formatDistanceToNow(new Date(otherProfile.last_seen)) })
                : t("presence.offline")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={initiateCall} disabled={!!callSessionId} title={t("chat.startCall")}>
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePin} title={isPinned ? t("chat.unpinChat") : t("chat.pinChat")}>
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowProfile(!showProfile)} title={showProfile ? t("chat.hideProfile") : t("chat.showProfile")}>
            {showProfile ? <UserRoundX className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Voice Call Bar */}
      <VoiceCallUI
        callState={callState}
        isMuted={isMuted}
        isDeafened={isDeafened}
        callDuration={callDuration}
        otherName={otherProfile?.display_name || otherProfile?.username || "User"}
        otherAvatar={otherProfile?.avatar_url || undefined}
        onEndCall={handleEndCall}
        onToggleMute={handleToggleMute}
        onToggleDeafen={handleToggleDeafen}
        isScreenSharing={isScreenSharing}
        remoteScreenStream={remoteScreenStream}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        isCameraOn={isCameraOn}
        localCameraStream={localCameraStream}
        remoteCameraStream={remoteCameraStream}
        onStartCamera={startCamera}
        onStopCamera={stopCamera}
      />

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {messagesLoading ? <MessageSkeleton count={6} /> : (
          <div className="animate-fade-in">
        {hasMore && (
          <div className="text-center mb-2">
            <Button variant="ghost" size="sm" onClick={loadOlder} className="text-xs text-muted-foreground">
              {t("chat.loadMore")}
            </Button>
          </div>
        )}
        {visibleMessages.map((msg, idx) => {
          const isMine = msg.author_id === user?.id;
          const isDeleted = msg.deleted_for_everyone;
          const msgAny = msg as any;
          const prev = idx > 0 ? visibleMessages[idx - 1] : null;
          const sameAuthor = prev && prev.author_id === msg.author_id;
          const timeDiff = prev ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
          const isGrouped = sameAuthor && timeDiff < 5 * 60 * 1000;

          // System call messages — rendered as centered pill
          const msgTyped = msg as any;
          const isCallNotification = msgTyped.type === 'call_notification'
            || (msgTyped.type === 'message' && (msg.content.startsWith("📞") || msg.content.startsWith("📵")));
          if (isCallNotification && !isDeleted) {
            const isMissed = msg.content.toLowerCase().includes("missed") || msg.content.startsWith("📵");
            const isEnded = msg.content.toLowerCase().includes("ended") || msg.content.startsWith("📞");
            const pillIcon = isMissed
              ? <PhoneMissed className="h-3 w-3 text-destructive shrink-0" />
              : isEnded
              ? <Phone className="h-3 w-3 text-primary shrink-0" />
              : <PhoneOff className="h-3 w-3 text-muted-foreground shrink-0" />;

            // Strip leading emoji for cleaner display if present
            const displayContent = msg.content.replace(/^[📞📵]\s*/, "").trim();

            return (
              <div key={msg.id} className="flex justify-center w-full my-4">
                <div className="flex items-center gap-2 bg-muted/40 rounded-full px-3 py-1 text-xs text-muted-foreground border border-border/20">
                  {pillIcon}
                  <span>{displayContent}</span>
                </div>
              </div>
            );
          }

          return (
            <MessageContextMenu
              key={msg.id}
              content={msg.content}
              messageId={msg.id}
              authorName={isMine ? (user?.email?.split("@")[0] || "You") : (otherProfile?.display_name || otherProfile?.username || "User")}
              isMine={isMine}
              isDeleted={!!isDeleted}
              onReply={(id, authorName, content) => setReplyingTo({ id, authorName, content })}
              onEdit={(id, content) => { setEditingId(id); setEditContent(content); }}
              onDeleteForMe={deleteForMe}
              onDeleteForEveryone={isMine ? deleteForEveryone : undefined}
              onMarkUnread={(id) => {
                const msg = visibleMessages.find(m => m.id === id);
                if (msg && user && threadId) {
                  const before = new Date(new Date(msg.created_at).getTime() - 1000).toISOString();
                  supabase.from("thread_read_status").upsert(
                    { user_id: user.id, thread_id: threadId, last_read_at: before },
                    { onConflict: "user_id,thread_id" }
                  ).then();
                }
              }}
            >
            <div id={`msg-${msg.id}`} className={`flex ${isMine ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : idx === 0 ? "" : "mt-3"} group/msg hover:bg-muted/30 rounded-lg -mx-2 px-2 py-0.5 transition-colors ${highlightedMsgId === msg.id ? "animate-pulse bg-primary/10 rounded-lg" : ""}`}>
              <div className="max-w-[75%]">
                {msgAny.reply_to_id && (() => {
                  const original = visibleMessages.find(m => m.id === msgAny.reply_to_id);
                  const origName = original ? (original.author_id === user?.id ? "You" : (otherProfile?.display_name || otherProfile?.username || "User")) : "…";
                  const origAvatarUrl = original ? (original.author_id === user?.id ? "" : (otherProfile?.avatar_url || "")) : "";
                  return (
                    <ReplyPreview
                      authorName={origName}
                      content={original?.content || "…"}
                      avatarUrl={origAvatarUrl}
                      onClick={() => {
                        const el = document.getElementById(`msg-${msgAny.reply_to_id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          setHighlightedMsgId(msgAny.reply_to_id);
                          setTimeout(() => setHighlightedMsgId(null), 2000);
                        }
                      }}
                    />
                  );
                })()}
              <div className={`group relative rounded-2xl px-4 py-2 ${
                isDeleted
                  ? "bg-muted/50 italic text-muted-foreground"
                  : isMine
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/50"
              }`}>
                {editingId === msg.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && editMessage(msg.id)}
                      className="h-8 text-sm bg-background text-foreground"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editMessage(msg.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {!isDeleted && msgAny.file_url && (msgAny.file_type === "gif" || msgAny.file_type === "sticker") ? (
                      <div className="mb-1">
                        <img src={msgAny.file_url} alt={msgAny.file_type === "gif" ? "GIF" : "Sticker"} className="max-w-[240px] max-h-[200px] rounded-lg object-contain" loading="lazy" />
                      </div>
                    ) : !isDeleted && msgAny.file_url ? (
                      <div className="mb-1">
                        <MessageFilePreview
                          fileUrl={msgAny.file_url}
                          fileName={msgAny.file_name || "file"}
                          fileType={msgAny.file_type || ""}
                          fileSize={msgAny.file_size || 0}
                          isMine={isMine}
                        />
                      </div>
                    ) : null}
                    <p className={`whitespace-pre-wrap break-words ${!isDeleted && getEmojiClass(msg.content) ? getEmojiClass(msg.content) : 'text-sm'}`}>
                      {isDeleted ? t("chat.deleted") : msg.content}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      {msg.edited_at && !isDeleted && <span>· {t("chat.edited")}</span>}
                    </div>
                  </>
                )}

                {!editingId && (
                  <div className="absolute top-1 end-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className={`h-6 w-6 ${isMine ? "text-primary-foreground/60 hover:text-primary-foreground" : ""}`}>
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isMine && !isDeleted && (
                          <DropdownMenuItem onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }}>
                            <Pencil className="h-4 w-4 me-2" /> {t("actions.edit")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteForMe(msg.id)}>
                          <Trash2 className="h-4 w-4 me-2" /> {t("actions.deleteForMe")}
                        </DropdownMenuItem>
                        {isMine && !isDeleted && (
                          <DropdownMenuItem onClick={() => deleteForEveryone(msg.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 me-2" /> {t("actions.deleteForEveryone")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              {!isDeleted && (
                <MessageReactions
                  messageId={msg.id}
                  reactions={reactions.get(msg.id) || []}
                  currentUserId={user?.id || ""}
                  onToggle={(mid, emoji) => user && toggleReaction(mid, emoji, user.id)}
                  isMine={isMine}
                />
              )}
              </div>
            </div>
            </MessageContextMenu>
          );
        })}
        {typingUser && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground italic">
              {otherProfile?.display_name || "User"} {t("chat.typing")}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="px-3 pt-2 space-y-1">
          <p className="text-xs text-muted-foreground">{t("files.uploading")}</p>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* File preview strip */}
      {selectedFile && uploadProgress === null && (
        <div className="px-3 pt-2 flex items-center gap-2">
          <div className="flex-1 text-sm truncate text-muted-foreground">
            📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Reply bar */}
      {replyingTo && (
        <div className="px-3 pt-2">
          <ReplyInputBar authorName={replyingTo.authorName} onCancel={() => setReplyingTo(null)} />
        </div>
      )}

      {/* Composer */}
      <div className="p-3 glass border-t border-border/50">
        <div className="flex items-center gap-2">
          <ChatInputActions
            onFileSelect={setSelectedFile}
            onEmojiSelect={(emoji) => setNewMsg((prev) => prev + emoji)}
            onGifSelect={async (url) => {
              if (!threadId || !user) return;
              await supabase.from("messages").insert({ thread_id: threadId, author_id: user.id, content: "", file_url: url, file_type: "gif", file_name: "gif" } as any);
              await supabase.from("dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
            }}
            onStickerSelect={async (url) => {
              if (!threadId || !user) return;
              await supabase.from("messages").insert({ thread_id: threadId, author_id: user.id, content: "", file_url: url, file_type: "sticker", file_name: "sticker" } as any);
              await supabase.from("dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
            }}
            disabled={sending}
          />
          <Input
            value={newMsg}
            onChange={(e) => { setNewMsg(e.target.value); broadcastTyping(); }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={t("chat.placeholder")}
            className="flex-1"
            maxLength={5000}
          />
          <Button size="icon" onClick={sendMessage} disabled={(!newMsg.trim() && !selectedFile) || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {chatPanel}
      {!isMobile && showProfile && <UserProfilePanel profile={otherProfile} statusLabel={otherStatus} />}
    </div>
  );
};

export default Chat;
