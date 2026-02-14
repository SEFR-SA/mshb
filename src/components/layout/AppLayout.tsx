import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useTheme } from "@/contexts/ThemeContext";

import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { usePendingFriendRequests } from "@/hooks/usePendingFriendRequests";
import { MessageSquare, Settings, Users, Download, Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import CallListener from "@/components/chat/CallListener";
import ServerRail from "@/components/server/ServerRail";
import VoiceConnectionManager from "@/components/server/VoiceConnectionBar";
import { NavLink } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AppLayout = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { voiceChannel, disconnectVoice } = useVoiceChannel();
  const { getGradientStyle, colorTheme } = useTheme();
  const isMobile = useIsMobile();
  const { totalUnread } = useUnreadCount();
  const { pendingCount } = usePendingFriendRequests();
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [serverDrawerOpen, setServerDrawerOpen] = useState(false);

  const gradientStyle = colorTheme !== "default" ? getGradientStyle() : {};

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    setInstallPrompt(null);
  };

  const navItems = [
    { to: "/", icon: MessageSquare, label: t("nav.inbox"), badge: totalUnread },
    { to: "/friends", icon: Users, label: t("nav.friends"), badge: pendingCount },
    
  ];

  const initials = (profile?.display_name || profile?.username || user?.email || "?")
    .charAt(0).toUpperCase();

  return (
    <div className={`flex h-screen overflow-hidden ${colorTheme === "default" ? "bg-background" : ""}`} style={colorTheme !== "default" ? gradientStyle : undefined}>
      <CallListener />
      {/* Server Rail */}
      {!isMobile && <ServerRail />}
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top header */}
        {isMobile && (
          <>
            <header className="flex items-center justify-between p-3 glass border-b border-border/50">
              <div className="flex items-center gap-2">
                <button onClick={() => setServerDrawerOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-bold text-primary">✦ {t("app.name")}</h1>
              </div>
            </header>
            <Sheet open={serverDrawerOpen} onOpenChange={setServerDrawerOpen}>
              <SheetContent side="left" className="p-0 w-[80px] border-none bg-sidebar/30 backdrop-blur-sm">
                <ServerRail onNavigate={() => setServerDrawerOpen(false)} />
              </SheetContent>
            </Sheet>
          </>
        )}

        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {voiceChannel && (
          <VoiceConnectionManager
            channelId={voiceChannel.id}
            channelName={voiceChannel.name}
            serverId={voiceChannel.serverId}
            onDisconnect={disconnectVoice}
          />
        )}

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="flex glass border-t border-border/50">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `relative flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute -top-1 end-1/4 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
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
  );
};

export default AppLayout;
