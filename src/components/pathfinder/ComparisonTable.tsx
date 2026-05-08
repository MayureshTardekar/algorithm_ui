import type { RunResult } from "@/lib/algos";
import { ALGOS } from "./AlgoSelector";
import { getNode } from "@/lib/graph-data";

export function ComparisonTable({ rows }: { rows: RunResult[] }) {
  if (!rows.length) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Pick a source node and hit "Compare All 5".
      </div>
    );
  }
  return (
    <div className="overflow-auto">
      <table className="w-full font-mono text-xs border-collapse">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3">Algorithm</th>
            <th className="py-2 pr-3">Target</th>
            <th className="py-2 pr-3">Path km</th>
            <th className="py-2 pr-3">Nodes explored</th>
            <th className="py-2 pr-3">Exec time</th>
            <th className="py-2 pr-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = ALGOS.find((a) => a.id === r.algo);
            const exploreInfo =
              r.algo === "bellman"
                ? `${r.stats["Edge relaxations"] ?? "—"} relax`
                : r.algo === "floyd"
                  ? "0 (precomp)"
                  : String(r.visitedOrder.length);
            return (
              <tr key={r.algo} className="border-t border-border">
                <td className="py-2 pr-3 font-display font-bold text-primary">
                  {meta?.name}
                </td>
                <td className="py-2 pr-3">
                  {r.target ? getNode(r.target).label : "—"}
                </td>
                <td className="py-2 pr-3 text-accent">
                  {isFinite(r.distance) ? r.distance.toFixed(2) : "∞"}
                </td>
                <td className="py-2 pr-3">{exploreInfo}</td>
                <td className="py-2 pr-3">{r.execMs.toFixed(2)} ms</td>
                <td className="py-2 pr-3 text-muted-foreground">{meta?.tag}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
