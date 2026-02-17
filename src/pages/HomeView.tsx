import React, { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import HomeSidebar from "@/components/layout/HomeSidebar";
import ActiveNowPanel from "@/components/chat/ActiveNowPanel";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const HomeView = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const isFriendsView = location.pathname === "/" || location.pathname === "/friends";

  // Load friend user IDs for ActiveNowPanel
  const [friendUserIds, setFriendUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      
      if (data) {
        setFriendUserIds(data.map((f: any) => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        ));
      }
    })();
  }, [user]);

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <HomeSidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Outlet />
      </div>
      {isFriendsView && (
        <div className="w-[280px] border-s border-border/50 shrink-0">
          <ActiveNowPanel friendUserIds={friendUserIds} />
        </div>
      )}
    </div>
  );
};

export default HomeView;
