import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AudioSettingsProvider } from "@/contexts/AudioSettingsContext";
import { VoiceChannelProvider } from "@/contexts/VoiceChannelContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import Inbox from "@/pages/Inbox";
import Chat from "@/pages/Chat";
import Friends from "@/pages/Friends";
import GroupChat from "@/pages/GroupChat";
import Settings from "@/pages/Settings";
import ServerView from "@/pages/ServerView";
import NotFound from "@/pages/NotFound";
import "@/i18n";

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
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Inbox />} />
                <Route path="chat/:threadId" element={<Chat />} />
                <Route path="friends" element={<Friends />} />
                <Route path="group/:groupId" element={<GroupChat />} />
                <Route path="server/:serverId" element={<ServerView />} />
                <Route path="server/:serverId/channel/:channelId" element={<ServerView />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </VoiceChannelProvider>
      </AudioSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
