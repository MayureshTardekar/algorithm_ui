// Mumbai Emergency Pathfinder — graph data
// Coordinates are hand-placed in a 1000x700 SVG viewBox for readability,
// not geo-accurate. Edges are weighted by approximate km between locations.

export type NodeType = "hospital" | "ambulance" | "junction";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface GraphEdge {
  a: string;
  b: string;
  km: number;
}

export const NODES: GraphNode[] = [
  // Hospitals (green)
  { id: "kem", label: "KEM Hospital", type: "hospital", x: 450, y: 535 },
  { id: "sion_h", label: "Sion Hospital", type: "hospital", x: 720, y: 500 },
  { id: "lilavati", label: "Lilavati", type: "hospital", x: 285, y: 285 },
  { id: "hinduja", label: "Hinduja", type: "hospital", x: 365, y: 430 },
  { id: "bombay_h", label: "Bombay Hospital", type: "hospital", x: 220, y: 650 },
  { id: "cooper", label: "Cooper Hospital", type: "hospital", x: 190, y: 150 },

  // Ambulance stations (amber)
  { id: "amb_dharavi", label: "Dharavi Amb.", type: "ambulance", x: 620, y: 475 },
  { id: "amb_bandra", label: "Bandra Amb.", type: "ambulance", x: 165, y: 365 },
  { id: "amb_andheri", label: "Andheri Amb.", type: "ambulance", x: 95, y: 110 },

  // Junctions (blue)
  { id: "andheri", label: "Andheri", type: "junction", x: 165, y: 70 },
  { id: "bandra", label: "Bandra", type: "junction", x: 275, y: 350 },
  { id: "mahim", label: "Mahim", type: "junction", x: 405, y: 355 },
  { id: "matunga", label: "Matunga", type: "junction", x: 530, y: 405 },
  { id: "dadar", label: "Dadar", type: "junction", x: 505, y: 480 },
  { id: "parel", label: "Parel", type: "junction", x: 390, y: 575 },
  { id: "worli", label: "Worli", type: "junction", x: 280, y: 595 },
  { id: "sion", label: "Sion", type: "junction", x: 700, y: 400 },
  { id: "kurla", label: "Kurla", type: "junction", x: 805, y: 360 },
];

export const EDGES: GraphEdge[] = [
  // North spine
  { a: "andheri", b: "amb_andheri", km: 0.8 },
  { a: "andheri", b: "cooper", km: 1.5 },
  { a: "cooper", b: "lilavati", km: 4.2 },
  { a: "andheri", b: "bandra", km: 7.5 },
  { a: "lilavati", b: "bandra", km: 3.0 },
  { a: "bandra", b: "amb_bandra", km: 0.7 },
  { a: "bandra", b: "mahim", km: 2.6 },
  { a: "mahim", b: "hinduja", km: 0.9 },
  { a: "hinduja", b: "matunga", km: 2.4 },
  { a: "mahim", b: "matunga", km: 2.1 },
  { a: "matunga", b: "dadar", km: 1.4 },
  { a: "dadar", b: "kem", km: 1.6 },
  { a: "kem", b: "parel", km: 1.1 },
  { a: "parel", b: "worli", km: 2.3 },
  { a: "worli", b: "bombay_h", km: 2.8 },
  { a: "parel", b: "bombay_h", km: 3.2 },
  { a: "dadar", b: "parel", km: 1.7 },
  { a: "matunga", b: "sion", km: 2.9 },
  { a: "sion", b: "sion_h", km: 0.6 },
  { a: "sion", b: "kurla", km: 3.1 },
  { a: "dadar", b: "amb_dharavi", km: 1.8 },
  { a: "amb_dharavi", b: "matunga", km: 1.5 },
  { a: "amb_dharavi", b: "sion", km: 2.2 },
  { a: "kurla", b: "matunga", km: 4.5 },
  { a: "andheri", b: "mahim", km: 9.0 },
  { a: "bandra", b: "worli", km: 6.4 },
  { a: "worli", b: "dadar", km: 3.6 },
  { a: "lilavati", b: "mahim", km: 4.1 },
  { a: "cooper", b: "amb_bandra", km: 5.0 },
  { a: "kurla", b: "sion_h", km: 3.0 },
];

export function buildAdjacency(
  edges: GraphEdge[],
  blocked: Set<string>,
  trafficMultiplier: number,
): Map<string, { to: string; km: number }[]> {
  const adj = new Map<string, { to: string; km: number }[]>();
  for (const n of NODES) adj.set(n.id, []);
  for (const e of edges) {
    const key1 = edgeKey(e.a, e.b);
    if (blocked.has(key1)) continue;
    const w = e.km * trafficMultiplier;
    adj.get(e.a)!.push({ to: e.b, km: w });
    adj.get(e.b)!.push({ to: e.a, km: w });
  }
  return adj;
}

export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export function getNode(id: string): GraphNode {
  const n = NODES.find((x) => x.id === id);
  if (!n) throw new Error(`unknown node ${id}`);
  return n;
}

export const HOSPITAL_IDS = NODES.filter((n) => n.type === "hospital").map((n) => n.id);
