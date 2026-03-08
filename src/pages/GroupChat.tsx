import React, { useEffect, useState, useRef, useCallback } from "react";
import { getEmojiClass } from "@/lib/emojiUtils";
import { renderLinkedText } from "@/lib/renderLinkedText";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useForwardMessage } from "@/contexts/ForwardMessageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2, X, Check, Settings2, Users, Upload, Pin, PinOff, UserRound, UserRoundX, Forward, Loader2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import GroupSettingsDialog from "@/components/GroupSettingsDialog";
import GroupMembersPanel from "@/components/chat/GroupMembersPanel";
import FileAttachmentButton from "@/components/chat/FileAttachmentButton";
import MessageFilePreview from "@/components/chat/MessageFilePreview";
import { Progress } from "@/components/ui/progress";
import { uploadChatFile } from "@/lib/uploadChatFile";
import type { Tables } from "@/integrations/supabase/types";
import EmojiPicker from "@/components/chat/EmojiPicker";
import GifPicker from "@/components/chat/GifPicker";
import StickerPicker from "@/components/chat/StickerPicker";
import ChatInputActions from "@/components/chat/ChatInputActions";
import { MessageSkeleton } from "@/components/skeletons/SkeletonLoaders";
import MessageContextMenu from "@/components/chat/MessageContextMenu";
import UserContextMenu from "@/components/chat/UserContextMenu";
import ReplyPreview from "@/components/chat/ReplyPreview";
import ReplyInputBar from "@/components/chat/ReplyInputBar";
import MessageReactions from "@/components/chat/MessageReactions";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import ServerInviteCard from "@/components/chat/ServerInviteCard";
import { detectInviteInMessage } from "@/lib/inviteUtils";
import AutoResizeTextarea from "@/components/chat/AutoResizeTextarea";
import StyledDisplayName from "@/components/StyledDisplayName";
import { useTogglePinMessage } from "@/hooks/useTogglePinMessage";
import PinnedMessagesDrawer from "@/components/chat/PinnedMessagesDrawer";
import { useInfiniteMessages } from "@/hooks/useInfiniteMessages";
import { useMessageKeybinds } from "@/hooks/useMessageKeybinds";

type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

const MAX_FILE_SIZE = 200 * 1024 * 1024;

const GroupChat = () => {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [memberRoles, setMemberRoles] = useState<Map<string, string>>(new Map());
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  // Infinite scrolling messages
  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
    scrollRef,
    appendRealtimeMessage,
    updateRealtimeMessage,
    showScrollToBottom,
    scrollToBottom,
  } = useInfiniteMessages({ groupThreadId: groupId });

  // Intersection observer for loading older messages
  const topSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Load group info + pin status
  useEffect(() => {
    if (!groupId || !user) return;
    (async () => {
      const { data: group } = await supabase
        .from("group_threads")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();
      if (!group) { navigate("/"); return; }
      setGroupName((group as any).name);
      setGroupAvatarUrl((group as any).avatar_url || "");

      const { data: members } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);
      setMemberCount(members?.length || 0);
      const myMembership = members?.find((m: any) => m.user_id === user.id);
      setIsAdmin((myMembership as any)?.role === "admin");

      const rolesMap = new Map<string, string>();
      members?.forEach((m: any) => rolesMap.set(m.user_id, m.role));
      setMemberRoles(rolesMap);

      const userIds = members?.map((m: any) => m.user_id) || [];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("*, active_server_tag:servers!profiles_active_server_tag_id_fkey(server_tag_name, server_tag_badge, server_tag_color, server_tag_container_color)").in("user_id", userIds);
        const map = new Map<string, any>();
        profs?.forEach((p) => map.set(p.user_id, p));
        setProfiles(map);
      }

      // Check pin status
      const { data: pin } = await supabase
        .from("pinned_chats")
        .select("id")
        .eq("user_id", user.id)
        .eq("group_thread_id", groupId)
        .maybeSingle();
      setIsPinned(!!pin);
    })();
  }, [groupId, user]);

  const togglePin = async () => {
    if (!groupId || !user) return;
    if (isPinned) {
      await supabase.from("pinned_chats").delete().eq("user_id", user.id).eq("group_thread_id", groupId);
      setIsPinned(false);
    } else {
      await supabase.from("pinned_chats").insert({ user_id: user.id, group_thread_id: groupId } as any);
      setIsPinned(true);
    }
  };

  // Load hidden
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("message_hidden").select("message_id").eq("user_id", user.id);
      setHiddenIds(new Set((data || []).map((h) => h.message_id)));
    })();
  }, [user]);

  // Mark as read
  useEffect(() => {
    if (!groupId || !user) return;
    supabase.from("thread_read_status").upsert(
      { user_id: user.id, group_thread_id: groupId, last_read_at: new Date().toISOString() } as any,
      { onConflict: "user_id,thread_id" }
    ).then();
  }, [groupId, user]);

  // Realtime — messages + group info + members
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_thread_id=eq.${groupId}` }, (payload) => {
        const msg = payload.new as Message;
        appendRealtimeMessage(msg);
        if (user && msg.author_id !== user.id) {
          supabase.from("thread_read_status").upsert(
            { user_id: user.id, group_thread_id: groupId, last_read_at: new Date().toISOString() } as any,
            { onConflict: "user_id,thread_id" }
          ).then();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `group_thread_id=eq.${groupId}` }, (payload) => {
        updateRealtimeMessage(payload.new as Message);
      })
      // Realtime: group info changes (name, avatar, etc.)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_threads", filter: `id=eq.${groupId}` }, (payload) => {
        const updated = payload.new as any;
        setGroupName(updated.name || groupName);
        setGroupAvatarUrl(updated.avatar_url || "");
      })
      // Realtime: members joining/leaving
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, async () => {
        const { data: members } = await supabase.from("group_members").select("*").eq("group_id", groupId);
        setMemberCount(members?.length || 0);
        const myMembership = members?.find((m: any) => m.user_id === user?.id);
        setIsAdmin((myMembership as any)?.role === "admin");
        const rolesMap = new Map<string, string>();
        members?.forEach((m: any) => rolesMap.set(m.user_id, m.role));
        setMemberRoles(rolesMap);
        // Refresh profiles for any new members
        const userIds = members?.map((m: any) => m.user_id) || [];
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("*, active_server_tag:servers!profiles_active_server_tag_id_fkey(server_tag_name, server_tag_badge, server_tag_color, server_tag_container_color)").in("user_id", userIds);
          const map = new Map<string, any>();
          profs?.forEach((p) => map.set(p.user_id, p));
          setProfiles(map);
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [groupId, appendRealtimeMessage, updateRealtimeMessage]);

  // Typing indicator
  useEffect(() => {
    if (!groupId || !user) return;
    const channel = supabase.channel(`typing-group-${groupId}`);
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const uid = payload.payload?.userId;
        if (uid && uid !== user.id) {
          setTypingUsers((prev) => new Set(prev).add(uid));
          const existing = typingTimeouts.current.get(uid);
          if (existing) clearTimeout(existing);
          typingTimeouts.current.set(uid, setTimeout(() => {
            setTypingUsers((prev) => { const next = new Set(prev); next.delete(uid); return next; });
          }, 3000));
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [groupId, user]);

  const broadcastTyping = () => {
    if (!groupId || !user) return;
    supabase.channel(`typing-group-${groupId}`).send({
      type: "broadcast", event: "typing", payload: { userId: user.id },
    });
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && !selectedFile) || !groupId || !user || sending) return;
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

      if (!file && content) {
        const invite = await detectInviteInMessage(content);
        if (invite.isInvite) {
          await supabase.from("messages").insert({
            group_thread_id: groupId,
            author_id: user.id,
            content: "",
            type: "server_invite",
            metadata: invite.metadata as any,
            ...(replyId ? { reply_to_id: replyId } : {}),
          } as any);
          await supabase.from("group_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", groupId);
          setSending(false);
          return;
        }
      }

      await supabase.from("messages").insert({
        group_thread_id: groupId,
        author_id: user.id,
        content,
        ...(fileData || {}),
        ...(replyId ? { reply_to_id: replyId } : {}),
      } as any);
      await supabase.from("group_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", groupId);
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

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));
  const { reactions, toggleReaction } = useMessageReactions(visibleMessages.map((m) => m.id));
  const { togglePin: toggleMessagePin } = useTogglePinMessage();
  const { openForwardModal } = useForwardMessage();

  const handleToggleMessagePin = async (msgId: string) => {
    const newVal = await toggleMessagePin(msgId);
    if (newVal !== null) {
      updateRealtimeMessage({ ...messages.find(m => m.id === msgId), is_pinned: newVal });
    }
  };

  useMessageKeybinds({
    hoveredMessageId: hoveredMsgId,
    messages: visibleMessages,
    currentUserId: user?.id,
    onEdit: (id, content) => { setEditingId(id); setEditContent(content); },
    onDeleteForMe: deleteForMe,
    onDeleteForEveryone: deleteForEveryone,
    onTogglePin: handleToggleMessagePin,
    onAddReaction: (id) => setReactionPickerMsgId(id),
    onForward: (id) => {
      const m = visibleMessages.find(v => v.id === id);
      if (m) openForwardModal({ content: m.content, fileUrl: (m as any).file_url, fileName: (m as any).file_name, fileType: (m as any).file_type, fileSize: (m as any).file_size });
    },
    onMarkUnread: (id) => {
      const msg = visibleMessages.find(m => m.id === id);
      if (msg && user && groupId) {
        const before = new Date(new Date(msg.created_at).getTime() - 1000).toISOString();
        supabase.from("thread_read_status").upsert(
          { user_id: user.id, group_thread_id: groupId, last_read_at: before } as any,
          { onConflict: "user_id,thread_id" }
        ).then();
      }
    },
  });

  const typingNames = Array.from(typingUsers)
    .map((uid) => profiles.get(uid)?.display_name || profiles.get(uid)?.username || "Someone")
    .join(", ");

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
        <Avatar className="h-9 w-9">
          <AvatarImage src={groupAvatarUrl} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {groupName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{groupName}</p>
          <p className="text-xs text-muted-foreground">
            <Users className="h-3 w-3 inline me-1" />
            {t("groups.memberCount", { count: memberCount })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <PinnedMessagesDrawer groupThreadId={groupId} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePin} title={isPinned ? t("chat.unpinChat") : t("chat.pinChat")}>
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMembers(!showMembers)} title={showMembers ? t("chat.hideProfile") : t("chat.showProfile")}>
            {showMembers ? <UserRoundX className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4">
        {messagesLoading ? <MessageSkeleton count={6} /> : (
          <div className="animate-fade-in">
            {/* Top sentinel for infinite scroll */}
            <div ref={topSentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {visibleMessages.map((msg, idx) => {
              const isMine = msg.author_id === user?.id;
              const isDeleted = msg.deleted_for_everyone;
              const authorProfile = profiles.get(msg.author_id);
              const msgAny = msg as any;
              const prev = idx > 0 ? visibleMessages[idx - 1] : null;
              const sameAuthor = prev && prev.author_id === msg.author_id;
              const timeDiff = prev ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
              const isGrouped = sameAuthor && timeDiff < 5 * 60 * 1000;

              // Server invite card
              if (msgAny.type === 'server_invite' && !isDeleted && msgAny.metadata) {
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : idx === 0 ? "" : "mt-3"}`}>
                    <ServerInviteCard metadata={msgAny.metadata} isMine={isMine} />
                  </div>
                );
              }

              return (
                <MessageContextMenu
                  key={msg.id}
                  content={msg.content}
                  messageId={msg.id}
                  authorName={authorProfile?.display_name || authorProfile?.username || "User"}
                  isMine={isMine}
                  isDeleted={!!isDeleted}
                  isPinned={!!(msg as any).is_pinned}
                  fileUrl={msgAny.file_url}
                  fileName={msgAny.file_name}
                  fileType={msgAny.file_type}
                  fileSize={msgAny.file_size}
                  onReply={(id, authorName, content) => setReplyingTo({ id, authorName, content })}
                  onEdit={(id, content) => { setEditingId(id); setEditContent(content); }}
                  onDeleteForMe={deleteForMe}
                  onDeleteForEveryone={isMine ? deleteForEveryone : undefined}
                  onTogglePin={handleToggleMessagePin}
                  onAddReaction={(id) => setReactionPickerMsgId(id)}
                  onForward={(id) => {
                    const m = visibleMessages.find(v => v.id === id);
                    if (m) openForwardModal({ content: m.content, fileUrl: (m as any).file_url, fileName: (m as any).file_name, fileType: (m as any).file_type, fileSize: (m as any).file_size });
                  }}
                  onMarkUnread={(id) => {
                    const msg = visibleMessages.find(m => m.id === id);
                    if (msg && user && groupId) {
                      const before = new Date(new Date(msg.created_at).getTime() - 1000).toISOString();
                      supabase.from("thread_read_status").upsert(
                        { user_id: user.id, group_thread_id: groupId, last_read_at: before } as any,
                        { onConflict: "user_id,thread_id" }
                      ).then();
                    }
                  }}
                >
                  <div id={`msg-${msg.id}`} onMouseEnter={() => setHoveredMsgId(msg.id)} onMouseLeave={() => setHoveredMsgId(null)} className={`flex ${isMine ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : idx === 0 ? "" : "mt-3"} group/msg hover:bg-muted/30 rounded-lg -mx-2 px-2 py-1 transition-colors ${highlightedMsgId === msg.id ? "animate-pulse bg-primary/10 rounded-lg" : ""}`}>
                    <div className="flex gap-2 max-w-[75%] flex-col">
                      {msgAny.reply_to_id && (() => {
                        const original = visibleMessages.find(m => m.id === msgAny.reply_to_id);
                        const origProfile = original ? profiles.get(original.author_id) : null;
                        const origName = origProfile?.display_name || origProfile?.username || "…";
                        const origAvatarUrl = origProfile?.avatar_url || "";
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
                      <div className="flex gap-2.5">
                        {!isMine && (
                          <UserContextMenu targetUserId={msg.author_id} targetUsername={authorProfile?.username || undefined}>
                            <Avatar className="h-8 w-8 mt-1 shrink-0 cursor-pointer">
                              <AvatarImage src={authorProfile?.avatar_url || ""} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                {(authorProfile?.display_name || "?").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </UserContextMenu>
                        )}
                        <div className={`group relative rounded-2xl px-4 py-2 ${isDeleted ? "bg-muted/50 italic text-muted-foreground"
                          : isMine ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border/50"
                          }`}>
                          {/* Forwarded indicator */}
                          {!isDeleted && (msg as any).is_forwarded && (
                            <div className={`flex items-center gap-1 text-[10px] mb-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              <Forward className="h-3 w-3" />
                              <span className="italic">{t("actions.forwarded")}</span>
                            </div>
                          )}
                          {!isMine && !isDeleted && (
                            <UserContextMenu targetUserId={msg.author_id} targetUsername={authorProfile?.username || undefined}>
                              <StyledDisplayName
                                displayName={authorProfile?.display_name || authorProfile?.username || "User"}
                                fontStyle={(authorProfile as any)?.name_font}
                                effect={(authorProfile as any)?.name_effect}
                                gradientStart={(authorProfile as any)?.name_gradient_start}
                                gradientEnd={(authorProfile as any)?.name_gradient_end}
                                className="text-[11px] font-bold text-primary mb-0.5 cursor-pointer hover:underline"
                                serverTag={(authorProfile as any)?.active_server_tag ? {
                                  name: (authorProfile as any).active_server_tag.server_tag_name,
                                  badge: (authorProfile as any).active_server_tag.server_tag_badge,
                                  color: (authorProfile as any).active_server_tag.server_tag_container_color ?? (authorProfile as any).active_server_tag.server_tag_color,
                                  badgeColor: (authorProfile as any).active_server_tag.server_tag_color,
                                } : null}
                              />
                            </UserContextMenu>
                          )}
                          {editingId === msg.id ? (
                            <div className="flex items-center gap-2">
                              <Input value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && editMessage(msg.id)}
                                className="h-8 text-sm bg-background text-foreground" autoFocus />
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
                                {isDeleted ? t("chat.deleted") : renderLinkedText(msg.content)}
                              </p>
                              <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {(msg as any).is_pinned && <Pin className="h-3 w-3" />}
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
                      </div>
                      {!isDeleted && (
                        <MessageReactions
                          messageId={msg.id}
                          reactions={reactions.get(msg.id) || []}
                          currentUserId={user?.id || ""}
                          onToggle={(mid, emoji) => user && toggleReaction(mid, emoji, user.id)}
                          isMine={isMine}
                          forceOpen={reactionPickerMsgId === msg.id}
                          onForceOpenHandled={() => setReactionPickerMsgId(null)}
                        />
                      )}
                    </div>
                  </div>
                </MessageContextMenu>
              );
            })}
            {typingNames && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground italic">
                  {typingNames} {t("chat.typing")}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {showScrollToBottom && (
        <button onClick={scrollToBottom} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-opacity animate-fade-in">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
      </div>

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
      <div className="px-4 pb-4 pt-2 bg-transparent shrink-0">
        <div className="theme-input border border-border/40 rounded-xl flex items-start gap-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <ChatInputActions
            onFileSelect={setSelectedFile}
            onEmojiSelect={(emoji) => setNewMsg((prev) => prev + emoji)}
            onGifSelect={async (url) => {
              if (!groupId || !user) return;
              await supabase.from("messages").insert({ group_thread_id: groupId, author_id: user.id, content: "", file_url: url, file_type: "gif", file_name: "gif" } as any);
              await supabase.from("group_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", groupId);
            }}
            onStickerSelect={async (url) => {
              if (!groupId || !user) return;
              await supabase.from("messages").insert({ group_thread_id: groupId, author_id: user.id, content: "", file_url: url, file_type: "sticker", file_name: "sticker" } as any);
              await supabase.from("group_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", groupId);
            }}
            disabled={sending}
          />
          <AutoResizeTextarea
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

      <GroupSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        groupId={groupId || ""}
        isAdmin={isAdmin}
        onLeave={() => navigate("/")}
      />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {chatPanel}
      {!isMobile && showMembers && (
        <GroupMembersPanel
          profiles={profiles}
          memberRoles={memberRoles}
          groupName={groupName}
          memberCount={memberCount}
          groupAvatarUrl={groupAvatarUrl}
        />
      )}
    </div>
  );
};

export default GroupChat;
