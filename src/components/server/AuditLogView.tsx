import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  server_id: string;
  actor_id: string;
  action_type: string;
  target_id: string | null;
  changes: any;
  created_at: string;
  actor?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface Props {
  serverId: string;
}

const formatAction = (log: AuditLog, t: (key: string, opts?: any) => string): string => {
  switch (log.action_type) {
    case "channel_created":
      return t("auditLog.channelCreated", { name: log.changes?.channel_name || "" });
    case "channel_deleted":
      return t("auditLog.channelDeleted", { name: log.changes?.channel_name || "" });
    case "server_updated":
      return t("auditLog.serverUpdated", { name: log.changes?.new_value || "" });
    case "member_kicked":
      return t("auditLog.memberKicked", { name: log.changes?.target_username || log.target_id || "" });
    default:
      return log.action_type;
  }
};

const AuditLogView = ({ serverId }: Props) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!serverId) return;
    const load = async () => {
      setIsLoading(true);
      const { data: rawLogs, error } = await supabase
        .from("server_audit_logs" as any)
        .select("*")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        toast({ title: t("auditLog.loadError"), variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const logList = (rawLogs as any[]) || [];

      if (logList.length > 0) {
        const actorIds = [...new Set(logList.map((l) => l.actor_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", actorIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        setLogs(logList.map((l) => ({ ...l, actor: profileMap.get(l.actor_id) })));
      } else {
        setLogs([]);
      }

      setIsLoading(false);
    };
    load();
  }, [serverId]);

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2.5 w-1/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center mt-6">{t("auditLog.empty")}</p>
    );
  }

  return (
    <div className="overflow-x-hidden space-y-2 mt-4">
      {logs.map((log) => {
        const actor = log.actor;
        const actorName = actor?.display_name || actor?.username || "Unknown";
        return (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 text-sm">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={actor?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {actorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <span className="font-medium">{actorName}</span>
              {" "}
              {formatAction(log, t)}
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditLogView;
