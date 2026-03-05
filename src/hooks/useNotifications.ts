import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const QUERY_KEY = "notifications";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*, actor_profile:profiles!notifications_actor_id_fkey(display_name, username, avatar_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as any[] || []) as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("id", notificationId);
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, user?.id] });
      queryClient.setQueryData([QUERY_KEY, user?.id], (old: Notification[] | undefined) =>
        (old || []).map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("user_id", user.id)
        .eq("is_read", false);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, user?.id] });
      queryClient.setQueryData([QUERY_KEY, user?.id], (old: Notification[] | undefined) =>
        (old || []).map((n) => ({ ...n, is_read: true }))
      );
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          // Fetch the full notification with actor profile
          const { data } = await supabase
            .from("notifications" as any)
            .select("*, actor_profile:profiles!notifications_actor_id_fkey(display_name, username, avatar_url)")
            .eq("id", (payload.new as any).id)
            .maybeSingle();
          if (data) {
            queryClient.setQueryData([QUERY_KEY, user.id], (old: Notification[] | undefined) =>
              [data as any as Notification, ...(old || [])]
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}
