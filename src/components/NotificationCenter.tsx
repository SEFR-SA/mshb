import React from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellDot, CheckCheck } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

function getNotificationText(n: Notification, t: (key: string, opts?: any) => string): string {
  const actorName = n.actor_profile?.display_name || n.actor_profile?.username || t("notificationCenter.someone");
  switch (n.type) {
    case "mention":
      return t("notificationCenter.mentionedYou", { name: actorName });
    case "server_invite":
      return t("notificationCenter.invitedYou", { name: actorName });
    case "missed_call":
      return t("notificationCenter.missedCall", { name: actorName });
    case "friend_request":
      return t("notificationCenter.friendRequest", { name: actorName });
    case "friend_accepted":
      return t("notificationCenter.friendAccepted", { name: actorName });
    case "server_kick":
      return t("notificationCenter.serverKick");
    case "stream_start":
      return t("notificationCenter.streamStart", { name: actorName });
    case "server_join":
      return t("notificationCenter.serverJoin", { name: actorName });
    case "group_invite":
      return t("notificationCenter.groupInvite", { name: actorName });
    default:
      return t("notificationCenter.genericNotification", { name: actorName });
  }
}

function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const { t } = useTranslation();
  const timeAgo = format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a");

  return (
    <button
      onClick={() => { if (!notification.is_read) onRead(notification.id); }}
      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-start transition-colors ${
        notification.is_read
          ? "opacity-60 hover:bg-muted/30"
          : "bg-primary/5 hover:bg-primary/10"
      }`}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={notification.actor_profile?.avatar_url || ""} />
        <AvatarFallback className="text-xs">
          {(notification.actor_profile?.display_name || "?").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          {getNotificationText(notification, t)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
}

function NotificationList() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-2">
        <h3 className="text-sm font-semibold text-foreground">{t("notificationCenter.title")}</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notificationCenter.markAllRead")}
          </button>
        )}
      </div>

      {/* Body */}
      <ScrollArea className="max-h-[360px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{t("notificationCenter.empty")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-1">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface NotificationCenterProps {
  children: React.ReactNode;
}

export function NotificationCenter({ children }: NotificationCenterProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Notifications</DrawerTitle>
          </DrawerHeader>
          <NotificationList />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-2">
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}
