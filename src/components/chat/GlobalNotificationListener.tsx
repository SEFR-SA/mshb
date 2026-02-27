import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playNotificationSound } from "@/lib/soundManager";
import { toast } from "@/hooks/use-toast";

const GlobalNotificationListener = () => {
    const { user, profile } = useAuth();
    const location = useLocation();
    const pathnameRef = useRef(location.pathname);

    // Keep ref up to date without triggering re-renders in the effect
    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    useEffect(() => {
        if (!user) return;

        const handleNewMessage = async (payload: any) => {
            const msg = payload.new;

            // 1. Ignore own messages
            if (msg.author_id === user.id) return;

            // Ensure we only process messages for channels (not DMs which use thread_id)
            if (!msg.channel_id) return;

            try {
                // Fetch channel and server info to get notification settings and names
                const res = await supabase
                    .from("channels" as any)
                    .select("name, server_id, servers(name)")
                    .eq("id", msg.channel_id)
                    .maybeSingle();

                const channelData = res.data as any;

                if (!channelData || !channelData.servers) return;

                const serverName = channelData.servers.name;
                const notificationLevel = channelData.servers.default_notification_level || "all_messages";

                // 2. Parse Mentions
                const content = msg.content || "";
                const isMentioned =
                    content.includes("@all") ||
                    content.includes("@everyone") ||
                    content.includes("@here") ||
                    (profile?.username && content.includes(`@${profile.username}`)) ||
                    (profile?.display_name && content.includes(`@${profile.display_name}`));

                // 3. Check Active Channel
                const isActiveChannel = pathnameRef.current.includes(`/channel/${msg.channel_id}`);

                // 4. Determine if we should play sound/toast
                let shouldNotify = false;

                if (isActiveChannel) {
                    // If actively viewing the channel, ONLY ping on strict mention to avoid spam
                    if (isMentioned) shouldNotify = true;
                } else {
                    // Not viewing the channel
                    if (notificationLevel === "all_messages") {
                        shouldNotify = true;
                    } else if (notificationLevel === "only_mentions" && isMentioned) {
                        shouldNotify = true;
                    }
                }

                if (shouldNotify) {
                    playNotificationSound().catch(() => { });

                    // Optional: we can fetch author name quickly for the toast, 
                    // but avoiding extra queries if possible is better. We'll show server/channel
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

    return null; // Headless component
};

export default GlobalNotificationListener;
