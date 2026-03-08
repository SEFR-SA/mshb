

## Security Audit Results -- "Hack My App"

I performed a full security scan and manual code review. Here are the vulnerabilities found, ranked by severity.

---

### CRITICAL (Exploitable Now)

**1. Users can fabricate purchase records (FREE ITEMS HACK)**
- **Table:** `user_purchases`
- **Attack:** Any authenticated user can run `supabase.from("user_purchases").insert({ user_id: MY_ID, item_id: "any-premium-item" })` from the browser console to grant themselves any marketplace item without paying.
- **Root cause:** INSERT policy only checks `auth.uid() = user_id` with no payment verification. `transaction_id` is nullable.
- **Fix:** Remove the direct INSERT policy. Create a SECURITY DEFINER function that validates payment before inserting purchase records, or handle via backend webhook only.

**2. Users can equip items they never purchased (BYPASS ENTITLEMENT)**
- **Table:** `user_equipped`
- **Attack:** `supabase.from("user_equipped").upsert({ user_id: MY_ID, category: "decoration", item_id: "premium-item-id" })` -- no check that the item exists in `user_purchases`.
- **Fix:** Add a WITH CHECK condition: `EXISTS (SELECT 1 FROM user_purchases WHERE user_id = auth.uid() AND item_id = user_equipped.item_id)`.

**3. Any user can spam notifications to any other user**
- **Table:** `notifications`
- **Attack:** `supabase.from("notifications").insert({ user_id: VICTIM_ID, actor_id: MY_ID, type: "mention", entity_id: "fake-id" })` -- the policy allows insert when `auth.uid() = actor_id`, so any user can target any `user_id`.
- **Fix:** Remove direct INSERT policy. Create notifications only via SECURITY DEFINER triggers (like the existing `notify_on_mention` trigger).

---

### HIGH

**4. Sensitive personal data exposed to all authenticated users**
- **Table:** `profiles`
- **Attack:** Any logged-in user can query `supabase.from("profiles").select("date_of_birth, gender, language, theme, last_seen")` for ALL users.
- **Fix:** Either restrict the SELECT policy to return only public columns, or move `date_of_birth`, `gender`, `language`, `theme` to a separate `profile_settings` table with owner-only access.

**5. No file type validation on uploads**
- **Code:** `uploadChatFile.ts` and all chat pages
- **Attack:** Users can upload `.exe`, `.html`, `.svg` (with embedded JS), or any file type. The `chat-files` bucket is **public**, so uploaded malicious files are accessible to anyone with the URL.
- **Fix:** Add server-side file type validation (allowlist: images, videos, audio, PDFs, documents). Add a storage policy or edge function to validate MIME types before accepting uploads.

**6. No rate limiting on any endpoint**
- **Edge functions** (`giphy-proxy`) and all Supabase PostgREST endpoints have zero rate limiting.
- **Attack:** Automated scripts can spam the GIPHY proxy (burning your API quota), flood message creation, or brute-force username enumeration via `get_email_by_username`.
- **Fix:** Add in-memory rate limiting to edge functions. Consider a `rate_limits` table for persistent tracking.

---

### MEDIUM

**7. Username enumeration via `get_email_by_username` RPC**
- **Attack:** The login flow calls `get_email_by_username` which returns an email address given a username. An attacker can enumerate valid usernames AND get their associated email addresses.
- **Fix:** Return a boolean (exists/not-exists) instead of the actual email, or handle the username-to-email resolution inside a single login RPC that doesn't expose the email.

**8. `get_email_by_username` leaks emails during signup check**
- **Code:** `Auth.tsx` line 67 -- username availability check calls `get_email_by_username` which returns the email of the existing user.
- **Fix:** Create a separate `check_username_available(p_username)` RPC that returns only a boolean.

**9. Giphy proxy parameter injection**
- **Code:** `giphy-proxy/index.ts` line 28 -- the `limit` and `offset` params are passed directly into the GIPHY URL without validation.
- **Attack:** `?limit=999999` could cause excessive API usage; non-numeric values could cause unexpected behavior.
- **Fix:** Parse and clamp: `Math.min(Math.max(parseInt(limit) || 25, 1), 50)`.

**10. Custom stickers readable without authentication**
- **Table:** `custom_stickers` SELECT policy uses `true` -- unauthenticated users can enumerate all stickers and creator `user_id`s.
- **Fix:** Change policy to require `auth.uid() IS NOT NULL`.

**11. Leaked password protection is disabled**
- Supabase's built-in check against known breached passwords is turned off.
- **Fix:** Enable leaked password protection via auth configuration.

---

### LOW

**12. Functions with mutable search_path**
- `trigger_welcome_message` and `reopen_dm_on_message` don't set `search_path`. An attacker with schema-creation privileges could shadow public tables.
- **Fix:** Add `SET search_path = public` to these functions.

**13. 200MB file upload limit is excessive**
- `MAX_FILE_SIZE = 200 * 1024 * 1024` -- this is very generous and could be abused for storage exhaustion.
- **Fix:** Reduce to a reasonable limit (e.g., 25MB) or enforce per-user storage quotas.

**14. `pendingInvite` stored in localStorage without sanitization**
- **Code:** `InviteJoin.tsx` stores invite codes in localStorage, then Auth.tsx reads and navigates to `/invite/${code}`.
- **Risk:** Low -- React Router handles this safely, but the code should validate the format (alphanumeric only).

---

### Summary Table

| # | Severity | Issue | Exploitable from browser console? |
|---|----------|-------|-----------------------------------|
| 1 | CRITICAL | Fake purchases (free premium items) | Yes |
| 2 | CRITICAL | Equip unpurchased items | Yes |
| 3 | CRITICAL | Spam notifications to any user | Yes |
| 4 | HIGH | All user DOB/gender/PII exposed | Yes |
| 5 | HIGH | No file type validation (public bucket) | Yes |
| 6 | HIGH | Zero rate limiting everywhere | Yes |
| 7 | MEDIUM | Username/email enumeration | Yes |
| 8 | MEDIUM | Email leak via signup check | Yes |
| 9 | MEDIUM | Giphy proxy param injection | Yes |
| 10 | MEDIUM | Stickers public without auth | Yes |
| 11 | MEDIUM | Leaked password protection off | N/A |
| 12 | LOW | Mutable search_path on functions | No |
| 13 | LOW | 200MB upload limit | Yes |
| 14 | LOW | localStorage invite code unsanitized | No |

### Recommended Fix Priority
1. Fix #1, #2, #3 immediately -- these allow real abuse from any logged-in user's browser console
2. Fix #4 -- PII exposure is a compliance risk
3. Fix #5, #6 -- abuse prevention
4. Fix #7-#11 -- hardening

Would you like me to implement fixes for any or all of these?

