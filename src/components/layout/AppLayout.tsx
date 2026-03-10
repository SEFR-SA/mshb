import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useTheme } from "@/contexts/ThemeContext";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { usePendingFriendRequests } from "@/hooks/usePendingFriendRequests";
import { Home } from "lucide-react";
import CallListener from "@/components/chat/CallListener";
import ServerRail from "@/components/server/ServerRail";
import VoiceConnectionManager from "@/components/server/VoiceConnectionBar";
import UserPanel from "@/components/layout/UserPanel";
import GlobalNotificationListener from "@/components/chat/GlobalNotificationListener";
import { useGlobalKeybinds } from "@/hooks/useGlobalKeybinds";
import { useStreamerMode } from "@/contexts/StreamerModeContext";
import { useDeviceTracker } from "@/hooks/useDeviceTracker";
import { NavLink } from "react-router-dom";
import { Monitor, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AppLayout = () => {
  useGlobalKeybinds();
  useDeviceTracker();
  const { t } = useTranslation();
  const { isStreamerMode, toggleStreamerMode } = useStreamerMode();
  const { user, profile } = useAuth();
  const { voiceChannel, disconnectVoice } = useVoiceChannel();
  const { getGradientStyle, colorTheme } = useTheme();
  const isMobile = useIsMobile();
  const { totalUnread } = useUnreadCount();
  const location = useLocation();

  const gradientStyle = colorTheme !== "default" ? getGradientStyle() : {};

  const initials = (profile?.display_name || profile?.username || user?.email || "?")
    .charAt(0).toUpperCase();

  // Detect Electron — preload exposes window.electronAPI
  const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI;

  // On mobile, determine if we're in a "full-page" view (chat, channel chat) where bottom nav should be hidden
  const isFullPageView = isMobile && (
    location.pathname.startsWith("/chat/") ||
    location.pathname.startsWith("/group/") ||
    /^\/server\/[^/]+\/channel\//.test(location.pathname)
  );

  // Hide the floating UserPanel on the Friends Dashboard to avoid overlapping the FAB
  const isFriendsDashboard = location.pathname === "/" || location.pathname === "/friends";
  const isBoostPage = /\/server\/[^/]+\/boost/.test(location.pathname);

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${colorTheme === "default" ? "bg-background" : ""}`} style={colorTheme !== "default" ? gradientStyle : undefined}>
      <CallListener />
      <GlobalNotificationListener />

      {/* Streamer Mode banner */}
      {isStreamerMode && (
        <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-primary text-primary-foreground z-[9999]">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4" />
            <span>Streamer Mode is Enabled</span>
          </div>
          <button
            onClick={toggleStreamerMode}
            className="flex items-center gap-1 text-xs font-semibold opacity-90 hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
            Disable
          </button>
        </div>
      )}

      {/* Electron WCO title bar: app icon, version, drag region, and safe-area spacer */}
      {isElectron && (
        <>
          <div
            className="relative z-[9999] shrink-0 flex items-center h-8 px-3 gap-2 bg-background"
            style={{ WebkitAppRegion: "drag", WebkitUserSelect: "none" } as React.CSSProperties}
          >
            <img
              src={new URL("favicon.png", document.baseURI).href}
              alt="MSHB"
              className="h-5 w-5 object-contain"
              style={{ WebkitAppRegion: "no-drag" } as any}
              draggable={false}
            />
            <span
              className="text-xs text-foreground/60 font-medium select-none"
              style={{ WebkitAppRegion: "no-drag" } as any}
            >
              v1.0.4
            </span>
            {/* Spacer reserves ~140 px for the native WCO minimize/maximize/close buttons */}
            <div className="ms-auto w-[140px] shrink-0" />
          </div>
        </>
      )}

      {/* Main content row — fills all remaining height below the title bar */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {/* ServerRail is rendered by child views (HomeView, ServerView) on mobile, not here */}
        {!isMobile && !isBoostPage && <ServerRail />}

        {/* Floating user panel */}
        {!isMobile && !isBoostPage && (
          <UserPanel className="absolute bottom-0 left-0 z-50 m-2 w-[calc(72px+240px-16px)] bg-background border border-border/50 rounded-lg shadow-lg" />
        )}
        {isMobile && !isFullPageView && !isFriendsDashboard && !isBoostPage && (
          <UserPanel className="fixed bottom-[60px] left-2 right-2 z-50 bg-background border border-border/50 rounded-lg" />
        )}

        <main className="flex-1 flex flex-col overflow-hidden bg-surface rounded-tl-[16px]">
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>

          {voiceChannel && (
            <VoiceConnectionManager
              key={voiceChannel.id}
              channelId={voiceChannel.id}
              channelName={voiceChannel.name}
              serverId={voiceChannel.serverId}
              onDisconnect={disconnectVoice}
            />
          )}

          {/* Mobile bottom nav - only show on non-full-page views */}
          {isMobile && !isFullPageView && (
            <nav className="flex glass border-t border-border/50">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `relative flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${isActive || location.pathname === "/friends" ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Home className="h-5 w-5" fill="currentColor" />
                <span>{t("nav.home")}</span>
                {totalUnread > 0 && (
                  <span className="absolute -top-1 end-1/4 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {totalUnread}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <span>{t("nav.profile")}</span>
              </NavLink>
            </nav>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
