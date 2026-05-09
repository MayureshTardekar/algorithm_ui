import { BarChart3, Play, RotateCcw, MousePointer2, Ban, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type Speed = "slow" | "medium" | "fast";

interface Props {
  traffic: number;
  onTraffic: (n: number) => void;
  speed: Speed;
  onSpeed: (s: Speed) => void;
  edgeMode: boolean;
  onEdgeMode: (b: boolean) => void;
  dragMode: boolean;
  onDragMode: (b: boolean) => void;
  onRun: () => void;
  onReset: () => void;
  onCompareAll: () => void;
  canRun: boolean;
  canCompare: boolean;
  status: string;
}

export function ControlsPanel({
  traffic,
  onTraffic,
  speed,
  onSpeed,
  edgeMode,
  onEdgeMode,
  dragMode,
  onDragMode,
  onRun,
  onReset,
  onCompareAll,
  canRun,
  canCompare,
  status,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="font-display text-sm font-semibold tracking-wide">
            Traffic Multiplier
          </label>
          <span className="font-mono text-xs text-accent">
            {traffic.toFixed(1)}x
          </span>
        </div>
        <Slider
          min={1}
          max={3}
          step={0.1}
          value={[traffic]}
          onValueChange={(v) => onTraffic(v[0])}
        />
      </div>

      <div>
        <div className="font-display text-sm font-semibold tracking-wide mb-1.5">
          Animation Speed
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(["slow", "medium", "fast"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={cn(
                "py-1.5 px-2 rounded-md text-xs font-mono uppercase border transition-colors",
                speed === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/40 border-border hover:border-primary/40",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="font-display text-sm font-semibold tracking-wide mb-2">
          Interaction Tool
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { onDragMode(false); onEdgeMode(false); }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-300",
              (!dragMode && !edgeMode)
                ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                : "bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60"
            )}
          >
            <MousePointer2 className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Select</span>
          </button>
          
          <button
            onClick={() => { onDragMode(false); onEdgeMode(true); }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-300",
              edgeMode
                ? "bg-destructive/20 border-destructive text-destructive shadow-[0_0_15px_rgba(var(--destructive),0.1)]"
                : "bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60"
            )}
          >
            <Ban className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Block</span>
          </button>

          <button
            onClick={() => { onDragMode(true); onEdgeMode(false); }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-300",
              dragMode
                ? "bg-accent/20 border-accent text-accent shadow-[0_0_15px_rgba(var(--accent),0.1)]"
                : "bg-white/5 border-white/5 text-white/40 hover:border-white/20 hover:text-white/60"
            )}
          >
            <Move className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Drag</span>
          </button>
        </div>
      </div>

      <div className="text-xs font-mono px-2 py-1.5 rounded bg-muted/40 text-muted-foreground border border-border min-h-[2.2rem] flex items-center">
        {status}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onRun}
          disabled={!canRun}
          className="font-display tracking-wider"
        >
          <Play className="size-4" />
          RUN
        </Button>
        <Button
          onClick={onReset}
          variant="secondary"
          className="font-display tracking-wider"
        >
          <RotateCcw className="size-4" />
          RESET
        </Button>
      </div>
      <Button
        onClick={onCompareAll}
        disabled={!canCompare}
        variant="outline"
        className="w-full font-display tracking-wider"
      >
        <BarChart3 className="size-4" />
        COMPARE ALL 5
      </Button>
    </div>
  );
}
