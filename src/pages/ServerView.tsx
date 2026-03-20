import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMountEffect } from "@/hooks/useMountEffect";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import ChannelSidebar from "@/components/server/ChannelSidebar";
import ServerChannelChat from "@/components/server/ServerChannelChat";
import ServerMemberList from "@/components/server/ServerMemberList";
import StreamGrid from "@/components/server/StreamGrid";
import CameraViewer from "@/components/server/CameraViewer";
import ServerRail from "@/components/server/ServerRail";
import SupportChannelView from "@/components/server/SupportChannelView";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Menu, Users, ArrowLeft } from "lucide-react";

const ServerView = () => {
  const { serverId, channelId } = useParams<{ serverId: string; channelId?: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { voiceChannel, setVoiceChannel: setVoiceCtx, disconnectVoice, remoteScreenStreams, remoteCameraStream, isWatchingStream, setIsWatchingStream, isScreenSharing, localScreenStream } = useVoiceChannel();
  const [activeChannel, setActiveChannel] = useState<{ id: string; name: string; type: string; is_private?: boolean; is_announcement?: boolean; is_rules?: boolean; description?: string | null; restricted_permissions?: string[] } | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean>(true);
  const [showMembers, setShowMembers] = useState(!isMobile);
  const [pendingVoiceChannel, setPendingVoiceChannel] = useState<{ id: string; name: string } | null>(null);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);

  // Combine remote + local screen streams so the local user sees their own share in the grid
  const allScreenStreams = useMemo(() => {
    const combined = [...remoteScreenStreams];
    if (isScreenSharing && localScreenStream && user) {
      combined.push({
        identity: user.id,
        name: (profile as any)?.display_name || (profile as any)?.username || "You",
        stream: localScreenStream,
      });
    }
    return combined;
  }, [remoteScreenStreams, isScreenSharing, localScreenStream, user, profile]);

  // Fetch user's server role for canEdit check
  useMountEffect(() => {
    if (!user || !serverId) return;
    supabase
      .from("server_members" as any)
      .select("role")
      .eq("server_id", serverId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setCanEdit(data?.role === "owner" || data?.role === "admin");
      });
  });

  // Immediately update activeChannel.description when the sidebar edit dialog saves
  useEffect(() => {
    const handler = (e: Event) => {
      const { channelId: updatedId, description } = (e as CustomEvent).detail;
      setActiveChannel(prev =>
        prev?.id === updatedId ? { ...prev, description } : prev
      );
    };
    window.addEventListener("channel-description-updated", handler);
    return () => window.removeEventListener("channel-description-updated", handler);
  }, []);

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
      supabase.from("channels" as any).select("id, name, type, is_private, is_announcement, is_rules, description, restricted_permissions").eq("id", channelId).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setActiveChannel(data as any);
          } else {
            setActiveChannel(null);
            navigate(`/server/${serverId}`, { replace: true });
          }
        });
      return;
    }
    // No channelId — show channel list without auto-selecting any channel
    setActiveChannel(null);
  }, [serverId, channelId, navigate]);

  // Realtime + polling fallback for deleted/missing channels
  useEffect(() => {
    if (!serverId || !channelId) return;

    let isActive = true;
    let pollInterval = 2000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const ensureChannelExists = async () => {
      const { data } = await supabase
        .from("channels" as any)
        .select("id, name, type, is_private, is_announcement, is_rules, description, restricted_permissions")
        .eq("id", channelId)
        .maybeSingle();

      if (!isActive) return;

      if (!data) {
        setActiveChannel(null);
        navigate(`/server/${serverId}`, { replace: true });
        return;
      }

      setActiveChannel(data as any);
    };

    const schedulePoll = () => {
      timeoutId = setTimeout(async () => {
        await ensureChannelExists();
        if (!isActive) return;
        pollInterval = Math.min(Math.floor(pollInterval * 1.5), 30000);
        schedulePoll();
      }, pollInterval);
    };

    const realtime = supabase
      .channel(`server-view-channel-${channelId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "channels",
        filter: `id=eq.${channelId}`,
      }, () => {
        pollInterval = 2000;
        ensureChannelExists();
      })
      .subscribe();

    schedulePoll();

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      realtime.unsubscribe();
    };
  }, [serverId, channelId, navigate]);

  const handleChannelSelect = (channel: { id: string; name: string; type: string; is_private?: boolean; is_announcement?: boolean; is_rules?: boolean }) => {
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
      supabase.from("channels" as any).select("id, name, type, is_private, is_announcement, is_rules").eq("server_id", serverId).eq("type", "text").order("position").limit(1)
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
    if (activeChannel.type === "support") {
      return <SupportChannelView serverId={serverId} channelId={activeChannel.id} channelName={activeChannel.name} />;
    }
    return <ServerChannelChat channelId={activeChannel.id} channelName={activeChannel.name} isPrivate={activeChannel.is_private} hasAccess={hasAccess} serverId={serverId} isAnnouncement={activeChannel.is_announcement} isRules={activeChannel.is_rules} channelType={activeChannel.type} channelDescription={activeChannel.description ?? null} canEdit={canEdit} restrictedPermissions={activeChannel.restricted_permissions ?? []} />;
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
            {allScreenStreams.length > 0 && isWatchingStream && (
              <StreamGrid streams={allScreenStreams} channelName={voiceChannel?.name || ""} onStopWatching={() => setIsWatchingStream(false)} />
            )}
            <div className="flex-1 min-h-0">{renderMainContent()}</div>
          </div>
          {switchDialog}
        </>
      );
    }

    // Phase 1: Server page (ServerRail + ChannelSidebar)
    return (
      <>
        <div className="flex h-full w-full max-w-full overflow-x-hidden bg-background">
          <ServerRail />
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col bg-surface rounded-tl-[16px]">
            {allScreenStreams.length > 0 && isWatchingStream && (
              <StreamGrid streams={allScreenStreams} channelName={voiceChannel?.name || ""} onStopWatching={() => setIsWatchingStream(false)} />
            )}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChannelSidebar serverId={serverId} activeChannelId={activeChannel?.id} onChannelSelect={handleChannelSelect} onVoiceChannelSelect={handleVoiceChannelSelect} activeVoiceChannelId={voiceChannel?.id} />
            </div>
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
          {allScreenStreams.length > 0 && isWatchingStream && (
            <StreamGrid streams={allScreenStreams} channelName={voiceChannel?.name || ""} onStopWatching={() => setIsWatchingStream(false)} />
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
