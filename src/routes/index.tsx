import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GraphCanvas } from "@/components/pathfinder/GraphCanvas";
import { AlgoSelector, ALGOS } from "@/components/pathfinder/AlgoSelector";
import { ControlsPanel, type Speed } from "@/components/pathfinder/ControlsPanel";
import { ResultsPanel } from "@/components/pathfinder/ResultsPanel";
import { MatrixHeatmap } from "@/components/pathfinder/MatrixHeatmap";
import { ComparisonTable } from "@/components/pathfinder/ComparisonTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  precomputeFloyd,
  runAlgo,
  runAStar,
  runBFS,
  runBellmanFord,
  runDijkstra,
  runFloydLookup,
  type AlgoName,
  type RunResult,
} from "@/lib/algos";
import { getNode } from "@/lib/graph-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Mumbai Emergency Pathfinder — Pathfinding Algorithm Visualizer",
      },
      {
        name: "description",
        content:
          "Interactive Mumbai-themed visualizer for Dijkstra, A*, BFS, Bellman-Ford, and Floyd-Warshall. Click hospitals and ambulance stations to see each algorithm work.",
      },
      {
        property: "og:title",
        content: "Mumbai Emergency Pathfinder",
      },
      {
        property: "og:description",
        content:
          "Side-by-side visualization of 5 classic shortest-path algorithms on a Mumbai map.",
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

  const fw = useMemo(
    () => precomputeFloyd(blocked, traffic),
    [blocked, traffic],
  );

  const algoMeta = ALGOS.find((a) => a.id === algo)!;
  const needsTarget = algoMeta.needsTarget;

  // animation
  useEffect(() => {
    if (!result) return;
    setFrame(0);
    if (!result.steps.length) return;
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i++;
      setFrame(i);
      if (i < result.steps.length) {
        setTimeout(tick, SPEED_MS[speed]);
      }
    };
    const id = setTimeout(tick, SPEED_MS[speed]);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [result, speed]);

  // derive visualization state from frame
  const { visitedSet, currentNode, finalPath } = useMemo(() => {
    const visited = new Set<string>();
    let current: string | null = null;
    let path: string[] = [];
    if (!result) return { visitedSet: visited, currentNode: null, finalPath: [] };
    const upto = Math.min(frame, result.steps.length);
    for (let i = 0; i < upto; i++) {
      const s = result.steps[i];
      if (s.kind === "visit") visited.add(s.node);
      else if (s.kind === "current") current = s.node;
      else if (s.kind === "relax") {
        visited.add(s.from);
        visited.add(s.to);
      } else if (s.kind === "final") path = s.path;
    }
    return { visitedSet: visited, currentNode: current, finalPath: path };
  }, [result, frame]);

  function clearAnim() {
    setResult(null);
    setFrame(0);
  }

  function handleNodeClick(id: string) {
    clearAnim();
    if (needsTarget) {
      if (!source) {
        setSource(id);
        setTarget(null);
      } else if (id === source) {
        setSource(null);
        setTarget(null);
      } else {
        setTarget(id);
      }
    } else {
      setSource(id);
      setTarget(null);
    }
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
    const m = ALGOS.find((x) => x.id === a)!;
    if (!m.needsTarget) setTarget(null);
  }

  function handleRun() {
    if (!source) return;
    if (needsTarget && !target) return;
    const opts = { source, target, blocked, trafficMultiplier: traffic };
    const r = runAlgo(algo, opts, fw);
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
    const opts = { source, target, blocked, trafficMultiplier: traffic };
    const dj = runDijkstra(opts);
    const tForA = target ?? dj.target;
    const rows: RunResult[] = [
      dj,
      runAStar({ ...opts, target: tForA }),
      runBFS(opts),
      runBellmanFord(opts),
      tForA ? runFloydLookup(fw, source, tForA) : runFloydLookup(fw, source, source),
    ];
    setComparison(rows);
    setResult(null);
  }

  const status = (() => {
    if (edgeMode) return "Edge mode: click an edge to block/unblock.";
    if (!source) return needsTarget ? "Click a source node." : "Click any node to set source.";
    if (needsTarget && !target)
      return `Source: ${getNode(source).label}. Now click a target hospital.`;
    if (needsTarget && target)
      return `${getNode(source).label} → ${getNode(target).label}. Press RUN.`;
    return `Source: ${getNode(source).label}. Press RUN to find nearest hospital.`;
  })();

  const canRun = !!source && (!needsTarget || !!target);

  return (
    <div className="min-h-screen text-foreground">
      <header className="px-6 py-4 border-b border-border glass">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wide">
              <span className="text-primary">MUMBAI</span> EMERGENCY PATHFINDER
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              5 shortest-path algorithms · 18 nodes · live edge weights
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
        {/* Left: graph */}
        <section className="glass rounded-xl p-2 min-h-[480px]">
          <GraphCanvas
            source={source}
            target={target}
            visitedSet={visitedSet}
            currentNode={currentNode}
            finalPath={finalPath}
            blocked={blocked}
            edgeMode={edgeMode}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
          />
        </section>

        {/* Right: panels */}
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
              status={status}
            />
          </div>
          <div className="glass rounded-xl p-3">
            <PanelTitle>Results</PanelTitle>
            <ResultsPanel result={result} />
          </div>
        </aside>

        {/* Bottom: tabs for comparison & matrix */}
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
              <MatrixHeatmap fw={fw} />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="text-center text-[11px] text-muted-foreground py-4 font-mono">
        Built with TanStack Start · all algorithms run client-side in pure JS
      </footer>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
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
