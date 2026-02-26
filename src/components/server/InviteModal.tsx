import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Copy, ArrowLeft, Check, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  serverName: string;
}

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const EXPIRE_OPTIONS = [
  { value: "1h", labelKey: "servers.expireOption1h", interval: "1 hour" },
  { value: "6h", labelKey: "servers.expireOption6h", interval: "6 hours" },
  { value: "12h", labelKey: "servers.expireOption12h", interval: "12 hours" },
  { value: "1d", labelKey: "servers.expireOption1d", interval: "1 day" },
  { value: "7d", labelKey: "servers.expireOption7d", interval: "7 days" },
];

const MAX_USES_OPTIONS = [
  { value: "0", labelKey: "servers.noLimit" },
  { value: "1", labelKey: "servers.maxUses1" },
  { value: "5", labelKey: "servers.maxUses5" },
  { value: "10", labelKey: "servers.maxUses10" },
  { value: "25", labelKey: "servers.maxUses25" },
];

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

const InviteModal = ({ open, onOpenChange, serverId, serverName }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<string | null>(null);

  // Settings
  const [expireAfter, setExpireAfter] = useState("7d");
  const [maxUses, setMaxUses] = useState("0");
  const [temporary, setTemporary] = useState(false);

  const inviteUrl = inviteCode ? `${BASE_URL}/invite/${inviteCode}` : "";

  const expiresLabel = t(EXPIRE_OPTIONS.find((o) => o.value === expireAfter)?.labelKey || "servers.expireOption7d");

  const generateInvite = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const expireOption = EXPIRE_OPTIONS.find((o) => o.value === expireAfter);
    const expiresAt = expireOption
      ? new Date(Date.now() + parseInterval(expireOption.interval)).toISOString()
      : null;

    const { data, error } = await supabase
      .from("invites" as any)
      .insert({
        server_id: serverId,
        creator_id: user.id,
        expires_at: expiresAt,
        max_uses: maxUses === "0" ? null : parseInt(maxUses),
        temporary,
      } as any)
      .select("code")
      .single();

    if (!error && data) {
      setInviteCode((data as any).code);
      setGeneratedExpiresAt(expiresAt);
    }
    setLoading(false);
  }, [user, serverId, expireAfter, maxUses, temporary]);

  useEffect(() => {
    if (!open || !user) return;
    generateInvite();
    loadFriends();
    setSentTo(new Set());
    setShowSettings(false);
    setSearch("");
  }, [open, user, serverId]);

  const loadFriends = async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) { setFriends([]); return; }

    const friendIds = friendships.map((f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", friendIds);

    setFriends((profiles || []) as Friend[]);
  };

  const sendInvite = async (friend: Friend) => {
    if (!user || !inviteCode) return;

    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${friend.user_id}),and(user1_id.eq.${friend.user_id},user2_id.eq.${user.id})`
      )
      .maybeSingle();

    let threadId = existing?.id;
    if (!threadId) {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: user.id, user2_id: friend.user_id })
        .select("id")
        .single();
      threadId = newThread?.id;
    }

    if (!threadId) return;

    // Fetch server icon + banner
    const { data: serverData } = await supabase
      .from("servers")
      .select("icon_url, banner_url")
      .eq("id", serverId)
      .maybeSingle();

    await supabase.from("messages").insert({
      thread_id: threadId,
      author_id: user.id,
      content: "",
      type: "server_invite",
      metadata: {
        server_id: serverId,
        invite_code: inviteCode,
        server_name: serverName,
        server_icon_url: (serverData as any)?.icon_url || "",
        server_banner_url: (serverData as any)?.banner_url || undefined,
        expires_at: generatedExpiresAt,
      },
    } as any);

    setSentTo((prev) => new Set(prev).add(friend.user_id));
  };

  const handleSettingsBack = async () => {
    setShowSettings(false);
    await generateInvite();
  };

  const filteredFriends = friends.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.display_name?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showSettings ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSettingsBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-base">{t("servers.inviteSettings")}</DialogTitle>
              </div>
              <DialogDescription>{t("servers.inviteSettingsDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>{t("servers.expireAfter")}</Label>
                <Select value={expireAfter} onValueChange={setExpireAfter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("servers.maxUses")}</Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_USES_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>{t("servers.grantTemporary")}</Label>
                <Switch checked={temporary} onCheckedChange={setTemporary} />
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("servers.inviteFriendsTo", { name: serverName })}</DialogTitle>
              <DialogDescription>{t("servers.inviteDesc")}</DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("servers.searchFriends")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>

            {/* Friends list */}
            <ScrollArea className="max-h-[220px]">
              <div className="space-y-1">
                {filteredFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {friends.length === 0 ? t("servers.noFriendsYet") : t("servers.noResults")}
                  </p>
                ) : (
                  filteredFriends.map((f) => {
                    const name = f.display_name || f.username || "User";
                    const isSent = sentTo.has(f.user_id);
                    return (
                      <div key={f.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={f.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1 truncate">{name}</span>
                        <Button
                          size="sm"
                          variant={isSent ? "secondary" : "default"}
                          disabled={isSent}
                          onClick={() => sendInvite(f)}
                          className="h-7 text-xs"
                        >
                          {isSent ? (
                            <><Check className="h-3 w-3 me-1" /> {t("servers.sent")}</>
                          ) : (
                            t("servers.sendInvite")
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Invite link box */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                {t("servers.inviteLinkLabel")}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={inviteUrl}
                  readOnly
                  className="font-mono text-xs"
                  dir="ltr"
                />
                <Button
                  variant="default"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    toast({ title: t("servers.copiedInvite") });
                  }}
                  disabled={!inviteCode}
                >
                  <Copy className="h-4 w-4 me-1" />
                  {t("servers.copy")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("servers.expiresIn", { duration: expiresLabel })}{" "}
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => setShowSettings(true)}
                >
                  {t("servers.editInviteLink")}
                </button>
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

function parseInterval(interval: string): number {
  const match = interval.match(/(\d+)\s*(hour|hours|day|days)/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1]);
  const unit = match[2];
  if (unit.startsWith("hour")) return n * 60 * 60 * 1000;
  if (unit.startsWith("day")) return n * 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

export default InviteModal;
