

## Infinite Scrolling for Message Fetching — Implementation Plan

### Current State

All three chat components (`Chat.tsx`, `GroupChat.tsx`, `ServerChannelChat.tsx`) share the same pattern:
- `loadMessages(before?: string)` fetches `PAGE_SIZE` messages ordered by `created_at DESC`, reverses them for display
- Manual `useState<Message[]>` for the messages array
- A "Load More" button at the top (no automatic loading)
- Realtime subscriptions append new messages via `setMessages(prev => [...prev, msg])`
- `scrollContainerRef` (Chat.tsx) or bare `div.overflow-y-auto` (GroupChat, ServerChannelChat) as scroll containers

### Plan

#### Phase 1: Create a shared `useInfiniteMessages` hook

**New file:** `src/hooks/useInfiniteMessages.ts`

This hook encapsulates all message fetching using `@tanstack/react-query`'s `useInfiniteQuery`:

- **Query key:** `["messages", threadId | groupId | channelId]`
- **Query function:** Fetches 50 messages per page ordered by `created_at DESC` using `.range(from, to)` based on `pageParam` (page index, starting at 0)
- **`getNextPageParam`:** Returns `pageCount` if the last page returned a full 50 rows, otherwise `undefined`
- **Data shape:** Each page is an array of messages. The hook provides a flat `allMessages` array by reversing each page and concatenating in reverse page order (oldest first)
- **Returns:** `{ messages, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, queryKey }` — plus a helper `appendRealtimeMessage(msg)` that manually updates the query cache to add a new message to page 0

The hook accepts a config object: `{ threadId?, groupThreadId?, channelId? }` and builds the correct `.eq()` filter.

#### Phase 2: Intersection Observer trigger

No new dependency needed — use a native `useRef` + `IntersectionObserver` pattern (or a simple `useEffect` with `ref.current`).

In each chat component:
- Add an invisible `<div ref={topSentinelRef} />` above the first message (inside the scrollable area)
- A `useEffect` creates an `IntersectionObserver` watching that sentinel
- When `inView` and `hasNextPage` and `!isFetchingNextPage`, call `fetchNextPage()`
- Show a small `Loader2` spinner at the top while `isFetchingNextPage`

#### Phase 3: Scroll Position Preservation (the critical fix)

**Approach: `scrollHeight` delta method** — no external library needed.

Before new older messages render:
1. In the `onSuccess` / `onSettled` callback of `fetchNextPage`, or via a `useEffect` watching the page count:
   - Before the DOM updates: capture `scrollContainer.scrollHeight` and `scrollContainer.scrollTop`
   - After the DOM updates (via `useLayoutEffect` or `requestAnimationFrame`): set `scrollContainer.scrollTop = scrollTop + (newScrollHeight - oldScrollHeight)`

**Implementation detail:** Use a `useRef` to store `{ prevScrollHeight, prevScrollTop }`. A `useLayoutEffect` that runs when `messages.length` changes (specifically when pages increase) will compare the current `scrollHeight` to the stored value and adjust `scrollTop`. This fires synchronously after DOM mutation but before paint, preventing any visual jump.

For initial load: scroll to bottom as before (`messagesEndRef.current?.scrollIntoView()`).

#### Phase 4: Realtime Subscription Compatibility

The existing realtime subscriptions stay mostly the same. Instead of `setMessages(prev => [...prev, msg])`, they call the hook's `appendRealtimeMessage(msg)` which uses `queryClient.setQueryData` to prepend the message to page 0's array (which represents the newest messages). This preserves the infinite query cache structure.

UPDATE events similarly use `queryClient.setQueryData` to find and replace the updated message across all pages.

### Migration per component

Each chat component (`Chat.tsx`, `GroupChat.tsx`, `ServerChannelChat.tsx`) will:
1. Remove `loadMessages`, `hasMore`, `messages` useState, `messagesLoading` state
2. Import and call `useInfiniteMessages({ threadId })` (or `groupThreadId` / `channelId`)
3. Replace the "Load More" button with the sentinel `div` + spinner
4. Add a `scrollContainerRef` (if not already present) and the `useLayoutEffect` for scroll preservation
5. Update realtime handlers to use cache mutation instead of `setMessages`
6. Keep `hiddenIds` filtering as-is (applied to the flat messages array from the hook)

### Files Summary

| File | Action |
|------|--------|
| `src/hooks/useInfiniteMessages.ts` | **New** — shared infinite query hook |
| `src/pages/Chat.tsx` | Refactor to use hook, add sentinel + scroll fix |
| `src/pages/GroupChat.tsx` | Same refactor |
| `src/components/server/ServerChannelChat.tsx` | Same refactor |

No database changes needed. No new dependencies needed (`useInfiniteQuery` is already available via `@tanstack/react-query`, and `IntersectionObserver` is native).

