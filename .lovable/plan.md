

## Fix Native URL Ghost Image on Channel Drag-and-Drop

### Problem
When dragging channels (which wrap `<NavLink>` elements), Chrome/Electron attaches the literal URL path as a ghost image under the cursor. This looks unprofessional.

### Fix

**File: `src/components/server/ChannelSidebar.tsx`**

**1. Update `handleDragStart` (line 747-752)** to override the drag image and text payload:
```typescript
const handleDragStart = (e: React.DragEvent, id: string, type: "channel" | "section") => {
  setDragItem(id);
  setDragType(type);
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "channel-drag");
  if (e.currentTarget instanceof HTMLElement) {
    e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
  }
};
```

**2. Update `handleParticipantDragStart` (line 761-768)** with the same drag image override:
```typescript
const handleParticipantDragStart = (...) => {
  // ... existing code ...
  if (e.currentTarget instanceof HTMLElement) {
    e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
  }
};
```

**3. Add `draggable={false}` to inner `<NavLink>` elements** at lines ~1236 and any other `<NavLink>` inside draggable wrappers, so the browser doesn't initiate a separate link-drag on the anchor:
- Text channel NavLink (~line 1236): add `draggable={false}`
- Voice channel rows use `<button>` (line 1070), not NavLink — no change needed there

