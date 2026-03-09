# SKILL: Supabase Database Migration
**Trigger:** Use this skill when adding features that require storing new data in Supabase.

## Execution Steps:
1. **Plan Schema:** Output the exact SQL required to create/alter tables.
2. **Row Level Security (RLS):** You MUST write RLS policies (`CREATE POLICY...`) ensuring users can only read/update appropriate data.
3. **Update TypeScript:** Open `src/integrations/supabase/types.ts` and update the TypeScript interfaces to perfectly match the new database columns to prevent frontend type errors.
