

## Fix Agent Diagram: Precise Node Alignment on Mobile

### Problem
Two issues visible in the mobile screenshot:

1. **Emoji boxes misaligned from triangle corners**: The CSS `translate-y: -50%` centers the entire node div (emoji box + gap + label text, totaling ~80px) at the triangle vertex. But the *emoji box center* is 28px from the div top, while the div center is 40px -- creating a ~12px offset. The emoji box sits below the top vertex and above the bottom vertices.

2. **Right-side clipping**: The "Organiser Agent" label at x=80% extends beyond the container on narrow mobile screens and gets clipped.

### Solution

**Restructure the node layout** so that only the emoji box determines the positioned height. Move the label to `position: absolute` so it doesn't contribute to the parent's height calculation. This way, `-translate-y-1/2` shifts by exactly half the emoji box height (~28px), placing the emoji center precisely at the triangle vertex.

**Add overflow-visible** to the diagram container so labels can extend beyond the container bounds without clipping.

### Changes (single file: `src/components/landing/AgentDiagram.tsx`)

**1. Add `overflow-visible` to the diagram container**

Change the container class to include `overflow-visible` so the node labels (especially "Organiser Agent" at the right edge) don't get clipped on narrow screens:

```
<div className="relative mx-auto mt-16 aspect-square max-w-sm sm:max-w-md overflow-visible">
```

**2. Restructure the node markup**

Currently the node is a flex column where both the emoji box and label contribute to the div height:

```text
+-------------------+
|    [emoji box]    |   <-- these two together = ~80px height
|      label        |   <-- translate-y: -50% shifts by 40px
+-------------------+
```

Change to: make the label `absolute` so only the emoji box determines the div height:

```text
+-------------------+
|    [emoji box]    |   <-- only this = ~56px height
+-------------------+   <-- translate-y: -50% shifts by 28px (correct!)
      label            <-- absolute, positioned below, outside height calc
```

The updated node JSX:

```tsx
<motion.div
  key={node.label}
  className="absolute -translate-x-1/2 -translate-y-1/2"
  style={{ left: node.x, top: node.y }}
  ...
>
  <div className="relative flex flex-col items-center">
    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg animate-float" ...>
      <span className="text-xl sm:text-2xl">{node.emoji}</span>
    </div>
    <span className="absolute top-full mt-1 text-xs sm:text-sm font-semibold whitespace-nowrap">
      {node.label}
    </span>
  </div>
</motion.div>
```

The key change is `absolute top-full mt-1` on the label span -- this positions it just below the emoji box without contributing to the parent's height, so the translate operation only accounts for the emoji box dimensions.

### Why This Fixes It

- The `-translate-y-1/2` now shifts by half of only the emoji box height (~28px on mobile), not half of the entire node (~40px). This places the emoji box center exactly at the triangle vertex coordinates.
- `overflow-visible` prevents clipping of labels that extend beyond the container edges on narrow screens.
- No change to the node coordinates or SVG geometry needed -- the existing values (19%, 77.5%) already match the SVG vertices correctly.

### Technical Summary

Single file: `src/components/landing/AgentDiagram.tsx`
- Line 24: Add `overflow-visible` to the diagram container class
- Lines 89-97: Restructure node markup so the label is `position: absolute` with `top-full`, removing it from the height calculation used by `translate-y`

