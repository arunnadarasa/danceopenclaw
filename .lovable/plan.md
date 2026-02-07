

## Fix Organiser Agent Position

### Problem
The Organiser Agent box is currently centered on the bottom-right triangle vertex. To mirror the Fan Agent (whose top-right corner touches the left vertex), the Organiser Agent's **top-left corner** should touch the right vertex — placing the box below and to the right of the corner.

### Solution
Change the Organiser Agent's `className` from `-translate-x-1/2 -translate-y-1/2` (centered) to no translate at all. By default, CSS positions the element's top-left corner at the coordinate point, which is exactly what we want.

### Changes (single file: `src/components/landing/AgentDiagram.tsx`)

**Line 6**: Update the Organiser Agent's className:

```text
Before: className: "-translate-x-1/2 -translate-y-1/2"
After:  className: ""
```

This means:
- **Fan Agent** (left): `-translate-x-full` -- top-right corner at vertex (box goes left)
- **Organiser Agent** (right): `""` -- top-left corner at vertex (box goes right)
- These two mirror each other symmetrically around the triangle

### Technical Summary
Single file: `src/components/landing/AgentDiagram.tsx`
- Line 6: Remove translate classes from Organiser Agent node configuration
