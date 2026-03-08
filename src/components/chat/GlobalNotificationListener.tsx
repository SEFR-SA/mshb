import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/soundManager";
import { getNotificationPrefs } from "@/lib/notificationPrefs";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useStreamerMode } from "@/contexts/StreamerModeContext";
import { toast } from "@/hooks/use-toast";

const GlobalNotificationListener = () => {
    const { user, profile } = useAuth();
    const { isStreamerMode } = useStreamerMode();
    const location = useLocation();
    const pathnameRef = useRef(location.pathname);
    const { totalUnread } = useUnreadCount();

    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    // Tab title unread count
    useEffect(() => {
        const prefs = getNotificationPrefs();
        if (prefs.showTabCount && totalUnread > 0) {
            document.title = `(${totalUnread}) MSHB`;
        } else {
            document.title = "MSHB";
        }
    }, [totalUnread]);

    useEffect(() => {
        if (!user) return;

        const handleNewMessage = async (payload: any) => {
            const msg = payload.new;

            if (msg.author_id === user.id) return;
            if (!msg.channel_id) return;

            try {
                const res = await supabase
                    .from("channels" as any)
                    .select("name, server_id, servers(name)")
                    .eq("id", msg.channel_id)
                    .maybeSingle();

                const channelData = res.data as any;
                if (!channelData || !channelData.servers) return;

                const serverName = channelData.servers.name;
                const notificationLevel = channelData.servers.default_notification_level || "all_messages";

                const content = msg.content || "";
                const isMentioned =
                    content.includes("@all") ||
                    content.includes("@everyone") ||
                    content.includes("@here") ||
                    (profile?.username && content.includes(`@${profile.username}`)) ||
                    (profile?.display_name && content.includes(`@${profile.display_name}`));

                const isActiveChannel = pathnameRef.current.includes(`/channel/${msg.channel_id}`);

                let shouldNotify = false;
                if (isActiveChannel) {
                    if (isMentioned) shouldNotify = true;
                } else {
                    if (notificationLevel === "all_messages") {
                        shouldNotify = true;
                    } else if (notificationLevel === "only_mentions" && isMentioned) {
                        shouldNotify = true;
                    }
                }

                if (shouldNotify) {
                    const prefs = getNotificationPrefs();
                    const appFocused = document.hasFocus();

                    // Sound — respect toggles
                    const shouldPlaySound = isMentioned ? prefs.mentionSound : prefs.messageSound;
                    if (shouldPlaySound) {
                        playNotificationSound().catch(() => { });
                    }

                    // Native OS notification — only when unfocused
                    if (
                        prefs.desktopEnabled &&
                        !appFocused &&
                        typeof Notification !== "undefined" &&
                        Notification.permission === "granted"
                    ) {
                        new Notification(
                            isMentioned ? `Mention in ${serverName}` : `New message in ${serverName}`,
                            {
                                body: `#${channelData.name}: ${content.substring(0, 80)}${content.length > 80 ? "..." : ""}`,
                                icon: "/icon-192.png",
                                silent: true,
                            }
                        );
                    }

                    // In-app toast (when not on that channel)
                    if (!isActiveChannel) {
                        toast({
                            title: isMentioned ? `Mention in ${serverName}` : `New message in ${serverName}`,
                            description: `#${channelData.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                            duration: 4000
                        });
                    }
                }

            } catch (err) {
                console.error("Error processing notification:", err);
            }
        };

        const channel = supabase
            .channel("global-message-notifications")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleNewMessage)
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user, profile?.username, profile?.display_name]);

    return null;
};

export default GlobalNotificationListener;
