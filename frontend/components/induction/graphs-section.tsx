'use client';

import { Area, AreaChart, CartesianGrid, ReferenceDot, XAxis, YAxis } from 'recharts';
import { SectionHead } from '@/components/lab/section-head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { DerivedReadings, ObservationRow } from '@/lib/induction';
import type { RowsApi } from './lab-rows';

interface Point {
  x: number; // output power, W
  y: number;
  id: number;
  obs: number;
}

interface Spec {
  id: string;
  title: string;
  yLabel: string;
  color: string;
  digits: number;
  value: (r: ObservationRow, d: DerivedReadings) => number | null;
  note: (pts: Point[]) => string;
}

const NEED_TWO = 'Record at least two valid readings at different loads to see the trend.';

// Least-squares slope of y against x. Null when the x values do not vary.
function slope(pts: Point[]) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  return sxx === 0 ? null : sxy / sxx;
}

const peakIndex = (pts: Point[]) => pts.reduce((b, p, i) => (p.y > pts[b].y ? i : b), 0);

// One sentence per chart. Where the data breaks the expected trend, the sentence says so and names a check.
const SPECS: Spec[] = [
  {
    id: 'eta',
    title: 'Efficiency against output power',
    yLabel: 'η (%)',
    color: 'var(--chart-1)',
    digits: 1,
    value: (_, d) => d.etaPct,
    note: (pts) => {
      if (pts.length < 2) return NEED_TWO;
      const i = peakIndex(pts);
      if (i === pts.length - 1)
        return 'Efficiency is still rising at the highest output, so its peak lies above the loads you tested. Add a heavier load to find it.';
      if (i === 0)
        return 'Efficiency falls from the first reading, which is not the usual shape. Check the wattmeter readings and the speed, since they set the input and output power.';
      return `Efficiency peaks near ${pts[i].x.toFixed(0)} W of output and falls after it, because the load-dependent loss grows with the square of the output.`;
    },
  },
  {
    id: 'pf',
    title: 'Power factor against output power',
    yLabel: 'pf',
    color: 'var(--chart-2)',
    digits: 3,
    value: (_, d) => d.pf,
    note: (pts) => {
      if (pts.length < 2) return NEED_TWO;
      const m = slope(pts);
      if (m === null) return NEED_TWO;
      return m > 0
        ? 'Power factor rises with output, as expected: a lightly loaded motor draws mostly magnetising current, which gives a low power factor.'
        : 'Power factor does not rise with output. It should be low at light load, so check the readings behind it: Pin from W1 and W2, the line voltage and the line current.';
    },
  },
  {
    id: 'speed',
    title: 'Speed against output power',
    yLabel: 'N (rpm)',
    color: 'var(--chart-3)',
    digits: 0,
    value: (r) => r.raw.speedRpm,
    note: (pts) => {
      if (pts.length < 2) return NEED_TWO;
      const m = slope(pts);
      if (m === null) return NEED_TWO;
      return m < 0
        ? 'Speed falls as output rises, as expected: slip grows with the torque the motor must develop.'
        : 'Speed does not fall as the load rises. Check the speed reading and the spring balance readings, which set the torque.';
    },
  },
  {
    id: 'current',
    title: 'Line current against output power',
    yLabel: 'IL (A)',
    color: 'var(--chart-4)',
    digits: 2,
    value: (r) => r.raw.IL,
    note: (pts) => {
      if (pts.length < 2) return NEED_TWO;
      const m = slope(pts);
      if (m === null) return NEED_TWO;
      return m > 0
        ? 'Line current rises with output, because the input power rises with the load.'
        : 'Line current does not rise with output. Check the ammeter reading and the line voltage, since the input power depends on both.';
    },
  },
  {
    id: 'torque',
    title: 'Torque against output power',
    yLabel: 'T (N·m)',
    color: 'var(--chart-5)',
    digits: 2,
    value: (_, d) => d.torqueNm,
    note: (pts) => {
      if (pts.length < 2) return NEED_TWO;
      const m = slope(pts);
      if (m === null) return NEED_TWO;
      return m > 0
        ? 'Torque rises with output power, as expected: at nearly constant speed, output power is proportional to torque.'
        : 'Torque does not rise with output power. Check the spring balance readings, since torque comes from them, and the speed, which sets the output power.';
    },
  },
  {
    id: 'slip',
    title: 'Slip against output power',
    yLabel: 's (%)',
    color: 'var(--chart-1)',
    digits: 2,
    value: (_, d) => d.slipPct,
    note: (pts) => {
      if (pts.length < 2) return NEED_TWO;
      const m = slope(pts);
      if (m === null) return NEED_TWO;
      return m > 0
        ? 'Slip rises with output, because the rotor must slip more to develop more torque.'
        : 'Slip does not rise with output. Slip comes from the speed reading alone, so check the speed against the 1500 rpm synchronous speed.';
    },
  },
];

export function GraphsSection({ api }: { api: RowsApi }) {
  // Rows with a missing or invalid value are left out, so no point is drawn from an unreliable reading.
  const series = (spec: Spec): Point[] => {
    const pts: Point[] = [];
    for (const r of api.rows) {
      const d = api.derivedOf(r);
      if (!d || !d.valid || d.poutW === null) continue;
      const y = spec.value(r, d);
      if (y === null || !Number.isFinite(y)) continue;
      pts.push({ x: d.poutW, y, id: r.id, obs: r.observation });
    }
    return pts.sort((a, b) => a.x - b.x);
  };

  const selected = api.rows.find((r) => r.id === api.selectedId);

  return (
    <div className="space-y-6">
      <SectionHead
        title="Graphs"
        subtitle="Six curves against output power. Hover a point to see its row. Click a point to select that row in the table."
        actions={
          selected ? (
            <span className="num text-sm text-muted-foreground">Selected: row {selected.observation}</span>
          ) : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SPECS.map((spec) => (
          <TrendChart key={spec.id} spec={spec} pts={series(spec)} selectedId={api.selectedId} onSelect={api.select} />
        ))}
      </div>
    </div>
  );
}

function TrendChart({
  spec,
  pts,
  selectedId,
  onSelect,
}: {
  spec: Spec;
  pts: Point[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const config = { y: { label: spec.yLabel, color: spec.color } } satisfies ChartConfig;
  const sel = pts.find((p) => p.id === selectedId);

  return (
    <Card className="glass gap-0 py-0 ring-0">
      <CardHeader className="border-b py-3.5">
        <CardTitle className="text-sm">{spec.title}</CardTitle>
        <CardDescription className="text-xs">
          x: output power (W) · y: {spec.yLabel} · {pts.length} {pts.length === 1 ? 'point' : 'points'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {pts.length === 0 ? (
          <div className="grid h-52 place-items-center text-center text-xs text-muted-foreground">
            Capture valid readings to plot this curve.
          </div>
        ) : (
          <ChartContainer config={config} className="chart-mono h-52 w-full">
            <AreaChart
              data={pts}
              margin={{ top: 12, right: 14, bottom: 4, left: 0 }}
              onClick={(state) => {
                // Recharts reports the index as a string.
                const raw = state?.activeTooltipIndex;
                const i = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
                if (Number.isInteger(i) && pts[i]) onSelect(pts[i].id);
              }}
            >
              <defs>
                <linearGradient id={`fill-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: spec.color, stopOpacity: 0.5 }} />
                  <stop offset="100%" style={{ stopColor: spec.color, stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v: number) => v.toFixed(0)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickFormatter={(v: number) => v.toFixed(spec.digits)}
                tickLine={false}
                axisLine={false}
                width={52}
                fontSize={11}
              />
              <ChartTooltip
                cursor={{ stroke: spec.color, strokeOpacity: 0.4, strokeDasharray: '3 3' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, items) => `Row ${items?.[0]?.payload?.obs ?? ''}`}
                    formatter={(v) => Number(v).toFixed(spec.digits)}
                  />
                }
              />
              <Area
                dataKey="y"
                type="monotone"
                stroke={spec.color}
                strokeWidth={2.5}
                fill={`url(#fill-${spec.id})`}
                dot={{ r: 3, fill: spec.color, stroke: 'none' }}
                activeDot={{ r: 5, fill: spec.color, stroke: 'var(--card)', strokeWidth: 2 }}
              />
              {sel && (
                <ReferenceDot x={sel.x} y={sel.y} r={6} fill="var(--card)" stroke={spec.color} strokeWidth={2.5} />
              )}
            </AreaChart>
          </ChartContainer>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">{spec.note(pts)}</p>
      </CardContent>
    </Card>
  );
}
