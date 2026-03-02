

## Mobile Responsiveness Audit: Server Settings — Stickers & Emojis Tabs

### Issues Found

1. **ESC label visible on mobile** — Line 243 of `ServerSettingsDialog.tsx`: `<span className="text-[10px] font-bold text-muted-foreground">ESC</span>` has no mobile breakpoint hide.

2. **Upload buttons not full-width on mobile** — Both `StickersTab.tsx` (line 173) and `EmojisTab.tsx` (line 142) wrap the upload button in `flex flex-col items-end`, keeping it small on mobile.

3. **Table layout cramped on mobile** — Both tabs use `<Table>` with `min-w-[520px]`/`min-w-[480px]` forcing horizontal scroll. No mobile card/list view.

4. **Copy mismatch** — `StickersTab.tsx` line 168 uses `t("serverSettings.emojisUsed")` which renders "3 / 50 Emojis" instead of "Stickers". Need a separate `stickersUsed` i18n key.

5. **Modal height on mobile** — The content area (`bg-muted`) doesn't guarantee full viewport height on short content.

### Plan

#### File 1: `src/i18n/en.ts`
- Add `stickersUsed: "{{count}} / {{max}} Stickers"` after `noStickers` line.

#### File 2: `src/i18n/ar.ts`
- Add `stickersUsed: "{{count}} / {{max}} ملصق"` after `noStickers` line.

#### File 3: `src/components/server/ServerSettingsDialog.tsx`
- **Line 233**: Add `min-h-[100dvh]` to the content area div so background extends full screen on mobile:
  `"flex-1 flex flex-col overflow-hidden bg-muted relative min-h-[100dvh] sm:min-h-0"`
- **Line 243**: Hide ESC label on mobile:
  `<span className="text-[10px] font-bold text-muted-foreground hidden sm:block">ESC</span>`

#### File 4: `src/components/server/settings/StickersTab.tsx`
- **Line 168**: Change `t("serverSettings.emojisUsed")` → `t("serverSettings.stickersUsed")`.
- **Line 172**: Make upload button wrapper full-width on mobile:
  `"flex flex-col items-stretch sm:items-end gap-1"` and add `w-full sm:w-auto` to the `<Button>`.
- **Lines 198–241**: Replace the table section with a responsive layout:
  - **Mobile** (`md:hidden`): Render a flex-based list. Each row is a horizontal flex container with image (left), name + format badge (center, `flex-1`), and delete button (right). Generous `py-3` padding, separated by `border-b border-border/50`.
  - **Desktop** (`hidden md:block`): Keep the existing `<Table>` as-is.

#### File 5: `src/components/server/settings/EmojisTab.tsx`
- **Line 141**: Same upload button treatment — `items-stretch sm:items-end`, button gets `w-full sm:w-auto`.
- **Lines 178–216**: Same responsive table refactor:
  - **Mobile**: Flex rows with emoji image, `:name:` text, and delete button.
  - **Desktop**: Existing `<Table>` unchanged.

### Summary of Changes

| File | What Changes |
|------|-------------|
| `en.ts` / `ar.ts` | Add `stickersUsed` key |
| `ServerSettingsDialog.tsx` | Full-height mobile content, hide ESC on mobile |
| `StickersTab.tsx` | Fix copy key, full-width button, flex list on mobile |
| `EmojisTab.tsx` | Full-width button, flex list on mobile |

