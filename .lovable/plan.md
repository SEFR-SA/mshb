

## Plan: Move "View Full Profile" Button Outside the Card

Currently the "View Full Profile" button sits inside the `bg-card/80` card div (line 250 `</div>`), alongside the mutual sections. Move it outside and below the card so it appears as a standalone element at the very bottom of the panel.

### Change — `src/components/chat/UserProfilePanel.tsx`

1. Remove the "View Full Profile" block (lines 237-249) from inside the card `<div>`.
2. Place it after the card's closing `</div>` (line 250), still inside the `<ProfileEffectWrapper>`, as a standalone button with padding (`px-4 pb-4`).

