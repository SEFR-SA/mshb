import React from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

interface Props {
  statusText?: string | null;
  isEditable?: boolean;
  onClick?: () => void;
}

const StatusBubble = ({ statusText, isEditable, onClick }: Props) => {
  const { t } = useTranslation();

  if (!statusText && !isEditable) return null;

  if (!statusText && isEditable) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/10 hover:bg-black/20 transition-colors text-xs text-muted-foreground whitespace-nowrap"
      >
        <Plus className="h-3 w-3 shrink-0" />
        {t("setStatus.addStatus")}
      </button>
    );
  }

  // Bubble with tail
  const Wrapper = (isEditable ? "button" : "span") as any;
  return (
    <Wrapper
      onClick={isEditable ? onClick : undefined}
      className="relative inline-block max-w-[160px] pl-2"
    >
      {/* Left-pointing tail */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "8px solid hsl(var(--muted))",
        }}
      />
      <span className="block px-3 py-1.5 rounded-full bg-muted text-foreground text-xs truncate shadow-md">
        {statusText}
      </span>
    </Wrapper>
  );
};

export default StatusBubble;
