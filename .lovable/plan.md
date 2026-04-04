

## Unique Server Tags — Implementation Plan

### What we're building
A platform-wide uniqueness constraint on server tags so no two servers can claim the same tag (case-insensitive). Live availability feedback in the tag name input field, plus graceful race-condition handling on save.

### Step 1: Database Migration

Create a migration that:
- Adds a **unique index** on `LOWER(server_tag_name)` (partial — only non-null values, so servers without a tag don't conflict)
- Creates an RPC function `check_server_tag_available(p_tag text, p_current_server_id uuid)` that returns `boolean` — checks if the lowered tag exists on any other server

```sql
CREATE UNIQUE INDEX IF NOT EXISTS unique_server_tag_name_lower_idx
  ON public.servers (LOWER(server_tag_name))
  WHERE server_tag_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_server_tag_available(p_tag text, p_current_server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.servers
    WHERE LOWER(server_tag_name) = LOWER(p_tag)
      AND id != p_current_server_id
  );
$$;
```

### Step 2: Update `ServerTagTab.tsx`

Add debounced availability checking and save-time race condition handling:

- **New state**: `isChecking`, `isAvailable` (boolean | null), `savedTagName` (to track original value from DB)
- **Debounced `useEffect`** on `tagName`: after 500ms, call `check_server_tag_available` RPC. Skip if tag is empty or unchanged from saved value (own tag is always "available").
- **Visual feedback** below the tag name input:
  - Checking: spinner + "Checking availability..." (muted)
  - Available: green checkmark + "Tag is available!"
  - Taken: red X + "This tag is already taken."
- **Save button disabled** when `isChecking === true` or `isAvailable === false`
- **`handleSave` error handling**: catch errors, check for code `23505` (unique violation), show specific toast "This tag was just taken by another server."

### Files to modify
- **New migration** via migration tool — unique index + RPC function
- **`src/components/server/settings/ServerTagTab.tsx`** — availability check UI + error handling

