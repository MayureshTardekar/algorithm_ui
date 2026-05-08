import type { AlgoName, RunResult, StepKind } from "@/lib/algos";
import { getNode } from "@/lib/graph-data";
import { ALGOS } from "./AlgoSelector";

interface Props {
  result: RunResult | null;
  currentStep: StepKind | null;
  frame: number;
}

const DAA_NOTES: Record<
  AlgoName,
  { complexity: string; why: string; stepRule: string }
> = {
  dijkstra: {
    complexity: "O((V + E) log V)",
    why: "Use when road weights are non-negative and the nearest weighted hospital is needed.",
    stepRule: "Each step finalizes the cheapest open node or relaxes a neighboring road.",
  },
  astar: {
    complexity: "O(E log V), guided by h",
    why: "Use when dispatch already has a hospital target and wants focused search.",
    stepRule: "Each step compares f = g + h, then updates g/h/f for better neighbors.",
  },
  bfs: {
    complexity: "O(V + E)",
    why: "Use as a hop-count baseline that ignores travel distance and traffic.",
    stepRule: "Each step expands one queue layer before moving to the next hop layer.",
  },
  bellman: {
    complexity: "O(V * E)",
    why: "Use to teach V - 1 relaxation rounds and detect negative cycles.",
    stepRule: "Each round scans every road; the final pass checks for impossible improvements.",
  },
  floyd: {
    complexity: "O(V^3) precompute, O(1) lookup",
    why: "Use when dispatch needs all-pairs answers and a distance matrix heatmap.",
    stepRule: "Each lookup reads a matrix cell, then follows next-hop pointers.",
  },
};

export function ResultsPanel({ result, currentStep, frame }: Props) {
  if (!result) {
    return (
      <div className="text-xs text-muted-foreground italic">
        Run an algorithm to see results and step explanations.
      </div>
    );
  }

  const algoMeta = ALGOS.find((a) => a.id === result.algo);
  const notes = DAA_NOTES[result.algo];
  const pathLabels = result.path.map((id) => getNode(id).label);
  const currentStepNumber = Math.min(frame, result.steps.length);

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
            {result.target ? getNode(result.target).label : "-"}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase text-muted-foreground mb-1">
          Path
        </div>
        <div className="text-foreground leading-snug">
          {pathLabels.length ? pathLabels.join(" -> ") : "no path found"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Distance"
          value={
            Number.isFinite(result.distance)
              ? `${result.distance.toFixed(2)} km`
              : "unreachable"
          }
          accent
        />
        <Stat label="Exec time" value={`${result.execMs.toFixed(2)} ms`} />
      </div>

      <div className="rounded border border-border bg-muted/20 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase text-muted-foreground">
            Step {currentStepNumber}/{result.steps.length}
          </span>
          <span className="text-[10px] uppercase text-accent">
            {currentStep?.kind ?? "ready"}
          </span>
        </div>
        <div className="text-foreground leading-snug">
          {currentStep?.message ?? notes.stepRule}
        </div>
        {currentStep && <StepMetrics step={currentStep} />}
      </div>

      <div className="rounded border border-border bg-muted/20 p-2 space-y-1.5">
        <div className="text-[10px] uppercase text-muted-foreground">
          DAA explanation
        </div>
        <div className="grid gap-1">
          <InfoLine label="Complexity" value={notes.complexity} />
          <InfoLine label="Why used" value={notes.why} />
          <InfoLine label="Step rule" value={notes.stepRule} />
        </div>
      </div>

      <div className="border-t border-border pt-2 space-y-1">
        {Object.entries(result.stats).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground text-right">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepMetrics({ step }: { step: StepKind }) {
  const entries: [string, string][] = [];

  if ("node" in step) entries.push(["node", getNode(step.node).label]);
  if ("from" in step && step.from) entries.push(["from", getNode(step.from).label]);
  if ("to" in step && step.to) entries.push(["to", getNode(step.to).label]);
  if ("round" in step && step.round !== undefined) {
    entries.push(["round", String(step.round)]);
  }
  if ("edgeWeight" in step && step.edgeWeight !== undefined) {
    entries.push(["edge", `${step.edgeWeight.toFixed(2)} km`]);
  }
  if ("nextDistance" in step && step.nextDistance !== undefined) {
    entries.push([
      "next",
      Number.isFinite(step.nextDistance)
        ? `${step.nextDistance.toFixed(2)}`
        : "unreachable",
    ]);
  }
  if ("g" in step && step.g !== undefined) entries.push(["g", step.g.toFixed(2)]);
  if ("h" in step && step.h !== undefined) entries.push(["h", step.h.toFixed(2)]);
  if ("f" in step && step.f !== undefined) entries.push(["f", step.f.toFixed(2)]);
  if ("negativeCycle" in step) {
    entries.push(["cycle", step.negativeCycle ? "detected" : "none"]);
  }

  if (!entries.length) return null;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1">
      {entries.map(([label, value]) => (
        <InfoLine key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value}</span>
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
