import type { AlgoName } from "@/lib/algos";
import { cn } from "@/lib/utils";

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
    desc: "Weighted nearest hospital",
    needsTarget: false,
  },
  {
    id: "astar",
    name: "A*",
    tag: "g + h = f",
    desc: "Selected hospital route",
    needsTarget: true,
  },
  {
    id: "bfs",
    name: "BFS",
    tag: "Hop layers",
    desc: "Fewest-hop hospital baseline",
    needsTarget: false,
  },
  {
    id: "bellman",
    name: "Bellman-Ford",
    tag: "V - 1 rounds",
    desc: "Relaxations plus cycle check",
    needsTarget: false,
  },
  {
    id: "floyd",
    name: "Floyd-Warshall",
    tag: "All pairs",
    desc: "Matrix heatmap and lookup",
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
          <div className="flex items-baseline justify-between gap-3">
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
