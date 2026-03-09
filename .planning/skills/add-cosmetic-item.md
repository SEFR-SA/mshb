# SKILL: Add a New Cosmetic Item
**Trigger:** Use this skill to add custom assets (Nameplates, Avatar Decorations, Profile Effects).

## Execution Steps:
1. **Identify Wrapper Requirements:**
   - Avatar Decoration: Requires `AvatarDecorationWrapper` (Oversized 1.2x, z-10).
   - Nameplate: Requires `NameplateWrapper` (Transparent bg, no dark bounding boxes).
   - Profile Effect: Requires `ProfileEffectWrapper` (Must overlay the ENTIRE card, z-50 pointer-events-none).
2. **Update the Config:** Do not write new component code. Open the relevant config file in `src/lib/` (e.g., `src/lib/nameplates.ts`, `src/lib/decorations.ts`, `src/lib/profileEffects.ts`).
3. **Inject Data:** Add the new `{ id, name, url, animated }` object to the config array using the user's provided Supabase Storage URL.
