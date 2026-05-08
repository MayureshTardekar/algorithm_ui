import type { RunResult } from "@/lib/algos";
import { getNode } from "@/lib/graph-data";
import { ALGOS } from "./AlgoSelector";

export function ComparisonTable({ rows }: { rows: RunResult[] }) {
  if (!rows.length) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Pick a source node and run Compare All 5.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[960px] font-mono text-xs border-collapse">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3">Algorithm</th>
            <th className="py-2 pr-3">Target</th>
            <th className="py-2 pr-3">Distance</th>
            <th className="py-2 pr-3">Path</th>
            <th className="py-2 pr-3">Visited</th>
            <th className="py-2 pr-3">Steps</th>
            <th className="py-2 pr-3">Complexity</th>
            <th className="py-2 pr-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = ALGOS.find((a) => a.id === r.algo);
            const path = r.path.map((id) => getNode(id).label).join(" -> ");
            return (
              <tr key={r.algo} className="border-t border-border align-top">
                <td className="py-2 pr-3 font-display font-bold text-primary">
                  {meta?.name ?? r.algo}
                </td>
                <td className="py-2 pr-3">
                  {r.target ? getNode(r.target).label : "-"}
                </td>
                <td className="py-2 pr-3 text-accent">
                  {Number.isFinite(r.distance)
                    ? `${r.distance.toFixed(2)} km`
                    : "unreachable"}
                </td>
                <td className="py-2 pr-3 max-w-[280px] text-foreground">
                  {path || "no path"}
                </td>
                <td className="py-2 pr-3">{visitedInfo(r)}</td>
                <td className="py-2 pr-3">{r.steps.length}</td>
                <td className="py-2 pr-3">
                  {String(r.stats["Time complexity"] ?? "-")}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{meta?.desc}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function visitedInfo(result: RunResult): string {
  if (result.algo === "bellman") {
    return `${result.stats["Relaxations accepted"] ?? 0} relax`;
  }
  if (result.algo === "floyd") {
    return "matrix lookup";
  }
  return String(result.visitedOrder.length);
}
