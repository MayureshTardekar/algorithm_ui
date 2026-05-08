# Mumbai Emergency Pathfinder — Build Plan

Haan, 100% ban jayega. Pure frontend React, no backend, no DB. Sab kuch ek route file mein.

## Scope

Interactive SVG graph of 18 Mumbai nodes (hospitals, ambulance stations, junctions) with 5 pathfinding algorithms visualized step-by-step, plus a comparison mode. Single page app, dark "emergency ops" aesthetic.

## File structure

- `src/routes/index.tsx` — replaces the placeholder, hosts the whole app (3-panel layout)
- `src/lib/graph-data.ts` — 18 nodes + ~30 weighted edges, fixed SVG coordinates
- `src/lib/algos.ts` — pure JS implementations of Dijkstra, A*, BFS, Bellman-Ford, Floyd-Warshall. Each returns `{ path, distance, visitedOrder, steps, stats }` so the UI can replay them frame-by-frame.
- `src/components/pathfinder/GraphCanvas.tsx` — SVG renderer (nodes, edges, animated path, click handlers)
- `src/components/pathfinder/AlgoSelector.tsx` — 5 cards
- `src/components/pathfinder/ControlsPanel.tsx` — traffic slider, speed, block-road toggle, run/reset
- `src/components/pathfinder/ResultsPanel.tsx` — stats + step log
- `src/components/pathfinder/MatrixHeatmap.tsx` — 18×18 Floyd-Warshall heatmap
- `src/components/pathfinder/ComparisonTable.tsx` — side-by-side run of all 5
- `src/styles.css` — add Rajdhani + JetBrains Mono via Google Fonts `@import`, dark navy `#080c18` tokens, emergency red accent, pulse + dash-draw keyframes

## Layout

```text
┌──────────────────────────┬─────────────────┐
│                          │ AlgoSelector    │
│      GraphCanvas         ├─────────────────┤
│      (SVG, ~70% width)   │ ControlsPanel   │
│                          ├─────────────────┤
│                          │ ResultsPanel    │
└──────────────────────────┴─────────────────┘
   ComparisonTable / MatrixHeatmap below (toggle tabs)
```

## Algorithms — what the UI shows

| Algo | Interaction | Visualization | Panel stats |
|------|-------------|---------------|-------------|
| Dijkstra | click source → auto-pick nearest hospital | visited nodes turn yellow in pop order | nodes explored, path km, O((V+E)logV) |
| A* | click source + click target hospital | directional sweep, fewer yellows | g, h, f per node in step log |
| BFS | click source → nearest hospital by hops | wave expansion ring-by-ring | hop count vs km diff vs Dijkstra |
| Bellman-Ford | click source | V-1 relaxation rounds, edges flash per round | iteration counter, "no negative cycle ✓" |
| Floyd-Warshall | precomputed on mount | 18×18 heatmap; click any 2 nodes → instant path | "precomputed in Xms, lookup 0ms" |

Animation driver: a single `useEffect` that walks `steps[]` on a `setTimeout` loop tied to the speed setting. Path draw uses `stroke-dasharray` + animated `stroke-dashoffset`.

## State machine (single reducer in index.tsx)

- `mode`: `'idle' | 'pickSource' | 'pickTarget' | 'running' | 'done'`
- `algo`: one of 5
- `source`, `target`, `blockedEdges: Set`, `trafficMultiplier`, `speed`
- `runResult`: `{ path, visitedOrder, steps, stats }`
- `animFrame`: index into `steps` for replay

## Visual states (node fill)

default (type color) → source (red pulse) → visited (yellow) → current (white pulse) → final path (bright green). Blocked edges render with a red ✕ overlay and are skipped by algos.

## Controls

- Algo selector: 5 cards, active card has red glow
- Traffic slider 1×–3× (multiplies edge weights live; re-runs if a result is shown)
- Block-road mode: click an edge to toggle blocked
- Speed: slow / medium / fast (250 / 100 / 30 ms per step)
- Run / Reset buttons

## Comparison mode

Button "Run all 5". Executes every algo synchronously on the current source (target = nearest hospital where applicable), renders the table from the spec. No animation — just numbers.

## Aesthetic / design tokens (added to `src/styles.css`)

- `--background: oklch(0.15 0.04 260)` (≈ #080c18)
- `--primary` = emergency red, `--accent` = amber, hospital green, junction blue as named tokens
- Glass panels: `bg-card/60 backdrop-blur border border-white/10`
- Fonts loaded via Google Fonts `@import` at top of styles.css; map to Tailwind `font-display` / `font-mono` utility classes
- Keyframes: `pulse-source`, `pulse-current`, `draw-path`

## SEO

Update `__root.tsx` head meta (title "Mumbai Emergency Pathfinder — Algorithm Visualizer", matching description, og:title/description). Single H1 on the page.

## Out of scope

No backend, no Lovable Cloud, no auth, no persistence. Graph data is hardcoded. Coordinates are hand-placed for readability, not geo-accurate.

## Open question

Do you want the **Comparison table** and **Floyd-Warshall heatmap** as two tabs under the graph, or stacked one below the other always visible? (Tabs keep the page tighter; stacked shows more at once.)
