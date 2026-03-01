import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2, Plus, TrendingUp, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ItemStatus   = "pending" | "approved" | "rejected";
type ItemCategory = "banner" | "avatar" | "soundboard" | "sticker" | "emoji" | "tag";
type ItemType     = "static" | "gif";

interface CreatorItem {
  id: string;
  name: string;
  category: ItemCategory;
  type: ItemType;
  price_sar: number;
  status: ItemStatus;
  created_at: string;
  asset_url: string;
}

const CATEGORY_GRADIENTS: Record<ItemCategory, string> = {
  banner:     "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  avatar:     "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  soundboard: "linear-gradient(135deg, #1a1a2e 0%, #4a0080 100%)",
  sticker:    "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  emoji:      "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
  tag:        "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  banner:     "marketplace.banners",
  avatar:     "marketplace.avatars",
  soundboard: "marketplace.soundboard",
  sticker:    "marketplace.stickers",
  emoji:      "marketplace.emojis",
  tag:        "marketplace.tags",
};

const CATEGORIES: ItemCategory[] = ["banner", "avatar", "soundboard", "sticker", "emoji", "tag"];

const CreatorStudio = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [items, setItems]       = useState<CreatorItem[]>([]);
  const [salesMap, setSalesMap] = useState<Record<string, number>>({});
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Upload form state
  const [file, setFile]             = useState<File | null>(null);
  const [formName, setFormName]     = useState("");
  const [formCategory, setFormCategory] = useState<ItemCategory>("banner");
  const [formType, setFormType]     = useState<ItemType>("static");
  const [formPrice, setFormPrice]   = useState<number>(0);
  const [uploading, setUploading]   = useState(false);

  const loadItems = async () => {
    if (!user) return;
    setLoading(true);

    const { data: myItems } = await supabase
      .from("marketplace_items" as any)
      .select("id, name, category, type, price_sar, status, created_at, asset_url")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    const ids = (myItems ?? []).map((i: any) => i.id);

    const { data: purchases } = ids.length
      ? await supabase.from("user_purchases" as any).select("item_id").in("item_id", ids)
      : { data: [] };

    const map: Record<string, number> = {};
    (purchases ?? []).forEach((p: any) => {
      map[p.item_id] = (map[p.item_id] ?? 0) + 1;
    });

    setItems((myItems ?? []) as CreatorItem[]);
    setSalesMap(map);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, [user?.id]);

  const totalListed = items.length;
  const totalSales  = Object.values(salesMap).reduce((a, b) => a + b, 0);
  const netRevenue  = items.reduce(
    (sum, item) => sum + (salesMap[item.id] ?? 0) * item.price_sar * 0.7,
    0
  );

  const resetForm = () => {
    setFile(null);
    setFormName("");
    setFormCategory("banner");
    setFormType("static");
    setFormPrice(0);
  };

  const handleUpload = async () => {
    if (!user || !file || !formName.trim()) return;
    setUploading(true);

    const ext      = file.name.split(".").pop() ?? "bin";
    const safeName = formName.trim().replace(/[^a-z0-9]/gi, "_");
    const path     = `${user.id}/${Date.now()}_${safeName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("pending_assets")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setUploading(false);
      toast({ title: t("marketplace.uploadFailed"), variant: "destructive" });
      return;
    }

    const resolvedType = formCategory === "soundboard" ? "static" : formType;

    const { error: dbError } = await supabase.from("marketplace_items" as any).insert({
      creator_id:    user.id,
      name:          formName.trim(),
      category:      formCategory,
      type:          resolvedType,
      price_sar:     formPrice,
      thumbnail_url: "",   // filled by admin on approval
      asset_url:     path,
      status:        "pending",
    });

    setUploading(false);

    if (dbError) {
      toast({ title: t("marketplace.uploadFailed"), variant: "destructive" });
      return;
    }

    toast({ title: t("marketplace.uploadSuccess") });
    setUploadOpen(false);
    resetForm();
    loadItems();
  };

  const handleDelete = async (item: CreatorItem) => {
    if (!user || item.status === "approved") return;
    setDeleting(item.id);

    // Remove the raw file from storage
    await supabase.storage.from("pending_assets").remove([item.asset_url]);

    const { error } = await supabase
      .from("marketplace_items" as any)
      .delete()
      .eq("id", item.id);

    setDeleting(null);

    if (error) {
      toast({ title: t("marketplace.deleteFailed"), variant: "destructive" });
      return;
    }

    toast({ title: t("marketplace.deleteSuccess") });
    loadItems();
  };

  const statusBadge = (status: ItemStatus) => {
    if (status === "approved")
      return (
        <Badge className="text-[9px] py-0 px-1.5 bg-green-500/20 text-green-500 border border-green-500/30 uppercase">
          {t("marketplace.statusApproved")}
        </Badge>
      );
    if (status === "rejected")
      return (
        <Badge className="text-[9px] py-0 px-1.5 bg-red-500/20 text-red-500 border border-red-500/30 uppercase">
          {t("marketplace.statusRejected")}
        </Badge>
      );
    return (
      <Badge className="text-[9px] py-0 px-1.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 uppercase">
        {t("marketplace.statusPending")}
      </Badge>
    );
  };

  const platformFee = (formPrice * 0.3).toFixed(2);
  const youEarn     = (formPrice * 0.7).toFixed(2);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{t("marketplace.creatorDashboard")}</p>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setUploadOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t("marketplace.uploadAsset")}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("marketplace.totalListed"), value: String(totalListed),            icon: Package },
          { label: t("marketplace.totalSales"),  value: String(totalSales),             icon: TrendingUp },
          { label: t("marketplace.netRevenue"),  value: `${netRevenue.toFixed(2)} SAR`, icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-3 space-y-1"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <p className="text-[10px] font-medium uppercase tracking-wide leading-none">{label}</p>
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Data table */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4 gap-2">
            <Upload className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground max-w-xs">{t("marketplace.noItemsYet")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{t("marketplace.colAsset")}</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{t("marketplace.colDate")}</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{t("marketplace.colStatus")}</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground text-end">{t("marketplace.colPrice")}</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground text-end">{t("marketplace.colSales")}</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground text-end">{t("marketplace.colEarned")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const salesCount = salesMap[item.id] ?? 0;
                const earned     = (salesCount * item.price_sar * 0.7).toFixed(2);
                const canDelete  = item.status !== "approved";

                return (
                  <TableRow key={item.id} className="border-border/30 hover:bg-muted/10">
                    {/* Asset thumbnail + name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-9 w-9 rounded-lg shrink-0"
                          style={{ background: CATEGORY_GRADIENTS[item.category] }}
                        />
                        <p className="text-xs font-medium text-foreground truncate max-w-[90px]">
                          {item.name}
                        </p>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </TableCell>

                    {/* Status */}
                    <TableCell>{statusBadge(item.status)}</TableCell>

                    {/* Price */}
                    <TableCell className="text-xs text-foreground text-end tabular-nums">
                      {item.price_sar.toFixed(2)}
                    </TableCell>

                    {/* Sales */}
                    <TableCell className="text-xs text-foreground text-end tabular-nums">
                      {salesCount}
                    </TableCell>

                    {/* Net earned */}
                    <TableCell className="text-xs text-green-500 font-semibold text-end tabular-nums">
                      {earned}
                    </TableCell>

                    {/* Delete */}
                    <TableCell>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={!canDelete || deleting === item.id}
                        title={canDelete ? undefined : "Approved items cannot be deleted"}
                        className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                          canDelete
                            ? "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            : "text-muted-foreground/20 cursor-not-allowed"
                        )}
                      >
                        {deleting === item.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Upload modal */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => { setUploadOpen(open); if (!open) resetForm(); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("marketplace.uploadAsset")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* File upload area */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                File <span className="text-red-500">*</span>
              </label>
              <label
                className={cn(
                  "flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                  file
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 bg-muted/20 hover:bg-muted/30 hover:border-primary/30"
                )}
              >
                <input
                  type="file"
                  accept="image/*,audio/*"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Upload className="h-5 w-5 text-muted-foreground mb-1.5" />
                <p className="text-xs text-muted-foreground text-center px-3 truncate max-w-full">
                  {file ? file.name : "Click to upload (image or audio)"}
                </p>
              </label>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("marketplace.uploadName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Desert Sunset"
                className="w-full h-9 bg-muted/40 border border-border/50 rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Category + Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("marketplace.uploadCategory")}
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ItemCategory)}
                  className="w-full h-9 bg-muted/40 border border-border/50 rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-background">
                      {t(CATEGORY_LABELS[cat])}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {t("marketplace.uploadType")}
                </label>
                <select
                  value={formCategory === "soundboard" ? "static" : formType}
                  onChange={(e) => setFormType(e.target.value as ItemType)}
                  disabled={formCategory === "soundboard"}
                  className="w-full h-9 bg-muted/40 border border-border/50 rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                >
                  <option value="static" className="bg-background">{t("marketplace.static")}</option>
                  <option value="gif"    className="bg-background">{t("marketplace.gif")}</option>
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("marketplace.uploadPrice")}
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formPrice}
                onChange={(e) => setFormPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full h-9 bg-muted/40 border border-border/50 rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* 30% fee breakdown */}
            <div className="rounded-lg bg-muted/30 border border-border/40 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("marketplace.platformFee")}</span>
                <span className="text-foreground tabular-nums">{platformFee} SAR</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-green-500">{t("marketplace.youEarn")}</span>
                <span className="text-green-500 tabular-nums">{youEarn} SAR</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed pt-0.5">
                {t("marketplace.uploadDisclaimer")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setUploadOpen(false); resetForm(); }}
              disabled={uploading}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading || !file || !formName.trim()}
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />{t("marketplace.uploading")}</>
              ) : (
                t("marketplace.uploadBtn")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorStudio;
