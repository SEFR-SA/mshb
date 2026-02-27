import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Check, X, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  { key: "maxUpload",       free: "8 MB",       light: "100 MB",      pro: "1 GB" },
  { key: "streamingQuality",free: "480p",        light: "720p HD",     pro: "4K Ultra HD" },
  { key: "messageLength",   free: "2,000 chars", light: "4,000 chars", pro: "10,000 chars" },
  { key: "serverLimit",     free: "100",         light: "150",         pro: "200" },
  { key: "customBanner",    free: false,         light: true,          pro: true },
  { key: "animatedAvatar",  free: false,         light: false,         pro: true },
  { key: "prioritySupport", free: false,         light: false,         pro: true },
] as const;

const Cell = ({ value }: { value: string | boolean }) => {
  if (typeof value === "boolean") {
    return value
      ? <Check className="h-4 w-4 text-green-500 mx-auto" />
      : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  }
  return <span className="text-sm">{value}</span>;
};

const SubscriptionsTab = () => {
  const { t } = useTranslation();

  const onSubscribe = () => toast({ title: t("settings.comingSoon") });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.subscriptions")}</h2>
        <p className="text-sm text-muted-foreground">Upgrade your experience with a Mshb subscription.</p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Light */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="font-bold">{t("settings.mshbLight")}</p>
              <p className="text-xs text-muted-foreground">For casual users</p>
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold">4.99</span>
            <span className="text-muted-foreground ms-1 text-sm">{t("settings.perMonth")}</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-1">
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 100 MB file uploads</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 720p HD streaming</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Custom profile banner</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 4,000 character messages</li>
          </ul>
          <Button variant="outline" className="w-full" onClick={onSubscribe}>
            {t("settings.subscribe")}
          </Button>
        </div>

        {/* Pro */}
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 flex flex-col gap-4 relative">
          <div className="absolute -top-3 start-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-bold">{t("settings.mshbPro")}</p>
              <p className="text-xs text-muted-foreground">For power users</p>
            </div>
          </div>
          <div>
            <span className="text-3xl font-bold">19.99</span>
            <span className="text-muted-foreground ms-1 text-sm">{t("settings.perMonth")}</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-1">
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 1 GB file uploads</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 4K Ultra HD streaming</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Animated avatar</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 10,000 character messages</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> 200 server limit</li>
            <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-500 shrink-0" /> Priority support</li>
          </ul>
          <Button className="w-full" onClick={onSubscribe}>
            {t("settings.subscribe")}
          </Button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="bg-muted/20 px-4 py-3">
          <h3 className="font-semibold text-sm">{t("settings.featureComparison")}</h3>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-start px-4 py-2.5 text-muted-foreground font-medium">{t("settings.feature")}</th>
              <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">{t("settings.free")}</th>
              <th className="text-center px-4 py-2.5 text-blue-500 font-medium">{t("settings.mshbLight")}</th>
              <th className="text-center px-4 py-2.5 text-primary font-medium">{t("settings.mshbPro")}</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row, i) => (
              <tr key={row.key} className={cn("border-b border-border/30", i % 2 === 0 ? "bg-muted/5" : "")}>
                <td className="px-4 py-3 text-sm font-medium">{t(`settings.${row.key}`)}</td>
                <td className="px-4 py-3 text-center text-muted-foreground"><Cell value={row.free} /></td>
                <td className="px-4 py-3 text-center"><Cell value={row.light} /></td>
                <td className="px-4 py-3 text-center"><Cell value={row.pro} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsTab;
