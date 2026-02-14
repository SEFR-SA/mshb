import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, LogIn, MessageSquare, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import CreateServerDialog from "./CreateServerDialog";
import JoinServerDialog from "./JoinServerDialog";
import { Separator } from "@/components/ui/separator";

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
}

const ServerRail = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: memberships } = await supabase
        .from("server_members" as any)
        .select("server_id")
        .eq("user_id", user.id);
      if (!memberships || memberships.length === 0) { setServers([]); return; }
      const ids = memberships.map((m: any) => m.server_id);
      const { data } = await supabase
        .from("servers" as any)
        .select("id, name, icon_url")
        .in("id", ids);
      setServers((data as any) || []);
    };
    load();

    const channel = supabase
      .channel("server-members-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  return (
    <>
      <div className="w-[72px] flex flex-col items-center py-3 gap-2 bg-sidebar-background border-e border-sidebar-border shrink-0 overflow-y-auto">
        {/* Home button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                  isActive ? "bg-primary text-primary-foreground rounded-xl" : "bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20"
                }`
              }
            >
              <MessageSquare className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{t("nav.inbox")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to="/friends"
              className={({ isActive }) =>
                `flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                  isActive ? "bg-primary text-primary-foreground rounded-xl" : "bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20"
                }`
              }
            >
              <Users className="h-5 w-5" />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{t("nav.friends")}</TooltipContent>
        </Tooltip>

        <Separator className="w-8 mx-auto" />

        {/* Server icons */}
        {servers.map((s) => (
          <Tooltip key={s.id}>
            <TooltipTrigger asChild>
              <NavLink
                to={`/server/${s.id}`}
                className={({ isActive }) =>
                  `flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                    isActive ? "bg-primary text-primary-foreground rounded-xl" : "bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20"
                  }`
                }
              >
                <Avatar className="h-12 w-12 rounded-[inherit]">
                  <AvatarImage src={s.icon_url || ""} />
                  <AvatarFallback className="bg-transparent text-inherit text-sm font-bold rounded-[inherit]">
                    {s.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">{s.name}</TooltipContent>
          </Tooltip>
        ))}

        <Separator className="w-8 mx-auto" />

        {/* Create server */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl transition-all"
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("servers.create")}</TooltipContent>
        </Tooltip>

        {/* Join server */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setJoinOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl transition-all"
            >
              <LogIn className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("servers.joinServer")}</TooltipContent>
        </Tooltip>
      </div>

      <CreateServerDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinServerDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
};

export default ServerRail;
