

## Fix Agent Diagram: Node Positions and Text Alignment

### Issues from Screenshot
1. The emoji nodes are not sitting exactly at the triangle corners — there's a gap between the nodes and where the lines meet
2. "Tips & Support" and "Events & Payouts" text labels are not aligned along the triangle's edges — the rotation angle is too shallow

### Changes (single file: `src/components/landing/AgentDiagram.tsx`)

**1. Align node positions to match SVG triangle vertices**

The SVG triangle has corners at (200,75), (80,310), (320,310) in a 400x400 viewBox. The container maps these to percentages, so the node CSS positions need to match exactly:

- Dancer Agent (top): stays at `50%` x, but y changes from `8%` to `18%` (75/400 = 18.75%)
- Fan Agent (bottom-left): stays at `20%` x, y changes from `78%` to `77%` (310/400 = 77.5%)
- Organiser Agent (bottom-right): stays at `80%` x, y changes from `78%` to `77%`

**2. Fix text label rotation angles**

The left edge of the triangle runs from (200,75) to (80,310) — this has a slope angle of approximately 63 degrees from horizontal. The right edge runs from (200,75) to (320,310) — same angle, mirrored.

Current text rotation is -44 and 44 degrees, which is too flat. Update to:
- "Tips & Support": rotate to approximately **-63 degrees**, repositioned to the midpoint of the left edge (~140, 192)
- "Events & Payouts": rotate to approximately **63 degrees**, repositioned to the midpoint of the right edge (~260, 192)

**3. Adjust text position to sit beside (not on top of) the lines**

Offset the text labels slightly away from the line (toward the outside of the triangle) so they don't overlap the dashed lines. This is done by shifting x coordinates slightly outward:
- Left edge label: shift x from 140 to ~128 (further left, outside the triangle)
- Right edge label: shift x from 260 to ~272 (further right, outside the triangle)

### Technical Summary

Single file change to `src/components/landing/AgentDiagram.tsx`:
- Update node y-coordinates: top node from `8%` to `18%`, bottom nodes from `78%` to `77%`
- Update SVG text rotation: from `-44`/`44` degrees to `-63`/`63` degrees
- Reposition text label coordinates to sit at the true midpoint of each edge, offset slightly outward
