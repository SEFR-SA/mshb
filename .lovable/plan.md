

## Fix: Make Theme Builder Responsive on Mobile

### Problem
The `ThemeBuilder` component is a **fixed full-screen overlay** with a horizontal `flex` layout: a large preview mock on the left and a `w-72` controls panel on the right. On mobile (390px wide), this layout completely breaks — the preview overflows and the controls panel is either off-screen or crushed.

### Solution
On mobile, render the Theme Builder as a **Drawer (bottom sheet)** instead of the fixed overlay. The preview mock is hidden (same pattern as DisplayNameStyleModal), and the controls are presented in a single-column scrollable drawer.

### Changes

**File: `src/components/settings/ThemeBuilder.tsx`**

1. Import `useIsMobile` and Drawer components
2. On mobile: wrap the controls in a `Drawer` bottom sheet, hide the large preview mock entirely, and show a small inline color swatch as a mini-preview instead
3. On desktop: keep the existing full-screen overlay layout unchanged

**Mobile layout structure:**
```
Drawer (bottom sheet)
  ├─ Drag handle
  ├─ Title + Close
  ├─ Small color swatch preview (rounded div showing primary + bg colors)
  ├─ Color picker
  ├─ Mode toggle (auto/light/dark)
  ├─ Surprise Me button
  └─ Save / Cancel buttons
```

**File: `src/components/settings/tabs/AppearanceTab.tsx`**

No changes needed — it already calls `setShowBuilder(true)` which renders `<ThemeBuilder />`. The ThemeBuilder itself will handle the responsive switch internally.

### Implementation Detail

```tsx
// ThemeBuilder.tsx — mobile branch
if (isMobile) {
  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("themeBuilder.title")}</DrawerTitle>
        </DrawerHeader>
        {/* Mini color preview swatch */}
        <div className="flex gap-2 items-center px-1">
          <div className="h-10 flex-1 rounded-lg" style={{ background: vars["--color-bg"] }} />
          <div className="h-10 flex-1 rounded-lg" style={{ background: vars["--color-primary"] }} />
          <div className="h-10 flex-1 rounded-lg" style={{ background: vars["--color-surface"] }} />
        </div>
        {/* Color picker + mode + surprise + save/cancel — same controls, full width */}
      </DrawerContent>
    </Drawer>
  );
}
// else: existing desktop overlay
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/ThemeBuilder.tsx` | Add `useIsMobile`, render as Drawer on mobile with mini swatch preview, keep desktop overlay unchanged |

