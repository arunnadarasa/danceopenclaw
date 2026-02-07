

## Add Port Configuration Tip to Dashboard

### What
Add a prominent tip in the OpenClaw Connection card's "Quick Setup Tips" section emphasizing that users must change the Railway networking port from the default 3000 to **8080**. This is a common setup mistake -- Railway defaults to port 3000 but OpenClaw listens on 8080.

### Where
**File: `src/components/dashboard/OpenClawConnectionCard.tsx`**

Add a new tip entry in the "Quick Setup Tips" section (after the existing "Hosting" and "AI Key" tips, around line 261), styled consistently with the other tips:

```text
Port    In Railway, go to Settings -> Networking -> Public Networking and change the port
        from 3000 to 8080. OpenClaw listens on port 8080 by default -- using the wrong port
        will prevent connections.
```

The word "Port" will be the label (styled in primary color like "Hosting" and "AI Key"), and the key values **3000** and **8080** will be bolded to draw attention. This follows the exact same layout pattern as the existing tips.

### Why
- The uploaded Railway screenshot confirms OpenClaw uses port 8080
- The OpenClaw docs checklist explicitly says "Enable HTTP Proxy on port 8080"
- This is a common first-time setup pitfall that causes connection failures
