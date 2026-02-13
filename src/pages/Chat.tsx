import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";

type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

const PAGE_SIZE = 30;

const Chat = () => {
  const { t } = useTranslation();
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const { isOnline, getUserStatus } = usePresence();
  const navigate = useNavigate();

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load thread info
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
    })();
  }, [threadId, user]);

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
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [threadId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

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
        // Mark thread as read on new incoming message
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

  // Typing indicator via broadcast
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
    if (!newMsg.trim() || !threadId || !user || sending) return;
    const content = newMsg.trim().slice(0, 2000);
    setSending(true);
    setNewMsg("");
    try {
      await supabase.from("messages").insert({
        thread_id: threadId,
        author_id: user.id,
        content,
      });
      await supabase.from("dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setSending(false);
  };

  const editMessage = async (msgId: string) => {
    if (!editContent.trim()) return;
    await supabase.from("messages").update({ content: editContent.trim().slice(0, 2000), edited_at: new Date().toISOString() }).eq("id", msgId);
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
    if (messages.length > 0) {
      loadMessages(messages[0].created_at);
    }
  };

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 p-3 glass border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherProfile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {(otherProfile?.display_name || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 end-0 border-2 border-background rounded-full">
            <StatusBadge status={(getUserStatus(otherProfile) === "offline" ? "invisible" : getUserStatus(otherProfile)) as UserStatus} size="sm" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{otherProfile?.display_name || otherProfile?.username || "User"}</p>
          <p className="text-xs text-muted-foreground">
            {getUserStatus(otherProfile) !== "offline"
              ? t(`status.${getUserStatus(otherProfile)}`)
              : otherProfile?.last_seen
                ? t("presence.lastSeen", { time: formatDistanceToNow(new Date(otherProfile.last_seen)) })
                : t("presence.offline")}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {hasMore && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} className="text-xs text-muted-foreground">
              {t("chat.loadMore")}
            </Button>
          </div>
        )}
        {visibleMessages.map((msg) => {
          const isMine = msg.author_id === user?.id;
          const isDeleted = msg.deleted_for_everyone;

          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`group relative max-w-[75%] rounded-2xl px-4 py-2 ${
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
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {isDeleted ? t("chat.deleted") : msg.content}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      <span>{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      {msg.edited_at && !isDeleted && <span>· {t("chat.edited")}</span>}
                    </div>
                  </>
                )}

                {/* Context menu */}
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

      {/* Composer */}
      <div className="p-3 glass border-t border-border/50">
        <div className="flex items-center gap-2">
          <Input
            value={newMsg}
            onChange={(e) => { setNewMsg(e.target.value); broadcastTyping(); }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={t("chat.placeholder")}
            className="flex-1"
            maxLength={2000}
          />
          <Button size="icon" onClick={sendMessage} disabled={!newMsg.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
