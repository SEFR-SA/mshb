import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Volume2 } from "lucide-react";

interface ActiveFriend {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  channelId: string;
  channelName: string;
  serverId: string;
  serverName: string;
  serverIcon: string | null;
}

interface ActiveNowPanelProps {
  friendUserIds: string[];
}

const ActiveNowPanel: React.FC<ActiveNowPanelProps> = ({ friendUserIds }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeFriends, setActiveFriends] = useState<ActiveFriend[]>([]);

  const fetchActive = useCallback(async () => {
    if (friendUserIds.length === 0) {
      setActiveFriends([]);
      return;
    }

    const { data: participants } = await supabase
      .from("voice_channel_participants")
      .select("user_id, channel_id")
      .in("user_id", friendUserIds);

    if (!participants || participants.length === 0) {
      setActiveFriends([]);
      return;
    }

    const channelIds = [...new Set(participants.map((p) => p.channel_id))];
    const userIds = [...new Set(participants.map((p) => p.user_id))];

    const [{ data: channels }, { data: profiles }] = await Promise.all([
      supabase.from("channels").select("id, name, server_id").in("id", channelIds),
      supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds),
    ]);

    const serverIds = [...new Set((channels || []).map((c) => c.server_id))];
    const { data: servers } = serverIds.length > 0
      ? await supabase.from("servers").select("id, name, icon_url").in("id", serverIds)
      : { data: [] };

    const channelMap = new Map((channels || []).map((c) => [c.id, c]));
    const serverMap = new Map((servers || []).map((s) => [s.id, s]));
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    const result: ActiveFriend[] = participants.map((p) => {
      const channel = channelMap.get(p.channel_id);
      const server = channel ? serverMap.get(channel.server_id) : null;
      const profile = profileMap.get(p.user_id);
      return {
        userId: p.user_id,
        displayName: profile?.display_name || profile?.username || "User",
        username: profile?.username || null,
        avatarUrl: profile?.avatar_url || null,
        channelId: p.channel_id,
        channelName: channel?.name || "Voice",
        serverId: channel?.server_id || "",
        serverName: server?.name || "Server",
        serverIcon: server?.icon_url || null,
      };
    });

    setActiveFriends(result);
  }, [friendUserIds]);

  useEffect(() => {
    fetchActive();

    const channel = supabase
      .channel("active-now-voice")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants" }, () => {
        fetchActive();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [fetchActive]);

  const handleJoinVoice = (serverId: string, channelId: string) => {
    navigate(`/server/${serverId}?voiceChannel=${channelId}`);
  };

  const initials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        {t("friends.activeNow")}
      </h3>

      {activeFriends.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <p className="text-sm text-muted-foreground">{t("friends.noActiveNow")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeFriends.map((friend) => (
            <div key={friend.userId} className="rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatarUrl || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {initials(friend.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm truncate">{friend.displayName}</span>
              </div>

              <div className="ms-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  {friend.serverIcon ? (
                    <img src={friend.serverIcon} alt="" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-primary">{initials(friend.serverName)}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate">{friend.serverName}</span>
                </div>

                <button
                  onClick={() => handleJoinVoice(friend.serverId, friend.channelId)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-start ps-0.5"
                >
                  <Volume2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{friend.channelName}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveNowPanel;
