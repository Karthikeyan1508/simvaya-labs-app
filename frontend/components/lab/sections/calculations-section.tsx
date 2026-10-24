'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ObservationRow } from '@/lib/types';
import { CalcPanel } from '../calc-panel';
import { GraphsPanel } from '../graphs-panel';
import { ObservationsTable } from '../observations-table';
import { ResultsPanel } from '../results-panel';
import { SectionHead } from '../section-head';

export interface CalculationsSectionProps {
  tab: string;
  onTab: (t: string) => void;
  rows: ObservationRow[];
  activeRow: number | null;
  onSelect: (i: number) => void;
  onClear: () => void;
  bestIndex: number;
  best: ObservationRow | null;
}

export function CalculationsSection(p: CalculationsSectionProps) {
  return (
    <div>
      <SectionHead
        title="Calculations"
        subtitle="Observation tables, every manual formula with its numbers substituted, results and graphs."
        actions={
          <Button variant="ghost" size="sm" onClick={p.onClear} disabled={p.rows.length === 0}>
            Clear table
          </Button>
        }
      />

      <Tabs value={p.tab} onValueChange={(v) => p.onTab(String(v))} className="gap-6">
        <TabsList variant="line" className="w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="observations" className="flex-none px-0.5 text-sm">
            Observations
            <span className="num ml-1.5 text-xs text-muted-foreground">{p.rows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="calculation" className="flex-none px-0.5 text-sm">
            Calculation
          </TabsTrigger>
          <TabsTrigger value="results" className="flex-none px-0.5 text-sm">
            Results
          </TabsTrigger>
          <TabsTrigger value="graphs" className="flex-none px-0.5 text-sm">
            Graphs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="observations" className="pt-2">
          <ObservationsTable rows={p.rows} activeRow={p.activeRow} onSelect={p.onSelect} bestIndex={p.bestIndex} />
        </TabsContent>
        <TabsContent value="calculation" className="pt-2">
          <CalcPanel rows={p.rows} activeRow={p.activeRow} onSelect={p.onSelect} />
        </TabsContent>
        <TabsContent value="results" className="pt-2">
          <ResultsPanel best={p.best} bestNumber={p.bestIndex + 1} />
        </TabsContent>
        <TabsContent value="graphs" className="pt-2">
          <GraphsPanel rows={p.rows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
