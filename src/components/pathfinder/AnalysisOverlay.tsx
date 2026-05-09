import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, X, Maximize2, Minimize2 } from "lucide-react";
import { ComparisonTable } from "./ComparisonTable";
import { MatrixHeatmap } from "./MatrixHeatmap";
import type { RunResult } from "@/lib/algos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comparison: RunResult[];
  fw: any; // Floyd-Warshall precomputed data
  source: string | null;
  target: string | null;
}

export function AnalysisOverlay({
  isOpen,
  onClose,
  comparison,
  fw,
  source,
  target,
}: Props) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 pointer-events-none">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Window */}
      <div 
        className={cn(
          "relative glass border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col pointer-events-auto overflow-hidden",
          isMaximized 
            ? "w-full h-full rounded-none" 
            : "w-full max-w-6xl h-[85vh] rounded-[2rem]"
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.3)] text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-black uppercase tracking-[0.25em] text-white/90">
                Analytical Dashboard
              </h2>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] text-white/40 font-medium uppercase tracking-widest">
                  Live System Metrics & Connectivity
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-10 w-10 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-full hover:bg-destructive/20 text-white/40 hover:text-destructive transition-colors"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-[#050505]/90">
          <Tabs defaultValue="compare" className="h-full flex flex-col">
            <div className="shrink-0 px-8 py-6">
              <TabsList className="h-11 bg-white/5 p-1.5 rounded-xl border border-white/5 w-fit">
                <TabsTrigger 
                  value="compare" 
                  className="px-8 text-[11px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                >
                  Algorithm Benchmark
                </TabsTrigger>
                <TabsTrigger 
                  value="matrix" 
                  className="px-8 text-[11px] font-bold uppercase tracking-widest rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
                >
                  Connectivity Matrix
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar px-8 pb-8">
              <TabsContent value="compare" className="mt-0 focus-visible:outline-none animate-in fade-in zoom-in-95 duration-500">
                <ComparisonTable rows={comparison} />
              </TabsContent>
              <TabsContent value="matrix" className="mt-0 focus-visible:outline-none animate-in fade-in zoom-in-95 duration-500">
                <MatrixHeatmap fw={fw} source={source} target={target} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
