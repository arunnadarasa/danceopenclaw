

## Update Docs Links and Add OpenRouter Setup Guidance

### Overview
Update all "OpenClaw setup docs" links to point to the correct Railway install guide, and add clear setup tips recommending Railway for hosting and OpenRouter (not Mistral) for the AI API key.

---

### Changes

**1. Fix docs link in `OpenClawConnectionCard.tsx` (line 232)**
- Change `href="https://openclaw.ai"` to `href="https://docs.openclaw.ai/install/railway"`

**2. Add a "Quick Setup Tips" section in `OpenClawConnectionCard.tsx`**
Below the docs link, add a compact tips block (always visible, no collapsible needed) with:
- **Hosting:** "We recommend Railway (Hobby Plan, $5/month). Set a $5 hard usage limit and a $3 custom email alert to control costs."  Link to railway.com.
- **AI API Key:** "Use OpenRouter for your AI model key (set as `OPENROUTER_API_KEY` in Railway). Sign up and grab a free key to get started."  Link to openrouter.ai.

**3. Fix docs link in `SetupGuide.tsx` (line 27)**
- Change `url: "https://openclaw.ai"` to `url: "https://docs.openclaw.ai/install/railway"`
- Update description to mention OpenRouter instead of generic "enable webhooks" language:
  "Deploy OpenClaw on Railway, add your OpenRouter API key, then paste your webhook URL and token into the dashboard."

**4. Replace the placeholder Docs page (`Docs.tsx`)**
Turn the "coming soon" page into a simple setup guide with three sections:
- **Deploy on Railway** -- Step-by-step: sign up, deploy the ClawdBot template, set Hobby Plan ($5/mo), configure $5 hard limit + $3 email alert. Link to docs.openclaw.ai/install/railway.
- **Get an AI API Key** -- Sign up at OpenRouter (openrouter.ai), create an API key, add it as `OPENROUTER_API_KEY` in your Railway environment variables.
- **Connect to Dashboard** -- Go to your Dashboard Settings, paste your Railway public URL and webhook token, click Connect. Link back to /dashboard.
- A prominent button linking to the full documentation at `https://docs.openclaw.ai/install/railway`.

### Files Modified
- `src/components/dashboard/OpenClawConnectionCard.tsx` -- fix link, add setup tips
- `src/components/landing/SetupGuide.tsx` -- fix link, update description
- `src/pages/Docs.tsx` -- replace placeholder with structured setup guide

