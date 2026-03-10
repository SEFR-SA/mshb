

## Fix Plan: 3 Layout Bugs in ServerBoostPage.tsx

### Fix 1: Title Cutoff
The hero `<section>` on line 157 has `overflow-hidden`, which clips the title text. Remove `overflow-hidden` from the section (keep it only on the background orbs wrapper on line 159 where it's already applied).

**Line 157**: Change `overflow-hidden` → remove it from the section class.

### Fix 2: Comparison Table Level 2 Column Border
The current approach uses `border-x border-pink-500/30` on individual `<th>` and `<td>` cells, but `idx === 1` maps to the Level 1 column (values array index 1), not Level 2. The values array is `[Unboosted, Level1, Level2, Level3]`, so Level 2 is `idx === 2`.

Fix: Change the border condition from `idx === 1` to `idx === 2` on both the header (line 292, `lvl === 2` is correct there) and body cells (line 317, change `idx === 1` to `idx === 2`). Also add top-border rounding on the header and bottom-border rounding on the last row for the Level 2 column.

### Fix 3: Remove Recognition Section
Delete lines 335-359 (the entire recognition section with the "Give your community a Boost" title and four cards). Also remove unused imports `Users, Award, Shield, Heart` from line 4.

### Files to modify
- `src/pages/ServerBoostPage.tsx` — all three fixes in one file

