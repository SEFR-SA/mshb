import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "mshb_device_id";
const LAST_UPSERT_KEY = "mshb_device_last_upsert";
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function parseOS(ua: string): string {
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS/.test(ua)) return "macOS";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  return "Unknown";
}

function parseBrowser(ua: string): string {
  // Check Electron first (MSHB desktop app)
  if (typeof window !== "undefined" && (window as any).electronAPI) return "MSHB Desktop";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  return "Unknown";
}

export function useDeviceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const lastUpsert = localStorage.getItem(LAST_UPSERT_KEY);
    if (lastUpsert && Date.now() - Number(lastUpsert) < THROTTLE_MS) return;

    const deviceId = getDeviceId();
    const os = parseOS(navigator.userAgent);
    const browser = parseBrowser(navigator.userAgent);

    supabase
      .from("user_devices")
      .upsert(
        { user_id: user.id, device_id: deviceId, os, browser, last_active: new Date().toISOString() },
        { onConflict: "user_id,device_id" }
      )
      .then(() => {
        localStorage.setItem(LAST_UPSERT_KEY, String(Date.now()));
      });
  }, [user]);
}
