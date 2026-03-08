import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import NameplateWrapper from "@/components/shared/NameplateWrapper";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import {
  User, Shield, Users, Bell, Star, CreditCard,
  Palette, Mic, Globe, LogOut, X, Menu, ShoppingBag, Keyboard,
} from "lucide-react";
import StyledDisplayName from "@/components/StyledDisplayName";
import { UnsavedChangesBar } from "@/components/settings/UnsavedChangesBar";

// Lazy-load tab content to keep initial bundle small
const ProfileTab       = lazy(() => import("./tabs/ProfileTab"));
const AccountTab       = lazy(() => import("./tabs/AccountTab"));
const SocialTab        = lazy(() => import("./tabs/SocialTab"));
const NotificationsTab = lazy(() => import("./tabs/NotificationsTab"));
const SubscriptionsTab = lazy(() => import("./tabs/SubscriptionsTab"));
const BillingTab       = lazy(() => import("./tabs/BillingTab"));
const AppearanceTab    = lazy(() => import("./tabs/AppearanceTab"));
const VoiceVideoTab    = lazy(() => import("./tabs/VoiceVideoTab"));
const LanguageTab      = lazy(() => import("./tabs/LanguageTab"));
const MarketplaceTab   = lazy(() => import("./tabs/MarketplaceTab"));
const KeybindsTab      = lazy(() => import("./tabs/KeybindsTab"));

type TabId =
  | "profile" | "account" | "social" | "notifications"
  | "subscriptions" | "billing" | "appearance" | "voice" | "language"
  | "marketplace";

interface NavItem {
  id: TabId;
  labelKey: string;
  icon: React.FC<{ className?: string }>;
}

interface NavGroup {
  headerKey: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    headerKey: "settings.userSettings",
    items: [
      { id: "profile",       labelKey: "settings.myProfile",    icon: User },
      { id: "account",       labelKey: "settings.myAccount",    icon: Shield },
      { id: "social",        labelKey: "settings.social",       icon: Users },
      { id: "notifications", labelKey: "settings.notifications",icon: Bell },
    ],
  },
  {
    headerKey: "settings.appSettings",
    items: [
      { id: "subscriptions", labelKey: "settings.subscriptions",icon: Star },
      { id: "billing",       labelKey: "settings.billing",      icon: CreditCard },
      { id: "appearance",    labelKey: "settings.appearance",   icon: Palette },
      { id: "voice",         labelKey: "settings.voiceVideo",    icon: Mic },
      { id: "language",      labelKey: "settings.languageTime",  icon: Globe },
      { id: "marketplace",   labelKey: "settings.marketplace",   icon: ShoppingBag },
    ],
  },
];

const TAB_COMPONENTS: Record<TabId, React.LazyExoticComponent<React.ComponentType<any>>> = {
  profile:       ProfileTab,
  account:       AccountTab,
  social:        SocialTab,
  notifications: NotificationsTab,
  subscriptions: SubscriptionsTab,
  billing:       BillingTab,
  appearance:    AppearanceTab,
  voice:         VoiceVideoTab,
  language:      LanguageTab,
  marketplace:   MarketplaceTab,
};

const TabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const SettingsModal = () => {
  const navigate   = useNavigate();
  const { t }      = useTranslation();
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [unsavedConfig, setUnsavedConfig] = useState<{ onSave: () => void; onReset: () => void } | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);

  const setUnsaved = (onSave: () => void, onReset: () => void) => setUnsavedConfig({ onSave, onReset });
  const clearUnsaved = () => {
    setUnsavedConfig(null);
    setShakeTrigger(0);
  };
  const triggerShake = () => setShakeTrigger(Date.now());

  const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI;

  const close = () => navigate(-1);

  const handleCloseAttempt = () => {
    if (unsavedConfig) {
      triggerShake();
    } else {
      close();
    }
  };

  // Use a ref to avoid stale closure in the keydown handler
  const handleCloseAttemptRef = useRef(handleCloseAttempt);
  useEffect(() => { handleCloseAttemptRef.current = handleCloseAttempt; });

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleCloseAttemptRef.current(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const initials = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();
  const ActiveTab = TAB_COMPONENTS[activeTab];

  // Reusable sidebar content — used in both desktop aside and mobile Sheet
  const SidebarNav = ({ onSelect }: { onSelect?: () => void }) => (
    <>
      {/* User mini-card */}
      <div className="px-3 pt-4 pb-2">
        <NameplateWrapper nameplateUrl={profile?.nameplate_url} isPro={profile?.is_pro} className="rounded-lg">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20">
          <AvatarDecorationWrapper decorationUrl={(profile as any)?.avatar_decoration_url} isPro={profile?.is_pro} size={32} className="shrink-0">
          <Avatar className="h-8 w-8" alwaysPlayGif>
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
          </Avatar>
          </AvatarDecorationWrapper>
          <div className="min-w-0">
            <StyledDisplayName displayName={profile?.display_name || profile?.username || "User"} fontStyle={(profile as any)?.name_font} effect={(profile as any)?.name_effect} gradientStart={(profile as any)?.name_gradient_start} gradientEnd={(profile as any)?.name_gradient_end} className="text-sm font-medium truncate" />
            {profile?.username && <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>}
          </div>
        </div>
        </NameplateWrapper>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-4 mt-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.headerKey}>
            <p className="px-2 mb-1 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
              {t(group.headerKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (unsavedConfig) {
                        triggerShake();
                      } else {
                        setActiveTab(item.id);
                        onSelect?.();
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-start",
                      activeTab === item.id
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider + Logout */}
      <div className="border-t border-border/50 p-2">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t("auth.logout")}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className={`absolute inset-0 ${isElectron ? "bg-transparent backdrop-blur-none" : "bg-black/70 backdrop-blur-sm"}`} onClick={close} />


      {/* Modal panel — sits on top of backdrop */}
      <div className={`relative z-10 flex w-full h-full overflow-hidden${isElectron ? " pt-8" : ""}`}>

        {/* ── LEFT SIDEBAR — desktop only ── */}
        <aside className="hidden md:flex md:w-56 shrink-0 flex-col overflow-hidden bg-background text-sidebar-foreground border-e border-border/50">
          <SidebarNav />
        </aside>

        {/* ── RIGHT CONTENT AREA ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted relative">
          {/* Close button */}
          <button
            onClick={handleCloseAttempt}
            className="absolute top-4 end-4 z-20 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>

          {/* ── Mobile header bar — hamburger + current tab name ── */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border/50 shrink-0">
            <button
              onClick={() => setSheetOpen(true)}
              className="h-9 w-9 rounded-md bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
              aria-label="Open settings menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="font-semibold text-sm truncate pe-10">
              {t(NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.labelKey ?? "")}
            </span>
          </div>

          {/* ── Mobile Sheet drawer ── */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="w-64 p-0 bg-background text-sidebar-foreground flex flex-col">
              <SidebarNav onSelect={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
              <Suspense fallback={<TabFallback />}>
                <ActiveTab setUnsaved={setUnsaved} clearUnsaved={clearUnsaved} />
              </Suspense>
            </div>
          </div>
          <UnsavedChangesBar
            show={!!unsavedConfig}
            onSave={unsavedConfig?.onSave}
            onReset={unsavedConfig?.onReset}
            shakeTrigger={shakeTrigger}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
