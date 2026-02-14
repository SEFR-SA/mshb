import React, { useEffect, useState, useRef, useCallback } from "react";
import { MessageSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { getEmojiClass } from "@/lib/emojiUtils";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Hash, Upload, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadChatFile } from "@/lib/uploadChatFile";
import FileAttachmentButton from "@/components/chat/FileAttachmentButton";
import MessageFilePreview from "@/components/chat/MessageFilePreview";
import { Progress } from "@/components/ui/progress";
import MentionPopup from "./MentionPopup";
import EmojiPicker from "@/components/chat/EmojiPicker";
import GifPicker from "@/components/chat/GifPicker";
import StickerPicker from "@/components/chat/StickerPicker";

const PAGE_SIZE = 50;
const MAX_FILE_SIZE = 200 * 1024 * 1024;

interface Props {
  channelId: string;
  channelName: string;
  isPrivate?: boolean;
  hasAccess?: boolean;
}

const renderMessageContent = (content: string, profiles: Map<string, any>, currentUserId?: string) => {
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
    return part;
  });
};

const ServerChannelChat = ({ channelId, channelName, isPrivate, hasAccess }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { serverId } = useParams<{ serverId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  const isLocked = isPrivate && hasAccess === false;

  const loadProfiles = useCallback(async (authorIds: string[]) => {
    const newIds = authorIds.filter((id) => !profiles.has(id));
    if (newIds.length === 0) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", newIds);
    if (data) {
      setProfiles((prev) => {
        const next = new Map(prev);
        data.forEach((p) => next.set(p.user_id, p));
        return next;
      });
    }
  }, [profiles]);

  const loadMessages = useCallback(async (before?: string) => {
    if (isLocked) return;
    let query = (supabase.from("messages") as any)
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (before) query = query.lt("created_at", before);
    const { data } = await query;
    if (!data) return;
    if (data.length < PAGE_SIZE) setHasMore(false);
    const reversed = data.reverse();
    loadProfiles(reversed.map((m: any) => m.author_id));
    if (before) {
      setMessages((prev) => [...reversed, ...prev]);
    } else {
      setMessages(reversed);
      setMessagesLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [channelId, loadProfiles, isLocked]);

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

  useEffect(() => {
    if (isLocked) return;
    setMessages([]);
    setHasMore(true);
    setMessagesLoading(true);
    loadMessages();
  }, [channelId, isLocked]);

  useEffect(() => {
    if (isLocked) return;
    const channel = supabase
      .channel(`channel-chat-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, (payload) => {
        const msg = payload.new as any;
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        loadProfiles([msg.author_id]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [channelId, loadProfiles, isLocked]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      await supabase.from("messages").insert({
        channel_id: channelId,
        author_id: user.id,
        content,
        ...(fileData || {}),
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
        {isPrivate ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Hash className="h-5 w-5 text-muted-foreground" />}
        <h2 className="font-semibold">{channelName}</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <MessageSkeleton count={6} />
        ) : (
          <div className="animate-fade-in space-y-3">
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => loadMessages(messages[0]?.created_at)} className="text-xs text-muted-foreground">
              {t("chat.loadMore")}
            </Button>
          </div>
        )}
        {messages.map((msg) => {
          const p = profiles.get(msg.author_id);
          const name = p?.display_name || p?.username || "User";
          const isMine = msg.author_id === user?.id;
          return (
            <div key={msg.id} className="flex gap-3 hover:bg-muted/30 rounded-lg px-2 py-1 -mx-2 transition-colors group">
              <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                <AvatarImage src={p?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-semibold ${isMine ? "text-primary" : "text-foreground"}`}>{name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                {msg.content && <p className={`whitespace-pre-wrap break-words ${getEmojiClass(msg.content) || 'text-sm'}`}>{renderMessageContent(msg.content, profiles, user?.id)}</p>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border/50">
        {uploadProgress !== null && <Progress value={uploadProgress} className="mb-2 h-1" />}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg text-sm">
            <span className="truncate flex-1">{selectedFile.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="h-6 text-xs">{t("actions.cancel")}</Button>
          </div>
        )}
        <div className="relative flex items-center gap-2">
          {mentionOpen && serverId && (
            <MentionPopup
              serverId={serverId}
              filter={mentionFilter}
              onSelect={handleMentionSelect}
              onClose={() => setMentionOpen(false)}
            />
          )}
          <FileAttachmentButton onFileSelect={(f) => {
            if (f.size > MAX_FILE_SIZE) { toast({ title: t("files.tooLarge"), variant: "destructive" }); return; }
            setSelectedFile(f);
          }} />
          <EmojiPicker onEmojiSelect={(emoji) => { setNewMsg((prev) => prev + emoji); inputRef.current?.focus(); }} />
          <GifPicker onGifSelect={async (url) => {
            if (!user) return;
            await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content: "", file_url: url, file_type: "gif", file_name: "gif" } as any);
          }} />
          <StickerPicker onStickerSelect={async (url) => {
            if (!user) return;
            await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content: "", file_url: url, file_type: "sticker", file_name: "sticker" } as any);
          }} />
          <Input
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
    </div>
  );
};

export default ServerChannelChat;
