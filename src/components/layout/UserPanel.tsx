import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { usePresence } from "@/hooks/usePresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Headphones, HeadphoneOff, Settings, PhoneOff, Monitor, MonitorOff, Video, VideoOff } from "lucide-react";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import NameplateWrapper from "@/components/shared/NameplateWrapper";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";

interface UserPanelProps {
  className?: string;
}

const UserPanel = ({ className }: UserPanelProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { voiceChannel, disconnectVoice, isScreenSharing, isCameraOn, nativeResolutionLabel } = useVoiceChannel();
  const { getUserStatus } = usePresence();

  const status = (getUserStatus(profile) || "online") as UserStatus;

  if (!user) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Voice connection status */}
      {voiceChannel && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/30">
          <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-xs font-medium truncate flex-1">#{voiceChannel.name}</span>
          {isScreenSharing && nativeResolutionLabel && (
            <span className="text-[10px] font-bold text-green-400 shrink-0 leading-none">
              {nativeResolutionLabel}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 shrink-0 ${isCameraOn ? "text-green-500" : ""}`}
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-camera"))}
            title={isCameraOn ? t("calls.stopCamera") : t("calls.startCamera")}
          >
            {isCameraOn ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 shrink-0 ${isScreenSharing ? "text-green-500" : ""}`}
            onClick={() => {
              if (isScreenSharing) {
                window.dispatchEvent(new CustomEvent("stop-screen-share"));
              } else {
                window.dispatchEvent(new CustomEvent("open-go-live"));
              }
            }}
            title={isScreenSharing ? t("calls.stopSharing") : t("calls.shareScreen")}
          >
            {isScreenSharing ? <MonitorOff className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={disconnectVoice}>
            <PhoneOff className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* User profile row + audio controls */}
      <NameplateWrapper nameplateUrl={profile?.nameplate_url} isPro={profile?.is_pro} className="rounded-md">
      <div className="flex items-center gap-2 p-2">
        <NavLink to="/settings" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {(profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <StatusBadge status={status} size="sm" className="absolute bottom-0 end-0" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate leading-tight">{profile?.display_name || profile?.username || "User"}</p>
            {profile?.username && <p className="text-[10px] text-muted-foreground truncate leading-tight">@{profile.username}</p>}
          </div>
        </NavLink>

        <div className="flex items-center shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleGlobalMute} title={globalMuted ? t("audio.unmute") : t("audio.mute")}>
            {globalMuted ? <MicOff className="h-3.5 w-3.5 text-destructive" /> : <Mic className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleGlobalDeafen} title={globalDeafened ? t("audio.undeafen") : t("audio.deafen")}>
            {globalDeafened ? <HeadphoneOff className="h-3.5 w-3.5 text-destructive" /> : <Headphones className="h-3.5 w-3.5" />}
          </Button>
          <NavLink to="/settings">
            <Button variant="ghost" size="icon" className="h-7 w-7" title={t("nav.settings")}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </NavLink>
        </div>
      </div>
      </NameplateWrapper>
    </div>
  );
};

export default UserPanel;
