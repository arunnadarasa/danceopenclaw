

## Update Docs Page: Railway to DigitalOcean

Replace all Railway references in `src/pages/Docs.tsx` with DigitalOcean 1-Click Droplet instructions, matching the changes already made to the dashboard connection card and landing page SetupGuide.

### Changes to `src/pages/Docs.tsx`

**1. Update the docs URL constant (line 4)**
- From: `https://docs.openclaw.ai/install/railway`
- To: `https://www.digitalocean.com/community/tutorials/how-to-run-openclaw`

**2. Rewrite Step 1 -- "Deploy on DigitalOcean" (lines 18-52)**

Replace the Railway-specific instructions with DigitalOcean guidance:

| Old (Railway) | New (DigitalOcean) |
|---|---|
| Sign up at railway.com and deploy the ClawdBot template | Go to DigitalOcean Marketplace, search "OpenClaw", and launch the 1-Click Droplet |
| Switch to the Hobby Plan ($5/month) | Select a 4 GB RAM Droplet (~$24/month recommended) |
| Set a $10 hard usage limit | SSH into your Droplet and run the setup wizard when prompted |
| Add a $5 custom email alert | The 1-Click deploy includes firewall rules, Docker isolation, and non-root execution |
| "Full Railway install guide" link | "Full DigitalOcean setup guide" link |

**3. Update Step 2 -- AI API Key section (lines 70-73)**
- Change "In your Railway project, go to Variables" to "SSH into your Droplet and enter your API key when prompted during setup" (or similar wording matching the DigitalOcean workflow)

**4. Update Step 3 -- Connect to Dashboard (line 93)**
- Change "Paste your Railway public URL" to "Paste your Droplet IP address"

### Files Modified
| File | Change |
|---|---|
| `src/pages/Docs.tsx` | Replace all Railway references with DigitalOcean equivalents |
