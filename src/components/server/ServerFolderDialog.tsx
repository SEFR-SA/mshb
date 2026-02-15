import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_COLORS = [
  "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  "#FF7F50", "#1ABC9C", "#E91E63", "#9B59B6", "#3498DB",
];

interface ServerFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialColor?: string;
  onSave: (name: string, color: string) => void;
}

const ServerFolderDialog: React.FC<ServerFolderDialogProps> = ({
  open,
  onOpenChange,
  initialName = "Folder",
  initialColor = "#5865F2",
  onSave,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const handleSave = () => {
    onSave(name.trim() || "Folder", color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{t("folders.editFolder")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("folders.folderName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder"
              maxLength={32}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("folders.folderColor")}</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:border-foreground transition-colors overflow-hidden relative">
                <span className="text-xs text-muted-foreground">+</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <div className="w-3 h-10 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{name || "Folder"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave}>{t("actions.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServerFolderDialog;
