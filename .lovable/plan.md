

## Fix: Redirect Logged-in Users from Landing Page to Dashboard

### The Problem

After signing in with Google, the OAuth callback redirects to `window.location.origin` (which is `/` -- the landing page). The landing page has no auth awareness, so it just shows the marketing content with a "Sign In" button. The user has to click "Sign In" again, which takes them to `/auth`, which *then* detects the session and redirects to `/dashboard`.

### The Fix (Two Changes)

#### 1. Landing Page (`src/pages/Index.tsx`) -- Add auth-aware redirect

Add a `useEffect` that checks if the user is already logged in. If so, redirect them straight to `/dashboard` (or `/onboarding` if onboarding is incomplete). This handles:
- Users who are already signed in and visit the homepage
- The OAuth callback redirect landing on `/`

```text
Flow after fix:
  Google OAuth -> callback to / -> Index detects session -> redirect to /dashboard
```

#### 2. Navbar (`src/components/landing/Navbar.tsx`) -- Show "Dashboard" instead of "Sign In"

Update the navbar button to be auth-aware:
- If logged in: show "Dashboard" button linking to `/dashboard`
- If not logged in: show "Sign In" button linking to `/auth` (current behavior)

This way, if the redirect somehow doesn't fire fast enough and the user sees the landing page, they get a relevant button instead of a confusing "Sign In".

---

### Files Modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Import `useAuth` and `useNavigate`, add `useEffect` to redirect authenticated users to `/dashboard` |
| `src/components/landing/Navbar.tsx` | Import `useAuth`, conditionally render "Dashboard" or "Sign In" button based on auth state |

### No database or backend changes required.

