

## Fix Username Check and Duplicate Email Detection on Signup

### Issue 1: Username Shows "Available" When It Is Taken

**Problem**: The username uniqueness check uses an exact (case-sensitive) match: `.eq("username", username.trim())`. If the database contains `"Risk_ii"` and a user types `"risk_ii"`, the query returns no match and incorrectly displays "Username is available."

Meanwhile, the login function (`get_email_by_username`) uses `lower()` for case-insensitive matching -- so there is an inconsistency.

**Fix**: Use `.ilike()` instead of `.eq()` for case-insensitive comparison in the username check query.

```typescript
// Before
.eq("username", username.trim())

// After  
.ilike("username", username.trim())
```

---

### Issue 2: Duplicate Email Accepted on Signup

**Problem**: When signing up with an already-registered email, Supabase intentionally returns a success response (HTTP 200) to prevent email enumeration. The app then shows a "Check your email" message, even though no real confirmation email is sent.

**Fix**: After a successful `signUp` call, inspect the returned user data. Supabase signals a duplicate by returning a user object with an empty `identities` array. We can detect this and show an appropriate error message.

```typescript
const { data, error } = await signUp(email, password, username.trim());
if (error) {
  // show error
} else if (data?.user?.identities?.length === 0) {
  // Email already registered
  toast({ title: "This email is already registered. Please log in instead.", variant: "destructive" });
} else {
  toast({ title: t("auth.checkEmail") });
}
```

This requires updating the `signUp` function in `AuthContext.tsx` to return the full response data (not just the error).

---

### Technical Details

**File: `src/contexts/AuthContext.tsx`**
- Change `signUp` return type from `{ error }` to `{ error, data }` so the caller can inspect `data.user.identities`
- Update the interface `AuthContextType` accordingly

**File: `src/pages/Auth.tsx`**
- In the username check `useEffect` (around line 39): replace `.eq("username", ...)` with `.ilike("username", ...)`
- In `handleSubmit` for the signup branch: check `data?.user?.identities?.length === 0` and show "Email already registered" error instead of the success toast
- Add a translation key reference or inline message for the duplicate email case

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Return `data` from `signUp`; update interface |
| `src/pages/Auth.tsx` | Case-insensitive username check; detect duplicate email |

