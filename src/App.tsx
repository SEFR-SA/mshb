import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AudioSettingsProvider } from "@/contexts/AudioSettingsContext";
import { VoiceChannelProvider } from "@/contexts/VoiceChannelContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import HomeView from "@/pages/HomeView";
import FriendsDashboard from "@/pages/FriendsDashboard";
import Chat from "@/pages/Chat";
import GroupChat from "@/pages/GroupChat";
import Settings from "@/pages/Settings";
import ServerView from "@/pages/ServerView";
import InviteJoin from "@/pages/InviteJoin";
import NotFound from "@/pages/NotFound";
import "@/i18n";
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

// --- TYPES FOR ELECTRON BRIDGE ---
declare global {
  interface Window {
    electronAPI: {
      onUpdateAvailable: (cb: () => void) => void;
      onUpdateDownloaded: (cb: () => void) => void;
      onDeepLink: (cb: (url: string) => void) => void;
      restartApp: () => void;
    };
  }
}

// --- AUTH CALLBACK BRIDGE (runs outside HashRouter, detects by pathname) ---
const AuthCallback = () => {
  useEffect(() => {
    // Only act when Vercel served this page for the /auth-callback path
    if (!window.location.pathname.includes('auth-callback')) return;

    // Supabase puts tokens in the URL hash (implicit flow) or search params (PKCE)
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams   = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const accessToken  = searchParams.get('access_token')  || hashParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      const deepLink = `mshb://auth#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
      window.location.href = deepLink;
      // Fallback: if the browser stays on the web version, send to home after 3 s
      setTimeout(() => { window.location.hash = '/'; }, 3000);
    } else {
      window.location.hash = '/';
    }
  }, []);

  // Only show the "opening app" UI when actually on the callback path
  if (!window.location.pathname.includes('auth-callback')) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-4 text-center z-50">
      <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
      <p className="text-muted-foreground mb-4">Opening the MSHB Desktop app...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-6" />
      <p className="text-sm text-muted-foreground">Make sure the desktop app is installed.</p>
      <a
        href={`mshb://auth${window.location.search}${window.location.hash}`}
        className="mt-4 text-primary underline text-sm font-medium"
      >
        Click here to open the app manually
      </a>
    </div>
  );
};

// --- DEEP LINK HANDLER COMPONENT ---
const DeepLinkHandler = () => {
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onDeepLink) {
      window.electronAPI.onDeepLink(async (url: string) => {
        console.log("Desktop app received deep link:", url);
        
        const hash = url.split('#')[1];
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (!error) {
              console.log("Successfully logged in via deep link!");
              window.location.hash = "/";
            }
          }
        }
      });
    }
  }, []);

  return null;
};

// --- UPDATE BANNER COMPONENT ---
const UpdateBanner = () => {
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloaded'>('none');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable(() => setUpdateStatus('available'));
      window.electronAPI.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    }
  }, []);

  if (updateStatus === 'none') return null;

  return (
    <div className="w-full bg-indigo-600 text-white py-2 px-4 flex justify-between items-center z-[100] animate-in slide-in-from-top duration-300 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {updateStatus === 'available' ? "🚀 Downloading a new update..." : "✨ Update ready! Restart to see the changes."}
        </span>
      </div>
      {updateStatus === 'downloaded' && (
        <button 
          onClick={() => window.electronAPI.restartApp()}
          className="bg-white text-indigo-600 px-3 py-1 rounded-md text-xs font-bold hover:bg-slate-100 transition-all"
        >
          Restart Now
        </button>
      )}
    </div>
  );
};

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="text-primary animate-pulse text-lg">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AudioSettingsProvider>
        <VoiceChannelProvider>
          <AuthProvider>
            <TooltipProvider>
              <DeepLinkHandler />
              <AuthCallback />
              <UpdateBanner />

              <Toaster />
              <Sonner />
              <HashRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  
                  <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route element={<HomeView />}>
                      <Route index element={<FriendsDashboard />} />
                      <Route path="friends" element={<FriendsDashboard />} />
                      <Route path="chat/:threadId" element={<Chat />} />
                      <Route path="group/:groupId" element={<GroupChat />} />
                    </Route>
                    <Route path="server/:serverId" element={<ServerView />} />
                    <Route path="server/:serverId/channel/:channelId" element={<ServerView />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                  <Route path="/invite/:code" element={<ProtectedRoute><InviteJoin /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </HashRouter>
            </TooltipProvider>
          </AuthProvider>
        </VoiceChannelProvider>
      </AudioSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;