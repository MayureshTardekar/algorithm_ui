import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlgoSelector, ALGOS } from "@/components/pathfinder/AlgoSelector";
import { ComparisonTable } from "@/components/pathfinder/ComparisonTable";
import { ControlsPanel, type Speed } from "@/components/pathfinder/ControlsPanel";
import { GraphCanvas } from "@/components/pathfinder/GraphCanvas";
import { MatrixHeatmap } from "@/components/pathfinder/MatrixHeatmap";
import { ResultsPanel } from "@/components/pathfinder/ResultsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { edgeKey, getNode, NODES } from "@/lib/graph-data";

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
  const [nodes, setNodes] = useState(NODES);
  const [blocked, setBlocked] = useState(new Set<string>());
  const [dragMode, setDragMode] = useState(false);
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

  function handleNodeMove(id: string, x: number, y: number) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
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
    setNodes(NODES);
    setResult(null);
    setFrame(0);
    setComparison([]);
    setEdgeMode(false);
    setDragMode(false);
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

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="h-svh flex flex-col overflow-hidden text-foreground bg-background">
      <header className="shrink-0 px-6 py-3 border-b border-border glass z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold tracking-wide">
                <span className="text-primary">MUMBAI</span> EMERGENCY PATHFINDER
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                Real-time EMS Dispatch Optimizer • {nodes.length} Nodes • Traffic Active
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-primary/20 hover:bg-primary/10"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-minimize-2"
                >
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-maximize-2"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </Button>
          </div>
          <div className="flex gap-4 text-[10px] font-mono uppercase tracking-wider">
            <Legend color="var(--hospital)" label="Hospital" />
            <Legend color="var(--ambulance)" label="EMS Station" />
            <Legend color="var(--destructive)" label="Source" />
            <Legend color="var(--pathline)" label="Optimal Path" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Map Area */}
        <section className="flex-1 relative bg-muted/5">
          <div className="absolute inset-0 p-4">
            <div className="w-full h-full glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
              <GraphCanvas
                source={source}
                target={target}
                visitedSet={visitedSet}
                currentNode={currentNode}
                finalPath={finalPath}
                blocked={blocked}
                activeEdge={activeEdge}
                trafficMultiplier={traffic}
                resultDistance={result ? result.distance : null}
                edgeMode={edgeMode}
                nodes={nodes}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onNodeMove={handleNodeMove}
                dragMode={dragMode}
              />
            </div>
          </div>
          
          {/* Status Overlay */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="glass px-6 py-2.5 rounded-full border border-primary/20 shadow-lg flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-display font-medium tracking-wide">
                {status}
              </span>
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="w-[380px] shrink-0 border-l border-border bg-card/30 backdrop-blur-md flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="glass rounded-xl p-4 border border-white/5">
              <PanelTitle>1. Select Algorithm</PanelTitle>
              <AlgoSelector active={algo} onSelect={handleAlgo} />
            </div>

            <div className="glass rounded-xl p-4 border border-white/5">
              <PanelTitle>2. Global Controls</PanelTitle>
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
                dragMode={dragMode}
                onDragMode={setDragMode}
                onRun={handleRun}
                onReset={handleReset}
                onCompareAll={handleCompareAll}
                canRun={canRun}
                canCompare={canCompare}
                status={status}
              />
            </div>

            <div className="glass rounded-xl p-4 border border-white/5 min-h-[120px]">
              <PanelTitle>3. Execution Trace</PanelTitle>
              <ResultsPanel
                result={result}
                currentStep={currentStep}
                frame={visibleFrame}
              />
            </div>

            {/* Bottom Section moved inside Sidebar or Collapsible */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <PanelTitle>4. Data Analysis</PanelTitle>
              <Tabs defaultValue="compare" className="w-full">
                <TabsList className="w-full grid grid-cols-2 h-8">
                  <TabsTrigger value="compare" className="text-[10px]">Comparison</TabsTrigger>
                  <TabsTrigger value="matrix" className="text-[10px]">Distance Matrix</TabsTrigger>
                </TabsList>
                <TabsContent value="compare" className="mt-2 overflow-x-auto">
                  <ComparisonTable rows={comparison} />
                </TabsContent>
                <TabsContent value="matrix" className="mt-2">
                  <MatrixHeatmap fw={fw} source={source} target={target} />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <footer className="shrink-0 p-4 border-t border-border bg-muted/10">
            <div className="flex items-center justify-between opacity-60">
              <span className="text-[10px] font-mono">V2.4.0_STABLE</span>
              <span className="text-[10px] font-mono uppercase tracking-tighter">Pure TypeScript Engine</span>
            </div>
          </footer>
        </aside>
      </main>
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
