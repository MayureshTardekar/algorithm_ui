import { NODES, EDGES, edgeKey, type GraphNode } from "@/lib/graph-data";

interface Props {
  source: string | null;
  target: string | null;
  visitedSet: Set<string>;
  currentNode: string | null;
  finalPath: string[];
  blocked: Set<string>;
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
  junction: "•",
};

export function GraphCanvas({
  source,
  target,
  visitedSet,
  currentNode,
  finalPath,
  blocked,
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

      {/* edges */}
      {EDGES.map((e) => {
        const A = NODES.find((n) => n.id === e.a)!;
        const B = NODES.find((n) => n.id === e.b)!;
        const key = edgeKey(e.a, e.b);
        const isBlocked = blocked.has(key);
        const isPath = pathSet.has(key);
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
                isPath
                  ? "var(--pathline)"
                  : isBlocked
                    ? "var(--destructive)"
                    : "oklch(1 0 0 / 0.18)"
              }
              strokeWidth={isPath ? 4 : isBlocked ? 2 : 1.5}
              strokeDasharray={isBlocked ? "4 4" : undefined}
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
            <text
              x={mx}
              y={my - 4}
              textAnchor="middle"
              fontSize="9"
              fill="oklch(0.7 0.03 255)"
              fontFamily="var(--font-mono)"
              pointerEvents="none"
            >
              {e.km}
            </text>
            {isBlocked && (
              <text
                x={mx}
                y={my + 6}
                textAnchor="middle"
                fontSize="14"
                fill="var(--destructive)"
                pointerEvents="none"
              >
                ✕
              </text>
            )}
          </g>
        );
      })}

      {/* animated path overlay */}
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

      {/* nodes */}
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
              stroke={
                isTarget ? "oklch(0.98 0 0)" : "oklch(0.16 0.04 265)"
              }
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
              x={n.x}
              y={n.y - 16}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="oklch(0.96 0.01 250)"
              pointerEvents="none"
              fontFamily="var(--font-display)"
              style={{ paintOrder: "stroke", stroke: "oklch(0.16 0.04 265)", strokeWidth: 3 }}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
