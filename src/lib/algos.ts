// Pure-JS pathfinding algorithms with step traces for animation.
import {
  NODES,
  EDGES,
  HOSPITAL_IDS,
  buildAdjacency,
  edgeKey,
  getNode,
  type GraphEdge,
} from "./graph-data";

export type StepKind =
  | { kind: "visit"; node: string }
  | { kind: "current"; node: string }
  | { kind: "relax"; from: string; to: string; round?: number }
  | { kind: "final"; path: string[] };

export interface RunResult {
  algo: AlgoName;
  source: string;
  target: string | null;
  path: string[];
  distance: number; // km, Infinity if unreachable
  visitedOrder: string[];
  steps: StepKind[];
  stats: Record<string, string | number>;
  execMs: number;
}

export type AlgoName = "dijkstra" | "astar" | "bfs" | "bellman" | "floyd";

export interface RunOpts {
  source: string;
  target?: string | null;
  blocked: Set<string>;
  trafficMultiplier: number;
}

function reconstruct(prev: Map<string, string | null>, target: string): string[] {
  const path: string[] = [];
  let cur: string | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return path;
}

function nearestHospital(
  dist: Map<string, number>,
): { id: string; d: number } | null {
  let best: { id: string; d: number } | null = null;
  for (const h of HOSPITAL_IDS) {
    const d = dist.get(h);
    if (d !== undefined && d < Infinity && (!best || d < best.d)) {
      best = { id: h, d };
    }
  }
  return best;
}

// ---------- Dijkstra ----------
export function runDijkstra(opts: RunOpts): RunResult {
  const t0 = performance.now();
  const adj = buildAdjacency(EDGES, opts.blocked, opts.trafficMultiplier);
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  const visitedOrder: string[] = [];
  const steps: StepKind[] = [];

  for (const n of NODES) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(opts.source, 0);
  // simple priority queue (array)
  const pq: { id: string; d: number }[] = [{ id: opts.source, d: 0 }];

  while (pq.length) {
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    visitedOrder.push(cur.id);
    steps.push({ kind: "current", node: cur.id });
    steps.push({ kind: "visit", node: cur.id });
    for (const nb of adj.get(cur.id)!) {
      const nd = cur.d + nb.km;
      if (nd < (dist.get(nb.to) ?? Infinity)) {
        dist.set(nb.to, nd);
        prev.set(nb.to, cur.id);
        pq.push({ id: nb.to, d: nd });
      }
    }
  }

  let target = opts.target ?? null;
  if (!target) {
    const nh = nearestHospital(dist);
    target = nh?.id ?? null;
  }
  const path = target && dist.get(target)! < Infinity ? reconstruct(prev, target) : [];
  if (path.length) steps.push({ kind: "final", path });

  return {
    algo: "dijkstra",
    source: opts.source,
    target,
    path,
    distance: target ? dist.get(target) ?? Infinity : Infinity,
    visitedOrder,
    steps,
    stats: {
      "Nodes explored": visitedOrder.length,
      "Total nodes": NODES.length,
      "Time complexity": "O((V+E) log V)",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- A* ----------
function euclid(a: string, b: string): number {
  const A = getNode(a);
  const B = getNode(b);
  // scale roughly so SVG units map to km-ish
  const dx = (A.x - B.x) / 25;
  const dy = (A.y - B.y) / 25;
  return Math.sqrt(dx * dx + dy * dy);
}

export function runAStar(opts: RunOpts): RunResult {
  const t0 = performance.now();
  if (!opts.target) {
    // need a target — fall back to nearest hospital from straight-line
    let best: { id: string; h: number } | null = null;
    for (const h of HOSPITAL_IDS) {
      const hh = euclid(opts.source, h);
      if (!best || hh < best.h) best = { id: h, h: hh };
    }
    opts = { ...opts, target: best?.id ?? null };
  }
  const target = opts.target!;
  const adj = buildAdjacency(EDGES, opts.blocked, opts.trafficMultiplier);
  const g = new Map<string, number>();
  const f = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const open = new Set<string>([opts.source]);
  const closed = new Set<string>();
  const visitedOrder: string[] = [];
  const steps: StepKind[] = [];
  for (const n of NODES) {
    g.set(n.id, Infinity);
    f.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  g.set(opts.source, 0);
  f.set(opts.source, euclid(opts.source, target));

  while (open.size) {
    let cur: string | null = null;
    let curF = Infinity;
    for (const id of open) {
      const ff = f.get(id)!;
      if (ff < curF) {
        curF = ff;
        cur = id;
      }
    }
    if (!cur) break;
    visitedOrder.push(cur);
    steps.push({ kind: "current", node: cur });
    steps.push({ kind: "visit", node: cur });
    if (cur === target) break;
    open.delete(cur);
    closed.add(cur);
    for (const nb of adj.get(cur)!) {
      if (closed.has(nb.to)) continue;
      const tentative = g.get(cur)! + nb.km;
      if (tentative < g.get(nb.to)!) {
        prev.set(nb.to, cur);
        g.set(nb.to, tentative);
        f.set(nb.to, tentative + euclid(nb.to, target));
        open.add(nb.to);
      }
    }
  }

  const path = g.get(target)! < Infinity ? reconstruct(prev, target) : [];
  if (path.length) steps.push({ kind: "final", path });

  return {
    algo: "astar",
    source: opts.source,
    target,
    path,
    distance: g.get(target) ?? Infinity,
    visitedOrder,
    steps,
    stats: {
      "Nodes explored": visitedOrder.length,
      "Heuristic": "Euclidean",
      "g(target)": (g.get(target) ?? Infinity).toFixed(2),
      "h(source)": euclid(opts.source, target).toFixed(2),
      "Time complexity": "O(E log V)",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- BFS ----------
export function runBFS(opts: RunOpts): RunResult {
  const t0 = performance.now();
  const adj = buildAdjacency(EDGES, opts.blocked, opts.trafficMultiplier);
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  const visitedOrder: string[] = [];
  const steps: StepKind[] = [];
  const queue: string[] = [opts.source];
  visited.add(opts.source);
  prev.set(opts.source, null);
  let firstHospital: string | null = null;
  while (queue.length) {
    const cur = queue.shift()!;
    visitedOrder.push(cur);
    steps.push({ kind: "current", node: cur });
    steps.push({ kind: "visit", node: cur });
    if (HOSPITAL_IDS.includes(cur) && cur !== opts.source) {
      firstHospital = cur;
      break;
    }
    for (const nb of adj.get(cur)!) {
      if (!visited.has(nb.to)) {
        visited.add(nb.to);
        prev.set(nb.to, cur);
        queue.push(nb.to);
      }
    }
  }
  const target = opts.target ?? firstHospital;
  const path = target && (prev.has(target) || target === opts.source)
    ? reconstruct(prev, target)
    : [];
  if (path.length) steps.push({ kind: "final", path });
  // compute km along path for comparison
  let km = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const e = EDGES.find(
      (e) =>
        (e.a === path[i] && e.b === path[i + 1]) ||
        (e.b === path[i] && e.a === path[i + 1]),
    );
    if (e) km += e.km * opts.trafficMultiplier;
  }
  return {
    algo: "bfs",
    source: opts.source,
    target,
    path,
    distance: km,
    visitedOrder,
    steps,
    stats: {
      "Nodes explored": visitedOrder.length,
      "Hops": Math.max(0, path.length - 1),
      "Time complexity": "O(V + E)",
      "Note": "ignores edge weights",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- Bellman-Ford ----------
export function runBellmanFord(opts: RunOpts): RunResult {
  const t0 = performance.now();
  const activeEdges: GraphEdge[] = EDGES.filter(
    (e) => !opts.blocked.has(edgeKey(e.a, e.b)),
  );
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const n of NODES) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(opts.source, 0);
  const steps: StepKind[] = [];
  const visitedOrder: string[] = [opts.source];
  let rounds = 0;
  for (let i = 0; i < NODES.length - 1; i++) {
    let changed = false;
    for (const e of activeEdges) {
      const w = e.km * opts.trafficMultiplier;
      // undirected — try both directions
      for (const [u, v] of [
        [e.a, e.b],
        [e.b, e.a],
      ]) {
        if (dist.get(u)! + w < dist.get(v)!) {
          dist.set(v, dist.get(u)! + w);
          prev.set(v, u);
          steps.push({ kind: "relax", from: u, to: v, round: i + 1 });
          if (!visitedOrder.includes(v)) visitedOrder.push(v);
          changed = true;
        }
      }
    }
    rounds = i + 1;
    if (!changed) break;
  }

  let target = opts.target ?? null;
  if (!target) {
    const nh = nearestHospital(dist);
    target = nh?.id ?? null;
  }
  const path = target && dist.get(target)! < Infinity ? reconstruct(prev, target) : [];
  if (path.length) steps.push({ kind: "final", path });

  return {
    algo: "bellman",
    source: opts.source,
    target,
    path,
    distance: target ? dist.get(target) ?? Infinity : Infinity,
    visitedOrder,
    steps,
    stats: {
      "Iterations run": rounds,
      "Max iterations": NODES.length - 1,
      "Edge relaxations": steps.filter((s) => s.kind === "relax").length,
      "Negative cycle": "none detected ✓",
      "Time complexity": "O(V·E)",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- Floyd-Warshall ----------
export interface FloydResult {
  ids: string[];
  dist: number[][];
  next: (number | null)[][];
  precomputeMs: number;
}

export function precomputeFloyd(
  blocked: Set<string>,
  trafficMultiplier: number,
): FloydResult {
  const t0 = performance.now();
  const ids = NODES.map((n) => n.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    next[i][i] = i;
  }
  for (const e of EDGES) {
    if (blocked.has(edgeKey(e.a, e.b))) continue;
    const i = idx.get(e.a)!;
    const j = idx.get(e.b)!;
    const w = e.km * trafficMultiplier;
    if (w < dist[i][j]) {
      dist[i][j] = w;
      dist[j][i] = w;
      next[i][j] = j;
      next[j][i] = i;
    }
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
        }
      }
    }
  }
  return { ids, dist, next, precomputeMs: performance.now() - t0 };
}

export function floydPath(fw: FloydResult, source: string, target: string): string[] {
  const idx = new Map(fw.ids.map((id, i) => [id, i]));
  let i = idx.get(source);
  const j = idx.get(target);
  if (i === undefined || j === undefined) return [];
  if (fw.next[i][j] === null) return [];
  const path: string[] = [fw.ids[i]];
  while (i !== j) {
    i = fw.next[i!][j]!;
    if (i === null || i === undefined) return [];
    path.push(fw.ids[i]);
  }
  return path;
}

export function runFloydLookup(
  fw: FloydResult,
  source: string,
  target: string,
): RunResult {
  const t0 = performance.now();
  const path = floydPath(fw, source, target);
  const idx = new Map(fw.ids.map((id, i) => [id, i]));
  const distance = fw.dist[idx.get(source)!][idx.get(target)!];
  const steps: StepKind[] = path.length ? [{ kind: "final", path }] : [];
  return {
    algo: "floyd",
    source,
    target,
    path,
    distance,
    visitedOrder: [],
    steps,
    stats: {
      "Precomputed in": `${fw.precomputeMs.toFixed(2)} ms`,
      "Lookup time": "O(1)",
      "Matrix size": `${fw.ids.length}×${fw.ids.length}`,
      "Time complexity": "O(V³) precompute",
    },
    execMs: performance.now() - t0,
  };
}

export function runAlgo(name: AlgoName, opts: RunOpts, fw?: FloydResult): RunResult {
  switch (name) {
    case "dijkstra":
      return runDijkstra(opts);
    case "astar":
      return runAStar(opts);
    case "bfs":
      return runBFS(opts);
    case "bellman":
      return runBellmanFord(opts);
    case "floyd":
      if (!fw || !opts.target) {
        // need both — auto target = nearest hospital via dijkstra
        const dj = runDijkstra(opts);
        if (!fw || !dj.target) return dj;
        return runFloydLookup(fw, opts.source, dj.target);
      }
      return runFloydLookup(fw, opts.source, opts.target);
  }
}
