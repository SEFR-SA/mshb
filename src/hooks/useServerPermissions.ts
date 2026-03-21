import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ServerPermissions {
  manage_roles: boolean;
  create_expressions: boolean;
  view_audit_log: boolean;
  manage_server: boolean;
  create_invites: boolean;
  kick_members: boolean;
  ban_members: boolean;
  view_channel: boolean;
  manage_channel: boolean;
  send_messages: boolean;
  attach_files: boolean;
  mention_everyone: boolean;
  delete_messages: boolean;
  create_polls: boolean;
  connect: boolean;
  speak: boolean;
  video: boolean;
  mute_members: boolean;
  deafen_members: boolean;
}

const ALL_TRUE: ServerPermissions = {
  manage_roles: true, create_expressions: true, view_audit_log: true,
  manage_server: true, create_invites: true, kick_members: true,
  ban_members: true, view_channel: true, manage_channel: true,
  send_messages: true, attach_files: true, mention_everyone: true,
  delete_messages: true, create_polls: true, connect: true, speak: true,
  video: true, mute_members: true, deafen_members: true,
};

const ALL_FALSE: ServerPermissions = {
  manage_roles: false, create_expressions: false, view_audit_log: false,
  manage_server: false, create_invites: false, kick_members: false,
  ban_members: false, view_channel: false, manage_channel: false,
  send_messages: false, attach_files: false, mention_everyone: false,
  delete_messages: false, create_polls: false, connect: false, speak: false,
  video: false, mute_members: false, deafen_members: false,
};

interface UseServerPermissionsResult {
  /** Server-level permissions including default-ON fallbacks (use for admin gates) */
  permissions: ServerPermissions;
  /** Strict permissions — only explicit role grants, no default-ON (use for channel restriction intersection) */
  strictPermissions: ServerPermissions;
  loading: boolean;
  refresh: () => void;
}

export function useServerPermissions(serverId: string | null | undefined): UseServerPermissionsResult {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ServerPermissions>(ALL_FALSE);
  const [strictPermissions, setStrictPermissions] = useState<ServerPermissions>(ALL_FALSE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!serverId || !user) { setLoading(false); return; }

    // Quick check: if owner/admin, return all-true immediately
    const { data: sm } = await supabase
      .from("server_members" as any)
      .select("role")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = (sm as any)?.role;
    if (role === "owner" || role === "admin") {
      setPermissions(ALL_TRUE);
      setStrictPermissions(ALL_TRUE);
      setLoading(false);
      return;
    }

    // For regular members: call both RPCs in parallel
    // - get_user_permissions: includes default-ON (for server-level gates)
    // - get_user_permissions_strict: explicit grants only (for channel restriction gates)
    const [{ data }, { data: strictData }] = await Promise.all([
      supabase.rpc("get_user_permissions" as any, { _server_id: serverId } as any),
      supabase.rpc("get_user_permissions_strict" as any, { _server_id: serverId } as any),
    ]);

    if (data) setPermissions(data as unknown as ServerPermissions);
    if (strictData) setStrictPermissions(strictData as unknown as ServerPermissions);
    setLoading(false);
  }, [serverId, user]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Re-fetch when member_roles change (role assignments added/removed)
  useEffect(() => {
    if (!serverId || !user) return;
    const channel = supabase
      .channel(`perms-${serverId}-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "member_roles",
        filter: `server_id=eq.${serverId}`,
      }, load)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [serverId, user, load]);

  // Re-fetch when server_roles permissions change (admin edits a role's permissions)
  useEffect(() => {
    if (!serverId || !user) return;
    const channel = supabase
      .channel(`perms-roles-${serverId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "server_roles",
        filter: `server_id=eq.${serverId}`,
      }, load)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [serverId, user, load]);

  return { permissions, strictPermissions, loading, refresh: load };
}
