# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**Large Monolithic Components (Component Complexity):**
- Issue: Several components exceed 600+ lines with complex state management and multiple responsibilities, mixing UI rendering with business logic
- Files:
  - `src/components/server/ChannelSidebar.tsx` (1092 lines)
  - `src/pages/Chat.tsx` (759 lines)
  - `src/pages/GroupChat.tsx` (636 lines)
  - `src/components/server/VoiceConnectionBar.tsx` (615 lines)
- Impact: Difficult to test, maintain, and reason about; increases cognitive load; harder to refactor; increased likelihood of bugs during modifications
- Fix approach: Break into smaller, focused components; extract state management logic into custom hooks; separate presentation from business logic

**React Query Installed But Unused:**
- Issue: `@tanstack/react-query` (v5.83.0) is a production dependency but not actively used anywhere in the codebase
- Files: `package.json` (line 54)
- Impact: Dead dependency adds bundle size; increases maintenance burden; inconsistent with CLAUDE.md directive to use direct Supabase calls
- Fix approach: Remove from `package.json`; document pattern for why direct Supabase calls are preferred

**Missing Promise Handling with Trailing `.then()`:**
- Issue: Numerous fire-and-forget Supabase operations using bare `.then()` without error handling or proper async/await
- Files:
  - `src/pages/Chat.tsx` (lines 260, 278, 561)
  - `src/pages/GroupChat.tsx` (lines 172, 187, 409)
  - `src/components/server/ServerChannelChat.tsx` (lines 158, 368)
  - `src/components/server/VoiceConnectionBar.tsx` (lines 105, 323, 364, 576, 604)
  - `src/hooks/usePresence.ts` (lines 37, 45)
- Impact: Errors silently fail; operations not tracked; potential database state inconsistencies; makes debugging harder
- Fix approach: Convert to proper async/await with try-catch; handle errors with toast notifications or logging

**Single Placeholder Test File:**
- Issue: Only one trivial example test exists (`src/test/example.test.ts`); vitest configured but no actual test coverage
- Files: `src/test/example.test.ts`
- Impact: No regression detection; confidence in changes is low; code can break silently in production; difficult to refactor safely
- Fix approach: Add comprehensive test suites for critical paths (auth, messages, voice calls, presence)

---

## Known Bugs

**Auth Context Deadlock Workaround with setTimeout:**
- Symptoms: Profile fetch hangs if called immediately after auth state change
- Files: `src/contexts/AuthContext.tsx` (line 56)
- Trigger: User signs in or session restores; `fetchProfile` is called from `onAuthStateChange` handler
- Current workaround: `setTimeout(() => fetchProfile(session.user.id), 0)` delays the fetch
- Impact: Race condition masked but not fixed; could resurface under slow network conditions
- Root cause: Potential Supabase client state not fully ready when auth event fires

**Missing Error Handling in Voice/Video Call:**
- Symptoms: Exceptions during WebRTC setup or media access silently fail; users get no feedback
- Files: `src/hooks/useWebRTC.ts` (lines 136, 439)
- Trigger: Camera/screen share denied by user; getUserMedia fails
- Current behavior: Catches error but silently continues with no user notification
- Impact: User thinks camera is on when it's not; remote side sees no video but doesn't know why

**Realtime Subscription Memory Leaks (Potential):**
- Symptoms: If Chat component unmounts during active call, memory may leak
- Files: `src/pages/Chat.tsx` (lines 176-212) - call status subscription
- Trigger: User navigates away while on a voice call
- Current cleanup: `channel.unsubscribe()` is called but timing of component unmount vs. channel subscription could race
- Impact: Accumulated memory leaks on repeated navigation; battery drain; slower performance
- Fix approach: Use refs to track subscription state; add mounted flag to prevent state updates after unmount

---

## Security Considerations

**Direct ENV Variable Access in File Upload:**
- Risk: Supabase credentials exposed through environment variables
- Files: `src/lib/uploadChatFile.ts` (lines 19-20)
- Current mitigation: Credentials are public/publishable keys only (VITE_SUPABASE_PUBLISHABLE_KEY), not sensitive
- Details: XMLHttpRequest uses Bearer token from session (safe) but also setRequestHeader with apikey
- Recommendation: Verify Supabase RLS policies on chat-files bucket prevent unauthorized access; consider server-side upload instead

**Row-Level Security (RLS) Policies Rely on Correct Implementation:**
- Risk: If a single RLS policy is misconfigured or bypassed, entire data model is exposed
- Files: All migration files in `supabase/migrations/`
- Current state: Policies present but complex (esp. `20260226000001_announcement_channels.sql` with nested function calls)
- Recommendation: Regularly audit RLS policies; add test coverage for permission checks; use Supabase Policy Editor to visualize

**Username Resolution via RPC During Sign-In:**
- Risk: `signIn` function calls RPC `get_email_by_username` which could be abused for username enumeration
- Files: `src/contexts/AuthContext.tsx` (line 97)
- Current mitigation: RPC error returns generic "No account found" message
- Recommendation: Add rate limiting on auth endpoint; monitor for enumeration attacks

**Hardcoded Email Redirect URL:**
- Risk: Redirect URL is hardcoded to `https://mshb.vercel.app/auth-callback`
- Files: `src/contexts/AuthContext.tsx` (line 81)
- Impact: Environment-specific URLs not supported; domain changes require code change
- Fix approach: Use environment variable `VITE_AUTH_REDIRECT_URL` with fallback

---

## Performance Bottlenecks

**Chat Messages Loading (No Pagination Optimization):**
- Problem: All messages loaded with `.order("created_at", { ascending: false }).limit(PAGE_SIZE)` but array operations use `.reverse()` and `.sort()`
- Files: `src/pages/Chat.tsx` (lines 227-250)
- Cause: Loading in descending order then reversing for display; repeated `.sort()` in state updates
- Impact: O(n log n) sort on every message load; slows down large conversation threads
- Improvement path: Fetch in ascending order; eliminate post-fetch reversal; use immutable append instead of sort

**Audio Context Creation Per Connection:**
- Problem: `createVolumeMonitor` creates a new AudioContext for each voice connection
- Files: `src/components/server/VoiceConnectionBar.tsx` (line 12)
- Cause: No audio context reuse; multiple simultaneous calls create multiple contexts
- Impact: Resource leak; battery drain on mobile; can hit browser limit on concurrent audio contexts (usually 6)
- Improvement path: Create singleton AudioContext; share across all voice connections; clean up on last disconnect

**Presence Updates Every 60 Seconds Without Debouncing:**
- Problem: `setInterval` fires every 60s updating `last_seen` in profiles table
- Files: `src/hooks/usePresence.ts` (lines 44-46)
- Cause: No check if value changed; always writes to DB even if user still idle
- Impact: Excess database writes; unnecessary Realtime events; increased bandwidth
- Improvement path: Only update if time since last update > threshold; use debounce

**Screen Share Stats Monitoring Every 5 Seconds:**
- Problem: Stats polling interval set to 5000ms unconditionally while screen sharing
- Files: `src/hooks/useWebRTC.ts` (lines 422-434)
- Cause: No cleanup of interval on component unmount if screen share active
- Impact: Can accumulate intervals; background CPU usage even when tab hidden
- Improvement path: Throttle to 10-15s; clean up on unmount; pause when page hidden

---

## Fragile Areas

**WebRTC Signaling with Race Conditions:**
- Files: `src/hooks/useWebRTC.ts` (lines 481-525)
- Why fragile:
  - 500ms hardcoded delay before sending offer (line 499)
  - `suppressNegotiationRef` flag to prevent renegotiation during setup but timing-dependent
  - Multiple state transitions (idle → ringing → connected) can race
  - ICE candidate queueing can exceed safe limits
- Safe modification:
  - Add state machine (e.g., xstate) to enforce valid transitions
  - Replace delay with callback-based synchronization
  - Add queue size limit for ICE candidates
- Test coverage: Only live testing; no unit tests

**Voice Channel Context with Many Mutable State Setters:**
- Files: `src/contexts/VoiceChannelContext.tsx`
- Why fragile:
  - 28 lines of empty default setters (lines 33-50)
  - No validation of state transitions (e.g., isCameraOn but localCameraStream is null)
  - `disconnectVoice()` resets everything but can be called multiple times
  - No atomic updates; partial state inconsistency possible
- Safe modification: Use reducer pattern; validate state invariants; add dev-only warnings
- Test coverage: No tests

**Message Deletion and Hidden State Sync:**
- Files: `src/pages/Chat.tsx`, `src/pages/GroupChat.tsx`
- Why fragile:
  - Deleted messages remain in state but are filtered by `hiddenIds` Set
  - No confirmation message deletion succeeded on server
  - If Realtime subscription misses DELETE event, hidden state diverges
  - No mechanism to re-sync after network loss
- Safe modification: Add DELETE handler to realtime; fetch hidden IDs periodically; add consistency checks
- Test coverage: None

---

## Scaling Limits

**Message History Pagination:**
- Current capacity: 30 messages per page with infinite scroll
- Limit: Very large conversation threads (1000+ messages) become slow when loading older pages
- Scaling path: Implement indexed queries with timestamp cursors; add message archival; compress old messages

**Concurrent Voice Connections:**
- Current capacity: Tested for 1-on-1 calls only
- Limit: Group voice channel with 10+ participants untested; browser audio context limits (~6 max)
- Scaling path: Implement mixer (combine tracks client-side); use Selective Forwarding Unit (SFU) server; add SFU backend

**Presence Tracking Memory:**
- Current capacity: `presenceMap` stores all online users in memory
- Limit: Thousands of users will bloat memory; Presence sync becomes chatty
- Scaling path: Use paginated presence; sync only relevant users; implement lazy loading of presence

**Supabase RLS Query Complexity:**
- Current complexity: `is_channel_announcement()` RPC + nested permission checks
- Limit: Complex policies slow down for large datasets; announcement_channels migration adds nesting
- Scaling path: Denormalize permissions; use PostgreSQL materialized views; add query optimization indexes

---

## Dependencies at Risk

**React Router v6 (Pinned to ^6.30.1):**
- Risk: No major version bump; security patches may lag
- Impact: Routing vulnerabilities not fixed promptly
- Migration plan: Monitor releases; plan upgrade to v7 when stable

**Supabase JS (v2.95.3):**
- Risk: Dependency on auth service; if Supabase breaks auth, app breaks
- Impact: Complete loss of access if auth goes down
- Mitigation: Test fallback offline mode; implement backup auth token storage

**Electron (v40.6.0 - Very Recent):**
- Risk: Rapid version churn; stability concerns with cutting-edge version
- Impact: Potential bugs in Electron runtime; security updates needed frequently
- Recommendation: Pin to minor version; only update after stability testing

---

## Missing Critical Features

**No Offline Message Queue:**
- Problem: If network drops while composing, message is lost
- Blocks: PWA/offline-first functionality
- Workaround: User must manually resend after reconnect

**No Message Encryption:**
- Problem: All messages stored plaintext in Supabase; servers can read
- Blocks: Privacy compliance (GDPR); sensitive conversations exposed
- Mitigation: Use TLS; data at rest encryption on Supabase side

**No Call Recording or Transcription:**
- Problem: Voice calls are ephemeral; no audit trail
- Blocks: Compliance use cases; call history

**No Moderation Tools:**
- Problem: No message reporting, user muting, or content filtering
- Blocks: Scale to public servers; COPPA compliance

---

## Test Coverage Gaps

**Authentication Flow:**
- What's not tested: Sign-up, sign-in, password reset, session restoration, status expiration reset
- Files: `src/contexts/AuthContext.tsx`
- Risk: Auth regressions go unnoticed; silent failures possible
- Priority: HIGH - affects all users

**Realtime Subscriptions:**
- What's not tested: Subscription cleanup, message insertion/update/delete events, presence sync
- Files: `src/pages/Chat.tsx`, `src/pages/GroupChat.tsx`, `src/components/server/ServerChannelChat.tsx`
- Risk: Memory leaks, missed messages, race conditions
- Priority: HIGH - core feature

**WebRTC Call Lifecycle:**
- What's not tested: Call initiation, answer, ICE gathering, renegotiation, disconnect, error recovery
- Files: `src/hooks/useWebRTC.ts`
- Risk: Calls fail silently; screen share breaks; camera/mic states diverge
- Priority: HIGH - complex feature

**Component Rendering:**
- What's not tested: Props validation, conditional rendering, responsive breakpoints, i18n
- Files: All components
- Risk: Broken layouts, untranslated strings, accessibility issues
- Priority: MEDIUM - found in QA

**File Upload:**
- What's not tested: Upload progress, error handling, file size validation, storage cleanup
- Files: `src/lib/uploadChatFile.ts`
- Risk: Disk space exhausted; failed uploads not reported; orphaned files
- Priority: MEDIUM

---

*Concerns audit: 2026-02-26*
