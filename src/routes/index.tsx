import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlgoSelector, ALGOS } from "@/components/pathfinder/AlgoSelector";
import { ComparisonTable } from "@/components/pathfinder/ComparisonTable";
import { ControlsPanel, type Speed } from "@/components/pathfinder/ControlsPanel";
import { GraphCanvas } from "@/components/pathfinder/GraphCanvas";
import { MatrixHeatmap } from "@/components/pathfinder/MatrixHeatmap";
import { ResultsPanel } from "@/components/pathfinder/ResultsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  precomputeFloyd,
  runAStar,
  runAlgo,
  runBFS,
  runBellmanFord,
  runDijkstra,
  runFloydLookup,
  type AlgoName,
  type RunOpts,
  type RunResult,
  type StepKind,
} from "@/lib/algos";
import { edgeKey, getNode } from "@/lib/graph-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Mumbai Emergency Pathfinder - Pathfinding Algorithm Visualizer",
      },
      {
        name: "description",
        content:
          "Interactive Mumbai-themed visualizer for Dijkstra, A*, BFS, Bellman-Ford, and Floyd-Warshall.",
      },
      {
        property: "og:title",
        content: "Mumbai Emergency Pathfinder",
      },
      {
        property: "og:description",
        content:
          "Side-by-side visualization of 5 classic shortest-path algorithms on a Mumbai emergency graph.",
      },
    ],
  }),
  component: Index,
});

const SPEED_MS: Record<Speed, number> = { slow: 320, medium: 110, fast: 30 };

function Index() {
  const [algo, setAlgo] = useState<AlgoName>("dijkstra");
  const [source, setSource] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [traffic, setTraffic] = useState(1);
  const [speed, setSpeed] = useState<Speed>("medium");
  const [edgeMode, setEdgeMode] = useState(false);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<RunResult | null>(null);
  const [frame, setFrame] = useState(0);
  const [comparison, setComparison] = useState<RunResult[]>([]);

  const fw = useMemo(() => precomputeFloyd(blocked, traffic), [blocked, traffic]);

  const algoMeta = ALGOS.find((a) => a.id === algo)!;
  const needsTarget = algoMeta.needsTarget;

  useEffect(() => {
    setFrame(0);
    if (!result?.steps.length) return;

    let cancelled = false;
    let i = 1;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setFrame(1);

    const tick = () => {
      if (cancelled || !result) return;
      if (i >= result.steps.length) return;
      i += 1;
      setFrame(i);
      timer = setTimeout(tick, SPEED_MS[speed]);
    };

    if (result.steps.length > 1) {
      timer = setTimeout(tick, SPEED_MS[speed]);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [result, speed]);

  const { visitedSet, currentNode, finalPath, activeEdge, currentStep } =
    useMemo(() => {
      const visited = new Set<string>();
      let current: string | null = null;
      let path: string[] = [];
      let active: string | null = null;
      let step: StepKind | null = null;

      if (!result) {
        return {
          visitedSet: visited,
          currentNode: null,
          finalPath: [],
          activeEdge: null,
          currentStep: null,
        };
      }

      const upto = Math.min(frame, result.steps.length);
      step = upto > 0 ? result.steps[upto - 1] : null;

      for (let i = 0; i < upto; i++) {
        const s = result.steps[i];
        if (s.kind === "visit") {
          visited.add(s.node);
        } else if (s.kind === "current") {
          current = s.node;
        } else if (s.kind === "relax") {
          visited.add(s.from);
          visited.add(s.to);
        } else if (s.kind === "final") {
          path = s.path;
        }
      }

      if (
        step &&
        (step.kind === "relax" || step.kind === "check") &&
        step.from &&
        step.to
      ) {
        active = edgeKey(step.from, step.to);
      }

      return {
        visitedSet: visited,
        currentNode: current,
        finalPath: path,
        activeEdge: active,
        currentStep: step,
      };
    }, [result, frame]);

  function clearAnim() {
    setResult(null);
    setFrame(0);
  }

  function handleNodeClick(id: string) {
    clearAnim();
    const clicked = getNode(id);

    if (needsTarget) {
      if (!source) {
        setSource(id);
        setTarget(null);
      } else if (id === source) {
        setSource(null);
        setTarget(null);
      } else if (clicked.type === "hospital") {
        setTarget(id);
      } else {
        setSource(id);
        setTarget(null);
      }
      return;
    }

    setSource(id);
    setTarget(null);
  }

  function handleEdgeClick(key: string) {
    clearAnim();
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleAlgo(a: AlgoName) {
    clearAnim();
    setAlgo(a);
    const meta = ALGOS.find((x) => x.id === a)!;
    if (!meta.needsTarget) {
      setTarget(null);
    } else if (target && getNode(target).type !== "hospital") {
      setTarget(null);
    }
  }

  function baseOpts(): RunOpts | null {
    if (!source) return null;
    return { source, target, blocked, trafficMultiplier: traffic };
  }

  function handleRun() {
    const opts = baseOpts();
    if (!opts) return;
    if (needsTarget && !target) return;
    const runTarget = needsTarget ? target : null;
    const r = runAlgo(algo, { ...opts, target: runTarget }, fw);
    setResult(r);
    setComparison([]);
  }

  function handleReset() {
    setSource(null);
    setTarget(null);
    setBlocked(new Set());
    setResult(null);
    setFrame(0);
    setComparison([]);
    setEdgeMode(false);
  }

  function handleCompareAll() {
    if (!source) return;
    const nearestOpts: RunOpts = {
      source,
      target: null,
      blocked,
      trafficMultiplier: traffic,
    };
    const dj = runDijkstra(nearestOpts);
    const selectedHospital =
      target && getNode(target).type === "hospital" ? target : null;
    const lookupTarget = selectedHospital ?? dj.target;

    const rows: RunResult[] = [
      dj,
      runAStar({ ...nearestOpts, target: lookupTarget }),
      runBFS(nearestOpts),
      runBellmanFord(nearestOpts),
      lookupTarget
        ? runFloydLookup(fw, source, lookupTarget, nearestOpts)
        : runAlgo("floyd", nearestOpts, fw),
    ];

    setComparison(rows);
    setResult(null);
    setFrame(0);
  }

  const status = (() => {
    if (edgeMode) return "Edge mode: click a road to block or unblock it.";
    if (!source) return "Click a Mumbai EMS node to set the source.";
    if (needsTarget && !target) {
      return `Source: ${getNode(source).label}. Click a hospital target.`;
    }
    if (needsTarget && target) {
      return `${getNode(source).label} -> ${getNode(target).label}. Press RUN.`;
    }
    return `Source: ${getNode(source).label}. Press RUN for nearest hospital.`;
  })();

  const canRun = !!source && (!needsTarget || !!target);
  const canCompare = !!source;
  const visibleFrame = result ? Math.min(frame, result.steps.length) : 0;

  return (
    <div className="min-h-screen text-foreground">
      <header className="px-6 py-4 border-b border-border glass">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wide">
              <span className="text-primary">MUMBAI</span> EMERGENCY PATHFINDER
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              5 shortest-path algorithms / 18 nodes / traffic-aware roads
            </p>
          </div>
          <div className="flex gap-3 text-[11px] font-mono">
            <Legend color="var(--hospital)" label="Hospital" />
            <Legend color="var(--ambulance)" label="Ambulance" />
            <Legend color="var(--junction)" label="Junction" />
            <Legend color="var(--destructive)" label="Source" />
            <Legend color="var(--visited)" label="Visited" />
            <Legend color="var(--pathline)" label="Path" />
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 max-w-[1600px] mx-auto">
        <section className="glass rounded-xl p-2 min-h-[480px]">
          <GraphCanvas
            source={source}
            target={target}
            visitedSet={visitedSet}
            currentNode={currentNode}
            finalPath={finalPath}
            blocked={blocked}
            activeEdge={activeEdge}
            trafficMultiplier={traffic}
            edgeMode={edgeMode}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </section>

        <aside className="space-y-3">
          <div className="glass rounded-xl p-3">
            <PanelTitle>Algorithm</PanelTitle>
            <AlgoSelector active={algo} onSelect={handleAlgo} />
          </div>
          <div className="glass rounded-xl p-3">
            <PanelTitle>Controls</PanelTitle>
            <ControlsPanel
              traffic={traffic}
              onTraffic={(n) => {
                clearAnim();
                setTraffic(n);
              }}
              speed={speed}
              onSpeed={setSpeed}
              edgeMode={edgeMode}
              onEdgeMode={setEdgeMode}
              onRun={handleRun}
              onReset={handleReset}
              onCompareAll={handleCompareAll}
              canRun={canRun}
              canCompare={canCompare}
              status={status}
            />
          </div>
          <div className="glass rounded-xl p-3">
            <PanelTitle>Results</PanelTitle>
            <ResultsPanel
              result={result}
              currentStep={currentStep}
              frame={visibleFrame}
            />
          </div>
        </aside>

        <section className="lg:col-span-2 glass rounded-xl p-3">
          <Tabs defaultValue="compare">
            <TabsList>
              <TabsTrigger value="compare">Comparison</TabsTrigger>
              <TabsTrigger value="matrix">Floyd-Warshall Matrix</TabsTrigger>
            </TabsList>
            <TabsContent value="compare" className="pt-3">
              <ComparisonTable rows={comparison} />
            </TabsContent>
            <TabsContent value="matrix" className="pt-3">
              <MatrixHeatmap fw={fw} source={source} target={target} />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="text-center text-[11px] text-muted-foreground py-4 font-mono">
        Built with TanStack Start / all algorithms run client-side in pure TypeScript
      </footer>
    </div>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="font-display text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground mb-2">
      {children}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
