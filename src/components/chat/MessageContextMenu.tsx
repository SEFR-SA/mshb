import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, Reply, Pencil, EyeOff, Trash2, BookmarkMinus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface MessageContextMenuProps {
  children: React.ReactNode;
  content: string;
  messageId: string;
  isMine: boolean;
  isDeleted: boolean;
  onReply?: (content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onMarkUnread?: (messageId: string) => void;
}

const MessageContextMenu = ({
  children,
  content,
  messageId,
  isMine,
  isDeleted,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onMarkUnread,
}: MessageContextMenuProps) => {
  const { t } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast({ title: t("actions.copied") });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {!isDeleted && content && (
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 me-2" />
            {t("actions.copyText")}
          </ContextMenuItem>
        )}
        {!isDeleted && onReply && (
          <ContextMenuItem onClick={() => onReply(content)}>
            <Reply className="h-4 w-4 me-2" />
            {t("actions.reply")}
          </ContextMenuItem>
        )}
        {isMine && !isDeleted && onEdit && (
          <ContextMenuItem onClick={() => onEdit(messageId, content)}>
            <Pencil className="h-4 w-4 me-2" />
            {t("actions.edit")}
          </ContextMenuItem>
        )}
        {onMarkUnread && (
          <ContextMenuItem onClick={() => onMarkUnread(messageId)}>
            <BookmarkMinus className="h-4 w-4 me-2" />
            {t("actions.markUnread")}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {onDeleteForMe && (
          <ContextMenuItem onClick={() => onDeleteForMe(messageId)}>
            <EyeOff className="h-4 w-4 me-2" />
            {t("actions.deleteForMe")}
          </ContextMenuItem>
        )}
        {isMine && !isDeleted && onDeleteForEveryone && (
          <ContextMenuItem onClick={() => onDeleteForEveryone(messageId)} className="text-destructive">
            <Trash2 className="h-4 w-4 me-2" />
            {t("actions.deleteForEveryone")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default MessageContextMenu;
