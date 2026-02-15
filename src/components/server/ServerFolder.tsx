import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Pencil, Palette, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";

interface FolderServer {
  id: string;
  name: string;
  icon_url: string | null;
}

interface ServerFolderProps {
  folderId: string;
  name: string;
  color: string;
  servers: FolderServer[];
  onRename: () => void;
  onUngroup: () => void;
  onNavigate?: () => void;
  onDropServer: (serverId: string) => void;
  unreadMap: Map<string, boolean>;
}

const ServerFolder: React.FC<ServerFolderProps> = ({
  folderId,
  name,
  color,
  servers,
  onRename,
  onUngroup,
  onNavigate,
  onDropServer,
  unreadMap,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const hasAnyUnread = servers.some((s) => unreadMap.get(s.id));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.types.includes("server-id");
    if (draggedId) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const serverId = e.dataTransfer.getData("server-id");
    if (serverId) onDropServer(serverId);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Collapsed folder pill */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setExpanded(!expanded)}
                className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                  dragOver ? "ring-2 ring-primary" : ""
                }`}
                style={{ backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` }}
              >
                {hasAnyUnread && (
                  <div className="absolute -start-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10" />
                )}
                {/* Stacked mini avatars */}
                <div className="flex -space-x-2">
                  {servers.slice(0, 3).map((s, i) => (
                    <Avatar key={s.id} className="h-5 w-5 border border-background" style={{ zIndex: 3 - i }}>
                      <AvatarImage src={s.icon_url || ""} />
                      <AvatarFallback className="bg-transparent text-[8px] font-bold" style={{ color }}>
                        {s.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <div className="absolute -bottom-0.5 -end-0.5">
                  {expanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </button>
            </TooltipTrigger>
          </Tooltip>

          {/* Expanded server list */}
          {expanded && (
            <div
              className="flex flex-col items-center gap-1 mt-1 py-1 rounded-xl"
              style={{ backgroundColor: `${color}10` }}
            >
              {servers.map((s) => {
                const hasUnread = unreadMap.get(s.id) || false;
                return (
                  <div key={s.id} className="relative">
                    {hasUnread && (
                      <div className="absolute -start-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10" />
                    )}
                    <NavLink
                      to={`/server/${s.id}`}
                      onClick={() => onNavigate?.()}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("server-id", s.id);
                        e.dataTransfer.setData("from-folder", folderId);
                      }}
                      className={({ isActive }) =>
                        `flex items-center justify-center w-10 h-10 rounded-xl transition-all hover:rounded-lg ${
                          isActive ? "bg-primary text-primary-foreground rounded-lg" : "bg-sidebar-accent/30 text-sidebar-foreground hover:bg-primary/20"
                        }`
                      }
                    >
                      <Avatar className="h-10 w-10 rounded-[inherit]">
                        <AvatarImage src={s.icon_url || ""} />
                        <AvatarFallback className="bg-transparent text-inherit text-xs font-bold rounded-[inherit]">
                          {s.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </NavLink>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRename}>
          <Pencil className="h-4 w-4 me-2" />
          {t("folders.rename")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onUngroup}>
          <FolderOpen className="h-4 w-4 me-2" />
          {t("folders.ungroup")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ServerFolder;
