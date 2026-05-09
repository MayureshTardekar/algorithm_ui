import { useState, useRef, useEffect } from "react";
import { EDGES, edgeKey, type GraphNode } from "@/lib/graph-data";

interface Props {
  nodes: GraphNode[];
  source: string | null;
  target: string | null;
  visitedSet: Set<string>;
  currentNode: string | null;
  finalPath: string[];
  blocked: Set<string>;
  activeEdge: string | null;
  trafficMultiplier: number;
  resultDistance: number | null;
  onNodeClick: (id: string) => void;
  onEdgeClick: (key: string) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  edgeMode: boolean;
  dragMode: boolean;
}

const TYPE_COLOR: Record<GraphNode["type"], string> = {
  hospital: "var(--hospital)",
  ambulance: "var(--ambulance)",
  junction: "var(--junction)",
};

const TYPE_ICON: Record<GraphNode["type"], string> = {
  hospital: "+",
  ambulance: "A",
  junction: "o",
};

const SHORT_LABEL: Record<string, string> = {
  kem: "KEM",
  sion_h: "Sion Hosp.",
  lilavati: "Lilavati",
  hinduja: "Hinduja",
  bombay_h: "Bombay Hosp.",
  cooper: "Cooper",
  amb_dharavi: "Dharavi Amb.",
  amb_bandra: "Bandra Amb.",
  amb_andheri: "Andheri Amb.",
};

const LABEL_OFFSET: Record<
  string,
  { dx: number; dy: number; anchor?: "start" | "middle" | "end" }
> = {
  amb_andheri: { dx: -8, dy: -22, anchor: "end" },
  andheri: { dx: 0, dy: -22 },
  cooper: { dx: 0, dy: -24 },
  lilavati: { dx: 0, dy: -22 },
  amb_bandra: { dx: -16, dy: -18, anchor: "end" },
  bandra: { dx: 0, dy: -24 },
  mahim: { dx: 0, dy: -22 },
  hinduja: { dx: 0, dy: -20 },
  matunga: { dx: 0, dy: -24 },
  amb_dharavi: { dx: 16, dy: -16, anchor: "start" },
  dadar: { dx: 0, dy: -22 },
  kem: { dx: 0, dy: -24 },
  parel: { dx: 0, dy: -22 },
  worli: { dx: 0, dy: -22 },
  bombay_h: { dx: 0, dy: -24 },
  sion: { dx: 0, dy: -24 },
  sion_h: { dx: 0, dy: 24 },
  kurla: { dx: 0, dy: -22 },
};

export function GraphCanvas({
  nodes,
  source,
  target,
  visitedSet,
  currentNode,
  finalPath,
  blocked,
  activeEdge,
  trafficMultiplier,
  resultDistance,
  onNodeClick,
  onEdgeClick,
  onNodeMove,
  edgeMode,
  dragMode,
}: Props) {
  // Zoom & Pan State
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const lastPoint = useRef({ x: 0, y: 0 });
  const startPoint = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);

  const pathSet = new Set<string>();
  for (let i = 0; i < finalPath.length - 1; i++) {
    pathSet.add(edgeKey(finalPath[i], finalPath[i + 1]));
  }

  const pathPoints = finalPath
    .map((id) => {
      const n = nodes.find((x) => x.id === id)!;
      return `${n.x},${n.y}`;
    })
    .join(" ");

  // Handle Zoom
  function handleWheel(e: React.WheelEvent) {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    // Normalize mouse position to 850x700 space
    const mx = (e.clientX - rect.left) * (850 / rect.width);
    const my = (e.clientY - rect.top) * (700 / rect.height);

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.min(Math.max(transform.k * delta, 0.5), 5);

    // Zoom towards cursor in normalized space
    const dx = (mx - transform.x) / transform.k;
    const dy = (my - transform.y) / transform.k;

    setTransform({
      k: newK,
      x: mx - dx * newK,
      y: my - dy * newK,
    });
  }

  // Handle Panning and Node Dragging
  function handlePointerDown(e: React.PointerEvent) {
    const target = e.target as SVGElement;
    const nodeG = target.closest("[data-node-id]");
    
    startPoint.current = { x: e.clientX, y: e.clientY };
    didMove.current = false;

    if (nodeG && !edgeMode) {
      if (dragMode) {
        const id = nodeG.getAttribute("data-node-id")!;
        setDraggedNode(id);
        svgRef.current?.setPointerCapture(e.pointerId);
      }
      // If not dragMode, we do NOTHING here, so we don't start panning.
      // This allows the browser to wait for the click event.
    } else {
      setIsPanning(true);
      lastPoint.current = { x: e.clientX, y: e.clientY };
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    // Check if we moved enough to call it a drag or pan
    if (!didMove.current) {
      const dist = Math.hypot(e.clientX - startPoint.current.x, e.clientY - startPoint.current.y);
      if (dist > 5) didMove.current = true;
    }

    if (draggedNode && dragMode) {
      // Normalize to 850x700 space
      const svgX = (e.clientX - rect.left) * (850 / rect.width);
      const svgY = (e.clientY - rect.top) * (700 / rect.height);
      
      // Adjust for our internal <g> transform
      const x = (svgX - transform.x) / transform.k;
      const y = (svgY - transform.y) / transform.k;
      
      onNodeMove(draggedNode, x, y);
    } else if (isPanning) {
      // For panning, we can use screen delta but must scale it back to 850x700 space
      const dx = (e.clientX - lastPoint.current.x) * (850 / rect.width);
      const dy = (e.clientY - lastPoint.current.y) * (700 / rect.height);
      
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPoint.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    setDraggedNode(null);
    setIsPanning(false);
    svgRef.current?.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-card/20 rounded-lg select-none touch-none">
      <svg
        ref={svgRef}
        viewBox="0 0 850 700"
        className="w-full h-full"
        style={{ display: "block", cursor: isPanning ? "grabbing" : dragMode ? (draggedNode ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.25 0.06 265)" />
            <stop offset="100%" stopColor="oklch(0.16 0.04 265)" />
          </radialGradient>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="oklch(1 0 0 / 0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="850" height="700" fill="url(#bgGlow)" />
        
        {/* Transform Group */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          <rect width="850" height="700" fill="url(#grid)" pointerEvents="none" />

          {EDGES.map((e) => {
            const A = nodes.find((n) => n.id === e.a)!;
            const B = nodes.find((n) => n.id === e.b)!;
            const key = edgeKey(e.a, e.b);
            const isBlocked = blocked.has(key);
            const isPath = pathSet.has(key);
            const isActive = activeEdge === key;
            const effectiveKm = e.km * trafficMultiplier;
            const mx = (A.x + B.x) / 2;
            const my = (A.y + B.y) / 2;

            return (
              <g key={key}>
                <line
                  x1={A.x}
                  y1={A.y}
                  x2={B.x}
                  y2={B.y}
                  stroke={
                    isActive
                      ? "var(--accent)"
                      : isPath
                        ? "var(--pathline)"
                        : isBlocked
                          ? "var(--destructive)"
                          : "oklch(1 0 0 / 0.18)"
                  }
                  strokeWidth={isActive ? 5 : isPath ? 4 : isBlocked ? 2 : 1.5}
                  strokeDasharray={isBlocked ? "4 4" : undefined}
                  className={isActive ? "edge-active" : undefined}
                  style={{ cursor: edgeMode ? "pointer" : "default" }}
                  onClick={() => edgeMode && onEdgeClick(key)}
                />
                {edgeMode && (
                  <line
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onClick={() => onEdgeClick(key)}
                  />
                )}
                <g pointerEvents="none">
                  <rect
                    x={mx - 21}
                    y={my - 19}
                    width={42}
                    height={17}
                    rx={4}
                    fill={
                      isActive
                        ? "var(--accent)"
                        : isPath
                          ? "var(--pathline)"
                          : "oklch(0.12 0.03 265 / 0.82)"
                    }
                    stroke="oklch(1 0 0 / 0.18)"
                  />
                  <text
                    x={mx}
                    y={my - 7}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill={
                      isActive || isPath
                        ? "oklch(0.14 0.03 265)"
                        : "oklch(0.92 0.02 250)"
                    }
                    fontFamily="var(--font-mono)"
                  >
                    {effectiveKm.toFixed(1)}
                  </text>
                </g>
                {isBlocked && (
                  <text
                    x={mx}
                    y={my + 6}
                    textAnchor="middle"
                    fontSize="14"
                    fill="var(--destructive)"
                    pointerEvents="none"
                  >
                    X
                  </text>
                )}
              </g>
            );
          })}

          {finalPath.length > 1 && (
            <polyline
              key={pathPoints}
              points={pathPoints}
              fill="none"
              stroke="var(--pathline)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="path-draw"
              opacity={0.9}
            />
          )}

          {nodes.map((n) => {
            const isSource = n.id === source;
            const isTarget = n.id === target;
            const isCurrent = n.id === currentNode;
            const isVisited = visitedSet.has(n.id);
            const inPath = finalPath.includes(n.id);
            const baseColor = TYPE_COLOR[n.type];
            
            let fill = baseColor;
            if (inPath) fill = "var(--pathline)";
            else if (isVisited) fill = "var(--visited)";
            if (isCurrent) fill = "oklch(0.98 0 0)";
            if (isSource) fill = "var(--destructive)";
            if (isTarget) fill = "var(--hospital)"; // Ensure hospital color for target

            const labelOffset = LABEL_OFFSET[n.id] ?? { dx: 0, dy: -16 };
            const label = SHORT_LABEL[n.id] ?? n.label;

            return (
              <g
                key={n.id}
                data-node-id={n.id}
                style={{ cursor: edgeMode ? "default" : dragMode ? "grab" : "pointer" }}
                onClick={(e) => {
                  // Prevent selection if we were dragging/panning
                  if (!didMove.current && !edgeMode) {
                    onNodeClick(n.id);
                  }
                }}
              >
                {isSource && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={20}
                    fill="var(--destructive)"
                    opacity={0.25}
                    className="node-source-pulse"
                  />
                )}
                {isTarget && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={20}
                    fill="var(--hospital)"
                    opacity={0.35}
                    className="node-source-pulse" // Reuse pulse for target too
                  />
                )}
                {isCurrent && !isSource && !isTarget && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={16}
                    fill="oklch(0.98 0 0)"
                    opacity={0.3}
                    className="node-current-pulse"
                  />
                )}
                {isVisited && !inPath && !isSource && !isTarget && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={14}
                    fill="var(--visited)"
                    opacity={0.2}
                    className="node-pop"
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isTarget || isSource ? 13 : 10}
                  fill={fill}
                  stroke={isTarget || isSource ? "oklch(0.98 0 0)" : "oklch(0.16 0.04 265)"}
                  strokeWidth={isTarget || isSource ? 2.5 : 2}
                />
                <text
                  x={n.x}
                  y={n.y + 3.5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill="oklch(0.16 0.04 265)"
                  pointerEvents="none"
                  fontFamily="var(--font-mono)"
                >
                  {TYPE_ICON[n.type]}
                </text>
                <text
                  x={n.x + labelOffset.dx}
                  y={n.y + labelOffset.dy}
                  textAnchor={labelOffset.anchor ?? "middle"}
                  fontSize="11"
                  fontWeight="600"
                  fill="oklch(0.96 0.01 250)"
                  pointerEvents="none"
                  fontFamily="var(--font-display)"
                  style={{
                    paintOrder: "stroke",
                    stroke: "oklch(0.16 0.04 265)",
                    strokeWidth: 3,
                  }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Persistent UI Overlays (Not affected by zoom/pan) */}
      {resultDistance !== null && (
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="glass p-3 border border-pathline/50 rounded-lg shadow-xl">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Total Distance
            </div>
            <div className="text-2xl font-display font-bold text-pathline">
              {Number.isFinite(resultDistance)
                ? `${resultDistance.toFixed(2)} km`
                : "Unreachable"}
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="glass px-3 py-1.5 border border-white/10 rounded text-[10px] font-mono text-white/40">
          SCROLL TO ZOOM • DRAG TO PAN • GRAB NODES TO MOVE
        </div>
      </div>
    </div>
  );
}
