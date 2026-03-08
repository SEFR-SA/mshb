import React, { useEffect, useState, useRef, useCallback } from "react";
import { MessageSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { getEmojiClass } from "@/lib/emojiUtils";
import { formatTime } from "@/lib/utils";
import { renderLinkedText } from "@/lib/renderLinkedText";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useForwardMessage } from "@/contexts/ForwardMessageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Hash, Upload, Lock, Megaphone, Pin, Forward, Loader2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownToolbar from "@/components/chat/MarkdownToolbar";
import { toast } from "@/hooks/use-toast";
import { uploadChatFile } from "@/lib/uploadChatFile";
import FileAttachmentButton from "@/components/chat/FileAttachmentButton";
import MessageFilePreview from "@/components/chat/MessageFilePreview";
import { Progress } from "@/components/ui/progress";
import MentionPopup from "./MentionPopup";
import EmojiPicker from "@/components/chat/EmojiPicker";
import GifPicker from "@/components/chat/GifPicker";
import StickerPicker from "@/components/chat/StickerPicker";
import ChatInputActions from "@/components/chat/ChatInputActions";
import MessageContextMenu from "@/components/chat/MessageContextMenu";
import UserContextMenu from "@/components/chat/UserContextMenu";
import StyledDisplayName from "@/components/StyledDisplayName";
import ReplyPreview from "@/components/chat/ReplyPreview";
import ReplyInputBar from "@/components/chat/ReplyInputBar";
import MessageReactions from "@/components/chat/MessageReactions";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import ServerInviteCard from "@/components/chat/ServerInviteCard";
import { detectInviteInMessage } from "@/lib/inviteUtils";
import AutoResizeTextarea from "@/components/chat/AutoResizeTextarea";
import { useTogglePinMessage } from "@/hooks/useTogglePinMessage";
import PinnedMessagesDrawer from "@/components/chat/PinnedMessagesDrawer";
import { useInfiniteMessages } from "@/hooks/useInfiniteMessages";
import { useMessageKeybinds } from "@/hooks/useMessageKeybinds";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
// Stable empty array reference — avoids creating new [] on every render for reactions-free messages
const EMPTY_REACTIONS: any[] = [];

interface Props {
  channelId: string;
  channelName: string;
  isPrivate?: boolean;
  hasAccess?: boolean;
  serverId?: string;
  isAnnouncement?: boolean;
}

const renderMessageContent = (
  content: string,
  profiles: Map<string, any>,
  currentUserId?: string,
  serverEmojis?: Array<{ name: string; url: string }>
) => {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part === "@all") {
      return <span key={i} className="bg-yellow-500/20 text-yellow-400 px-1 rounded font-medium">@all</span>;
    }
    if (part.startsWith("@")) {
      const username = part.slice(1);
      const matched = [...profiles.values()].find((p: any) => p.username === username);
      if (matched) {
        const isMe = matched.user_id === currentUserId;
        return (
          <span key={i} className={`px-1 rounded font-medium ${isMe ? "bg-primary/30 text-primary" : "bg-primary/20 text-primary"}`}>
            {part}
          </span>
        );
      }
    }
    return <React.Fragment key={i}>{renderLinkedText(part, serverEmojis)}</React.Fragment>;
  });
};

// ─── MessageItem ────────────────────────────────────────────────────────────
interface MessageItemProps {
  msg: any;
  prevMsg: any | null;
  replyToMsg: any | null;
  profiles: Map<string, any>;
  roleInfo: { color: string; iconUrl: string | null } | null;
  currentUserId: string | undefined;
  serverEmojis: Array<{ name: string; url: string }>;
  serverId: string | undefined;
  channelId: string;
  isAnnouncement: boolean | undefined;
  isFirstMessage: boolean;
  isHighlighted: boolean;
  reactions: any[];
  user: any;
  onReply: (id: string, authorName: string, content: string) => void;
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: ((id: string) => void) | undefined;
  onMarkUnread: (id: string, createdAt: string) => void;
  onTogglePin: (id: string) => void;
  onHighlight: React.Dispatch<React.SetStateAction<string | null>>;
  toggleReaction: (mid: string, emoji: string, uid: string) => void;
  onAddReaction: (id: string) => void;
  onForward: (id: string) => void;
  reactionPickerMsgId: string | null;
  onReactionPickerHandled: () => void;
}

const MessageItem = React.memo(({
  msg, prevMsg, replyToMsg, profiles, roleInfo,
  currentUserId, serverEmojis, serverId, channelId, isAnnouncement,
  isFirstMessage, isHighlighted, reactions, user,
  onReply, onDeleteForMe, onDeleteForEveryone, onMarkUnread, onTogglePin, onHighlight,
  toggleReaction, onAddReaction, onForward, reactionPickerMsgId, onReactionPickerHandled,
}: MessageItemProps) => {
  const { t } = useTranslation();
  const p = profiles.get(msg.author_id);
  const name = p?.display_name || p?.username || "User";
  const isMine = msg.author_id === currentUserId;
  const sameAuthor = !!(prevMsg && prevMsg.author_id === msg.author_id);
  const timeDiff = prevMsg ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() : Infinity;
  const isGrouped = sameAuthor && timeDiff < 5 * 60 * 1000;
  const msgAny = msg as any;

  // Welcome (join) message
  if (msgAny.type === "welcome") {
    return (
      <div className="flex items-center gap-3 py-2 px-1 text-sm text-muted-foreground select-none">
        <div className="flex-1 border-t border-border" />
        <span className="shrink-0 inline-flex items-center gap-1">
          👋 <StyledDisplayName
            displayName={p?.display_name || p?.username || t("common.someone")}
            fontStyle={(p as any)?.name_font}
            effect={(p as any)?.name_effect}
            gradientStart={(p as any)?.name_gradient_start}
            gradientEnd={(p as any)?.name_gradient_end}
            className="font-bold"
          />{" "}
          {t("servers.joinedServer")}
        </span>
        <div className="flex-1 border-t border-border" />
      </div>
    );
  }

  // Server invite card
  if (msgAny.type === "server_invite" && msgAny.metadata) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : isFirstMessage ? "" : "mt-3"}`}>
        <ServerInviteCard metadata={msgAny.metadata} isMine={isMine} />
      </div>
    );
  }

  const replyAuthorProfile = replyToMsg ? profiles.get(replyToMsg.author_id) : null;
  const replyName = replyAuthorProfile?.display_name || replyAuthorProfile?.username || "…";
  const replyAvatarUrl = replyAuthorProfile?.avatar_url || "";

  return (
    <MessageContextMenu
      content={msg.content}
      messageId={msg.id}
      authorName={name}
      isMine={isMine}
      isDeleted={false}
      isPinned={!!msg.is_pinned}
      fileUrl={msg.file_url}
      fileName={msg.file_name}
      fileType={msg.file_type}
      fileSize={msg.file_size}
      onReply={(id, authorName, content) => onReply(id, authorName, content)}
      onDeleteForMe={(id) => onDeleteForMe(id)}
      onDeleteForEveryone={onDeleteForEveryone}
      onTogglePin={onTogglePin}
      onMarkUnread={(id) => onMarkUnread(id, msg.created_at)}
      onAddReaction={onAddReaction}
      onForward={onForward}
    >
      <div
        id={`msg-${msg.id}`}
        className={`hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 transition-colors group ${isGrouped ? "mt-0.5" : isFirstMessage ? "" : "mt-3"} ${isHighlighted ? "animate-pulse bg-primary/10 rounded-lg" : ""}`}
      >
        {msgAny.reply_to_id && replyToMsg && (
          <div className="ms-5">
            <ReplyPreview
              authorName={replyName}
              content={replyToMsg.content || "…"}
              avatarUrl={replyAvatarUrl}
              onClick={() => {
                const el = document.getElementById(`msg-${msgAny.reply_to_id}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  onHighlight(msgAny.reply_to_id);
                  setTimeout(() => onHighlight(null), 2000);
                }
              }}
            />
          </div>
        )}
        <div className="flex gap-3">
          <UserContextMenu targetUserId={msg.author_id} targetUsername={p?.username || undefined}>
            <Avatar className="h-9 w-9 mt-0.5 shrink-0 cursor-pointer">
              <AvatarImage src={p?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </UserContextMenu>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <UserContextMenu targetUserId={msg.author_id} targetUsername={p?.username || undefined}>
                <span className="inline-flex items-center">
                  <StyledDisplayName
                    displayName={name}
                    fontStyle={p?.name_font}
                    effect={p?.name_effect}
                    gradientStart={p?.name_gradient_start}
                    gradientEnd={p?.name_gradient_end}
                    color={isMine ? undefined : roleInfo?.color}
                    className={`text-sm font-bold cursor-pointer hover:underline ${isMine ? "text-primary" : "text-foreground"}`}
                    serverTag={p?.active_server_tag ? {
                      name: p.active_server_tag.server_tag_name,
                      badge: p.active_server_tag.server_tag_badge,
                      color: (p.active_server_tag as any).server_tag_container_color ?? p.active_server_tag.server_tag_color,
                      badgeColor: p.active_server_tag.server_tag_color,
                    } : null}
                  />
                  {!isMine && roleInfo?.iconUrl && (
                    <img src={roleInfo.iconUrl} className="h-3.5 w-3.5 rounded shrink-0 ms-1" alt="role" />
                  )}
                </span>
              </UserContextMenu>
              {msg.is_pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground">
                {formatTime(msg.created_at)}
              </span>
            </div>
            {msg.file_url && (msg.file_type === "gif" || msg.file_type === "sticker") ? (
              <div className="mt-1">
                <img src={msg.file_url} alt={msg.file_type === "gif" ? "GIF" : "Sticker"} className="max-w-[240px] max-h-[200px] rounded-lg object-contain" loading="lazy" />
              </div>
            ) : msg.file_url ? (
              <div className="mt-1">
                <MessageFilePreview fileUrl={msg.file_url} fileName={msg.file_name || "file"} fileType={msg.file_type || ""} fileSize={msg.file_size || 0} isMine={isMine} />
              </div>
            ) : null}
            {msg.content && (
              isAnnouncement ? (
                <div className="text-sm leading-relaxed prose-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-2 mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-bold mt-1.5 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-1 mb-0.5">{children}</h3>,
                      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc ms-4 mb-1.5 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal ms-4 mb-1.5 space-y-0.5">{children}</ol>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
                      code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                      pre: ({ children }) => <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto mb-1.5">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-s-4 border-primary/50 ps-3 italic text-muted-foreground mb-1.5">{children}</blockquote>,
                      a: ({ href, children }) => <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className={`whitespace-pre-wrap break-words ${getEmojiClass(msg.content) || "text-sm"}`}>
                  {renderMessageContent(msg.content, profiles, currentUserId, serverEmojis)}
                </p>
              )
            )}
            {/* Forwarded indicator */}
            {(msg as any).is_forwarded && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
                <Forward className="h-3 w-3" />
                <span className="italic">{t("actions.forwarded")}</span>
              </div>
            )}
            <MessageReactions
              messageId={msg.id}
              reactions={reactions}
              currentUserId={user?.id || ""}
              onToggle={(mid, emoji) => user && toggleReaction(mid, emoji, user.id)}
              serverId={serverId}
              serverEmojis={serverEmojis}
              forceOpen={reactionPickerMsgId === msg.id}
              onForceOpenHandled={onReactionPickerHandled}
            />
          </div>
        </div>
      </div>
    </MessageContextMenu>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg === nextProps.msg &&
    prevProps.prevMsg === nextProps.prevMsg &&
    prevProps.replyToMsg === nextProps.replyToMsg &&
    prevProps.profiles === nextProps.profiles &&
    prevProps.roleInfo === nextProps.roleInfo &&
    prevProps.serverEmojis === nextProps.serverEmojis &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.reactions === nextProps.reactions &&
    prevProps.isFirstMessage === nextProps.isFirstMessage
  );
});

// ─── ServerChannelChat ───────────────────────────────────────────────────────

const ServerChannelChat = ({ channelId, channelName, isPrivate, hasAccess, serverId: serverIdProp, isAnnouncement }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { serverId: serverIdParam } = useParams<{ serverId: string }>();
  const serverId = serverIdProp || serverIdParam;
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; content: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  const isLocked = isPrivate && hasAccess === false;
  const [userRole, setUserRole] = useState<string>("member");
  const [userRoleColorMap, setUserRoleColorMap] = useState<Map<string, { color: string; iconUrl: string | null }>>(new Map());

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
  } = useInfiniteMessages({ channelId, enabled: !isLocked });

  const { reactions, toggleReaction } = useMessageReactions(messages.map((m: any) => m.id));
  const { togglePin: toggleMessagePin } = useTogglePinMessage();
  const { openForwardModal } = useForwardMessage();

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

  const handleToggleMessagePin = async (msgId: string) => {
    const newVal = await toggleMessagePin(msgId);
    if (newVal !== null) {
      updateRealtimeMessage({ ...messages.find((m: any) => m.id === msgId), is_pinned: newVal });
    }
  };

  useMessageKeybinds({
    hoveredMessageId: hoveredMsgId,
    messages,
    currentUserId: user?.id,
    onEdit: undefined, // ServerChannelChat doesn't have inline edit
    onDeleteForMe: handleDeleteForMe,
    onDeleteForEveryone: handleDeleteForEveryone,
    onTogglePin: handleToggleMessagePin,
    onAddReaction: (id) => setReactionPickerMsgId(id),
    onForward: (id) => {
      const m = messages.find(v => v.id === id);
      if (m) openForwardModal({ content: m.content, fileUrl: m.file_url, fileName: m.file_name, fileType: m.file_type, fileSize: m.file_size });
    },
    onMarkUnread: (id) => {
      const msg = messages.find(m => m.id === id);
      if (msg && user) {
        const before = new Date(new Date(msg.created_at).getTime() - 1000).toISOString();
        supabase.from("channel_read_status" as any).upsert(
          { channel_id: channelId, user_id: user.id, last_read_at: before } as any,
          { onConflict: "channel_id,user_id" } as any
        ).then();
      }
    },
  });

  useEffect(() => {
    if (!serverId || !user) return;
    supabase
      .from("server_members" as any)
      .select("role")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUserRole((data as any).role || "member");
      });
  }, [serverId, user?.id]);

  // Fetch custom role colors for all members in this server
  useEffect(() => {
    if (!serverId) return;
    (async () => {
      const { data } = await supabase
        .from("member_roles" as any)
        .select("user_id, server_roles(id, color, icon_url, position)")
        .eq("server_id", serverId);
      const map = new Map<string, { color: string; iconUrl: string | null }>();
      ((data as any[]) || []).forEach((mr) => {
        const role = (mr as any).server_roles;
        if (!role) return;
        const existing = map.get(mr.user_id);
        if (!existing || role.position < (existing as any)._position) {
          map.set(mr.user_id, { color: role.color, iconUrl: role.icon_url, _position: role.position } as any);
        }
      });
      setUserRoleColorMap(map);
    })();
  }, [serverId]);

  const [serverEmojis, setServerEmojis] = useState<{ name: string; url: string }[]>([]);

  // Initial fetch of server emojis
  useEffect(() => {
    if (!serverId) return;
    supabase
      .from("server_emojis" as any)
      .select("name, url")
      .eq("server_id", serverId)
      .then(({ data }) => setServerEmojis((data as any[]) || []));
  }, [serverId]);

  // Realtime subscription: keep serverEmojis in sync when admin adds/removes emojis
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`server-emojis-${serverId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "server_emojis", filter: `server_id=eq.${serverId}` },
        (payload) => {
          setServerEmojis((prev) => [
            ...prev,
            { name: (payload.new as any).name, url: (payload.new as any).url },
          ]);
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "server_emojis", filter: `server_id=eq.${serverId}` },
        (payload) => {
          setServerEmojis((prev) => prev.filter((e) => e.name !== (payload.old as any).name));
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [serverId]);

  const canPost = !isAnnouncement || userRole === "admin" || userRole === "owner";

  const loadProfiles = useCallback(async (authorIds: string[]) => {
    const newIds = authorIds.filter((id) => !profiles.has(id));
    if (newIds.length === 0) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url, name_font, name_effect, name_gradient_start, name_gradient_end, active_server_tag:servers!profiles_active_server_tag_id_fkey(server_tag_name, server_tag_badge, server_tag_color, server_tag_container_color)").in("user_id", newIds);
    if (data) {
      setProfiles((prev) => {
        const next = new Map(prev);
        data.forEach((p) => next.set(p.user_id, p));
        return next;
      });
    }
  }, [profiles]);

  // Load profiles for current messages
  useEffect(() => {
    if (messages.length > 0) {
      loadProfiles(messages.map((m: any) => m.author_id));
    }
  }, [messages.length]);

  // Mark channel as read
  useEffect(() => {
    if (isLocked || !user) return;
    supabase
      .from("channel_read_status" as any)
      .upsert(
        { channel_id: channelId, user_id: user.id, last_read_at: new Date().toISOString() } as any,
        { onConflict: "channel_id,user_id" } as any
      )
      .then();
  }, [channelId, user, isLocked]);

  // Realtime messages
  useEffect(() => {
    if (isLocked) return;
    const channel = supabase
      .channel(`channel-chat-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, (payload) => {
        const msg = payload.new as any;
        appendRealtimeMessage(msg);
        loadProfiles([msg.author_id]);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [channelId, loadProfiles, isLocked, appendRealtimeMessage]);

  // ── Stable action callbacks for MessageItem (prevent memo from busting) ──

  const handleReply = useCallback((id: string, authorName: string, content: string) => {
    setReplyingTo({ id, authorName, content });
  }, []);

  const handleDeleteForMe = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("message_hidden").insert({ user_id: user.id, message_id: id });
  }, [user]);

  const handleDeleteForEveryone = useCallback(async (id: string) => {
    await supabase.from("messages").update({ deleted_for_everyone: true, content: "" }).eq("id", id);
  }, []);

  const handleMarkUnread = useCallback((msgId: string, msgCreatedAt: string) => {
    if (!user) return;
    const before = new Date(new Date(msgCreatedAt).getTime() - 1000).toISOString();
    supabase.from("channel_read_status" as any).upsert(
      { channel_id: channelId, user_id: user.id, last_read_at: before } as any,
      { onConflict: "channel_id,user_id" } as any
    ).then();
  }, [user, channelId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMsg(val);
    const pos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!/\s/.test(textAfterAt)) {
        setMentionOpen(true);
        setMentionStart(atIndex);
        setMentionFilter(textAfterAt);
        return;
      }
    }
    setMentionOpen(false);
  };

  const handleMentionSelect = (mention: string) => {
    if (mentionStart === null) return;
    const before = newMsg.slice(0, mentionStart);
    const cursorPos = inputRef.current?.selectionStart || newMsg.length;
    const after = newMsg.slice(cursorPos);
    const newValue = `${before}${mention} ${after}`;
    setNewMsg(newValue);
    setMentionOpen(false);
    setMentionStart(null);
    setTimeout(() => {
      const newCursor = before.length + mention.length + 1;
      inputRef.current?.setSelectionRange(newCursor, newCursor);
      inputRef.current?.focus();
    }, 0);
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && !selectedFile) || !user || sending) return;
    const content = newMsg.trim().slice(0, 5000);
    setSending(true);
    setNewMsg("");
    const file = selectedFile;
    setSelectedFile(null);
    try {
      let fileData: any = null;
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
            channel_id: channelId,
            author_id: user.id,
            content: "",
            type: "server_invite",
            metadata: invite.metadata as any,
            ...(replyId ? { reply_to_id: replyId } : {}),
          } as any);
          setSending(false);
          return;
        }
      }

      await supabase.from("messages").insert({
        channel_id: channelId,
        author_id: user.id,
        content,
        ...(fileData || {}),
        ...(replyId ? { reply_to_id: replyId } : {}),
      } as any);
    } catch {
      setUploadProgress(null);
      toast({ title: t("common.error"), variant: "destructive" });
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
    if (file.size > MAX_FILE_SIZE) { toast({ title: t("files.tooLarge"), variant: "destructive" }); return; }
    setSelectedFile(file);
  };

  // Locked state for private channels without access
  if (isLocked) {
    return (
      <div className="flex flex-col h-full min-w-0 flex-1">
        <header className="flex items-center gap-2 p-3 glass border-b border-border/50">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">{channelName}</h2>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
          <Lock className="h-12 w-12 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground">{t("channels.privateChannel")}</h3>
          <p className="text-sm text-center max-w-sm">{t("channels.noAccess")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-0 flex-1 relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {dragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-10 w-10" />
            <span className="font-medium">{t("files.dropHere")}</span>
          </div>
        </div>
      )}

      <header className="flex items-center gap-2 p-3 glass border-b border-border/50">
        {isPrivate ? <Lock className="h-5 w-5 text-muted-foreground" /> : isAnnouncement ? <Megaphone className="h-5 w-5 text-muted-foreground" /> : <Hash className="h-5 w-5 text-muted-foreground" />}
        <h2 className="font-semibold">{channelName}</h2>
        {isAnnouncement && <span className="ms-1 text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t("channels.announcementBadge")}</span>}
        <div className="ms-auto">
          <PinnedMessagesDrawer channelId={channelId} />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4">
        {messagesLoading ? (
          <MessageSkeleton count={6} />
        ) : (
          <div className="animate-fade-in">
            {/* Top sentinel for infinite scroll */}
            <div ref={topSentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const replyToMsg = (msg as any).reply_to_id
                ? messages.find((m) => m.id === (msg as any).reply_to_id) || null
                : null;
              const roleInfo = userRoleColorMap.get(msg.author_id) || null;
              return (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  prevMsg={prevMsg}
                  replyToMsg={replyToMsg}
                  profiles={profiles}
                  roleInfo={roleInfo}
                  currentUserId={user?.id}
                  serverEmojis={serverEmojis}
                  serverId={serverId}
                  channelId={channelId}
                  isAnnouncement={isAnnouncement}
                  isFirstMessage={idx === 0}
                  isHighlighted={highlightedMsgId === msg.id}
                  reactions={reactions.get(msg.id) || EMPTY_REACTIONS}
                  user={user}
                  onReply={handleReply}
                  onDeleteForMe={handleDeleteForMe}
                  onDeleteForEveryone={msg.author_id === user?.id ? handleDeleteForEveryone : undefined}
                  onMarkUnread={handleMarkUnread}
                  onTogglePin={handleToggleMessagePin}
                  onHighlight={setHighlightedMsgId}
                  toggleReaction={toggleReaction}
                  onAddReaction={(id) => setReactionPickerMsgId(id)}
                  onForward={(id) => {
                    const m = messages.find(v => v.id === id);
                    if (m) openForwardModal({ content: m.content, fileUrl: m.file_url, fileName: m.file_name, fileType: m.file_type, fileSize: m.file_size });
                  }}
                  reactionPickerMsgId={reactionPickerMsgId}
                  onReactionPickerHandled={() => setReactionPickerMsgId(null)}
                />
              );
            })}
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

      {isAnnouncement && !canPost ? (
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 border-t border-border/40">
          <Megaphone className="h-4 w-4 shrink-0" />
          {t("channels.announcementReadOnly")}
        </div>
      ) : isAnnouncement && canPost ? (
        /* Markdown toolbar for admins/owners in announcement channels */
        <div className="px-4 pb-4 pt-2 bg-transparent shrink-0">
          {replyingTo && (
            <div className="pb-2">
              <ReplyInputBar authorName={replyingTo.authorName} onCancel={() => setReplyingTo(null)} />
            </div>
          )}
          <MarkdownToolbar
            value={newMsg}
            onChange={setNewMsg}
            onSend={sendMessage}
            disabled={sending}
            placeholder={`${t("chat.placeholder")} #${channelName}`}
          />
        </div>
      ) : (
        /* Standard input for regular channels */
        <>
          {replyingTo && (
            <div className="px-3 pt-2">
              <ReplyInputBar authorName={replyingTo.authorName} onCancel={() => setReplyingTo(null)} />
            </div>
          )}
          <div className="px-4 pb-4 pt-2 bg-transparent shrink-0">
            {uploadProgress !== null && <Progress value={uploadProgress} className="mb-2 h-1" />}
            {selectedFile && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg text-sm">
                <span className="truncate flex-1">{selectedFile.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="h-6 text-xs">{t("actions.cancel")}</Button>
              </div>
            )}
            <div className="relative theme-input border border-border/40 rounded-xl flex items-start gap-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              {mentionOpen && serverId && (
                <MentionPopup
                  serverId={serverId}
                  filter={mentionFilter}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionOpen(false)}
                />
              )}
              <ChatInputActions
                onFileSelect={(f) => {
                  if (f.size > MAX_FILE_SIZE) { toast({ title: t("files.tooLarge"), variant: "destructive" }); return; }
                  setSelectedFile(f);
                }}
                onEmojiSelect={(emoji) => { setNewMsg((prev) => prev + emoji); inputRef.current?.focus(); }}
                onGifSelect={async (url) => {
                  if (!user) return;
                  await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content: "", file_url: url, file_type: "gif", file_name: "gif" } as any);
                }}
                onStickerSelect={async (url) => {
                  if (!user) return;
                  await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content: "", file_url: url, file_type: "sticker", file_name: "sticker" } as any);
                }}
                disabled={sending}
                serverId={serverId}
              />
              <AutoResizeTextarea
                ref={inputRef}
                value={newMsg}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (mentionOpen) return;
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder={`${t("chat.placeholder")} #${channelName}`}
                className="flex-1"
                maxLength={5000}
              />
              <Button size="icon" onClick={sendMessage} disabled={(!newMsg.trim() && !selectedFile) || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServerChannelChat;
