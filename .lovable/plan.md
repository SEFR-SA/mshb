

## Registration Page Update and Profile Enhancements

### Overview
Redesign the signup form to include additional fields (Display Name, Date of Birth, Gender) and add a password visibility toggle. Then display calculated age and gender on the user profile panel.

### 1. Database Migration
Add two new columns to the `profiles` table:
- `date_of_birth` (date, nullable) -- stores the user's birthday
- `gender` (text, nullable) -- stores "Male" or "Female"

Update the `handle_new_user()` trigger function to populate these fields from signup metadata.

### 2. Update Auth Context (`src/contexts/AuthContext.tsx`)
Expand the `signUp` function signature to accept optional `displayName`, `dateOfBirth`, and `gender` parameters, passing them as user metadata so the trigger can pick them up.

### 3. Redesign Signup Form (`src/pages/Auth.tsx`)
Reorder and add fields in this exact sequence:
1. **Email** -- mandatory, text input
2. **Display Name** -- optional, text input
3. **Username** -- mandatory, with existing duplicate-check logic (debounced query showing taken/available status)
4. **Password** -- mandatory, with eye icon toggle to show/hide, plus PasswordStrengthBar
5. **Confirm Password** -- mandatory, with eye icon toggle
6. **Date of Birth** -- three dropdowns: Month (Jan-Dec), Day (1-31), Year (reasonable range)
7. **Gender** -- dropdown with "Male" and "Female" options

New state variables: `displayName`, `dobMonth`, `dobDay`, `dobYear`, `gender`, `showPassword`, `showConfirmPassword`.

### 4. Update User Profile Panel (`src/components/chat/UserProfilePanel.tsx`)
- Calculate age from `date_of_birth` using date-fns `differenceInYears`
- Display age (e.g., "23 years old") and gender in the profile card, between the status section and "About Me" section

### Technical Details

**Files modified:**
- Database migration: add `date_of_birth` and `gender` columns, update trigger
- `src/contexts/AuthContext.tsx` -- expand signUp params and metadata
- `src/pages/Auth.tsx` -- reorder form, add new fields, add password eye toggles
- `src/components/chat/UserProfilePanel.tsx` -- show age and gender

**No new dependencies needed** -- uses existing lucide-react icons (Eye, EyeOff) and date-fns.

