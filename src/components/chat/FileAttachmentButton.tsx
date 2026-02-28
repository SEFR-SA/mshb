import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface FileAttachmentButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileAttachmentButton = ({ onFileSelect, disabled }: FileAttachmentButtonProps) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const isPro = (profile as any)?.is_pro ?? false;
  const MAX_FILE_SIZE = isPro ? 1024 * 1024 * 1024 : 50 * 1024 * 1024; // 1 GB vs 50 MB

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: t("files.tooLarge"), variant: "destructive" });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onFileSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  );
};

export default FileAttachmentButton;
