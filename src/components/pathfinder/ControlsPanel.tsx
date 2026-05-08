import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
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
  onRun: () => void;
  onReset: () => void;
  onCompareAll: () => void;
  canRun: boolean;
  status: string;
}

export function ControlsPanel({
  traffic,
  onTraffic,
  speed,
  onSpeed,
  edgeMode,
  onEdgeMode,
  onRun,
  onReset,
  onCompareAll,
  canRun,
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
            {traffic.toFixed(1)}×
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

      <div className="flex items-center justify-between rounded-md border border-border p-2.5">
        <div>
          <div className="font-display text-sm font-semibold">Block Roads</div>
          <div className="text-[11px] text-muted-foreground">
            Click any edge to toggle
          </div>
        </div>
        <Switch checked={edgeMode} onCheckedChange={onEdgeMode} />
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
          ▶ RUN
        </Button>
        <Button
          onClick={onReset}
          variant="secondary"
          className="font-display tracking-wider"
        >
          RESET
        </Button>
      </div>
      <Button
        onClick={onCompareAll}
        variant="outline"
        className="w-full font-display tracking-wider"
      >
        COMPARE ALL 5
      </Button>
    </div>
  );
}
