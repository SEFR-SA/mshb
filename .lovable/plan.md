

## Plan: Pin "View Full Profile" Button to Bottom of Panel

The panel currently uses `overflow-y-auto` on the `ProfileEffectWrapper` root, so the button scrolls with content. Fix by splitting the layout into a scrollable area and a sticky footer.

### Change — `src/components/chat/UserProfilePanel.tsx`

1. Change the `ProfileEffectWrapper` className from `overflow-y-auto` to `flex flex-col` (keep `h-full`).
2. Wrap all content (banner through mutual sections card) in a `<div className="flex-1 overflow-y-auto min-h-0">`.
3. Move the "View Full Profile" button block outside that scrollable div, into a `<div className="shrink-0 px-4 py-3 border-t border-border/50">` at the bottom — this stays pinned.

```text
<ProfileEffectWrapper className="w-72 ... h-full flex flex-col">
  <div className="flex-1 overflow-y-auto min-h-0">
    {/* banner, avatar, card, mutuals */}
  </div>
  <div className="shrink-0 px-4 py-3 border-t border-border/50">
    <Button>View Full Profile</Button>
  </div>
</ProfileEffectWrapper>
```

Single file: `src/components/chat/UserProfilePanel.tsx`

