import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Pin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import StyledDisplayName from "@/components/StyledDisplayName";
import { renderLinkedText } from "@/lib/renderLinkedText";

interface PinnedMessagesDrawerProps {
  /** One of these must be provided to identify the chat */
  threadId?: string;
  groupThreadId?: string;
  channelId?: string;
}

interface PinnedMsg {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  file_url?: string | null;
  file_name?: string | null;
}

interface AuthorProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  name_font?: string | null;
  name_effect?: string | null;
  name_gradient_start: string | null;
  name_gradient_end: string | null;
}

const PinnedMessagesDrawer = ({ threadId, groupThreadId, channelId }: PinnedMessagesDrawerProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMsg[]>([]);
  const [profiles, setProfiles] = useState<Map<string, AuthorProfile>>(new Map());
  const [loading, setLoading] = useState(false);

  const pinnedCount = pinnedMessages.length;

  const fetchPinned = async () => {
    let query = supabase
      .from("messages")
      .select("id, content, created_at, author_id, file_url, file_name")
      .eq("is_pinned", true)
      .eq("deleted_for_everyone", false)
      .order("created_at", { ascending: false });

    if (threadId) query = query.eq("thread_id", threadId);
    else if (groupThreadId) query = query.eq("group_thread_id", groupThreadId);
    else if (channelId) query = query.eq("channel_id", channelId);

    const { data } = await query;
    const msgs = (data || []) as PinnedMsg[];
    setPinnedMessages(msgs);

    const authorIds = [...new Set(msgs.map((m) => m.author_id))];
    if (authorIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, name_font, name_effect, name_gradient_start, name_gradient_end")
        .in("user_id", authorIds);
      if (profileData) {
        const map = new Map<string, AuthorProfile>();
        profileData.forEach((p: any) => map.set(p.user_id, p));
        setProfiles(map);
      }
    }
  };

  // Fetch pinned messages when opened
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchPinned().finally(() => setLoading(false));
  }, [open, threadId, groupThreadId, channelId]);

  // Realtime: listen for pin/unpin changes
  useEffect(() => {
    const filterId = threadId || groupThreadId || channelId;
    if (!filterId) return;
    const filterCol = threadId ? "thread_id" : groupThreadId ? "group_thread_id" : "channel_id";
    const channel = supabase
      .channel(`pinned-msgs-${filterId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `${filterCol}=eq.${filterId}` }, (payload) => {
        const updated = payload.new as any;
        if (updated.is_pinned !== undefined) {
          fetchPinned();
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [threadId, groupThreadId, channelId]);

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 relative"
      title={t("chat.pinnedMessages")}
      onClick={() => setOpen(true)}
    >
      <Pin className="h-4 w-4" />
    </Button>
  );

  const content = (
    <div className="flex flex-col gap-1">
      {loading ? (
        <div className="space-y-3 p-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-[80%]" />
              </div>
            </div>
          ))}
        </div>
      ) : pinnedMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
          <Pin className="h-8 w-8 opacity-40" />
          <p className="text-sm">{t("chat.noPinnedMessages")}</p>
        </div>
      ) : (
        pinnedMessages.map((msg) => {
          const author = profiles.get(msg.author_id);
          return (
            <div key={msg.id} className="flex gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                <AvatarImage src={author?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(author?.display_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <StyledDisplayName
                    displayName={author?.display_name || author?.username || "User"}
                    fontStyle={author?.name_font}
                    effect={author?.name_effect}
                    gradientStart={author?.name_gradient_start}
                    gradientEnd={author?.name_gradient_end}
                    className="text-sm font-medium truncate"
                  />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 break-words line-clamp-3">
                  {msg.content ? renderLinkedText(msg.content) : msg.file_name ? `📎 ${msg.file_name}` : ""}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // Mobile: use Drawer
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Pin className="h-4 w-4" />
                {t("chat.pinnedMessages")}
                {pinnedCount > 0 && <span className="text-xs text-muted-foreground">({pinnedCount})</span>}
              </DrawerTitle>
            </DrawerHeader>
            <ScrollArea className="max-h-[60vh]">
              {content}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: use Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <Pin className="h-4 w-4" />
          <span className="font-semibold text-sm">{t("chat.pinnedMessages")}</span>
          {pinnedCount > 0 && <span className="text-xs text-muted-foreground">({pinnedCount})</span>}
        </div>
        <ScrollArea className="max-h-[400px]">
          {content}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default PinnedMessagesDrawer;
