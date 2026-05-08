import { cn } from "@/lib/utils";
import type { AlgoName } from "@/lib/algos";

const ALGOS: {
  id: AlgoName;
  name: string;
  tag: string;
  desc: string;
  needsTarget: boolean;
}[] = [
  {
    id: "dijkstra",
    name: "Dijkstra",
    tag: "Greedy + PQ",
    desc: "Shortest km to nearest hospital",
    needsTarget: false,
  },
  {
    id: "astar",
    name: "A*",
    tag: "Heuristic",
    desc: "Pick a target hospital, watch focused search",
    needsTarget: true,
  },
  {
    id: "bfs",
    name: "BFS",
    tag: "Layered",
    desc: "Fewest turns (ignores km)",
    needsTarget: false,
  },
  {
    id: "bellman",
    name: "Bellman-Ford",
    tag: "V-1 rounds",
    desc: "Edge relaxation, slower but general",
    needsTarget: false,
  },
  {
    id: "floyd",
    name: "Floyd-Warshall",
    tag: "Precompute O(V³)",
    desc: "All-pairs matrix, O(1) lookup",
    needsTarget: true,
  },
];

export { ALGOS };

export function AlgoSelector({
  active,
  onSelect,
}: {
  active: AlgoName;
  onSelect: (a: AlgoName) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {ALGOS.map((a) => (
        <button
          key={a.id}
          onClick={() => onSelect(a.id)}
          className={cn(
            "text-left rounded-md p-3 border transition-all",
            active === a.id
              ? "border-primary bg-primary/10 shadow-[0_0_24px_-6px_var(--primary)]"
              : "border-border bg-card/40 hover:border-primary/40",
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="font-display text-base font-bold tracking-wide">
              {a.name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {a.tag}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
        </button>
      ))}
    </div>
  );
}
