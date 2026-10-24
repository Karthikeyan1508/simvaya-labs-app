'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { SectionHead } from '@/components/lab/section-head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { balancedComparisons, makeInput, quickSort, seededRandom, worstComparisons } from './engine';

// The generator has 99 distinct values, so sizes stay below that.
const SIZES = Array.from({ length: 16 }, (_, k) => 6 + k * 6); // 6 to 96 items
const RUNS = 16; // random arrays averaged at each size

// Comparisons the visualiser's quick sort makes, averaged over random arrays of size n.
function measuredAverage(n: number): number {
  const rnd = seededRandom(n * 97 + 1);
  let total = 0;
  for (let r = 0; r < RUNS; r++) {
    total += quickSort(makeInput(n, 'random', rnd)).filter((s) => s.type === 'compare').length;
  }
  return total / RUNS;
}

const config = {
  average: { label: 'Measured average', color: 'var(--chart-1)' },
  balanced: { label: 'n log₂ n', color: 'var(--chart-2)' },
  worst: { label: 'n(n − 1) / 2', color: 'var(--chart-3)' },
} satisfies ChartConfig;

// Comparisons against input size, with the formulas as reference curves.
export function SortGraphs({ n }: { n: number }) {
  const data = useMemo(
    () =>
      SIZES.map((size) => ({
        size,
        average: measuredAverage(size),
        balanced: balancedComparisons(size),
        worst: worstComparisons(size),
      })),
    [],
  );

  return (
    <div className="space-y-8">
      <SectionHead title="Time complexity" subtitle="How the number of comparisons grows with the number of items." />

      <Card className="glass max-w-4xl gap-0 py-0 ring-0">
        <CardHeader className="border-b py-3.5">
          <CardTitle className="text-sm">Comparisons against input size</CardTitle>
          <CardDescription className="text-xs">
            Average of {RUNS} random arrays at each size. The dashed vertical line marks the {n} items you are sorting.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer config={config} className="h-80 w-full">
            <LineChart data={data} margin={{ top: 14, right: 18, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="size"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis tickLine={false} axisLine={false} width={56} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <ReferenceLine x={n} stroke="var(--primary)" strokeDasharray="4 4" />
              <Line dataKey="worst" type="monotone" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              <Line
                dataKey="balanced"
                type="monotone"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line dataKey="average" type="monotone" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <p className="max-w-3xl text-[15px] leading-relaxed">
        The measured average grows in step with n log₂ n and sits about 1.4 times above it, because quick sort does
        roughly 1.39 n log₂ n comparisons on average. The worst case grows as n², so it climbs far above both as the
        array grows.
      </p>
    </div>
  );
}
