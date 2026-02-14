import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Paperclip, Smile, ImageIcon, Sticker } from "lucide-react";
import FileAttachmentButton from "./FileAttachmentButton";
import EmojiPicker from "./EmojiPicker";
import GifPicker from "./GifPicker";
import StickerPicker from "./StickerPicker";

interface ChatInputActionsProps {
  onFileSelect: (file: File) => void;
  onEmojiSelect: (emoji: string) => void;
  onGifSelect: (url: string) => Promise<void>;
  onStickerSelect: (url: string) => Promise<void>;
  disabled?: boolean;
}

const ChatInputActions = ({
  onFileSelect,
  onEmojiSelect,
  onGifSelect,
  onStickerSelect,
  disabled,
}: ChatInputActionsProps) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  // Track which sub-picker to show after closing menu
  const [activePicker, setActivePicker] = useState<"file" | "emoji" | "gif" | "sticker" | null>(null);

  // Desktop: show all icons inline
  if (!isMobile) {
    return (
      <>
        <FileAttachmentButton onFileSelect={onFileSelect} disabled={disabled} />
        <EmojiPicker onEmojiSelect={onEmojiSelect} />
        <GifPicker onGifSelect={onGifSelect} />
        <StickerPicker onStickerSelect={onStickerSelect} />
      </>
    );
  }

  // Mobile/Tablet: single + button with action sheet
  const menuItems = [
    { key: "file" as const, icon: Paperclip, label: t("files.upload", "Upload File") },
    { key: "emoji" as const, icon: Smile, label: t("chat.emoji", "Insert Emoji") },
    { key: "gif" as const, icon: ImageIcon, label: t("chat.gif", "Send GIF") },
    { key: "sticker" as const, icon: Sticker, label: t("chat.stickers", "Stickers") },
  ];

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-52 p-1 animate-fade-in"
          sideOffset={8}
        >
          <div className="flex flex-col gap-0.5">
            {menuItems.map((item) => (
              <button
                key={item.key}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm hover:bg-muted/60 transition-colors text-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  setActivePicker(item.key);
                }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Render pickers off-screen, triggered programmatically */}
      {activePicker === "file" && (
        <MobileFilePicker
          onFileSelect={(f) => { onFileSelect(f); setActivePicker(null); }}
          onClose={() => setActivePicker(null)}
          disabled={disabled}
        />
      )}
      {activePicker === "emoji" && (
        <MobilePickerWrapper onClose={() => setActivePicker(null)}>
          <EmojiPicker onEmojiSelect={(emoji) => { onEmojiSelect(emoji); setActivePicker(null); }} />
        </MobilePickerWrapper>
      )}
      {activePicker === "gif" && (
        <MobilePickerWrapper onClose={() => setActivePicker(null)}>
          <GifPicker onGifSelect={(url) => { onGifSelect(url); setActivePicker(null); }} />
        </MobilePickerWrapper>
      )}
      {activePicker === "sticker" && (
        <MobilePickerWrapper onClose={() => setActivePicker(null)}>
          <StickerPicker onStickerSelect={(url) => { onStickerSelect(url); setActivePicker(null); }} />
        </MobilePickerWrapper>
      )}
    </>
  );
};

/** Invisible file input that auto-clicks on mount */
const MobileFilePicker = ({ onFileSelect, onClose, disabled }: { onFileSelect: (f: File) => void; onClose: () => void; disabled?: boolean }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Auto-trigger file dialog
    inputRef.current?.click();
  }, []);

  return (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
        else onClose();
      }}
      onBlur={onClose}
    />
  );
};

/** Wrapper that auto-clicks the picker trigger button on mount */
const MobilePickerWrapper = ({ children, onClose }: { children: React.ReactElement; onClose: () => void }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Find and click the trigger button inside the picker
    const btn = wrapperRef.current?.querySelector("button");
    if (btn) btn.click();
  }, []);

  return (
    <div ref={wrapperRef} className="hidden">
      {children}
    </div>
  );
};

export default ChatInputActions;
