

# Fix: Profile Save Failing Due to Language Check Constraint

## Problem
The database has a CHECK constraint on the `profiles` table that only allows `language` values of `'en'` or `'ar'`. However, `i18n.language` can return locale variants like `'en-US'` from the browser's language detector, which violates this constraint when saving.

## Solution
Normalize the language value before saving by extracting just the base language code (e.g., `'en-US'` becomes `'en'`).

## Changes

**`src/pages/Settings.tsx`** (line 64):
- Change `language: i18n.language` to `language: i18n.language.split('-')[0]`

This ensures only `'en'` or `'ar'` is ever sent to the database, satisfying the CHECK constraint.

