import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2, X, Check, Settings2, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import GroupSettingsDialog from "@/components/GroupSettingsDialog";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"messages">;
type Profile = Tables<"profiles">;

const PAGE_SIZE = 30;

const GroupChat = () => {
  const { t } = useTranslation();
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Load group info
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

      const { data: members } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);
      setMemberCount(members?.length || 0);
      const myMembership = members?.find((m: any) => m.user_id === user.id);
      setIsAdmin((myMembership as any)?.role === "admin");

      const userIds = members?.map((m: any) => m.user_id) || [];
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("*").in("user_id", userIds);
        const map = new Map<string, Profile>();
        profs?.forEach((p) => map.set(p.user_id, p));
        setProfiles(map);
      }
    })();
  }, [groupId, user]);

  // Load hidden
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("message_hidden").select("message_id").eq("user_id", user.id);
      setHiddenIds(new Set((data || []).map((h) => h.message_id)));
    })();
  }, [user]);

  // Load messages
  const loadMessages = useCallback(async (before?: string) => {
    if (!groupId) return;
    let query = supabase
      .from("messages")
      .select("*")
      .eq("group_thread_id", groupId)
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
  }, [groupId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Mark as read
  useEffect(() => {
    if (!groupId || !user) return;
    supabase.from("thread_read_status").upsert(
      { user_id: user.id, group_thread_id: groupId, last_read_at: new Date().toISOString() } as any,
      { onConflict: "user_id,thread_id" }
    ).then();
  }, [groupId, user]);

  // Realtime
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `group_thread_id=eq.${groupId}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);
        if (user && msg.author_id !== user.id) {
          supabase.from("thread_read_status").upsert(
            { user_id: user.id, group_thread_id: groupId, last_read_at: new Date().toISOString() } as any,
            { onConflict: "user_id,thread_id" }
          ).then();
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `group_thread_id=eq.${groupId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [groupId]);

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
    if (!newMsg.trim() || !groupId || !user || sending) return;
    const content = newMsg.trim().slice(0, 2000);
    setSending(true);
    setNewMsg("");
    try {
      await supabase.from("messages").insert({ group_thread_id: groupId, author_id: user.id, content } as any);
      await supabase.from("group_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", groupId);
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

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));

  const typingNames = Array.from(typingUsers)
    .map((uid) => profiles.get(uid)?.display_name || profiles.get(uid)?.username || "Someone")
    .join(", ");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 p-3 glass border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
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
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="h-5 w-5" />
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {hasMore && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => messages.length > 0 && loadMessages(messages[0].created_at)} className="text-xs text-muted-foreground">
              {t("chat.loadMore")}
            </Button>
          </div>
        )}
        {visibleMessages.map((msg) => {
          const isMine = msg.author_id === user?.id;
          const isDeleted = msg.deleted_for_everyone;
          const authorProfile = profiles.get(msg.author_id);

          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="flex gap-2 max-w-[75%]">
                {!isMine && (
                  <Avatar className="h-7 w-7 mt-1 shrink-0">
                    <AvatarImage src={authorProfile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {(authorProfile?.display_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`group relative rounded-2xl px-4 py-2 ${
                  isDeleted ? "bg-muted/50 italic text-muted-foreground"
                    : isMine ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border/50"
                }`}>
                  {!isMine && !isDeleted && (
                    <p className="text-[11px] font-semibold text-primary mb-0.5">
                      {authorProfile?.display_name || authorProfile?.username || "User"}
                    </p>
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
                      <p className="text-sm whitespace-pre-wrap break-words">
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
              </div>
            </div>
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

      <GroupSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        groupId={groupId || ""}
        isAdmin={isAdmin}
        onLeave={() => navigate("/")}
      />
    </div>
  );
};

export default GroupChat;
