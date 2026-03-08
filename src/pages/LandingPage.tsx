import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Download, UserPlus, MessageSquare, Video, Palette, Shield, Globe, Crown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Sado (light) / Mjlis (dark) brand palettes ─── */
const sadoVars: Record<string, string> = {
  "--background": "36 100% 99%",
  "--foreground": "25 44% 25%",
  "--card": "0 0% 100%",
  "--card-foreground": "25 44% 25%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "25 44% 25%",
  "--primary": "6 53% 50%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "36 50% 92%",
  "--secondary-foreground": "25 44% 25%",
  "--muted": "36 50% 92%",
  "--muted-foreground": "30 1% 41%",
  "--accent": "36 50% 92%",
  "--accent-foreground": "25 44% 25%",
  "--destructive": "0 84% 60%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "36 33% 83%",
  "--input": "36 33% 83%",
  "--ring": "6 53% 50%",
  "--surface": "36 50% 97%",
};

const mjlisVars: Record<string, string> = {
  "--background": "22 44% 8%",
  "--foreground": "36 56% 95%",
  "--card": "23 47% 13%",
  "--card-foreground": "36 56% 95%",
  "--popover": "23 47% 13%",
  "--popover-foreground": "36 56% 95%",
  "--primary": "6 53% 50%",
  "--primary-foreground": "36 100% 99%",
  "--secondary": "23 50% 10%",
  "--secondary-foreground": "36 56% 95%",
  "--muted": "23 50% 10%",
  "--muted-foreground": "32 11% 66%",
  "--accent": "22 48% 20%",
  "--accent-foreground": "36 56% 95%",
  "--destructive": "0 62% 30%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "22 48% 20%",
  "--input": "22 44% 8%",
  "--ring": "6 53% 50%",
  "--surface": "23 47% 15%",
};

const toStyle = (vars: Record<string, string>): React.CSSProperties => {
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) obj[k] = v;
  return obj as unknown as React.CSSProperties;
};

/* ─── Placeholder image component ─── */
const PlaceholderImage = ({ width, height, label }: { width: number; height: number; label: string }) => (
  <div
    className="rounded-2xl border border-border/50 flex items-center justify-center bg-muted/50 w-full"
    style={{ aspectRatio: `${width}/${height}`, maxWidth: width }}
  >
    <div className="text-center p-4">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className="text-muted-foreground/60 text-xs mt-1">{width} × {height}px</p>
    </div>
  </div>
);

/* ─── Feature section data ─── */
const features = [
  {
    title: "Make Your Group Chats More Fun",
    description: "Use custom emojis, stickers, soundboards, and GIFs to express yourself. React to messages, pin important ones, and keep the conversation alive.",
    icon: MessageSquare,
    imgW: 600, imgH: 400, imgLabel: "Group Chat Screenshot",
  },
  {
    title: "Stream Like You're In The Same Room",
    description: "Go live with screen sharing, hop on voice or video calls, and hang out with friends in real time. No downloads needed for the web version.",
    icon: Video,
    imgW: 800, imgH: 450, imgLabel: "Streaming UI Screenshot",
  },
  {
    title: "Hop In When You're Free, No Need To Call",
    description: "Voice channels let you join whenever you want. See who's online, jump in to chat, and leave when you're done. Simple as that.",
    icon: Globe,
    imgW: 500, imgH: 600, imgLabel: "Voice Channel Screenshot",
  },
  {
    title: "See Who's Around To Chill",
    description: "Check who's online, what they're up to, and jump into conversation. Your friends are always just a click away.",
    icon: Shield,
    imgW: 600, imgH: 500, imgLabel: "Active Now Screenshot",
  },
  {
    title: "Always Have Something To Do Together",
    description: "Create servers with channels for different topics. Organize with roles, categories, and permissions. Your community, your rules.",
    icon: Crown,
    imgW: 700, imgH: 400, imgLabel: "Server Management Screenshot",
  },
  {
    title: "Wherever You Are, Hang Out Here",
    description: "Available as a desktop app and progressive web app. Full Arabic RTL support. MSHB goes wherever you go.",
    icon: Palette,
    imgW: 400, imgH: 600, imgLabel: "Mobile App Screenshot",
  },
];

/* ─── Scrolling marquee ─── */
const MarqueeBar = () => {
  const words = ["TALK", "PLAY", "CHAT", "HANG OUT", "CONNECT", "SHARE", "STREAM", "CREATE"];
  const row = words.map((w, i) => (
    <span key={i} className="mx-8 text-2xl md:text-4xl font-black tracking-widest opacity-80 select-none">
      {w} <span className="text-primary">✦</span>
    </span>
  ));
  return (
    <div className="overflow-hidden py-8 bg-primary/5 border-y border-border/30">
      <div className="flex whitespace-nowrap animate-marquee">
        {row}{row}{row}
      </div>
    </div>
  );
};

/* ─── Main landing page ─── */
const LandingPage = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") return window.matchMedia("(prefers-color-scheme: dark)").matches;
    return true;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const themeVars = dark ? toStyle(mjlisVars) : toStyle(sadoVars);

  return (
    <div
      className={dark ? "dark" : ""}
      style={{
        ...themeVars,
        backgroundColor: `hsl(${dark ? mjlisVars["--background"] : sadoVars["--background"]})`,
        color: `hsl(${dark ? mjlisVars["--foreground"] : sadoVars["--foreground"]})`,
        minHeight: "100vh",
      }}
    >
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]})`, backgroundColor: `hsl(${dark ? mjlisVars["--background"] : sadoVars["--background"]} / 0.9)` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="MSHB" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">MSHB</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: `hsl(${dark ? mjlisVars["--accent"] : sadoVars["--accent"]})` }}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/auth">
              <Button
                size="sm"
                className="gap-2"
                style={{ backgroundColor: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})`, color: `hsl(${dark ? mjlisVars["--primary-foreground"] : sadoVars["--primary-foreground"]})` }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Now</span>
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                style={{
                  borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]})`,
                  color: `hsl(${dark ? mjlisVars["--foreground"] : sadoVars["--foreground"]})`,
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Up</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -start-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }} />
        <div className="absolute -bottom-32 -end-32 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }} />

        <div className="max-w-7xl mx-auto px-6 py-24 md:py-36 text-center relative z-10">
          {/* Saudi Made badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border" style={{ borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]})`, backgroundColor: `hsl(${dark ? mjlisVars["--card"] : sadoVars["--card"]})` }}>
            <img src="/images/saudi-tech.png" alt="Saudi Made" className="h-6" />
            <span className="text-sm font-semibold tracking-wide">SAUDI MADE</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto mb-6">
            YOUR PLACE TO{" "}
            <span style={{ color: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }}>TALK</span>,{" "}
            <span style={{ color: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }}>PLAY</span> &{" "}
            <span style={{ color: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }}>CONNECT</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 opacity-80">
            MSHB is the ultimate communication platform — chat, call, stream, and build communities. 
            Designed and built in Saudi Arabia, for the world.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/auth">
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg"
                style={{ backgroundColor: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})`, color: `hsl(${dark ? mjlisVars["--primary-foreground"] : sadoVars["--primary-foreground"]})` }}
              >
                <Download className="h-5 w-5" />
                Download Now
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                variant="outline"
                size="lg"
                className="gap-2 text-base px-8 py-6 rounded-xl"
                style={{
                  borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]})`,
                  color: `hsl(${dark ? mjlisVars["--foreground"] : sadoVars["--foreground"]})`,
                }}
              >
                <UserPlus className="h-5 w-5" />
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Hero placeholder image */}
          <div className="max-w-5xl mx-auto">
            <PlaceholderImage width={1200} height={600} label="Hero App Screenshot — 1200 × 600px" />
          </div>

          {/* Scroll indicator */}
          <div className="mt-12 animate-bounce">
            <ChevronDown className="h-6 w-6 mx-auto opacity-40" />
          </div>
        </div>
      </section>

      {/* ── Feature sections (alternating) ── */}
      {features.map((feat, i) => {
        const isReversed = i % 2 === 1;
        const Icon = feat.icon;

        return (
          <section
            key={i}
            className="py-20 md:py-28 border-t"
            style={{ borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]} / 0.3)` }}
          >
            <div className={`max-w-7xl mx-auto px-6 flex flex-col ${isReversed ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 md:gap-20`}>
              {/* Text */}
              <div className="flex-1 text-center md:text-start">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6"
                  style={{ backgroundColor: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]} / 0.15)`, color: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{feat.title}</h2>
                <p className="text-lg opacity-70 max-w-lg">{feat.description}</p>
              </div>
              {/* Image placeholder */}
              <div className="flex-1 flex justify-center">
                <PlaceholderImage width={feat.imgW} height={feat.imgH} label={feat.imgLabel} />
              </div>
            </div>
          </section>
        );
      })}

      {/* ── Marquee ── */}
      <MarqueeBar />

      {/* ── Final CTA ── */}
      <section className="py-24 md:py-32 text-center px-6">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 max-w-3xl mx-auto">
          YOU CAN'T SCROLL ANYMORE.
          <br />
          <span style={{ color: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})` }}>
            BETTER GO CHAT.
          </span>
        </h2>
        <p className="text-lg opacity-70 mb-10 max-w-xl mx-auto">
          Join thousands of users already on MSHB. Your community is waiting.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/auth">
            <Button
              size="lg"
              className="gap-2 text-base px-8 py-6 rounded-xl shadow-lg"
              style={{ backgroundColor: `hsl(${dark ? mjlisVars["--primary"] : sadoVars["--primary"]})`, color: `hsl(${dark ? mjlisVars["--primary-foreground"] : sadoVars["--primary-foreground"]})` }}
            >
              <Download className="h-5 w-5" />
              Download Now
            </Button>
          </Link>
          <Link to="/auth">
            <Button
              variant="outline"
              size="lg"
              className="gap-2 text-base px-8 py-6 rounded-xl"
              style={{
                borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]})`,
                color: `hsl(${dark ? mjlisVars["--foreground"] : sadoVars["--foreground"]})`,
              }}
            >
              <UserPlus className="h-5 w-5" />
              Sign Up
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t py-12 px-6"
        style={{ borderColor: `hsl(${dark ? mjlisVars["--border"] : sadoVars["--border"]} / 0.3)`, backgroundColor: `hsl(${dark ? mjlisVars["--card"] : sadoVars["--card"]})` }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="MSHB" className="h-8 w-8" />
            <span className="font-bold text-lg">MSHB</span>
          </div>
          <div className="flex items-center gap-4">
            <img src="/images/saudi-tech.png" alt="Saudi Made" className="h-8" />
            <span className="text-sm opacity-60">© {new Date().getFullYear()} MSHB. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Marquee animation style */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
