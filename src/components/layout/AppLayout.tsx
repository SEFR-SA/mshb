import React from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Moon, Sun, Globe, LogOut, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AppLayout = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { totalUnread } = useUnreadCount();

  const toggleLang = () => {
    const next = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  };

  const navItems = [
    { to: "/", icon: MessageSquare, label: t("nav.inbox") },
    { to: "/friends", icon: Users, label: t("nav.friends") },
    { to: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  const initials = (profile?.display_name || profile?.username || user?.email || "?")
    .charAt(0).toUpperCase();

  return (
    <div className="flex h-screen galaxy-gradient overflow-hidden">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 flex flex-col glass border-e border-border/50 shrink-0">
          <div className="p-4 border-b border-border/50">
            <h1 className="text-lg font-bold text-primary text-galaxy-glow">✦ {t("app.name")}</h1>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.to === "/" && totalUnread > 0 && (
                  <span className="ms-auto inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5">
                    {totalUnread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === "dark" ? t("profile.light") : t("profile.dark")}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleLang} title={i18n.language === "ar" ? "English" : "العربية"}>
                <Globe className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} title={t("auth.logout")}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <NavLink to="/settings" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm truncate">
                <p className="font-medium truncate">{profile?.display_name || profile?.username || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.status_text || ""}</p>
              </div>
            </NavLink>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top header */}
        {isMobile && (
          <header className="flex items-center justify-between p-3 glass border-b border-border/50">
            <h1 className="text-lg font-bold text-primary">✦ {t("app.name")}</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleLang}>
                <Globe className="h-4 w-4" />
              </Button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <nav className="flex glass border-t border-border/50">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `relative flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.to === "/" && totalUnread > 0 && (
                  <span className="absolute -top-1 end-1/4 inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                    {totalUnread}
                  </span>
                )}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span>{t("nav.profile")}</span>
            </NavLink>
          </nav>
        )}
      </main>
    </div>
  );
};

export default AppLayout;
