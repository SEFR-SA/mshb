import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useDeviceTracker";
import { Monitor, Smartphone, Laptop, X, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Device {
  id: string;
  device_id: string;
  os: string;
  browser: string;
  last_active: string;
  created_at: string;
  ip_address: string | null;
  location: string | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getDeviceIcon(os: string) {
  const mobile = ["Android", "iOS"];
  if (mobile.includes(os)) return Smartphone;
  if (os === "macOS") return Laptop;
  return Monitor;
}

const DevicesTab: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDeviceId = getDeviceId();

  const fetchDevices = async () => {
    if (!user) return;
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    const { data } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .gte("last_active", cutoff)
      .order("last_active", { ascending: false });
    setDevices((data as Device[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, [user]);

  const removeDevice = async (deviceId: string) => {
    await supabase.from("user_devices").delete().eq("device_id", deviceId).eq("user_id", user!.id);
    setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
    toast.success(t("settings.deviceLoggedOut"));
  };

  const logOutAllOthers = async () => {
    await supabase.auth.signOut({ scope: "others" });
    await supabase.from("user_devices").delete().eq("user_id", user!.id).neq("device_id", currentDeviceId);
    setDevices((prev) => prev.filter((d) => d.device_id === currentDeviceId));
    toast.success(t("settings.allDevicesLoggedOut"));
  };

  const currentDevice = devices.find((d) => d.device_id === currentDeviceId);
  const otherDevices = devices.filter((d) => d.device_id !== currentDeviceId);

  const DeviceCard = ({ device, isCurrent }: { device: Device; isCurrent: boolean }) => {
    const Icon = getDeviceIcon(device.os);
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border/50">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{device.os}</span>
            {isCurrent && (
              <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-500 bg-green-500/10">
                {t("settings.currentDevice")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {device.browser} · {formatDistanceToNow(new Date(device.last_active), { addSuffix: true })}
          </p>
        </div>
        {!isCurrent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => removeDevice(device.device_id)}
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
                  aria-label={t("settings.logOutDevice")}
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{t("settings.logOutDeviceNote")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("settings.devices")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.devicesDescription")}</p>
      </div>

      {/* Current device */}
      {currentDevice && (
        <div className="space-y-2">
          <DeviceCard device={currentDevice} isCurrent />
        </div>
      )}

      {/* Other devices */}
      {otherDevices.length > 0 && (
        <div className="space-y-2">
          {otherDevices.map((d) => (
            <DeviceCard key={d.id} device={d} isCurrent={false} />
          ))}
        </div>
      )}

      {otherDevices.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("settings.noOtherDevices")}</p>
      )}

      {/* Log out all others */}
      {otherDevices.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <LogOut className="h-4 w-4 me-2" />
              {t("settings.logOutAllOther")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.logOutAllOther")}</AlertDialogTitle>
              <AlertDialogDescription>{t("settings.logOutAllConfirm")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={logOutAllOthers} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("settings.logOutAllOther")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default DevicesTab;
