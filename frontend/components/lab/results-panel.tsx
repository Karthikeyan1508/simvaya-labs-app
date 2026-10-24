import { Sparkles } from 'lucide-react';
import { fmt, sig } from '@/lib/format';
import type { ObservationRow } from '@/lib/types';

export function ResultsPanel({ best, bestNumber }: { best: ObservationRow | null; bestNumber: number }) {
  if (!best) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <Sparkles className="size-5 text-primary" />
        <p className="text-sm font-medium">Results appear after a loaded row</p>
        <p className="text-sm text-muted-foreground">Run the pump and record at least one row with load.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg bg-primary p-5 text-primary-foreground">
          <p className="text-sm font-medium opacity-90">Maximum efficiency</p>
          <p className="num mt-6 text-4xl font-semibold tracking-tight">
            {fmt(best.etaPct, 1)}
            <span className="ml-1 text-lg font-normal opacity-80">%</span>
          </p>
          <p className="num mt-3 text-xs opacity-80">
            Row {bestNumber} · T = {fmt(best.netLoadKg, 2)} kg
          </p>
        </div>
        <Tile label="Actual discharge" value={sig(best.qActM3s, 4)} unit="m³/s" sub={`${fmt(best.qActM3s * 1000, 2)} L/s`} />
        <Tile label="Head at inlet" value={fmt(best.headInletM, 2)} unit="m" sub="Hi = Pi / W" />
        <Tile label="Brake power" value={fmt(best.bhpKw, 3)} unit="kW" sub={`IHP ${fmt(best.ipKw, 3)} kW`} />
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Efficiency is highest when the net load is near half the stall load. At a fixed nozzle opening the input power
        is constant, so the BHP graph is a straight line and its highest point is the best result. Check the load
        graphs for the turn-over.
      </p>
    </div>
  );
}

function Tile({ label, value, unit, sub }: { label: string; value: string; unit: string; sub: string }) {
  return (
    <div className="rounded-lg bg-foreground/[0.035] p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="num mt-6 text-3xl font-semibold tracking-tight">
        {value}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      <p className="num mt-3 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
