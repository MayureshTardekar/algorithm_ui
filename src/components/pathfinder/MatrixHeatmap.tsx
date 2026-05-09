import type { FloydResult } from "@/lib/algos";
import { NODES } from "@/lib/graph-data";
import { cn } from "@/lib/utils";

interface Props {
  fw: FloydResult;
  source: string | null;
  target: string | null;
}

export function MatrixHeatmap({ fw, source, target }: Props) {
  let max = 0;
  for (const row of fw.dist) {
    for (const v of row) if (Number.isFinite(v) && v > max) max = v;
  }

  const labels = fw.ids.map(
    (id) => NODES.find((n) => n.id === id)?.label.slice(0, 10) ?? id,
  );
  const sourceIndex = source ? fw.ids.indexOf(source) : -1;
  const targetIndex = target ? fw.ids.indexOf(target) : -1;

  function color(value: number) {
    if (!Number.isFinite(value)) return "oklch(0.2 0.02 265)";
    if (value === 0 || max === 0) return "oklch(0.3 0.04 265)";
    const t = Math.min(1, value / max);
    const hue = 145 - t * 120;
    return `oklch(${0.55 + 0.15 * (1 - t)} ${0.18 + 0.06 * t} ${hue})`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-2 font-mono text-[10px] text-muted-foreground bg-white/5 p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>Precomputed in <span className="text-white font-bold">{fw.precomputeMs.toFixed(2)} ms</span></span>
          </div>
          <div className="h-3 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Scale: <span className="text-white font-bold">{max.toFixed(1)} km Max</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-[oklch(0.7_0.2_145)]" />
            <span>Efficient</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-[oklch(0.6_0.2_25)]" />
            <span>Congested</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar rounded-xl border border-white/5 bg-black/20">
        <table className="border-collapse font-mono text-[11px] min-w-full">
          <thead>
            <tr className="sticky top-0 z-10 bg-black/80 backdrop-blur-md">
              <th className="p-3 border-b border-white/10 bg-black/20"></th>
              {labels.map((label, i) => (
                <th
                  key={fw.ids[i]}
                  className={cn(
                    "p-2 text-center border-b border-white/10 transition-colors",
                    i === targetIndex ? "text-primary font-bold bg-primary/10" : "text-white/40 font-normal hover:text-white/80"
                  )}
                  style={{
                    minWidth: 45,
                  }}
                >
                  <div className="flex items-center justify-center h-24">
                    <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                      {label}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fw.dist.map((row, i) => (
              <tr key={fw.ids[i]} className="hover:bg-white/[0.02] transition-colors">
                <th
                  className={cn(
                    "p-3 text-right sticky left-0 z-10 bg-black/80 backdrop-blur-md border-r border-white/10 transition-colors",
                    i === sourceIndex ? "text-primary font-bold bg-primary/10" : "text-white/40 font-normal"
                  )}
                  style={{ minWidth: 100 }}
                >
                  {labels[i]}
                </th>
                {row.map((value, j) => {
                  const selectedCell = i === sourceIndex && j === targetIndex;
                  const isSourceRow = i === sourceIndex;
                  const isTargetCol = j === targetIndex;
                  const highValue = Number.isFinite(value) && max > 0 && value / max > 0.45;

                  return (
                    <td
                      key={`${fw.ids[i]}-${fw.ids[j]}`}
                      title={`${labels[i]} -> ${labels[j]}: ${
                        Number.isFinite(value)
                          ? `${value.toFixed(2)} km`
                          : "unreachable"
                      }`}
                      className={cn(
                        "p-0 border border-white/5 text-center transition-all duration-300 relative group",
                        isSourceRow && !selectedCell && "bg-primary/5",
                        isTargetCol && !selectedCell && "bg-primary/5",
                        selectedCell && "z-10 shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                      )}
                      style={{
                        minWidth: 45,
                        height: 38,
                      }}
                    >
                      <div 
                        className={cn(
                          "w-full h-full flex items-center justify-center transition-transform",
                          selectedCell ? "scale-100" : "scale-[0.98] group-hover:scale-100"
                        )}
                        style={{
                          background: color(value),
                          color: highValue ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.9)",
                        }}
                      >
                        {selectedCell && (
                          <div className="absolute inset-0 border-2 border-primary animate-pulse" />
                        )}
                        <span className={cn(
                          "font-bold tracking-tighter",
                          selectedCell && "text-white drop-shadow-md"
                        )}>
                          {Number.isFinite(value) ? value.toFixed(1) : "∞"}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
