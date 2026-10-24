'use client';

import { GradientChart } from './gradient-chart';
import type { ObservationRow } from '@/lib/types';

// Manual graph (x = BHP) split into panels, plus the load curves that show the turn-over.
export function GraphsPanel({ rows }: { rows: ObservationRow[] }) {
  const loaded = rows.filter((r) => r.ipKw > 0);
  const byX = (a: { x: number }, b: { x: number }) => a.x - b.x;

  const etaBhp = loaded.map((r) => ({ x: r.bhpKw, y: r.etaPct })).sort(byX);
  const qBhp = rows.map((r) => ({ x: r.bhpKw, y: r.qActM3s * 1000 })).sort(byX);
  const hBhp = rows.map((r) => ({ x: r.bhpKw, y: r.headVenturiM })).sort(byX);
  const etaLoad = loaded.map((r) => ({ x: r.netLoadKg, y: r.etaPct })).sort(byX);
  const bhpLoad = rows.map((r) => ({ x: r.netLoadKg, y: r.bhpKw })).sort(byX);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <GradientChart
        id="eta-bhp"
        title="Efficiency vs BHP"
        description="Manual graph · x: BHP (kW)"
        yLabel="η (%)"
        data={etaBhp}
        color="var(--chart-1)"
        peak
      />
      <GradientChart
        id="q-bhp"
        title="Actual discharge vs BHP"
        description="Manual graph · x: BHP (kW)"
        yLabel="Qact (L/s)"
        data={qBhp}
        color="var(--chart-2)"
        yDigits={2}
      />
      <GradientChart
        id="h-bhp"
        title="Venturi head vs BHP"
        description="Manual graph · x: BHP (kW)"
        yLabel="H (m)"
        data={hBhp}
        color="var(--chart-3)"
        yDigits={2}
      />
      <GradientChart
        id="eta-load"
        title="Efficiency vs net load"
        description="Load curve · x: T (kg), shows the turn-over"
        yLabel="η (%)"
        data={etaLoad}
        color="var(--chart-1)"
        peak
      />
      <GradientChart
        id="bhp-load"
        title="BHP vs net load"
        description="Load curve · x: T (kg)"
        yLabel="BHP (kW)"
        data={bhpLoad}
        color="var(--chart-2)"
        yDigits={3}
        peak
      />
    </div>
  );
}
