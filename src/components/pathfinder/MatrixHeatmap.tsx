import type { FloydResult } from "@/lib/algos";
import { NODES } from "@/lib/graph-data";

export function MatrixHeatmap({ fw }: { fw: FloydResult }) {
  // find max finite for normalization
  let max = 0;
  for (const row of fw.dist) {
    for (const v of row) if (isFinite(v) && v > max) max = v;
  }
  const labels = fw.ids.map(
    (id) => NODES.find((n) => n.id === id)?.label.slice(0, 8) ?? id,
  );

  function color(v: number) {
    if (!isFinite(v)) return "oklch(0.2 0.02 265)";
    if (v === 0) return "oklch(0.3 0.04 265)";
    const t = Math.min(1, v / max);
    // green (low) -> amber -> red (high)
    const hue = 145 - t * 120; // 145 -> 25
    return `oklch(${0.55 + 0.15 * (1 - t)} ${0.18 + 0.06 * t} ${hue})`;
  }

  return (
    <div className="overflow-auto">
      <div className="text-xs text-muted-foreground mb-2 font-mono">
        Floyd–Warshall all-pairs km matrix · precomputed in{" "}
        <span className="text-accent">{fw.precomputeMs.toFixed(2)} ms</span> ·
        any cell is an O(1) lookup
      </div>
      <table className="border-collapse font-mono text-[10px]">
        <thead>
          <tr>
            <th className="p-1"></th>
            {labels.map((l, i) => (
              <th
                key={i}
                className="p-1 text-muted-foreground font-normal"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  height: 70,
                }}
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fw.dist.map((row, i) => (
            <tr key={i}>
              <th className="p-1 text-right text-muted-foreground font-normal pr-2">
                {labels[i]}
              </th>
              {row.map((v, j) => (
                <td
                  key={j}
                  title={`${labels[i]} → ${labels[j]}: ${isFinite(v) ? v.toFixed(2) + " km" : "∞"}`}
                  style={{
                    background: color(v),
                    width: 28,
                    height: 22,
                    textAlign: "center",
                    color:
                      isFinite(v) && v / max > 0.45
                        ? "oklch(0.16 0.04 265)"
                        : "oklch(0.96 0.01 250)",
                  }}
                >
                  {isFinite(v) ? v.toFixed(0) : "∞"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
