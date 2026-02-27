

## Plan: Redesign Server Settings to Discord-style Layout (Phase 1)

### Database Migration

The `servers` table is missing a `description` column. Add it:

```sql
ALTER TABLE public.servers ADD COLUMN description text DEFAULT '';
```

No new RLS policies needed — existing "Admin can update server" policy already covers updates.

### File Changes

#### 1. New: `src/components/server/settings/ServerProfileTab.tsx`
- Server Name input + save button
- Server Description textarea + save button  
- Server Avatar upload (reuse existing `uploadImage` pattern from current dialog)
- Server Banner upload (wide image with hover overlay)
- Loading states during uploads
- Only owner/admin can edit; read-only for others

#### 2. Rewrite: `src/components/server/ServerSettingsDialog.tsx`
- Remove the old `Tabs`-based layout entirely
- Use a custom full-screen-style dialog (`sm:max-w-4xl h-[85vh]`) with flex layout:
  - **Desktop**: Left sidebar (w-56, fixed) with tab list + right scrollable content area
  - **Mobile**: `useIsMobile()` — show hamburger button that opens a `Sheet` (slide-in sidebar) with the same tab list
- `activeTab` state manages which tab renders in the content area
- Sidebar tabs: "Server Profile", "Server Tag", "Engagement", "Emojis", "Stickers", "Soundboard", "Members", "Roles", then separator, then "Audit Logs" (if admin), then separator, then red "Delete Server" button
- Only "Server Profile", "Members", "Audit Logs" have content; others show placeholder text
- Members tab: move existing member management JSX into inline content
- Audit Logs tab: render existing `AuditLogView`
- Extract existing data loading, upload, promote/demote/kick logic — keep in the dialog

#### 3. Delete Server Action
- Red "Delete Server" button in sidebar triggers an `AlertDialog`
- Requires typing the server name to confirm (input must match `serverName`)
- On confirm: delete server via supabase, close dialog, navigate home

#### 4. Update: `src/i18n/en.ts` and `src/i18n/ar.ts`
- Add keys for all new tab names: `serverSettings.serverProfile`, `serverSettings.serverTag`, `serverSettings.engagement`, `serverSettings.emojis`, `serverSettings.stickers`, `serverSettings.soundboard`, `serverSettings.members`, `serverSettings.roles`, `serverSettings.deleteServer`
- Add keys for: `serverSettings.description`, `serverSettings.descriptionPlaceholder`, `serverSettings.uploadAvatar`, `serverSettings.uploadBanner`, `serverSettings.deleteConfirmTitle`, `serverSettings.deleteConfirmDesc`, `serverSettings.typeServerName`, `serverSettings.comingSoon`

### Structure

```text
ServerSettingsDialog (full-screen modal)
├── Desktop: flex row
│   ├── Sidebar (w-56, border-r, scrollable)
│   │   ├── Tab buttons (Server Profile, Server Tag, ...)
│   │   ├── Separator
│   │   ├── Audit Logs (if admin)
│   │   ├── Separator  
│   │   └── Delete Server (red, owner only)
│   └── Content area (flex-1, overflow-y-auto, p-6)
│       └── <ServerProfileTab /> | Members | AuditLogView | Placeholder
└── Mobile: 
    ├── Header with hamburger → Sheet with same sidebar
    └── Content area (full width)
```

### Files Summary

| File | Action |
|------|--------|
| New migration | Add `description` column to `servers` |
| `src/components/server/settings/ServerProfileTab.tsx` | Create |
| `src/components/server/ServerSettingsDialog.tsx` | Rewrite with sidebar layout |
| `src/i18n/en.ts` | Add new translation keys |
| `src/i18n/ar.ts` | Add new translation keys |

