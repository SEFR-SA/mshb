import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import ChannelSidebar from "@/components/server/ChannelSidebar";
import ServerChannelChat from "@/components/server/ServerChannelChat";
import ServerMemberList from "@/components/server/ServerMemberList";
import ScreenShareViewer from "@/components/server/ScreenShareViewer";
import CameraViewer from "@/components/server/CameraViewer";
import ServerRail from "@/components/server/ServerRail";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Menu, Users, ArrowLeft } from "lucide-react";

const ServerView = () => {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { voiceChannel, setVoiceChannel: setVoiceCtx, disconnectVoice, remoteScreenStream, screenSharerName, remoteCameraStream } = useVoiceChannel();
  const [activeChannel, setActiveChannel] = useState<{ id: string; name: string; type: string; is_private?: boolean } | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(true);
  const [showMembers, setShowMembers] = useState(!isMobile);
  const [pendingVoiceChannel, setPendingVoiceChannel] = useState<{ id: string; name: string } | null>(null);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);

  // Check access for private channels
  useEffect(() => {
    if (!activeChannel || !user) { setHasAccess(true); return; }
    if (!activeChannel.is_private) { setHasAccess(true); return; }
    supabase.from("channel_members" as any)
      .select("id")
      .eq("channel_id", activeChannel.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasAccess(!!data);
      });
  }, [activeChannel?.id, activeChannel?.is_private, user?.id]);

  // Auto-select first text channel if none specified
  useEffect(() => {
    if (!serverId) return;
    if (channelId) {
      supabase.from("channels" as any).select("id, name, type, is_private").eq("id", channelId).maybeSingle()
        .then(({ data }) => { if (data) setActiveChannel(data as any); });
      return;
    }
    // On mobile without channelId, don't auto-navigate — show channel list
    if (isMobile) {
      setActiveChannel(null);
      return;
    }
    supabase.from("channels" as any).select("id, name, type, is_private").eq("server_id", serverId).eq("type", "text").order("position").limit(1)
      .then(({ data }) => {
        if (data && (data as any[]).length > 0) {
          const ch = (data as any[])[0];
          navigate(`/server/${serverId}/channel/${ch.id}`, { replace: true });
        }
      });
  }, [serverId, channelId, navigate, isMobile]);

  const handleChannelSelect = (channel: { id: string; name: string; type: string; is_private?: boolean }) => {
    if (channel.type !== "voice") {
      setActiveChannel(channel);
      // On mobile, navigate to the channel route for full-page chat
      if (isMobile) {
        navigate(`/server/${serverId}/channel/${channel.id}`);
      }
    }
  };

  const handleVoiceChannelSelect = (channel: { id: string; name: string }) => {
    if (voiceChannel && voiceChannel.id !== channel.id) {
      setPendingVoiceChannel(channel);
      setSwitchDialogOpen(true);
      return;
    }
    joinVoiceChannel(channel);
  };

  const joinVoiceChannel = (channel: { id: string; name: string }) => {
    setVoiceCtx({ id: channel.id, name: channel.name, serverId: serverId! });
    if (!activeChannel && serverId && !isMobile) {
      supabase.from("channels" as any).select("id, name, type, is_private").eq("server_id", serverId).eq("type", "text").order("position").limit(1)
        .then(({ data }) => {
          if (data && (data as any[]).length > 0) {
            const ch = (data as any[])[0];
            setActiveChannel(ch as any);
            navigate(`/server/${serverId}/channel/${ch.id}`, { replace: true });
          }
        });
    }
  };

  const confirmSwitch = async () => {
    disconnectVoice();
    await new Promise(r => setTimeout(r, 100));
    if (pendingVoiceChannel) {
      joinVoiceChannel(pendingVoiceChannel);
    }
    setSwitchDialogOpen(false);
    setPendingVoiceChannel(null);
  };

  if (!serverId) return null;

  const renderMainContent = () => {
    if (!activeChannel) {
      return <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a channel</div>;
    }
    return <ServerChannelChat channelId={activeChannel.id} channelName={activeChannel.name} isPrivate={activeChannel.is_private} hasAccess={hasAccess} />;
  };

  const switchDialog = (
    <AlertDialog open={switchDialogOpen} onOpenChange={setSwitchDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("channels.switchVoice")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("channels.switchVoiceDesc", { name: pendingVoiceChannel?.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setSwitchDialogOpen(false); setPendingVoiceChannel(null); }}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmSwitch}>
            {t("common.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Mobile layout
  if (isMobile) {
    // Phase 2: Channel chat (full-page)
    if (channelId && activeChannel) {
      return (
        <>
          <div className="flex flex-col h-full">
            <header className="flex items-center gap-2 p-2 border-b border-border/50 glass">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/server/${serverId}`)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium flex-1 truncate">#{activeChannel.name}</span>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Users className="h-4 w-4" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-[280px]">
                  <ServerMemberList serverId={serverId} />
                </SheetContent>
              </Sheet>
            </header>
            <div className="flex-1 min-h-0">{renderMainContent()}</div>
          </div>
          {switchDialog}
        </>
      );
    }

    // Phase 1: Server page (ServerRail + ChannelSidebar)
    return (
      <>
        <div className="flex h-full w-full max-w-full overflow-x-hidden">
          <ServerRail />
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            <ChannelSidebar serverId={serverId} activeChannelId={activeChannel?.id} onChannelSelect={handleChannelSelect} onVoiceChannelSelect={handleVoiceChannelSelect} activeVoiceChannelId={voiceChannel?.id} />
          </div>
        </div>
        {switchDialog}
      </>
    );
  }

  // Desktop layout
  return (
    <>
      <div className="flex h-full">
        <ChannelSidebar serverId={serverId} activeChannelId={activeChannel?.id} onChannelSelect={handleChannelSelect} onVoiceChannelSelect={handleVoiceChannelSelect} activeVoiceChannelId={voiceChannel?.id} />
        <div className="flex-1 flex flex-col min-h-0">
          {remoteScreenStream && (
            <ScreenShareViewer stream={remoteScreenStream} sharerName={screenSharerName || "User"} />
          )}
          {remoteCameraStream && (
            <CameraViewer stream={remoteCameraStream} />
          )}
          <div className="flex-1 min-h-0">{renderMainContent()}</div>
        </div>
        {showMembers && <ServerMemberList serverId={serverId} />}
        {!showMembers && (
          <Button variant="ghost" size="icon" className="absolute top-3 end-3" onClick={() => setShowMembers(true)}>
            <Users className="h-4 w-4" />
          </Button>
        )}
      </div>
      {switchDialog}
    </>
  );
};

export default ServerView;
