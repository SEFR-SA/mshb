

## Add @Mentions in Server Chat and Voice Channel Presence in Sidebar

### Feature 1: @Mentions in Server Chat

Add the ability to mention individual users (`@username`) or all members (`@all`) in server channel messages. Typing `@` will show a dropdown of server members to pick from.

**New Component: `src/components/server/MentionPopup.tsx`**
- A floating popup that appears above the input when `@` is typed
- Fetches server members and filters by typed text after `@`
- Shows an `@all` option at the top
- Clicking a suggestion inserts the mention text into the input
- Keyboard navigation (arrow keys + Enter) supported

**Modified: `src/components/server/ServerChannelChat.tsx`**
- Track cursor position and detect `@` trigger in the input
- Show `MentionPopup` when user types `@`
- On mention select, replace the `@partial` text with `@username` or `@all`
- Render mentions in messages with highlight styling: parse message content for `@username` and `@all` patterns and wrap them in styled spans
- Create a `renderMessageContent` helper function that replaces `@username` patterns with highlighted `<span>` elements using the loaded profiles map

**Message Rendering:**
- `@all` rendered with a distinct background highlight (e.g., `bg-yellow-500/20 text-yellow-300`)
- `@username` rendered with a primary color highlight (e.g., `bg-primary/20 text-primary`)
- Current user's own mentions get extra emphasis

### Feature 2: Voice Channel Participants in Sidebar

Show users currently in a voice channel directly under the channel name in the sidebar, similar to Discord's layout. Active voice channels (with participants) show a green speaker icon instead of gray.

**Modified: `src/components/server/ChannelSidebar.tsx`**
- Fetch voice channel participants from `voice_channel_participants` table for all voice channels in the server
- Subscribe to real-time changes on `voice_channel_participants` filtered by channel IDs
- For each voice channel, display participant avatars and names in a nested list below the channel button
- Change the `Volume2` icon color to `text-green-500` when the channel has one or more participants
- Each participant row shows a small avatar and their display name, indented under the voice channel

**Layout for voice channels in the sidebar:**
```text
  [green speaker] chilling          1:49:38
      [avatar] black angel
      [avatar] SeraphEcho
```

### i18n Updates

**`src/i18n/en.ts` and `src/i18n/ar.ts`:**
- `mentions.all` - "everyone" / label for @all
- `mentions.noResults` - "No members found"
- `servers.voiceConnected` - connected duration or count label

### Technical Details

**MentionPopup component:**
```typescript
interface MentionPopupProps {
  serverId: string;
  filter: string; // text after @ 
  onSelect: (mention: string) => void;
  onClose: () => void;
}
```
- Fetches `server_members` + profiles for the server
- Filters by `display_name` or `username` matching the typed filter
- Positioned absolutely above the input area

**Message content rendering (in ServerChannelChat):**
```typescript
const renderContent = (content: string) => {
  // Split on @mentions pattern: @username or @all
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part === "@all") {
      return <span key={i} className="bg-yellow-500/20 text-yellow-400 px-1 rounded font-medium">@all</span>;
    }
    if (part.startsWith("@")) {
      const username = part.slice(1);
      const matched = [...profiles.values()].find(p => p.username === username);
      if (matched) {
        return <span key={i} className="bg-primary/20 text-primary px-1 rounded font-medium">{part}</span>;
      }
    }
    return part;
  });
};
```

**Voice participants in ChannelSidebar:**
```typescript
// Fetch all voice_channel_participants for voice channels in this server
const [voiceParticipants, setVoiceParticipants] = useState<Map<string, VoiceParticipant[]>>(new Map());

useEffect(() => {
  const voiceChannelIds = channels.filter(c => c.type === "voice").map(c => c.id);
  if (voiceChannelIds.length === 0) return;
  
  // Fetch participants
  supabase.from("voice_channel_participants")
    .select("channel_id, user_id")
    .in("channel_id", voiceChannelIds)
    .then(({ data }) => {
      // Group by channel_id, fetch profiles, update state
    });

  // Subscribe to realtime changes
  const sub = supabase.channel(`voice-sidebar-${serverId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants" }, () => reload())
    .subscribe();
  return () => sub.unsubscribe();
}, [channels]);
```

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/server/MentionPopup.tsx` | Create | Mention suggestion dropdown component |
| `src/components/server/ServerChannelChat.tsx` | Modify | Add mention trigger logic, render mentions with highlights |
| `src/components/server/ChannelSidebar.tsx` | Modify | Show voice participants under voice channels, green icon for active |
| `src/i18n/en.ts` | Modify | Add mention-related translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic mention translations |

