import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel, type RemoteScreenShareInfo } from "@/contexts/VoiceChannelContext";
import ScreenShareViewer from "@/components/server/ScreenShareViewer";
import { Maximize2, Grid2x2 } from "lucide-react";

interface StreamGridProps {
  streams: RemoteScreenShareInfo[];
  channelName: string;
  onStopWatching: () => void;
}

/**
 * Multi-stream grid for simultaneous screen shares.
 * 1 stream  → full width single viewer
 * 2 streams → side-by-side
 * 3-4       → 2×2 grid
 * Click a tile to spotlight it (full-size); click again to return to grid.
 */
const StreamGrid = ({ streams, channelName, onStopWatching }: StreamGridProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { focusedStreamIdentity, setFocusedStreamIdentity } = useVoiceChannel();

  // Single stream — just render the viewer directly
  if (streams.length === 1) {
    return (
      <ScreenShareViewer
        stream={streams[0].stream}
        sharerName={streams[0].name}
        channelName={channelName}
        onStopWatching={onStopWatching}
        audioMuted={streams[0].identity === user?.id}
      />
    );
  }

  // Spotlight mode — one stream focused
  const focusedStream = focusedStreamIdentity
    ? streams.find((s) => s.identity === focusedStreamIdentity)
    : null;

  if (focusedStream) {
    return (
      <div className="relative">
        <ScreenShareViewer
          stream={focusedStream.stream}
          sharerName={focusedStream.name}
          channelName={channelName}
          onStopWatching={onStopWatching}
          audioMuted={focusedStream.identity === user?.id}
        />
        {/* Grid toggle button */}
        <button
          onClick={() => setFocusedStreamIdentity(null)}
          className="absolute top-3 end-14 z-20 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors backdrop-blur-sm"
          title={t("streaming.showGrid", "Show all streams")}
        >
          <Grid2x2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Grid mode
  const gridCols = streams.length <= 2 ? "grid-cols-2" : "grid-cols-2";
  const tileHeight = streams.length <= 2 ? "h-[360px]" : "h-[180px]";

  return (
    <div className="border-b border-border">
      <div className={cn("grid gap-px bg-border", gridCols)}>
        {streams.map((s) => (
          <div
            key={s.identity}
            className={cn("relative group bg-black cursor-pointer", tileHeight)}
          >
            <StreamTile stream={s} channelName={channelName} />
            {/* Spotlight button on hover */}
            <button
              onClick={() => setFocusedStreamIdentity(s.identity)}
              className="absolute top-2 end-2 z-10 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              title={t("streaming.spotlight", "Spotlight")}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {/* Stop watching bar for the whole grid */}
      <div className="flex justify-center py-2 bg-card/80 border-t border-border/50">
        <button
          onClick={onStopWatching}
          className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors"
        >
          {t("streaming.stopWatching")}
        </button>
      </div>
    </div>
  );
};

/** Lightweight tile — video only, with sharer name overlay */
const StreamTile = ({
  stream,
  channelName,
}: {
  stream: RemoteScreenShareInfo;
  channelName: string;
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream.stream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-contain"
      />
      {/* Name overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 pointer-events-none">
        <p className="text-xs text-white font-medium truncate">{stream.name}</p>
      </div>
      {/* LIVE badge */}
      <span className="absolute top-2 start-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none pointer-events-none">
        LIVE
      </span>
    </>
  );
};

export default StreamGrid;
