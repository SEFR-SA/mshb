

## Remove Nav Links from AppLayout Sidebar and Merge User Panel into ChannelSidebar

### Overview
Since Messages and Friends are now accessible from the Server Rail, and Settings is accessible from the sidebar bottom, the desktop sidebar nav in AppLayout is redundant. We will remove the entire desktop sidebar from AppLayout and move the user panel (voice status, audio controls, user profile + settings) into the bottom of ChannelSidebar -- matching Discord's layout where the user panel sits at the bottom of the channel sidebar.

### Changes

**1. `src/components/layout/AppLayout.tsx`**
- Remove the entire desktop `<aside>` block (lines 62-148) which contains the nav items and the bottom user panel
- Keep everything else: Server Rail, mobile header, mobile bottom nav, main content area
- The desktop layout becomes: ServerRail | Main Content (with ChannelSidebar rendered inside ServerView's Outlet)

**2. `src/components/server/ChannelSidebar.tsx`**
- Replace the current bottom section (lines 467-474, just a "Leave" button) with a full Discord-style user panel:
  - Voice connection status row (when connected): green indicator + channel name + disconnect button
  - Audio controls row: Mute, Deafen, Settings (link to /settings), and Leave Server button
  - User profile row: Avatar with status badge, display name, username
- Import needed hooks: `useAudioSettings`, `useVoiceChannel`, `useAuth` (already imported), `usePresence`
- Import needed icons: `Mic`, `MicOff`, `Headphones`, `HeadphoneOff`, `PhoneOff`
- Import `StatusBadge`, `Avatar` components (Avatar already imported)

### Visual Layout (ChannelSidebar Bottom)

```text
+------------------------------------------+
| [green dot] Voice Connected               |
| #channel-name           [Disconnect]      |
+------------------------------------------+
| [Mute] [Deafen] [Settings] [Leave]       |
+------------------------------------------+
| [Avatar+Status]  DisplayName              |
|                  @username                |
+------------------------------------------+
```

### Files Modified
- `src/components/layout/AppLayout.tsx` -- remove desktop sidebar entirely
- `src/components/server/ChannelSidebar.tsx` -- add user panel with voice status, audio controls, and profile to bottom

