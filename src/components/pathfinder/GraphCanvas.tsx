import { EDGES, NODES, edgeKey, type GraphNode } from "@/lib/graph-data";

interface Props {
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
  edgeMode: boolean;
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
  edgeMode,
}: Props) {
  const pathSet = new Set<string>();
  for (let i = 0; i < finalPath.length - 1; i++) {
    pathSet.add(edgeKey(finalPath[i], finalPath[i + 1]));
  }

  const pathPoints = finalPath
    .map((id) => {
      const n = NODES.find((x) => x.id === id)!;
      return `${n.x},${n.y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 850 700"
      className="w-full h-full"
      style={{ display: "block" }}
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
      <rect width="850" height="700" fill="url(#grid)" />

      {EDGES.map((e) => {
        const A = NODES.find((n) => n.id === e.a)!;
        const B = NODES.find((n) => n.id === e.b)!;
        const key = edgeKey(e.a, e.b);
        const isBlocked = blocked.has(key);
        const isPath = pathSet.has(key);
        const isActive = activeEdge === key;
        const showDistance = true;
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
            {showDistance && (
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
            )}
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

      {resultDistance !== null && (
        <g transform="translate(632 22)" pointerEvents="none">
          <rect
            width={190}
            height={54}
            rx={8}
            fill="oklch(0.14 0.03 265 / 0.9)"
            stroke="var(--pathline)"
            strokeWidth={1.5}
          />
          <text
            x={14}
            y={20}
            fontSize="10"
            fontWeight="800"
            fill="oklch(0.7 0.03 255)"
            fontFamily="var(--font-mono)"
          >
            TOTAL DISTANCE
          </text>
          <text
            x={14}
            y={42}
            fontSize="22"
            fontWeight="800"
            fill="var(--pathline)"
            fontFamily="var(--font-display)"
          >
            {Number.isFinite(resultDistance)
              ? `${resultDistance.toFixed(2)} km`
              : "unreachable"}
          </text>
        </g>
      )}

      {NODES.map((n) => {
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
        const labelOffset = LABEL_OFFSET[n.id] ?? { dx: 0, dy: -16 };
        const label = SHORT_LABEL[n.id] ?? n.label;

        return (
          <g
            key={n.id}
            style={{ cursor: edgeMode ? "default" : "pointer" }}
            onClick={() => !edgeMode && onNodeClick(n.id)}
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
            {isCurrent && !isSource && (
              <circle
                cx={n.x}
                cy={n.y}
                r={16}
                fill="oklch(0.98 0 0)"
                opacity={0.3}
                className="node-current-pulse"
              />
            )}
            {isVisited && !inPath && !isSource && (
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
              r={isTarget ? 13 : 10}
              fill={fill}
              stroke={isTarget ? "oklch(0.98 0 0)" : "oklch(0.16 0.04 265)"}
              strokeWidth={isTarget ? 2.5 : 2}
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
    </svg>
  );
}
