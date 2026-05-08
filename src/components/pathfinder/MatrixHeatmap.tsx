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
    <div className="overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-mono text-xs text-muted-foreground">
        <span>
          Floyd-Warshall all-pairs distance matrix, precomputed in{" "}
          <span className="text-accent">{fw.precomputeMs.toFixed(2)} ms</span>.
        </span>
        <span className="text-[10px] uppercase tracking-wider">
          green low / amber mid / red high
        </span>
      </div>
      <table className="border-collapse font-mono text-[10px]">
        <thead>
          <tr>
            <th className="p-1"></th>
            {labels.map((label, i) => (
              <th
                key={fw.ids[i]}
                className={cn(
                  "p-1 text-muted-foreground font-normal",
                  i === targetIndex && "text-accent",
                )}
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  height: 78,
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fw.dist.map((row, i) => (
            <tr key={fw.ids[i]}>
              <th
                className={cn(
                  "p-1 text-right text-muted-foreground font-normal pr-2",
                  i === sourceIndex && "text-accent",
                )}
              >
                {labels[i]}
              </th>
              {row.map((value, j) => {
                const selectedCell = i === sourceIndex && j === targetIndex;
                const highlightedLine =
                  i === sourceIndex || (targetIndex >= 0 && j === targetIndex);
                const highValue =
                  Number.isFinite(value) && max > 0 && value / max > 0.45;

                return (
                  <td
                    key={`${fw.ids[i]}-${fw.ids[j]}`}
                    title={`${labels[i]} -> ${labels[j]}: ${
                      Number.isFinite(value)
                        ? `${value.toFixed(2)} km`
                        : "unreachable"
                    }`}
                    className={cn(
                      "border border-background/40",
                      highlightedLine && "ring-1 ring-inset ring-accent/40",
                      selectedCell && "ring-2 ring-inset ring-primary",
                    )}
                    style={{
                      background: color(value),
                      width: 30,
                      height: 24,
                      textAlign: "center",
                      color: highValue
                        ? "oklch(0.16 0.04 265)"
                        : "oklch(0.96 0.01 250)",
                    }}
                  >
                    {Number.isFinite(value) ? value.toFixed(0) : "-"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
