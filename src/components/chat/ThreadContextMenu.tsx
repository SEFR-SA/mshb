import React from "react";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, CheckCheck, BellOff, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ThreadContextMenuProps {
  children: React.ReactNode;
  isPinned: boolean;
  onTogglePin: () => void;
  onMarkAsRead: () => void;
  onDelete?: () => void;
}

const ThreadContextMenu = ({
  children,
  isPinned,
  onTogglePin,
  onMarkAsRead,
  onDelete,
}: ThreadContextMenuProps) => {
  const { t } = useTranslation();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onTogglePin}>
          {isPinned ? <PinOff className="h-4 w-4 me-2" /> : <Pin className="h-4 w-4 me-2" />}
          {isPinned ? t("chat.unpinChat") : t("chat.pinChat")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onMarkAsRead}>
          <CheckCheck className="h-4 w-4 me-2" />
          {t("actions.markAsRead")}
        </ContextMenuItem>
        <ContextMenuItem disabled>
          <BellOff className="h-4 w-4 me-2" />
          {t("actions.muteNotifications")}
        </ContextMenuItem>
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 me-2" />
              {t("actions.deleteConversation")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ThreadContextMenu;
