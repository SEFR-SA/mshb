import { useEffect, useRef, useCallback } from "react";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useStreamerMode } from "@/contexts/StreamerModeContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "mshb_custom_keybinds";

interface StoredBind {
  action: string;
  keys: string[];
}

const DEFAULT_BINDS: StoredBind[] = [
  { action: "TOGGLE_MUTE", keys: ["Ctrl", "Shift", "M"] },
  { action: "TOGGLE_DEAFEN", keys: ["Ctrl", "Shift", "D"] },
  { action: "TOGGLE_STREAMER_MODE", keys: ["Ctrl", "Shift", "S"] },
];

function loadBinds(): StoredBind[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom: StoredBind[] = raw ? JSON.parse(raw) : [];
    // Merge: custom binds take priority; add defaults for actions not yet assigned
    const assignedActions = new Set(
      custom.filter((b) => b.action !== "UNASSIGNED").map((b) => b.action),
    );
    const merged = [...custom];
    for (const def of DEFAULT_BINDS) {
      if (!assignedActions.has(def.action)) {
        merged.push(def);
      }
    }
    return merged.filter((b) => b.keys.length > 0 && b.action !== "UNASSIGNED");
  } catch {
    return DEFAULT_BINDS;
  }
}

/**
 * Global keyboard shortcuts.
 *
 * Electron path: registers OS-level global shortcuts via IPC so they work
 * even when the app is minimized or another window is focused.
 *
 * Browser path: falls back to window keydown listener (only when focused).
 */
export const useGlobalKeybinds = () => {
  const { toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { isStreamerMode, toggleStreamerMode } = useStreamerMode();
  const { disconnectVoice } = useVoiceChannel();

  // Keep action functions in refs so IPC callbacks are never stale
  const actionsRef = useRef({
    toggleGlobalMute,
    toggleGlobalDeafen,
    toggleStreamerMode,
    isStreamerMode,
    disconnectVoice,
  });
  useEffect(() => {
    actionsRef.current = {
      toggleGlobalMute,
      toggleGlobalDeafen,
      toggleStreamerMode,
      isStreamerMode,
      disconnectVoice,
    };
  });

  const dispatchAction = useCallback((action: string) => {
    const a = actionsRef.current;
    switch (action) {
      case "TOGGLE_MUTE":
        a.toggleGlobalMute();
        break;
      case "TOGGLE_DEAFEN":
        a.toggleGlobalDeafen();
        break;
      case "TOGGLE_STREAMER_MODE":
        a.toggleStreamerMode();
        toast({
          title: !a.isStreamerMode
            ? "Streamer Mode Enabled"
            : "Streamer Mode Disabled",
          description: !a.isStreamerMode
            ? "Notifications, sounds, and sensitive info are now hidden."
            : "Notifications and info are visible again.",
          duration: 3000,
        });
        break;
      case "DISCONNECT_VOICE":
        a.disconnectVoice();
        break;
      case "TOGGLE_SCREEN_SHARE":
        window.dispatchEvent(new CustomEvent("mshb:toggle-screen-share"));
        break;
      case "ANSWER_CALL":
        window.dispatchEvent(new CustomEvent("mshb:answer-call"));
        break;
      case "DECLINE_CALL":
        window.dispatchEvent(new CustomEvent("mshb:decline-call"));
        break;
    }
  }, []);

  // ── Electron: OS-level global shortcuts ──
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.registerGlobalShortcuts || !api?.onGlobalShortcutTriggered) return;

    const register = () => {
      const binds = loadBinds();
      api.registerGlobalShortcuts(
        binds.map((b) => ({ action: b.action, keys: b.keys })),
      );
    };

    // Register on mount
    register();

    // Listen for triggered shortcuts from main process
    const unsubTrigger = api.onGlobalShortcutTriggered((action: string) => {
      dispatchAction(action);
    });

    // Re-register when keybinds change in settings (same window)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) register();
    };
    window.addEventListener("storage", onStorage);

    // Also listen for same-window localStorage writes (storage event only fires cross-tab)
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
      origSetItem(key, value);
      if (key === STORAGE_KEY) register();
    };

    return () => {
      unsubTrigger();
      window.removeEventListener("storage", onStorage);
      localStorage.setItem = origSetItem;
    };
  }, [dispatchAction]);

  // ── Browser fallback: DOM keydown (only when focused) ──
  useEffect(() => {
    if ((window as any).electronAPI?.registerGlobalShortcuts) return;

    const handler = (e: KeyboardEvent) => {
      const binds = loadBinds();
      for (const bind of binds) {
        const needsCtrl = bind.keys.some(
          (k) => k.toLowerCase() === "ctrl",
        );
        const needsShift = bind.keys.some(
          (k) => k.toLowerCase() === "shift",
        );
        const needsAlt = bind.keys.some(
          (k) => k.toLowerCase() === "alt",
        );
        const mainKey = bind.keys.find(
          (k) =>
            !["ctrl", "shift", "alt", "meta"].includes(k.toLowerCase()),
        );
        if (!mainKey) continue;

        const keyMatches =
          mainKey.toLowerCase() === "space"
            ? e.key === " "
            : e.key.toUpperCase() === mainKey.toUpperCase();

        if (
          e.ctrlKey === needsCtrl &&
          e.shiftKey === needsShift &&
          e.altKey === needsAlt &&
          keyMatches
        ) {
          e.preventDefault();
          dispatchAction(bind.action);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatchAction]);
};
