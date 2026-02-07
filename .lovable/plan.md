

## Fix Agent Diagram: Align Emoji Nodes to Triangle Corners

### Problem
The emoji nodes and SVG triangle use **two different coordinate systems** that don't line up:
- The SVG triangle is drawn in a 400x400 square viewBox, then scaled with `preserveAspectRatio` to fit the container
- The emoji nodes are positioned using CSS percentages of the container (which is NOT square -- 420px tall with variable width)

On mobile especially, the container is taller than wide, so the SVG shrinks and centers vertically, while the CSS nodes remain at their percentage positions -- creating the visible gap.

### Solution
Make the container **square** using `aspect-ratio: 1/1`. Since the SVG viewBox is 400x400 (a square), a square container means CSS percentages map directly to SVG coordinates. The nodes will sit exactly at the triangle corners on all screen sizes.

### Changes (single file: `src/components/landing/AgentDiagram.tsx`)

**1. Replace fixed height with aspect-ratio on the diagram container**

Change the container from:
```
h-[420px] max-w-md sm:max-w-lg
```
To:
```
aspect-square max-w-sm sm:max-w-md
```

This makes the container always square, so 50%/18% in CSS maps exactly to (200,75) in the SVG viewBox, and 20%/77% maps to (80,310), etc.

**2. Fine-tune node y-percentages to exact values**

With a square container, the exact mapping from SVG coordinates to CSS percentages is:
- Top node (200, 75): x=50%, y=18.75% (round to `19%`)
- Bottom-left (80, 310): x=20%, y=77.5% (round to `77.5%`)
- Bottom-right (320, 310): x=80%, y=77.5% (round to `77.5%`)

**3. Reduce max-width slightly**

Since the container is now square, `max-w-md` (28rem) would be quite large. Using `max-w-sm` (24rem) on mobile and `max-w-md` on `sm:` screens keeps it well-proportioned.

### Why This Works
With a square container and a square SVG viewBox, both coordinate systems become identical -- percentage positions in CSS correspond exactly to the same proportional positions in the SVG. The triangle corners and emoji nodes will always align regardless of screen size.

### Technical Summary
Single file change to `src/components/landing/AgentDiagram.tsx`:
- Line 24: Change container class from `h-[420px] max-w-md sm:max-w-lg` to `aspect-square max-w-sm sm:max-w-md`
- Lines 4-6: Update node y-coordinates to `19%` / `77.5%` / `77.5%` for precise alignment

