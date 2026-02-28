import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useServerOwnerIsPro(serverId: string): boolean {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!serverId) return;
    (async () => {
      const { data: server } = await supabase
        .from("servers" as any)
        .select("owner_id")
        .eq("id", serverId)
        .maybeSingle();
      const ownerId = (server as any)?.owner_id;
      if (!ownerId) return;
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("user_id", ownerId)
        .maybeSingle();
      setIsPro((ownerProfile as any)?.is_pro ?? false);
    })();
  }, [serverId]);

  return isPro;
}
