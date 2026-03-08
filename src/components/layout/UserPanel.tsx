import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Mic, MicOff, Headphones, HeadphoneOff, Settings, PhoneOff, Monitor, MonitorOff, Video, VideoOff, ChevronDown } from "lucide-react";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import NameplateWrapper from "@/components/shared/NameplateWrapper";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import StyledDisplayName from "@/components/StyledDisplayName";
import UserPanelPopover from "./UserPanelPopover";
import AudioControlPopover from "./AudioControlPopover";

interface UserPanelProps {
  className?: string;
}

const UserPanel = ({ className }: UserPanelProps) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { voiceChannel, disconnectVoice, isScreenSharing, isCameraOn, nativeResolutionLabel } = useVoiceChannel();
  
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [micPopoverOpen, setMicPopoverOpen] = useState(false);
  const [speakerPopoverOpen, setSpeakerPopoverOpen] = useState(false);

  const status = ((profile as any)?.status || "online") as UserStatus;

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
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 p-2 cursor-pointer hover:opacity-90 transition-opacity">
            <AvatarDecorationWrapper decorationUrl={(profile as any)?.avatar_decoration_url} isPro={profile?.is_pro} size={32} className="shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <StatusBadge status={status} size="sm" className="absolute bottom-0 end-0 z-20" />
            </AvatarDecorationWrapper>
            <div className="min-w-0 flex-1">
              <StyledDisplayName
                displayName={profile?.display_name || profile?.username || "User"}
                fontStyle={(profile as any)?.name_font}
                effect={(profile as any)?.name_effect}
                gradientStart={(profile as any)?.name_gradient_start}
                gradientEnd={(profile as any)?.name_gradient_end}
                className="text-xs font-bold truncate leading-tight"
              />
              {profile?.username && <p className="text-[10px] text-muted-foreground truncate leading-tight">@{profile.username}</p>}
            </div>

            <div className="flex items-center shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              {/* Mic button group */}
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-e-none" onClick={toggleGlobalMute} title={globalMuted ? t("audio.unmute") : t("audio.mute")}>
                  {globalMuted ? <MicOff className="h-3.5 w-3.5 text-destructive" /> : <Mic className="h-3.5 w-3.5" />}
                </Button>
                <AudioControlPopover type="input" open={micPopoverOpen} onOpenChange={setMicPopoverOpen}>
                  <Button variant="ghost" size="icon" className="h-7 w-4 rounded-s-none px-0" title={t("settings.microphone")}>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </AudioControlPopover>
              </div>

              {/* Speaker button group */}
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-e-none" onClick={toggleGlobalDeafen} title={globalDeafened ? t("audio.undeafen") : t("audio.deafen")}>
                  {globalDeafened ? <HeadphoneOff className="h-3.5 w-3.5 text-destructive" /> : <Headphones className="h-3.5 w-3.5" />}
                </Button>
                <AudioControlPopover type="output" open={speakerPopoverOpen} onOpenChange={setSpeakerPopoverOpen}>
                  <Button variant="ghost" size="icon" className="h-7 w-4 rounded-s-none px-0" title={t("settings.speakers")}>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </AudioControlPopover>
              </div>

              <NavLink to="/settings">
                <Button variant="ghost" size="icon" className="h-7 w-7" title={t("nav.settings")}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </NavLink>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" sideOffset={8} collisionPadding={8} className="p-0 w-auto">
          <UserPanelPopover onClose={() => setPopoverOpen(false)} />
        </PopoverContent>
      </Popover>
      </NameplateWrapper>
    </div>
  );
};

export default UserPanel;
