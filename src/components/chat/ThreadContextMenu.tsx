import React from "react";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, CheckCheck, BellOff, Trash2, User, Phone, X, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
  isDM?: boolean;
  onCloseDM?: () => void;
  onBlock?: () => void;
}

const ThreadContextMenu = ({
  children,
  isPinned,
  onTogglePin,
  onMarkAsRead,
  onDelete,
  isDM,
  onCloseDM,
  onBlock,
}: ThreadContextMenuProps) => {
  const { t } = useTranslation();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {isDM && (
          <ContextMenuItem onClick={() => toast({ title: "Feature coming soon" })}>
            <User className="h-4 w-4 me-2" />
            {t("profile.title")}
          </ContextMenuItem>
        )}
        {isDM && (
          <ContextMenuItem onClick={() => toast({ title: "Feature coming soon" })}>
            <Phone className="h-4 w-4 me-2" />
            {t("actions.call")}
          </ContextMenuItem>
        )}
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
        {isDM && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onCloseDM ? onCloseDM() : toast({ title: "Feature coming soon" })}>
              <X className="h-4 w-4 me-2" />
              {t("common.closeDM")}
            </ContextMenuItem>
          </>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 me-2" />
              {t("actions.deleteConversation")}
            </ContextMenuItem>
          </>
        )}
        {isDM && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onBlock ? onBlock() : toast({ title: "Feature coming soon" })} className="text-destructive focus:text-destructive">
              <Ban className="h-4 w-4 me-2" />
              {t("common.block")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ThreadContextMenu;
