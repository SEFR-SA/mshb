import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, Reply, Pencil, EyeOff, Trash2, BookmarkMinus, Smile, Forward, Pin, PinOff, Flag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useReportModal } from "@/contexts/ReportModalContext";
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
  authorName?: string;
  isMine: boolean;
  isDeleted: boolean;
  isPinned?: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  onReply?: (messageId: string, authorName: string, content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onMarkUnread?: (messageId: string) => void;
  onTogglePin?: (messageId: string) => void;
  onAddReaction?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
}

const MessageContextMenu = ({
  children,
  content,
  messageId,
  authorName,
  isMine,
  isDeleted,
  isPinned,
  fileUrl,
  fileName,
  fileType,
  fileSize,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onMarkUnread,
  onTogglePin,
  onAddReaction,
  onForward,
}: MessageContextMenuProps) => {
  const { t } = useTranslation();
  const { openReportModal } = useReportModal();

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
          <ContextMenuItem onClick={() => onReply(messageId, authorName || "User", content)}>
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
        {!isDeleted && (
          <>
            <ContextMenuItem onClick={() => onAddReaction?.(messageId)}>
              <Smile className="h-4 w-4 me-2" />
              {t("actions.addReaction")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onForward?.(messageId)}>
              <Forward className="h-4 w-4 me-2" />
              {t("actions.forward")}
            </ContextMenuItem>
            {onTogglePin ? (
              <ContextMenuItem onClick={() => onTogglePin(messageId)}>
                {isPinned ? <PinOff className="h-4 w-4 me-2" /> : <Pin className="h-4 w-4 me-2" />}
                {isPinned ? t("actions.unpinMessage") : t("actions.pinMessage")}
              </ContextMenuItem>
            ) : (
              <ContextMenuItem onClick={() => toast({ title: "Feature coming soon" })}>
                <Pin className="h-4 w-4 me-2" />
                {t("actions.pinMessage")}
              </ContextMenuItem>
            )}
          </>
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
        {!isMine && !isDeleted && (
          <ContextMenuItem onClick={() => openReportModal(messageId, authorName || "User")} className="text-destructive focus:text-destructive">
            <Flag className="h-4 w-4 me-2" />
            {t("actions.reportMessage")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default MessageContextMenu;
