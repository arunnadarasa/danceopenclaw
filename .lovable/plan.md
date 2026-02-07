

## Replace Quick Setup Guide with DigitalOcean Instructions

### What
Replace the current Railway-focused "Quick Setup Tips" section and related references in the OpenClaw Connection card with DigitalOcean-based guidance, matching the user's proven deployment workflow.

### Changes

**File: `src/components/dashboard/OpenClawConnectionCard.tsx`**

**1. Update the webhook URL placeholder and help text (lines 181-189)**
- Change placeholder from `https://your-server.up.railway.app` to `https://your-droplet-ip`
- Update the example URL from `https://clawdbot-production-xxxx.up.railway.app` to `https://178.xxx.xxx.xxx` (DigitalOcean Droplet IP style)

**2. Update the setup docs link (lines 231-238)**
- Change URL from `https://docs.openclaw.ai/install/railway` to `https://www.digitalocean.com/community/tutorials/how-to-run-openclaw`
- Change label from "OpenClaw setup docs" to "DigitalOcean setup guide"

**3. Replace the entire Quick Setup Tips section (lines 240-270)**

Remove the three Railway-specific tips (Hosting, AI Key, Port) and replace with DigitalOcean-relevant tips:

| Tip Label | Content |
|-----------|---------|
| **Deploy** | Use DigitalOcean's 1-Click OpenClaw Droplet (4 GB RAM, ~$24/month). Go to Create Droplet, select the Marketplace tab, search "OpenClaw", and launch. |
| **AI Key** | SSH into your Droplet, choose your AI provider (Anthropic, Gradient AI), and enter your API key when prompted during setup. |
| **Pairing** | In the Droplet console, run the pairing automation and open the provided URL in your browser to access the OpenClaw dashboard. Copy your Droplet IP as the webhook URL above. |
| **Security** | The 1-Click deploy includes authenticated communication, hardened firewall rules, Docker isolation, and non-root execution out of the box. |

**4. Update the diagnostic error text (line 173)**
- Change "Check your Railway/server logs" to "Check your server/Droplet console logs"

### Why
- The user successfully deployed on DigitalOcean and confirmed it works
- DigitalOcean's 1-Click Application handles security (firewall, Docker isolation, auth tokens) automatically -- simpler than Railway
- No port configuration needed (unlike Railway's 3000-to-8080 issue)
- The setup guide should reflect the recommended and tested deployment path

### Files Modified
- `src/components/dashboard/OpenClawConnectionCard.tsx`

