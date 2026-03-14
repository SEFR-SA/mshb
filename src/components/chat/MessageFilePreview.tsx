import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download } from "lucide-react";
import ImageViewer from "./ImageViewer";
import ForwardImageDialog from "./ForwardImageDialog";

interface MessageFilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  isMine: boolean;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageFilePreview = ({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  isMine,
  senderName,
  senderAvatar,
  timestamp,
}: MessageFilePreviewProps) => {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  if (fileType?.startsWith("image/")) {
    return (
      <>
        <img
          src={fileUrl}
          alt={fileName}
          className="relative z-10 pointer-events-auto max-w-full max-h-60 rounded-lg cursor-pointer transition-opacity hover:opacity-90 object-cover"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFullscreen(true); }}
        />
        {fullscreen && (
          <ImageViewer
            src={fileUrl}
            alt={fileName}
            fileName={fileName}
            fileSize={formatFileSize(fileSize)}
            senderName={senderName}
            senderAvatar={senderAvatar}
            timestamp={timestamp}
            onForward={() => setForwardOpen(true)}
            onClose={() => setFullscreen(false)}
          />
        )}
        <ForwardImageDialog
          open={forwardOpen}
          onOpenChange={setForwardOpen}
          fileUrl={fileUrl}
          fileName={fileName}
          fileType={fileType}
          fileSize={fileSize}
        />
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
