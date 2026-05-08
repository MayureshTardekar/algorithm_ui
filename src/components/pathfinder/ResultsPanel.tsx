import type { RunResult } from "@/lib/algos";
import { getNode } from "@/lib/graph-data";
import { ALGOS } from "./AlgoSelector";

export function ResultsPanel({ result }: { result: RunResult | null }) {
  if (!result) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Run an algorithm to see results.
      </div>
    );
  }
  const algoMeta = ALGOS.find((a) => a.id === result.algo);
  const pathLabels = result.path.map((id) => getNode(id).label);
  return (
    <div className="space-y-3 font-mono text-xs">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Algorithm
        </div>
        <div className="text-sm font-display font-bold text-primary">
          {algoMeta?.name ?? result.algo}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Source</div>
          <div className="text-foreground">{getNode(result.source).label}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Target</div>
          <div className="text-foreground">
            {result.target ? getNode(result.target).label : "—"}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase text-muted-foreground mb-1">
          Path
        </div>
        <div className="text-foreground leading-snug">
          {pathLabels.length ? pathLabels.join(" → ") : "no path found"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Distance"
          value={
            isFinite(result.distance) ? `${result.distance.toFixed(2)} km` : "∞"
          }
          accent
        />
        <Stat label="Exec time" value={`${result.execMs.toFixed(2)} ms`} />
      </div>

      <div className="border-t border-border pt-2 space-y-1">
        {Object.entries(result.stats).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded border border-border bg-muted/30 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={accent ? "text-accent font-bold" : "text-foreground"}>
        {value}
      </div>
    </div>
  );
}
