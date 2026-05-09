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
    <div className="flex flex-col h-full bg-black/20 rounded-xl overflow-hidden border border-white/5">
      <div className="overflow-auto custom-scrollbar">
        <table className="w-full min-w-[1000px] font-mono text-[11px] border-collapse">
          <thead>
            <tr className="text-left text-[9px] uppercase tracking-[0.2em] text-white/40 sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-white/10">
              <th className="py-4 px-6 font-bold text-white/60">Algorithm</th>
              <th className="py-4 px-3">Target Node</th>
              <th className="py-4 px-3">Distance</th>
              <th className="py-4 px-3">Optimal Path</th>
              <th className="py-4 px-3">Nodes Visited</th>
              <th className="py-4 px-3">Total Steps</th>
              <th className="py-4 px-3">Complexity</th>
              <th className="py-4 px-6">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => {
              const meta = ALGOS.find((a) => a.id === r.algo);
              const pathLabels = r.path.map((id) => getNode(id).label);
              return (
                <tr key={r.algo} className="group hover:bg-white/[0.03] transition-colors align-top">
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-primary text-[13px] tracking-wide group-hover:text-primary-foreground transition-colors">
                        {meta?.name ?? r.algo}
                      </span>
                      <span className="text-[8px] text-white/20 uppercase">
                        {r.algo === 'floyd' ? 'Precomputed' : 'Dynamic Search'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-white/80">
                    {r.target ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {getNode(r.target).label}
                      </div>
                    ) : "-"}
                  </td>
                  <td className="py-4 px-3">
                    <span className="px-2 py-1 rounded bg-accent/10 text-accent font-bold border border-accent/20">
                      {Number.isFinite(r.distance)
                        ? `${r.distance.toFixed(2)} km`
                        : "unreachable"}
                    </span>
                  </td>
                  <td className="py-4 px-3 max-w-[300px]">
                    <div className="flex flex-wrap gap-1">
                      {pathLabels.length > 0 ? pathLabels.map((l, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="text-white/90">{l}</span>
                          {i < pathLabels.length - 1 && <span className="text-white/20">→</span>}
                        </span>
                      )) : <span className="text-white/20 italic">No path found</span>}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-white/60">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-white/10 rounded-full" />
                      {visitedInfo(r)}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-white/60">
                    {r.steps.length}
                  </td>
                  <td className="py-4 px-3 text-[10px] text-white/40 italic">
                    {String(r.stats["Time complexity"] ?? "-")}
                  </td>
                  <td className="py-4 px-6 text-[10px] leading-relaxed text-white/30 group-hover:text-white/50 transition-colors">
                    {meta?.desc}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
