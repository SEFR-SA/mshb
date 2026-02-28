import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useTheme } from "@/contexts/ThemeContext";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { usePendingFriendRequests } from "@/hooks/usePendingFriendRequests";
import { Users } from "lucide-react";
import CallListener from "@/components/chat/CallListener";
import ServerRail from "@/components/server/ServerRail";
import VoiceConnectionManager from "@/components/server/VoiceConnectionBar";
import GlobalNotificationListener from "@/components/chat/GlobalNotificationListener";
import { NavLink } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AppLayout = () => {
  const { t } = useTranslation();
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

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${colorTheme === "default" ? "bg-background" : ""}`} style={colorTheme !== "default" ? gradientStyle : undefined}>
      <CallListener />
      <GlobalNotificationListener />

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
          {/* Separator: placed below the WCO overlay so it is never obscured by the native buttons background */}
          <div className="relative z-[9999] shrink-0 h-px w-full bg-border/40" />
        </>
      )}

      {/* Main content row — fills all remaining height below the title bar */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ServerRail is rendered by child views (HomeView, ServerView) on mobile, not here */}
        {!isMobile && <ServerRail />}
        <main className="flex-1 flex flex-col overflow-hidden">
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
                <Users className="h-5 w-5" />
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
