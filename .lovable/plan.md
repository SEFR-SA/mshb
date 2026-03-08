

## Comprehensive Server Invitation System Rework

### Root Cause Analysis

**Bug 1 — False Expired State:** The `ServerInviteCard` (in-DM card) queries the `invites` table directly (line 76). The RLS policy on `invites` only allows SELECT for **server members**. A logged-in user who is NOT yet a member gets zero rows back, so `inv` is null, which the code interprets as "expired." In incognito, `InviteJoin.tsx` uses the `get_server_preview_by_invite` RPC (SECURITY DEFINER, bypasses RLS) — that's why it works there.

**Bug 2 — Ignored Expirations:** The invite metadata (`expires_at`, `max_uses`) is snapshot into the message at send time and never re-validated on the frontend. The `use_invite` RPC does validate, but the card's visual status check fails silently (due to Bug 1's RLS issue), so it falls through to showing the static metadata which is always stale.

**Bug 3 — Electron Deep Links:** `DeepLinkHandler` only handles `mshb://auth#...`. There is no code path for `mshb://invite/CODE`. Clicking invite URLs in DM messages likely triggers `window.open` or anchor navigation, which in Electron opens an external browser instead of internal routing.

---

### Layer 1: Database — New RPC for Invite Validation

**Create `validate_invite` RPC** (SECURITY DEFINER) that returns invite status without requiring membership:

```sql
CREATE FUNCTION public.validate_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_result jsonb;
BEGIN
  SELECT i.server_id, i.expires_at, i.max_uses, i.use_count,
         s.name, s.icon_url, s.banner_url
  INTO v_row
  FROM invites i JOIN servers s ON s.id = i.server_id
  WHERE i.code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_row.max_uses IS NOT NULL AND v_row.use_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('status', 'maxed');
  END IF;

  RETURN jsonb_build_object(
    'status', 'valid',
    'server_id', v_row.server_id,
    'server_name', v_row.name,
    'server_icon_url', v_row.icon_url,
    'server_banner_url', v_row.banner_url,
    'expires_at', v_row.expires_at,
    'max_uses', v_row.max_uses,
    'use_count', v_row.use_count
  );
END;
$$;
```

This single RPC replaces all direct `invites` table queries from non-member contexts.

**Enhance `use_invite` RPC** to also insert into `server_members` atomically (preventing race conditions where `use_invite` succeeds but the subsequent client-side insert fails):

```sql
CREATE OR REPLACE FUNCTION public.use_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_server_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Validate + increment atomically
  UPDATE invites
  SET use_count = use_count + 1
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  RETURNING server_id INTO v_server_id;

  IF v_server_id IS NULL THEN RETURN NULL; END IF;

  -- Insert membership (ignore if already member)
  INSERT INTO server_members (server_id, user_id, role)
  VALUES (v_server_id, v_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_server_id;
END;
$$;
```

This eliminates the separate client-side `server_members.insert()` calls scattered across `ServerInviteCard`, `InviteJoin`, and `JoinServerDialog`.

---

### Layer 2: Frontend — Fix ServerInviteCard.tsx

Replace the direct `invites` table query with the new `validate_invite` RPC:

```text
Current (broken):
  supabase.from("invites").select(...).eq("code", ...) // blocked by RLS

Fixed:
  supabase.rpc("validate_invite", { p_code: metadata.invite_code })
```

Also add membership check to distinguish 4 states: `valid`, `expired`, `maxed`, `already_joined`.

Remove the separate `server_members.insert()` from `handleJoin` — `use_invite` now handles it.

**File: `src/components/chat/ServerInviteCard.tsx`** — Rewrite the `useEffect` load function and `handleJoin`.

---

### Layer 3: Frontend — Fix InviteJoin.tsx

Replace `get_server_preview_by_invite` usage (or keep it for the preview data) but use `validate_invite` for status. Remove the separate `server_members.insert()` after `use_invite`.

**File: `src/pages/InviteJoin.tsx`** — Remove the manual membership insert (line 90-93), since `use_invite` now handles it atomically.

---

### Layer 4: Frontend — Fix JoinServerDialog.tsx

Same pattern: remove the manual `server_members.insert()` after `use_invite` / `get_server_id_by_invite`.

**File: `src/components/server/JoinServerDialog.tsx`** — Remove lines 49-52 manual insert.

---

### Layer 5: Electron Deep Linking for Invites

**`main.cjs`:** The deep link handler already forwards `mshb://` URLs to the renderer. No changes needed here.

**`src/App.tsx` — `DeepLinkHandler`:** Extend to parse `mshb://invite/CODE` URLs and navigate via hash router:

```typescript
// In DeepLinkHandler useEffect:
if (url.startsWith('mshb://invite/')) {
  const code = url.replace('mshb://invite/', '').split(/[?#]/)[0];
  window.location.hash = `/invite/${code}`;
  return;
}
```

**`ServerInviteCard` link clicks:** When a user clicks "Join" on an in-DM invite card, it already uses `handleJoin` + `navigate()` (React Router). This is correct and does NOT open an external browser. No change needed here.

**For invite URLs rendered as text in messages** (via `renderLinkedText`): Intercept clicks on invite URLs to prevent default and use `navigate()` instead. Check `src/lib/renderLinkedText.tsx` to see if this needs a handler.

---

### Layer 6: Fix inviteUtils.ts — detectInviteInMessage

The `detectInviteInMessage` function also queries the `invites` table directly (blocked by RLS for non-members). Replace with `validate_invite` RPC.

**File: `src/lib/inviteUtils.ts`** — Use `validate_invite` RPC instead of direct table queries.

---

### Summary of Changes

| File | Change |
|------|--------|
| **Migration SQL** | Create `validate_invite` RPC; update `use_invite` to insert membership atomically |
| `src/components/chat/ServerInviteCard.tsx` | Use `validate_invite` RPC; remove manual membership insert |
| `src/pages/InviteJoin.tsx` | Remove manual membership insert after `use_invite` |
| `src/components/server/JoinServerDialog.tsx` | Remove manual membership insert |
| `src/App.tsx` (`DeepLinkHandler`) | Handle `mshb://invite/CODE` deep links |
| `src/lib/inviteUtils.ts` | Use `validate_invite` RPC instead of direct table queries |
| `src/lib/renderLinkedText.tsx` | Intercept invite URL clicks for internal navigation (if needed) |

