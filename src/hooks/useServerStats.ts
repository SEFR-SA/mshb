import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServerStatsFlags {
  show_member_count?: boolean;
  show_online_count?: boolean;
  show_role_count?: boolean;
  show_boost_count?: boolean;
}

export interface ServerStats {
  memberCount: number;
  onlineCount: number;
  roleCount: number;
  boostCount: number;
}

const STALE_TIME = 3 * 60 * 1000; // 3 minutes

export function useServerStats(serverId: string | null | undefined, flags: ServerStatsFlags | null) {
  const anyEnabled =
    flags?.show_member_count || flags?.show_online_count ||
    flags?.show_role_count   || flags?.show_boost_count;

  const { data, isLoading } = useQuery<ServerStats>({
    queryKey: ["server-stats", serverId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_server_stats" as any, {
        p_server_id: serverId!,
      });
      if (error) throw error;
      return {
        memberCount: Number((data as any)?.member_count ?? 0),
        onlineCount: Number((data as any)?.online_count  ?? 0),
        roleCount:   Number((data as any)?.role_count    ?? 0),
        boostCount:  Number((data as any)?.boost_count   ?? 0),
      };
    },
    enabled: !!serverId && !!anyEnabled,
    staleTime: STALE_TIME,
    refetchInterval: STALE_TIME,
    refetchOnWindowFocus: true,
    // Keep previous data visible during background refetches — no flicker
    placeholderData: (prev) => prev,
  });

  return { serverStats: data ?? null, statsLoading: isLoading };
}
