import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download } from "lucide-react";

interface MessageFilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isMine: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageFilePreview = ({ fileUrl, fileName, fileType, fileSize, isMine }: MessageFilePreviewProps) => {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);

  if (fileType?.startsWith("image/")) {
    return (
      <>
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-60 rounded-lg cursor-pointer object-cover"
          onClick={() => setFullscreen(true)}
        />
        {fullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
            onClick={() => setFullscreen(false)}
          >
            <img src={fileUrl} alt={fileName} className="max-w-[90vw] max-h-[90vh] object-contain" />
          </div>
        )}
      </>
    );
  }

  if (fileType?.startsWith("video/")) {
    return (
      <video controls className="max-w-full max-h-60 rounded-lg">
        <source src={fileUrl} type={fileType} />
      </video>
    );
  }

  if (fileType?.startsWith("audio/")) {
    return (
      <audio controls className="max-w-full">
        <source src={fileUrl} type={fileType} />
      </audio>
    );
  }

  // Generic file
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 p-2 rounded-lg border ${
        isMine ? "border-primary-foreground/20 hover:bg-primary-foreground/10" : "border-border hover:bg-muted"
      } transition-colors`}
    >
      <FileText className="h-8 w-8 shrink-0 opacity-70" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {formatFileSize(fileSize)}
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
};

export default MessageFilePreview;
