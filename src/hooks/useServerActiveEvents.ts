import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useServerActiveEvents(serverIds: string[]) {
  const [activeSet, setActiveSet] = useState<Set<string>>(new Set());

  const compute = useCallback(async () => {
    if (serverIds.length === 0) {
      setActiveSet(new Set());
      return;
    }

    const { data } = await supabase
      .from("server_events")
      .select("server_id")
      .in("server_id", serverIds)
      .eq("status", "active");

    const ids = new Set<string>();
    (data || []).forEach((e) => ids.add(e.server_id));
    setActiveSet(ids);
  }, [serverIds.join(",")]);

  useEffect(() => {
    compute();

    const channel = supabase
      .channel("server-active-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "server_events" }, () => {
        compute();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [compute]);

  return activeSet;
}
