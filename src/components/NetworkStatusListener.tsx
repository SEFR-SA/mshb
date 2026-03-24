import { useEffect } from "react";
import { toast } from "sonner";

export default function NetworkStatusListener() {
  useEffect(() => {
    const onOffline = () =>
      toast.error("You're offline. Check your connection.", {
        id: "network-offline",
        duration: Infinity,
      });
    const onOnline = () => {
      toast.dismiss("network-offline");
      toast.success("Back online!");
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return null;
}
