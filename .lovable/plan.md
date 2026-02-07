

## Update Cost Recommendations

### Overview
Change the recommended Railway usage limits across all three files where they appear:
- Hard usage limit: **$5 → $10**
- Custom email alert: **$3 → $5**

### Files to Update

**1. `src/components/dashboard/OpenClawConnectionCard.tsx`**
- In the "Quick Setup Tips" section, change "$5 hard usage limit" to "$10 hard usage limit" and "$3 custom email alert" to "$5 custom email alert"

**2. `src/components/landing/SetupGuide.tsx`**
- In Step 01 "Get Your Privy Keys" description (or the Deploy step), no direct mention exists here -- but the landing page step cards will be checked for any cost references

**3. `src/pages/Docs.tsx`**
- In the "Deploy on Railway" section, change the bullet point from "$5 hard usage limit" to "$10 hard usage limit" and "$3 custom email alert" to "$5 custom email alert"

### Summary of Text Changes

| Location | Old Text | New Text |
|---|---|---|
| OpenClawConnectionCard.tsx | `$5 hard usage limit` | `$10 hard usage limit` |
| OpenClawConnectionCard.tsx | `$3 custom email alert` | `$5 custom email alert` |
| Docs.tsx | `$5 hard usage limit` | `$10 hard usage limit` |
| Docs.tsx | `$3 custom email alert` | `$5 custom email alert` |

Three simple text replacements across two files. No logic or structural changes needed.

