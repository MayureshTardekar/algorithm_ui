// Pure pathfinding algorithms with step traces for animation and DAA panels.
import {
  EDGES,
  HOSPITAL_IDS,
  NODES,
  buildAdjacency,
  edgeKey,
  getNode,
  type GraphEdge,
} from "./graph-data";

export type StepKind =
  | {
      kind: "current";
      node: string;
      distance?: number;
      g?: number;
      h?: number;
      f?: number;
      round?: number;
      message: string;
    }
  | {
      kind: "visit";
      node: string;
      distance?: number;
      hops?: number;
      message: string;
    }
  | {
      kind: "relax";
      from: string;
      to: string;
      round?: number;
      edgeWeight?: number;
      previousDistance?: number;
      nextDistance?: number;
      accepted: boolean;
      g?: number;
      h?: number;
      f?: number;
      message: string;
    }
  | {
      kind: "round";
      round: number;
      message: string;
    }
  | {
      kind: "check";
      from?: string;
      to?: string;
      edgeWeight?: number;
      negativeCycle: boolean;
      message: string;
    }
  | {
      kind: "matrix";
      via?: string;
      from?: string;
      to?: string;
      distance?: number;
      message: string;
    }
  | {
      kind: "final";
      path: string[];
      distance?: number;
      message: string;
    };

export interface RunResult {
  algo: AlgoName;
  source: string;
  target: string | null;
  path: string[];
  distance: number;
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

interface WeightedEdge extends GraphEdge {
  key: string;
  weight: number;
}

function formatKm(value: number): string {
  return Number.isFinite(value) ? `${value.toFixed(2)} km` : "unreachable";
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

function weightedEdges(blocked: Set<string>, trafficMultiplier: number): WeightedEdge[] {
  return EDGES.filter((e) => !blocked.has(edgeKey(e.a, e.b))).map((e) => ({
    ...e,
    key: edgeKey(e.a, e.b),
    weight: e.km * trafficMultiplier,
  }));
}

function findEdgeWeight(
  a: string,
  b: string,
  blocked: Set<string>,
  trafficMultiplier: number,
): number {
  const key = edgeKey(a, b);
  if (blocked.has(key)) return Infinity;
  const e = EDGES.find((edge) => edgeKey(edge.a, edge.b) === key);
  return e ? e.km * trafficMultiplier : Infinity;
}

function pathDistance(
  path: string[],
  blocked: Set<string>,
  trafficMultiplier: number,
): number {
  let km = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const w = findEdgeWeight(path[i], path[i + 1], blocked, trafficMultiplier);
    if (!Number.isFinite(w)) return Infinity;
    km += w;
  }
  return km;
}

function uniquePush(items: string[], id: string) {
  if (!items.includes(id)) items.push(id);
}

function noPathResult(algo: AlgoName, opts: RunOpts, message: string): RunResult {
  return {
    algo,
    source: opts.source,
    target: opts.target ?? null,
    path: [],
    distance: Infinity,
    visitedOrder: [],
    steps: [{ kind: "final", path: [], distance: Infinity, message }],
    stats: {
      "Traffic multiplier": `${opts.trafficMultiplier.toFixed(1)}x`,
      "Blocked roads": opts.blocked.size,
      "Status": "No reachable hospital or target",
    },
    execMs: 0,
  };
}

// The coordinates are hand-placed, so derive an admissible straight-line lower
// bound from the smallest km-per-pixel ratio in the graph instead of guessing.
const MIN_KM_PER_PIXEL = EDGES.reduce((min, e) => {
  const a = getNode(e.a);
  const b = getNode(e.b);
  const pixels = Math.hypot(a.x - b.x, a.y - b.y);
  return pixels > 0 ? Math.min(min, e.km / pixels) : min;
}, Infinity);

function heuristicKm(a: string, b: string): number {
  const A = getNode(a);
  const B = getNode(b);
  const pixels = Math.hypot(A.x - B.x, A.y - B.y);
  return pixels * (Number.isFinite(MIN_KM_PER_PIXEL) ? MIN_KM_PER_PIXEL : 0);
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
  let relaxations = 0;
  let queuePushes = 1;
  let resolvedTarget: string | null = opts.target ?? null;

  for (const n of NODES) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(opts.source, 0);

  const pq: { id: string; d: number }[] = [{ id: opts.source, d: 0 }];
  while (pq.length) {
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift()!;
    if (visited.has(cur.id)) continue;

    const curDistance = dist.get(cur.id) ?? Infinity;
    visited.add(cur.id);
    visitedOrder.push(cur.id);
    steps.push({
      kind: "current",
      node: cur.id,
      distance: curDistance,
      message: `Extracted ${getNode(cur.id).label} with the lowest tentative distance (${formatKm(curDistance)}).`,
    });
    steps.push({
      kind: "visit",
      node: cur.id,
      distance: curDistance,
      message: `${getNode(cur.id).label} is finalized; no later route can improve it.`,
    });

    const foundRequestedTarget = resolvedTarget && cur.id === resolvedTarget;
    const foundNearestHospital = !resolvedTarget && HOSPITAL_IDS.includes(cur.id);
    if (foundRequestedTarget || foundNearestHospital) {
      resolvedTarget = cur.id;
      break;
    }

    for (const nb of adj.get(cur.id) ?? []) {
      if (visited.has(nb.to)) continue;
      const previousDistance = dist.get(nb.to) ?? Infinity;
      const nextDistance = curDistance + nb.km;
      if (nextDistance < previousDistance) {
        dist.set(nb.to, nextDistance);
        prev.set(nb.to, cur.id);
        pq.push({ id: nb.to, d: nextDistance });
        queuePushes += 1;
        relaxations += 1;
        steps.push({
          kind: "relax",
          from: cur.id,
          to: nb.to,
          edgeWeight: nb.km,
          previousDistance,
          nextDistance,
          accepted: true,
          message: `Relaxed ${getNode(cur.id).label} -> ${getNode(nb.to).label}; best known distance is now ${formatKm(nextDistance)}.`,
        });
      }
    }
  }

  if (!resolvedTarget) {
    const nh = nearestHospital(dist);
    resolvedTarget = nh?.id ?? null;
  }

  const distance = resolvedTarget ? dist.get(resolvedTarget) ?? Infinity : Infinity;
  const path =
    resolvedTarget && distance < Infinity ? reconstruct(prev, resolvedTarget) : [];
  steps.push({
    kind: "final",
    path,
    distance,
    message: path.length
      ? `Dijkstra selected ${getNode(resolvedTarget!).label} at ${formatKm(distance)}.`
      : "No hospital is reachable with the current blocked roads.",
  });

  return {
    algo: "dijkstra",
    source: opts.source,
    target: resolvedTarget,
    path,
    distance,
    visitedOrder,
    steps,
    stats: {
      "Nodes explored": visitedOrder.length,
      "Relaxations accepted": relaxations,
      "Queue pushes": queuePushes,
      "Traffic multiplier": `${opts.trafficMultiplier.toFixed(1)}x`,
      "Blocked roads": opts.blocked.size,
      "Time complexity": "O((V + E) log V)",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- A* ----------
export function runAStar(opts: RunOpts): RunResult {
  const t0 = performance.now();
  const fallbackTarget = opts.target ?? runDijkstra({ ...opts, target: null }).target;
  const target = fallbackTarget ?? null;
  if (!target) {
    return {
      ...noPathResult("astar", opts, "A* needs a reachable hospital target."),
      execMs: performance.now() - t0,
    };
  }

  const adj = buildAdjacency(EDGES, opts.blocked, opts.trafficMultiplier);
  const g = new Map<string, number>();
  const f = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const open = new Set<string>([opts.source]);
  const closed = new Set<string>();
  const visitedOrder: string[] = [];
  const steps: StepKind[] = [];
  let relaxations = 0;

  for (const n of NODES) {
    g.set(n.id, Infinity);
    f.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  g.set(opts.source, 0);
  f.set(opts.source, heuristicKm(opts.source, target));

  while (open.size) {
    let cur: string | null = null;
    let curF = Infinity;
    let curH = Infinity;
    for (const id of open) {
      const ff = f.get(id) ?? Infinity;
      const hh = heuristicKm(id, target);
      if (ff < curF || (ff === curF && hh < curH)) {
        curF = ff;
        curH = hh;
        cur = id;
      }
    }
    if (!cur) break;

    const curG = g.get(cur) ?? Infinity;
    const h = heuristicKm(cur, target);
    visitedOrder.push(cur);
    steps.push({
      kind: "current",
      node: cur,
      g: curG,
      h,
      f: curG + h,
      message: `A* chose ${getNode(cur).label} because it has the smallest f = g + h (${(curG + h).toFixed(2)}).`,
    });
    steps.push({
      kind: "visit",
      node: cur,
      distance: curG,
      message: `${getNode(cur).label} is moved from the open set into the closed set.`,
    });

    if (cur === target) break;
    open.delete(cur);
    closed.add(cur);

    for (const nb of adj.get(cur) ?? []) {
      if (closed.has(nb.to)) continue;
      const tentativeG = curG + nb.km;
      const previousG = g.get(nb.to) ?? Infinity;
      if (tentativeG < previousG) {
        const nextH = heuristicKm(nb.to, target);
        const nextF = tentativeG + nextH;
        prev.set(nb.to, cur);
        g.set(nb.to, tentativeG);
        f.set(nb.to, nextF);
        open.add(nb.to);
        relaxations += 1;
        steps.push({
          kind: "relax",
          from: cur,
          to: nb.to,
          edgeWeight: nb.km,
          previousDistance: previousG,
          nextDistance: tentativeG,
          accepted: true,
          g: tentativeG,
          h: nextH,
          f: nextF,
          message: `Updated ${getNode(nb.to).label}: g=${tentativeG.toFixed(2)}, h=${nextH.toFixed(2)}, f=${nextF.toFixed(2)}.`,
        });
      }
    }
  }

  const distance = g.get(target) ?? Infinity;
  const path = distance < Infinity ? reconstruct(prev, target) : [];
  steps.push({
    kind: "final",
    path,
    distance,
    message: path.length
      ? `A* reached ${getNode(target).label} with total g=${distance.toFixed(2)} km.`
      : `A* could not reach ${getNode(target).label} with the current blocked roads.`,
  });

  return {
    algo: "astar",
    source: opts.source,
    target,
    path,
    distance,
    visitedOrder,
    steps,
    stats: {
      "Nodes explored": visitedOrder.length,
      "Relaxations accepted": relaxations,
      "Target g": Number.isFinite(distance) ? distance.toFixed(2) : "unreachable",
      "Start h": heuristicKm(opts.source, target).toFixed(2),
      "Heuristic": "SVG straight-line lower bound",
      "Traffic multiplier": `${opts.trafficMultiplier.toFixed(1)}x`,
      "Blocked roads": opts.blocked.size,
      "Time complexity": "O(E log V)",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- BFS ----------
export function runBFS(opts: RunOpts): RunResult {
  const t0 = performance.now();
  const adj = buildAdjacency(EDGES, opts.blocked, 1);
  const prev = new Map<string, string | null>();
  const hops = new Map<string, number>();
  const visited = new Set<string>();
  const visitedOrder: string[] = [];
  const steps: StepKind[] = [];
  const queue: string[] = [opts.source];
  let firstHospital: string | null = null;
  let enqueues = 1;

  visited.add(opts.source);
  prev.set(opts.source, null);
  hops.set(opts.source, 0);

  while (queue.length) {
    const cur = queue.shift()!;
    const curHops = hops.get(cur) ?? 0;
    visitedOrder.push(cur);
    steps.push({
      kind: "current",
      node: cur,
      distance: curHops,
      message: `BFS dequeued ${getNode(cur).label} at hop layer ${curHops}.`,
    });
    steps.push({
      kind: "visit",
      node: cur,
      hops: curHops,
      message: `${getNode(cur).label} is visited before moving to the next queued node.`,
    });

    if (HOSPITAL_IDS.includes(cur)) {
      firstHospital = cur;
      break;
    }

    for (const nb of adj.get(cur) ?? []) {
      if (!visited.has(nb.to)) {
        visited.add(nb.to);
        prev.set(nb.to, cur);
        hops.set(nb.to, curHops + 1);
        queue.push(nb.to);
        enqueues += 1;
        steps.push({
          kind: "relax",
          from: cur,
          to: nb.to,
          edgeWeight: 1,
          previousDistance: Infinity,
          nextDistance: curHops + 1,
          accepted: true,
          message: `Queued ${getNode(nb.to).label} for hop layer ${curHops + 1}.`,
        });
      }
    }
  }

  const target = firstHospital;
  const path = target ? reconstruct(prev, target) : [];
  const distance = path.length
    ? pathDistance(path, opts.blocked, opts.trafficMultiplier)
    : Infinity;
  steps.push({
    kind: "final",
    path,
    distance,
    message: path.length
      ? `BFS found the nearest hospital by hop count: ${getNode(target!).label}.`
      : "BFS found no reachable hospital with the current blocked roads.",
  });

  return {
    algo: "bfs",
    source: opts.source,
    target,
    path,
    distance,
    visitedOrder,
    steps,
    stats: {
      "Nodes explored": visitedOrder.length,
      "Queue enqueues": enqueues,
      "Hops": Math.max(0, path.length - 1),
      "Weighted km after path": Number.isFinite(distance)
        ? distance.toFixed(2)
        : "unreachable",
      "Traffic used for km": `${opts.trafficMultiplier.toFixed(1)}x`,
      "Blocked roads": opts.blocked.size,
      "Time complexity": "O(V + E)",
      "Search rule": "fewest hops, ignores weights",
    },
    execMs: performance.now() - t0,
  };
}

// ---------- Bellman-Ford ----------
export function runBellmanFord(opts: RunOpts): RunResult {
  const t0 = performance.now();
  const activeEdges = weightedEdges(opts.blocked, opts.trafficMultiplier);
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const steps: StepKind[] = [];
  const visitedOrder: string[] = [opts.source];
  let relaxations = 0;

  for (const n of NODES) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(opts.source, 0);

  for (let round = 1; round <= NODES.length - 1; round++) {
    steps.push({
      kind: "round",
      round,
      message: `Relaxation round ${round} of ${NODES.length - 1}; every road is tested in both directions.`,
    });

    for (const e of activeEdges) {
      for (const [u, v] of [
        [e.a, e.b] as const,
        [e.b, e.a] as const,
      ]) {
        const fromDist = dist.get(u) ?? Infinity;
        const previousDistance = dist.get(v) ?? Infinity;
        const nextDistance = fromDist + e.weight;
        if (fromDist < Infinity && nextDistance < previousDistance) {
          dist.set(v, nextDistance);
          prev.set(v, u);
          uniquePush(visitedOrder, v);
          relaxations += 1;
          steps.push({
            kind: "relax",
            from: u,
            to: v,
            round,
            edgeWeight: e.weight,
            previousDistance,
            nextDistance,
            accepted: true,
            message: `Round ${round}: ${getNode(u).label} improves ${getNode(v).label} to ${formatKm(nextDistance)}.`,
          });
        }
      }
    }
  }

  let negativeCycle = false;
  for (const e of activeEdges) {
    for (const [u, v] of [
      [e.a, e.b] as const,
      [e.b, e.a] as const,
    ]) {
      const fromDist = dist.get(u) ?? Infinity;
      const nextDistance = fromDist + e.weight;
      if (fromDist < Infinity && nextDistance < (dist.get(v) ?? Infinity)) {
        negativeCycle = true;
        steps.push({
          kind: "check",
          from: u,
          to: v,
          edgeWeight: e.weight,
          negativeCycle: true,
          message: `Negative-cycle check found another improvement on ${getNode(u).label} -> ${getNode(v).label}.`,
        });
        break;
      }
    }
    if (negativeCycle) break;
  }

  if (!negativeCycle) {
    steps.push({
      kind: "check",
      negativeCycle: false,
      message: "Final extra pass found no improvement, so no reachable negative cycle exists.",
    });
  }

  let target = opts.target ?? null;
  if (!target) {
    const nh = nearestHospital(dist);
    target = nh?.id ?? null;
  }
  const distance = target ? dist.get(target) ?? Infinity : Infinity;
  const path =
    target && distance < Infinity && !negativeCycle ? reconstruct(prev, target) : [];
  steps.push({
    kind: "final",
    path,
    distance,
    message: path.length
      ? `Bellman-Ford selected ${getNode(target!).label} after ${NODES.length - 1} full rounds.`
      : "Bellman-Ford cannot return a reliable path for the current graph state.",
  });

  return {
    algo: "bellman",
    source: opts.source,
    target,
    path,
    distance,
    visitedOrder,
    steps,
    stats: {
      "Iterations run": NODES.length - 1,
      "Edge scans": activeEdges.length * 2 * (NODES.length - 1),
      "Relaxations accepted": relaxations,
      "Negative cycle": negativeCycle ? "detected" : "none detected",
      "Traffic multiplier": `${opts.trafficMultiplier.toFixed(1)}x`,
      "Blocked roads": opts.blocked.size,
      "Time complexity": "O(V * E)",
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
  const dist: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(Infinity),
  );
  const next: (number | null)[][] = Array.from({ length: n }, () =>
    Array(n).fill(null),
  );

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
        const viaK = dist[i][k] + dist[k][j];
        if (viaK < dist[i][j]) {
          dist[i][j] = viaK;
          next[i][j] = next[i][k];
        }
      }
    }
  }

  return { ids, dist, next, precomputeMs: performance.now() - t0 };
}

export function floydPath(fw: FloydResult, source: string, target: string): string[] {
  const idx = new Map(fw.ids.map((id, i) => [id, i]));
  const sourceIndex = idx.get(source);
  const targetIndex = idx.get(target);
  if (sourceIndex === undefined || targetIndex === undefined) return [];

  let currentIndex: number = sourceIndex;
  if (fw.next[currentIndex][targetIndex] === null) return [];

  const path: string[] = [fw.ids[currentIndex]];
  while (currentIndex !== targetIndex) {
    const nextIndex = fw.next[currentIndex][targetIndex];
    if (nextIndex === null) return [];
    currentIndex = nextIndex;
    path.push(fw.ids[currentIndex]);
  }
  return path;
}

export function runFloydLookup(
  fw: FloydResult,
  source: string,
  target: string,
  opts?: Pick<RunOpts, "blocked" | "trafficMultiplier">,
): RunResult {
  const t0 = performance.now();
  const path = floydPath(fw, source, target);
  const idx = new Map(fw.ids.map((id, i) => [id, i]));
  const distance = fw.dist[idx.get(source)!][idx.get(target)!];
  const steps: StepKind[] = [
    {
      kind: "matrix",
      from: source,
      to: target,
      distance,
      message: `Read the all-pairs matrix cell for ${getNode(source).label} -> ${getNode(target).label}.`,
    },
  ];

  for (const id of path) {
    steps.push({
      kind: "current",
      node: id,
      distance,
      message: `Floyd-Warshall replays next-hop data through ${getNode(id).label}.`,
    });
    steps.push({
      kind: "visit",
      node: id,
      distance,
      message: `${getNode(id).label} is part of the reconstructed all-pairs path.`,
    });
  }

  for (let i = 0; i < path.length - 1; i++) {
    const edgeWeight = opts
      ? findEdgeWeight(path[i], path[i + 1], opts.blocked, opts.trafficMultiplier)
      : undefined;
    steps.push({
      kind: "relax",
      from: path[i],
      to: path[i + 1],
      edgeWeight,
      accepted: true,
      message: `Next-hop pointer advances from ${getNode(path[i]).label} to ${getNode(path[i + 1]).label}.`,
    });
  }

  steps.push({
    kind: "final",
    path,
    distance,
    message: path.length
      ? `Floyd-Warshall lookup returns ${formatKm(distance)} from the precomputed matrix.`
      : "The selected source and hospital are disconnected in the matrix.",
  });

  return {
    algo: "floyd",
    source,
    target,
    path,
    distance,
    visitedOrder: path,
    steps,
    stats: {
      "Precomputed in": `${fw.precomputeMs.toFixed(2)} ms`,
      "Lookup time": "O(1)",
      "Matrix size": `${fw.ids.length} x ${fw.ids.length}`,
      "Traffic multiplier": opts
        ? `${opts.trafficMultiplier.toFixed(1)}x`
        : "matrix value",
      "Blocked roads": opts ? opts.blocked.size : "matrix value",
      "Time complexity": "O(V^3) precompute",
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
    case "floyd": {
      const matrix = fw ?? precomputeFloyd(opts.blocked, opts.trafficMultiplier);
      const target = opts.target ?? runDijkstra({ ...opts, target: null }).target;
      if (!target) {
        return noPathResult(
          "floyd",
          opts,
          "Floyd-Warshall needs a reachable target hospital for lookup.",
        );
      }
      return runFloydLookup(matrix, opts.source, target, opts);
    }
  }
}
