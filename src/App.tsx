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

// --- TYPES FOR ELECTRON BRIDGE ---
declare global {
  interface Window {
    electronAPI: {
      onUpdateAvailable: (cb: () => void) => void;
      onUpdateDownloaded: (cb: () => void) => void;
      restartApp: () => void;
    };
  }
}

// --- DISCORD-STYLE UPDATE BANNER COMPONENT ---
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
              {/* THE UPDATE BANNER SITS AT THE VERY TOP */}
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