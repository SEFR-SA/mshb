import { useEffect } from "react";

interface MessageKeybindHandlers {
  hoveredMessageId: string | null;
  messages: any[];
  currentUserId: string | undefined;
  onEdit?: (id: string, content: string) => void;
  onDeleteForMe?: (id: string) => void;
  onDeleteForEveryone?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onAddReaction?: (id: string) => void;
  onForward?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
}

const isInputFocused = () => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((document.activeElement as HTMLElement)?.isContentEditable) return true;
  return false;
};

/**
 * Message-level keyboard shortcuts that fire when hovering a message:
 * E → Edit (own msg), Backspace → Delete, P → Pin, + → Reaction, F → Forward
 * Ctrl+C → Copy (no selection), Alt+Enter → Mark unread
 */
export const useMessageKeybinds = ({
  hoveredMessageId,
  messages,
  currentUserId,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onTogglePin,
  onAddReaction,
  onForward,
  onMarkUnread,
}: MessageKeybindHandlers) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!hoveredMessageId) return;

      const msg = messages.find((m) => m.id === hoveredMessageId);
      if (!msg) return;

      const isMine = msg.author_id === currentUserId;
      const isDeleted = msg.deleted_for_everyone;

      // Ctrl+C — copy text (only when no text selection)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toUpperCase() === "C") {
        const selection = window.getSelection()?.toString();
        if (!selection && msg.content && !isDeleted) {
          e.preventDefault();
          navigator.clipboard.writeText(msg.content);
        }
        return;
      }

      // Alt+Enter — mark unread
      if (e.altKey && e.key === "Enter") {
        e.preventDefault();
        onMarkUnread?.(hoveredMessageId);
        return;
      }

      // Single-key shortcuts — skip if in input
      if (isInputFocused()) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch (e.key.toUpperCase()) {
        case "E":
          if (isMine && !isDeleted && onEdit) {
            e.preventDefault();
            onEdit(hoveredMessageId, msg.content);
          }
          break;
        case "BACKSPACE":
          e.preventDefault();
          if (isMine && !isDeleted && onDeleteForEveryone) {
            onDeleteForEveryone(hoveredMessageId);
          } else if (onDeleteForMe) {
            onDeleteForMe(hoveredMessageId);
          }
          break;
        case "P":
          if (!isDeleted && onTogglePin) {
            e.preventDefault();
            onTogglePin(hoveredMessageId);
          }
          break;
        case "+":
        case "=": // + is shift+= on most keyboards
          if (!isDeleted && onAddReaction) {
            e.preventDefault();
            onAddReaction(hoveredMessageId);
          }
          break;
        case "F":
          if (!isDeleted && onForward) {
            e.preventDefault();
            onForward(hoveredMessageId);
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hoveredMessageId, messages, currentUserId, onEdit, onDeleteForMe, onDeleteForEveryone, onTogglePin, onAddReaction, onForward, onMarkUnread]);
};
