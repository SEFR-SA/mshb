import React, { useState } from "react";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "@/components/chat/EmojiPicker";
import type { Reaction } from "@/hooks/useMessageReactions";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface Props {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (messageId: string, emoji: string) => void;
  isMine?: boolean;
}

const MessageReactions = ({ messageId, reactions, currentUserId, onToggle, isMine }: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
      {reactions.map((r) => {
        const iReacted = r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(messageId, r.emoji)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
              iReacted
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-sm">{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
        );
      })}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            title="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1 mb-2">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onToggle(messageId, e); setPickerOpen(false); }}
                className="text-lg hover:scale-125 transition-transform p-1"
              >
                {e}
              </button>
            ))}
          </div>
          <EmojiPicker onEmojiSelect={(emoji) => { onToggle(messageId, emoji); setPickerOpen(false); }} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;
