

## Avatar Hover Effect & Status Badge on Profile Preview

### What changes

**`src/components/settings/tabs/ProfileTab.tsx`** (lines 310-321):

1. **Add hover overlay to avatar** -- same pattern as the banner: a `group` class on the label, with an absolutely-positioned overlay containing `ImagePlus` icon that appears on hover with `bg-black/40 opacity-0 group-hover:opacity-100` transition. The overlay needs to be positioned inside the Avatar (within the decoration wrapper) so it covers the circular avatar area with `rounded-full`.

2. **Replace the Camera badge** (lines 317-319) with a `StatusBadge` component showing the user's current status. Use `profile?.status` to determine the status value (online/busy/dnd/idle/invisible), positioned at `absolute bottom-0 end-0 z-20`.

### Specific edits

Replace lines 310-321:
```tsx
<label className="cursor-pointer relative inline-block group shrink-0">
  <AvatarDecorationWrapper decorationUrl={p?.avatar_decoration_url} isPro={isPro} size={80}>
    <Avatar className="h-20 w-20 border-4 border-background" alwaysPlayGif>
      <AvatarImage src={profile?.avatar_url || ""} />
      <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initials}</AvatarFallback>
    </Avatar>
    {/* Hover overlay -- same as banner */}
    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
      <ImagePlus className="h-5 w-5 text-white" />
    </div>
    <StatusBadge status={(p?.status || "online") as UserStatus} size="md" className="absolute bottom-0 end-0 z-20" />
  </AvatarDecorationWrapper>
  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
</label>
```

Also add the `StatusBadge` and `UserStatus` imports, and remove the unused `Camera` import.

### Files changed
| File | Change |
|------|--------|
| `src/components/settings/tabs/ProfileTab.tsx` | Replace camera badge with StatusBadge; add hover overlay to avatar |

