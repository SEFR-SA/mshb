import React from "react";
import { useTranslation } from "react-i18next";
import { X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReplyInputBarProps {
  authorName: string;
  onCancel: () => void;
}

const ReplyInputBar = ({ authorName, onCancel }: ReplyInputBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-s-2 border-primary bg-muted/50 rounded-t-lg text-xs">
      <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="flex-1 truncate text-muted-foreground">
        {t("reply.replyingTo", { name: authorName })}
      </span>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCancel}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default ReplyInputBar;
