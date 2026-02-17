import React from "react";

interface ReplyPreviewProps {
  authorName: string;
  content: string;
  avatarUrl?: string;
  onClick?: () => void;
}

const ReplyPreview = ({ authorName, content, avatarUrl, onClick }: ReplyPreviewProps) => {
  const truncated = content.length > 80 ? content.slice(0, 80) + "…" : content;

  return (
    <div className="flex items-center gap-0 ms-[4px] mb-[-2px]">
      {/* Curved connector line */}
      <div
        className="shrink-0 self-end mb-[14px]"
        style={{
          width: 32,
          height: 16,
          borderLeft: "2px solid hsl(var(--muted-foreground) / 0.3)",
          borderTop: "2px solid hsl(var(--muted-foreground) / 0.3)",
          borderTopLeftRadius: 8,
        }}
      />
      {/* Reply content row */}
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground/70 transition-colors min-w-0 py-0.5"
        onClick={onClick}
      >
        {/* Tiny avatar */}
        <img
          src={avatarUrl || ""}
          alt=""
          className="h-4 w-4 rounded-full shrink-0 object-cover bg-muted"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="font-semibold text-foreground/70 shrink-0">{authorName}</span>
        <span className="truncate opacity-60">{truncated || "…"}</span>
      </div>
    </div>
  );
};

export default ReplyPreview;
