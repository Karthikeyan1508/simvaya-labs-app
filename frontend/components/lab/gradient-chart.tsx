'use client';

import { Area, AreaChart, CartesianGrid, ReferenceDot, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';

export interface SeriesPoint {
  x: number;
  y: number;
}

interface Props {
  id: string;
  title: string;
  description: string;
  yLabel: string;
  data: SeriesPoint[];
  color: string; // a theme chart colour, e.g. var(--chart-1)
  xDigits?: number;
  yDigits?: number;
  peak?: boolean;
}

export function GradientChart({
  id,
  title,
  description,
  yLabel,
  data,
  color,
  xDigits = 2,
  yDigits = 1,
  peak = false,
}: Props) {
  const config = { y: { label: yLabel, color } } satisfies ChartConfig;
  const top = data.reduce<SeriesPoint | undefined>((b, p) => (!b || p.y > b.y ? p : b), undefined);

  return (
    <Card className="glass gap-0 py-0 ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b py-3.5">
        <div className="min-w-0">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {peak && top && (
          <Badge className="num shrink-0 border-0 bg-primary/15 font-medium text-primary">max {top.y.toFixed(1)}</Badge>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {data.length === 0 ? (
          <div className="grid h-56 place-items-center text-xs text-muted-foreground">Record rows to plot.</div>
        ) : (
          <ChartContainer config={config} className="chart-mono h-56 w-full">
            <AreaChart data={data} margin={{ top: 14, right: 14, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.5 }} />
                  <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v: number) => v.toFixed(xDigits)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickFormatter={(v: number) => v.toFixed(yDigits)}
                tickLine={false}
                axisLine={false}
                width={48}
                fontSize={11}
              />
              <ChartTooltip
                cursor={{ stroke: color, strokeOpacity: 0.4, strokeDasharray: '3 3' }}
                content={<ChartTooltipContent labelFormatter={(v) => Number(v).toFixed(xDigits)} />}
              />
              <Area
                dataKey="y"
                type="monotone"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#fill-${id})`}
                dot={{ r: 3, fill: color, stroke: 'none' }}
                activeDot={{ r: 5, fill: color, stroke: 'var(--card)', strokeWidth: 2 }}
              />
              {peak && top && (
                <ReferenceDot x={top.x} y={top.y} r={6} fill="var(--card)" stroke={color} strokeWidth={2.5} />
              )}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
