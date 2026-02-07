

## Fix Agent Diagram: Framer Motion Overriding CSS Transforms

### Root Cause
Framer Motion's `scale` animation sets an **inline `transform`** style on the `motion.div`. This completely overrides Tailwind's CSS `transform` (which includes the translate classes). So `-translate-x-1/2`, `-translate-y-full`, etc. are being thrown away at runtime -- explaining why nothing visually changed.

### Solution
Separate concerns into two nested elements:
- **Outer plain `div`**: Handles positioning with Tailwind translate classes (no Framer Motion interference)
- **Inner `motion.div`**: Handles the scale/opacity entrance animation

This way the translate transforms live on a different element from the animated transforms, and they don't conflict.

### Changes (single file: `src/components/landing/AgentDiagram.tsx`)

**Restructure the node rendering (lines 79-98)**

Replace the current single `motion.div` with a nested structure:

```tsx
{nodes.map((node, i) => (
  <div
    key={node.label}
    className={`absolute ${node.className}`}
    style={{ left: node.x, top: node.y }}
  >
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: i * 0.2 }}
    >
      <div className="relative flex flex-col items-center">
        <div
          className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg animate-float"
          style={{ animationDelay: `${i * 2}s` }}
        >
          <span className="text-xl sm:text-2xl">{node.emoji}</span>
        </div>
        <span className="absolute top-full mt-1 text-xs sm:text-sm font-semibold whitespace-nowrap">
          {node.label}
        </span>
      </div>
    </motion.div>
  </div>
))}
```

Key structural change:
- The outer `div` gets the `absolute`, position (`left`/`top`), and translate classes -- these are pure CSS and won't be touched by Framer Motion
- The inner `motion.div` only handles the entrance animation (`scale` + `opacity`) -- its inline `transform` only affects itself, leaving the parent's positioning intact

### Why This Fixes It
Framer Motion can only override transforms on the element it controls. By moving the positioning transforms to a parent `div`, both systems work independently:
- Parent: `transform: translate(-50%, -100%)` (from Tailwind, untouched)
- Child: `transform: scale(1)` (from Framer Motion animation)

### Technical Summary
Single file: `src/components/landing/AgentDiagram.tsx`
- Lines 79-98: Wrap each node in a plain `div` for positioning, nest `motion.div` inside for animation only
