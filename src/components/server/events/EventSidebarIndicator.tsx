import React, { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EventSidebarIndicatorProps {
  serverId: string;
  onClick: () => void;
}

const EventSidebarIndicator: React.FC<EventSidebarIndicatorProps> = ({ serverId, onClick }) => {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { count: c } = await supabase
      .from("server_events")
      .select("id", { count: "exact", head: true })
      .eq("server_id", serverId)
      .in("status", ["scheduled", "active"]);
    setCount(c ?? 0);
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel(`event-indicator-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_events", filter: `server_id=eq.${serverId}` },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [serverId]);

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
    >
      <Calendar className="h-4 w-4 shrink-0" />
      <span>{count} Event{count !== 1 ? "s" : ""}</span>
    </button>
  );
};

export default EventSidebarIndicator;
