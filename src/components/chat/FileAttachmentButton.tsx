import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

interface FileAttachmentButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const FileAttachmentButton = ({ onFileSelect, disabled }: FileAttachmentButtonProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

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
