import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStreamerMode } from "@/contexts/StreamerModeContext";
import { toast } from "@/hooks/use-toast";
import { playNotificationSound } from "@/lib/soundManager";
import { getNotificationPrefs } from "@/lib/notificationPrefs";

export function useUnreadCount() {
  const { user } = useAuth();
  const { isStreamerMode } = useStreamerMode();
  const [totalUnread, setTotalUnread] = useState(0);
  const prevCountRef = useRef<number | null>(null);

  const computeUnread = async () => {
    if (!user) { setTotalUnread(0); return; }

    const { data: threads } = await supabase
      .from("dm_threads")
      .select("id");

    const { data: readStatuses } = await supabase
      .from("thread_read_status")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id);

    const readMap = new Map<string, string>();
    (readStatuses || []).forEach((rs: any) => {
      if (rs.thread_id) readMap.set(rs.thread_id, rs.last_read_at);
    });

    let total = 0;

    if (threads) {
      for (const thread of threads) {
        const lastRead = readMap.get(thread.id);
        let query = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", thread.id)
          .neq("author_id", user.id);
        if (lastRead) query = query.gt("created_at", lastRead);
        const { count } = await query;
        total += count || 0;
      }
    }

    if (prevCountRef.current !== null && total > prevCountRef.current) {
      const prefs = getNotificationPrefs();
      const appFocused = document.hasFocus();

      if (prefs.messageSound && !appFocused) {
        playNotificationSound();
      }

      if (!appFocused) {
        toast({ title: "You have a new message" });
      }

      if (
        prefs.desktopEnabled &&
        !appFocused &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("New direct message", {
          body: "You have a new unread message",
          icon: "/icon-192.png",
          silent: true,
        });
      }
    }
    prevCountRef.current = total;

    setTotalUnread(total);
  };

  useEffect(() => {
    computeUnread();

    const channel = supabase
      .channel("unread-count-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        computeUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "thread_read_status" }, () => {
        computeUnread();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  return { totalUnread };
}
