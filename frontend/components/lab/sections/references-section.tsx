import { SectionHead } from '../section-head';

// Check each citation against the library record before publishing.
export interface Reference {
  title: string;
  source: string;
  note: string;
}

const REFERENCES: Reference[] = [
  {
    title: 'Experiment 8: Performance characteristics of a Pelton turbine',
    source: 'Hydraulics laboratory manual (lab sheet supplied for this experiment)',
    note: 'Source of the procedure, observation tables and calculation chain.',
  },
  {
    title: 'Hydraulics and Fluid Mechanics',
    source: 'P. N. Modi and S. M. Seth, Standard Book House',
    note: 'Background on impulse turbines, Pelton wheels and venturimeters.',
  },
  {
    title: 'Fluid Mechanics and Thermodynamics of Turbomachinery',
    source: 'S. L. Dixon and C. Hall, Butterworth-Heinemann',
    note: 'Jet and runner velocity triangles, and turbine efficiency.',
  },
];

export function ReferencesSection({
  items = REFERENCES,
  subtitle = 'Sources used for the theory, procedure and calculations.',
}: {
  items?: Reference[];
  subtitle?: string;
}) {
  return (
    <div className="space-y-8">
      <SectionHead title="References" subtitle={subtitle} />
      <ol className="max-w-3xl space-y-3">
        {items.map((r, i) => (
          <li key={r.title} className="flex gap-4 rounded-md bg-foreground/[0.035] p-4">
            <span className="num text-sm text-primary">{String(i + 1).padStart(2, '0')}</span>
            <div className="space-y-1">
              <p className="text-[15px] font-medium">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.source}</p>
              <p className="text-xs text-muted-foreground/80">{r.note}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
