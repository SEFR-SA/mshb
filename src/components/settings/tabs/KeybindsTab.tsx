import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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

interface KeybindsTabProps {
  setUnsaved?: (onSave: () => void, onReset: () => void) => void;
  clearUnsaved?: () => void;
}

const KeybindsTab = (_props: KeybindsTabProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.keybinds")}</h2>
          <p className="text-sm text-muted-foreground">
            Default keyboard shortcuts for quick actions.
          </p>
        </div>
        <Button size="sm" className="shrink-0">
          <Plus className="h-4 w-4" />
          Add a Keybind
        </Button>
      </div>

      {/* Sections */}
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
    </div>
  );
};

export default KeybindsTab;
