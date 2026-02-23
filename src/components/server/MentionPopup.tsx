import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MentionPopupProps {
  serverId: string;
  filter: string;
  onSelect: (mention: string) => void;
  onClose: () => void;
}

interface MemberProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const MentionPopup = ({ serverId, filter, onSelect, onClose }: MentionPopupProps) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: sm } = await supabase
        .from("server_members" as any)
        .select("user_id")
        .eq("server_id", serverId);
      if (!sm) return;
      const userIds = (sm as any[]).map((m) => m.user_id);
      if (userIds.length === 0) return;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      if (profiles) setMembers(profiles);
    };
    load();
  }, [serverId]);

  const lowerFilter = filter.toLowerCase();
  const filtered = members.filter(
    (m) =>
      (m.username && m.username.toLowerCase().includes(lowerFilter)) ||
      (m.display_name && m.display_name.toLowerCase().includes(lowerFilter))
  );

  // Build suggestions: @all first, then filtered members
  const suggestions: { label: string; value: string; avatar?: string | null }[] = [];
  if ("all".includes(lowerFilter) || lowerFilter === "") {
    suggestions.push({ label: t("mentions.all", "everyone"), value: "@all" });
  }
  filtered.forEach((m) => {
    if (m.username) {
      suggestions.push({
        label: m.display_name || m.username,
        value: `@${m.username}`,
        avatar: m.avatar_url,
      });
    }
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && suggestions.length > 0) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]?.value || "");
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  if (suggestions.length === 0) {
    return (
      <div ref={containerRef} className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm text-muted-foreground">{t("mentions.noResults", "No members found")}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute bottom-full mb-1 left-0 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
      <ScrollArea className="max-h-48">
        {suggestions.map((s, i) => (
          <button
            key={s.value}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s.value);
            }}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            {s.value === "@all" ? (
              <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">@</div>
            ) : (
              <Avatar className="h-6 w-6">
                <AvatarImage src={s.avatar || ""} />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{s.label.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <span className="truncate">{s.label}</span>
            <span className="text-xs text-muted-foreground ms-auto">{s.value}</span>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
};

export default MentionPopup;
