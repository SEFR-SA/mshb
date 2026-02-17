import React from "react";
import { useTranslation } from "react-i18next";
import { Reply } from "lucide-react";

interface ReplyPreviewProps {
  authorName: string;
  content: string;
  onClick?: () => void;
}

const ReplyPreview = ({ authorName, content, onClick }: ReplyPreviewProps) => {
  const { t } = useTranslation();
  const truncated = content.length > 80 ? content.slice(0, 80) + "…" : content;

  return (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted/30 rounded px-2 py-1 mb-0.5 border-s-2 border-primary/60"
      onClick={onClick}
    >
      <Reply className="h-3 w-3 shrink-0 rotate-180" />
      <span className="font-semibold text-primary/80 shrink-0">{authorName}</span>
      <span className="truncate opacity-70">{truncated || "…"}</span>
    </div>
  );
};

export default ReplyPreview;
