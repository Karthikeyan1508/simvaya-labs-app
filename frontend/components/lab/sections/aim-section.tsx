import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHead } from '../section-head';

const OBJECTIVES = [
  'Measure brake power, input power and efficiency of a Pelton turbine.',
  'Plot efficiency and discharge against brake power.',
  'Find the load at which the turbine gives its best efficiency.',
];

interface AimSectionProps {
  aim: string;
  apparatus: string[];
  onStart: () => void;
  subtitle?: string;
  objectives?: string[];
  startLabel?: string;
}

export function AimSection({
  aim,
  apparatus,
  onStart,
  subtitle = 'Experiment 08 · Impulse turbine',
  objectives = OBJECTIVES,
  startLabel = 'Start the simulation',
}: AimSectionProps) {
  return (
    <div className="space-y-8">
      <SectionHead title="Aim" subtitle={subtitle} />

      <p className="max-w-3xl text-xl leading-relaxed font-medium text-balance md:text-2xl">{aim}</p>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Objectives</h3>
          <ol className="space-y-2">
            {objectives.map((o, i) => (
              <li key={o} className="flex gap-3 border-l border-primary/50 pl-3 text-sm leading-relaxed">
                <span className="num text-primary">{String(i + 1).padStart(2, '0')}</span>
                {o}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Apparatus</h3>
          <ul className="grid gap-2">
            {apparatus.map((a, i) => (
              <li key={a} className="flex items-center gap-3 rounded-md bg-foreground/[0.035] px-3 py-2.5 text-sm">
                <span className="num text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Button onClick={onStart}>
        {startLabel} <ArrowRight />
      </Button>
    </div>
  );
}
