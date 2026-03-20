

## Investigation

The `free-games-bot` edge function code exists at `supabase/functions/free-games-bot/index.ts`, but there is no corresponding entry in `supabase/config.toml`. Every other edge function has a `[functions.<name>]` block with `verify_jwt = false` — this one is missing.

Without the config entry, the function won't be deployed by the platform.

## Fix

**File: `supabase/config.toml`**

Add the missing config block:

```toml
[functions.free-games-bot]
verify_jwt = false
```

This is the only change needed — the function code itself is already complete.

