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
    <div className="flex items-center gap-1 ms-[4px] mb-[-2px]">
      {/* Reply arrow */}
      <svg
        className="shrink-0 text-muted-foreground/40 rtl:scale-x-[-1]"
        width="18"
        height="14"
        viewBox="0 0 18 14"
        fill="none"
      >
        <path
          d="M7 1L1 7L7 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M1 7H12C14.2091 7 16 8.7909 16 11V13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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
