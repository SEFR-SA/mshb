import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import { UnsavedChangesBar } from "@/components/settings/UnsavedChangesBar";

/* ───────────────── Sub-components (unchanged) ───────────────── */

const KbdKey = ({ children }: { children: React.ReactNode }) => (
  <kbd className="bg-muted border border-border rounded px-2 py-1 text-xs font-mono text-foreground">
    {children}
  </kbd>
);

const KeyCombo = ({ keys }: { keys: string[] }) => (
  <div className="flex items-center gap-1">
    {keys.map((key, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
        <KbdKey>{key}</KbdKey>
      </React.Fragment>
    ))}
  </div>
);

const KeybindRow = ({ label, keys }: { label: string; keys: string[] }) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-sm font-medium">{label}</span>
    <KeyCombo keys={keys} />
  </div>
);

/* ───────────────── Types & Constants ───────────────── */

interface Section {
  title: string;
  binds: { label: string; keys: string[] }[];
}

const SECTIONS: Section[] = [
  {
    title: "App Settings",
    binds: [
      { label: "Toggle Streamer Mode", keys: ["Ctrl", "Shift", "S"] },
    ],
  },
  {
    title: "Messages",
    binds: [
      { label: "Edit Message", keys: ["E"] },
      { label: "Delete Message", keys: ["Backspace"] },
      { label: "Pin Message", keys: ["P"] },
      { label: "Add Reaction", keys: ["+"] },
      { label: "Forward Message", keys: ["F"] },
      { label: "Copy Text", keys: ["Ctrl", "C"] },
      { label: "Mark Unread", keys: ["Alt", "Enter"] },
    ],
  },
  {
    title: "Voice & Video",
    binds: [
      { label: "Toggle Mute", keys: ["Ctrl", "Shift", "M"] },
      { label: "Toggle Deafen", keys: ["Ctrl", "Shift", "D"] },
      { label: "Answer Incoming Calls", keys: ["Ctrl", "Enter"] },
      { label: "Decline Incoming Calls", keys: ["Esc"] },
      { label: "Start Streaming", keys: ["Ctrl", "Alt", "S"] },
      { label: "End Stream", keys: ["Ctrl", "Alt", "E"] },
    ],
  },
];

interface CustomBind {
  id: string;
  action: string;
  keys: string[];
}

const AVAILABLE_ACTIONS = [
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "TOGGLE_MUTE", label: "Toggle Mute" },
  { value: "TOGGLE_DEAFEN", label: "Toggle Deafen" },
  { value: "DISCONNECT_VOICE", label: "Disconnect from Voice Channel" },
  { value: "TOGGLE_SCREEN_SHARE", label: "Toggle Screen Share" },
  { value: "TOGGLE_STREAMER_MODE", label: "Toggle Streamer Mode" },
  { value: "ANSWER_CALL", label: "Answer Incoming Call" },
  { value: "DECLINE_CALL", label: "Decline Incoming Call" },
];

const STORAGE_KEY = "mshb_custom_keybinds";

const loadCustomBinds = (): CustomBind[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/* ───────────────── Component ───────────────── */

interface KeybindsTabProps {
  setUnsaved?: (onSave: () => void, onReset: () => void) => void;
  clearUnsaved?: () => void;
}

const KeybindsTab = ({ setUnsaved, clearUnsaved }: KeybindsTabProps) => {
  const { t } = useTranslation();

  const [customBinds, setCustomBinds] = useState<CustomBind[]>(loadCustomBinds);
  const originalRef = useRef<string>(JSON.stringify(loadCustomBinds()));

  const isDirty = JSON.stringify(customBinds) !== originalRef.current;

  /* ── Save / Reset ── */

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customBinds));
    originalRef.current = JSON.stringify(customBinds);
  };

  const handleReset = () => {
    const original: CustomBind[] = JSON.parse(originalRef.current);
    setCustomBinds(original);
  };

  /* ── CRUD ── */

  const handleAddKeybind = () => {
    setCustomBinds((prev) => [
      { id: crypto.randomUUID(), action: "UNASSIGNED", keys: [] },
      ...prev,
    ]);
  };

  const updateAction = (id: string, action: string) => {
    setCustomBinds((prev) =>
      prev.map((b) => (b.id === id ? { ...b, action } : b)),
    );
  };

  const updateKeys = (id: string, keys: string[]) => {
    setCustomBinds((prev) =>
      prev.map((b) => (b.id === id ? { ...b, keys } : b)),
    );
  };

  const deleteKeybind = (id: string) => {
    setCustomBinds((prev) => prev.filter((b) => b.id !== id));
  };

  /* ── Key Recorder ── */

  const handleKeyRecord = (
    e: React.KeyboardEvent<HTMLDivElement>,
    bindId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
    const combo: string[] = [];
    if (e.ctrlKey) combo.push("Ctrl");
    if (e.shiftKey) combo.push("Shift");
    if (e.altKey) combo.push("Alt");
    combo.push(e.key === " " ? "SPACE" : e.key.toUpperCase());
    updateKeys(bindId, combo);
  };

  /* ── Render ── */

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {t("settings.keybinds")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("keybinds.description")}
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={handleAddKeybind}>
          <Plus className="h-4 w-4" />
          {t("keybinds.addKeybind")}
        </Button>
      </div>

      {/* Custom Keybinds */}
      {customBinds.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-2">
            {t("keybinds.customKeybinds")}
          </h3>
          {customBinds.map((bind) => (
            <div key={bind.id} className="flex items-center gap-3 py-3">
              {/* Action selector */}
              <Select
                value={bind.action}
                onValueChange={(val) => updateAction(bind.id, val)}
              >
                <SelectTrigger className="w-48 bg-muted/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {t(`keybinds.actions.${a.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Key Recorder */}
              <div
                tabIndex={0}
                onKeyDown={(e) => handleKeyRecord(e, bind.id)}
                className="flex-1 flex items-center justify-between min-h-[40px] px-3 rounded-md border border-border bg-muted/40 cursor-pointer focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
              >
                {bind.keys.length > 0 ? (
                  <KeyCombo keys={bind.keys} />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("keybinds.recordKeybind")}
                  </span>
                )}
                {bind.keys.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateKeys(bind.id, []);
                    }}
                    className="ms-2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center shrink-0"
                    aria-label="Clear keybind"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteKeybind(bind.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Default Sections (read-only) */}
      {SECTIONS.map((section) => (
        <div
          key={section.title}
          className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-2">
            {section.title}
          </h3>
          {section.binds.map((bind) => (
            <KeybindRow key={bind.label} label={bind.label} keys={bind.keys} />
          ))}
        </div>
      ))}

      <UnsavedChangesBar show={isDirty} onSave={handleSave} onReset={handleReset} />
    </div>
  );
};

export default KeybindsTab;
