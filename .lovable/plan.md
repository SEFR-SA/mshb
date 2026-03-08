

## Fix: ESC Decline Navigating to DM Page

After extensive investigation of the codebase, the `handleDecline` function in `CallListener.tsx` does **not** contain any navigation. However, the ESC key handler only calls `e.preventDefault()` without `e.stopImmediatePropagation()`, which means other `keydown` handlers on `window` can also fire in response to the same ESC press. This likely causes a secondary handler to trigger navigation.

### Fix — `src/components/chat/CallListener.tsx` (line 361-363)

Add `e.stopImmediatePropagation()` to the ESC handler so no other `window`-level `keydown` listener can react to the same keypress:

```ts
if (e.key === "Escape") {
  e.preventDefault();
  e.stopImmediatePropagation();
  handleDecline();
}
```

Single line addition. One file change.

