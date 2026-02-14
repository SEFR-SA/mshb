import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Hash, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { uploadChatFile } from "@/lib/uploadChatFile";
import FileAttachmentButton from "@/components/chat/FileAttachmentButton";
import MessageFilePreview from "@/components/chat/MessageFilePreview";
import { Progress } from "@/components/ui/progress";

const PAGE_SIZE = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Props {
  channelId: string;
  channelName: string;
}

const ServerChannelChat = ({ channelId, channelName }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    let query = (supabase
      .from("messages") as any)
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (before) query = query.lt("created_at", before);
    const { data } = await query;
    if (!data) return;
    if (data.length < PAGE_SIZE) setHasMore(false);
    const reversed = data.reverse();
    loadProfiles(reversed.map((m) => m.author_id));
    if (before) {
      setMessages((prev) => [...reversed, ...prev]);
    } else {
      setMessages(reversed);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [channelId, loadProfiles]);

  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    loadMessages();
  }, [channelId]);

  // Realtime
  useEffect(() => {
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
  }, [channelId, loadProfiles]);

  const sendMessage = async () => {
    if ((!newMsg.trim() && !selectedFile) || !user || sending) return;
    const content = newMsg.trim().slice(0, 2000);
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

      {/* Header */}
      <header className="flex items-center gap-2 p-3 glass border-b border-border/50">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{channelName}</h2>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                {msg.file_url && (
                  <div className="mt-1">
                    <MessageFilePreview fileUrl={msg.file_url} fileName={msg.file_name || "file"} fileType={msg.file_type || ""} fileSize={msg.file_size || 0} isMine={isMine} />
                  </div>
                )}
                {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50">
        {uploadProgress !== null && <Progress value={uploadProgress} className="mb-2 h-1" />}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg text-sm">
            <span className="truncate flex-1">{selectedFile.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="h-6 text-xs">{t("actions.cancel")}</Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <FileAttachmentButton onFileSelect={(f) => {
            if (f.size > MAX_FILE_SIZE) { toast({ title: t("files.tooLarge"), variant: "destructive" }); return; }
            setSelectedFile(f);
          }} />
          <Input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={`${t("chat.placeholder")} #${channelName}`}
            className="flex-1"
            maxLength={2000}
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
