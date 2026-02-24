

## Investigation: Invite Links Show White Page

### Root Cause

The app uses `HashRouter` (in `src/App.tsx`), which means all client-side routes live under `/#/...`. For example, the invite route is actually `https://mshb.lovable.app/#/invite/CODE`.

However, the invite links being generated and shared use a **non-hash path**: `https://mshb.lovable.app/invite/CODE` (see `InviteModal.tsx` line 46 and `ServerRail.tsx` line 135). When someone visits this URL, the server serves `index.html` but the HashRouter sees no hash fragment, so it renders the default route (or nothing), resulting in a white page. The 404 errors in the screenshot for `manifest.json`, `favicon.png`, and assets confirm the browser is trying to load resources relative to `/invite/` which doesn't exist on the server.

### Fix

Add a redirect script in `index.html` that detects non-hash paths like `/invite/:code` and redirects them to `/#/invite/:code` before React mounts. This is the standard approach for HashRouter apps that need to support shareable deep links.

### Files to Modify

**`index.html`**
- Add a small inline `<script>` block in `<head>` (before React loads) that checks if `window.location.pathname` starts with `/invite/` and redirects to `/#/invite/...`:
```javascript
(function() {
  var path = window.location.pathname;
  if (path.startsWith('/invite/')) {
    window.location.replace('/#' + path);
  }
})();
```

This runs before the app boots, so the user seamlessly lands on the correct HashRouter route (`/#/invite/CODE`) which renders the `InviteJoin` component.

### Why Not Switch to BrowserRouter?

The app uses HashRouter intentionally for Electron compatibility (`base: './'` in vite.config.ts, `HashRouter` in App.tsx). Switching to BrowserRouter would break the desktop app. The redirect script is the correct solution.

### Summary

| File | Change |
|------|--------|
| `index.html` | Add path-to-hash redirect script for `/invite/` URLs |

