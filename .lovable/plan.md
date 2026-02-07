

## Fix Agent Diagram: Per-Node Corner Alignment

### Problem
All three nodes currently use identical centering (`-translate-x-1/2 -translate-y-1/2`), but each node needs to touch its triangle corner from a different direction:

- **Fan Agent** (bottom-left): The box should have its **top-right corner** touching the triangle vertex -- so the box sits below-left of the corner
- **Dancer Agent** (top): The box should sit **above** the vertex with the label text appearing just below the vertex, centered at the top of the triangle
- **Organiser Agent** (bottom-right): Already looks perfect with center alignment -- no change needed

### Solution

Add per-node alignment configuration to control which part of the box anchors to the triangle vertex. Each node gets a custom CSS transform class:

```text
Dancer (top vertex):
  Before: box centered on vertex
  After:  box above vertex, label at vertex top
  Transform: -translate-x-1/2  -translate-y-full

Fan (bottom-left vertex):
  Before: box centered on vertex
  After:  box below-left, top-right corner at vertex
  Transform: -translate-x-full  (no y translate)

Organiser (bottom-right vertex):
  No change: -translate-x-1/2  -translate-y-1/2
```

### Changes (single file: `src/components/landing/AgentDiagram.tsx`)

**1. Add per-node alignment class to the nodes array**

Add a `className` property to each node definition:

- Dancer Agent: `"-translate-x-1/2 -translate-y-full"` -- centers horizontally, pushes box fully above the point so bottom-center edge sits at the vertex; label appears at the vertex (top of triangle)
- Fan Agent: `"-translate-x-full"` -- pushes box fully to the left so right edge is at the vertex; top-right corner touches the triangle corner
- Organiser Agent: `"-translate-x-1/2 -translate-y-1/2"` -- keep existing centered behavior (confirmed perfect)

**2. Use per-node className in the motion.div**

Replace the fixed class `className="absolute -translate-x-1/2 -translate-y-1/2"` with the node-specific transform class:

```tsx
className={`absolute ${node.className}`}
```

### Technical Summary

Single file: `src/components/landing/AgentDiagram.tsx`
- Lines 3-7: Add `className` property to each node in the array
- Line 82: Use `node.className` instead of hardcoded translate classes

