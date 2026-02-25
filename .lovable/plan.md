

## Fix: Server Invite Card Avatar Clipped

### Problem
The server icon/avatar on the invite card is positioned to overlap the bottom edge of the banner using `absolute -bottom-5`, but the banner container has `overflow-hidden`, which clips the avatar in half.

### Solution
Move the `overflow-hidden` from the outer banner `div` to the banner image only, so the avatar can visually overflow the banner area without being clipped.

### File: `src/components/chat/ServerInviteCard.tsx`

**Line 132**: Remove `overflow-hidden` from the banner wrapper div. Instead, wrap only the banner image in its own clipping container.

Current:
```html
<div className="relative h-[80px] bg-gradient-to-br from-primary/30 to-muted/60 overflow-hidden">
```

Change to:
```html
<div className="relative h-[80px] bg-gradient-to-br from-primary/30 to-muted/60">
```

And wrap the banner `<img>` in its own overflow-hidden container so it doesn't bleed outside the banner rectangle:
```html
<div className="absolute inset-0 overflow-hidden">
  <img src={metadata.server_banner_url} alt="" className="w-full h-full object-cover" />
</div>
```

This lets the avatar overlap freely while the banner image stays contained.

### Files to modify

| File | Change |
|------|--------|
| `src/components/chat/ServerInviteCard.tsx` | Remove `overflow-hidden` from banner div, wrap banner `<img>` in its own clipping container |

