import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import ChannelSidebar from "@/components/server/ChannelSidebar";
import ServerChannelChat from "@/components/server/ServerChannelChat";
import ServerMemberList from "@/components/server/ServerMemberList";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Users } from "lucide-react";

const ServerView = () => {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeChannel, setActiveChannel] = useState<{ id: string; name: string } | null>(null);
  const [showMembers, setShowMembers] = useState(!isMobile);

  // Auto-select first text channel if none specified
  useEffect(() => {
    if (!serverId) return;
    if (channelId) {
      // Load channel name
      supabase.from("channels" as any).select("id, name").eq("id", channelId).maybeSingle()
        .then(({ data }) => { if (data) setActiveChannel(data as any); });
      return;
    }
    // Redirect to first text channel
    supabase.from("channels" as any).select("id, name").eq("server_id", serverId).eq("type", "text").order("position").limit(1)
      .then(({ data }) => {
        if (data && (data as any[]).length > 0) {
          const ch = (data as any[])[0];
          navigate(`/server/${serverId}/channel/${ch.id}`, { replace: true });
        }
      });
  }, [serverId, channelId, navigate]);

  if (!serverId) return null;

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1 p-2 border-b border-border/50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Menu className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <ChannelSidebar serverId={serverId} activeChannelId={activeChannel?.id} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium flex-1 truncate">#{activeChannel?.name || "..."}</span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Users className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[280px]">
              <ServerMemberList serverId={serverId} />
            </SheetContent>
          </Sheet>
        </div>
        {activeChannel && <ServerChannelChat channelId={activeChannel.id} channelName={activeChannel.name} />}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <ChannelSidebar serverId={serverId} activeChannelId={activeChannel?.id} />
      {activeChannel ? (
        <ServerChannelChat channelId={activeChannel.id} channelName={activeChannel.name} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a channel</div>
      )}
      {showMembers && <ServerMemberList serverId={serverId} />}
      {!showMembers && (
        <Button variant="ghost" size="icon" className="absolute top-3 end-3" onClick={() => setShowMembers(true)}>
          <Users className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ServerView;
