'use client';

import { useId, type ReactNode } from 'react';
import { isComponentId, type ComponentId } from '@/lib/induction';

export interface CircuitDiagramProps {
  highlightIds: ComponentId[];
  selectedId: ComponentId | null;
  onSelect?: (id: ComponentId | null) => void;
}

type Mark = 'selected' | 'highlight' | 'idle';

// Protective earth is drawn in its own colour, green in both themes.
const PE_GREEN = '#16a34a';
// Symbol bodies are filled with the card colour so the supply lines pass behind them.
const BOX = { fill: 'var(--card)' };
// Phase lines L1, L2, L3 (x positions). The viewBox is kept narrow so the text stays readable at 360 px.
const PHASES = [110, 210, 310];
// Text inside the SVG takes the current colour, so it follows the highlight and the theme.
const label = { fill: 'currentColor', stroke: 'none' } as const;

// Each element is a group with data-component, so tests and the lab can find it by id.
// A marked group uses the theme's primary colour and a glow. The selected one is drawn heavier.
function Part({
  id,
  mark,
  glow,
  color,
  children,
}: {
  id: ComponentId;
  mark: Mark;
  glow: string;
  color?: string;
  children: ReactNode;
}) {
  const marked = mark !== 'idle';
  return (
    <g
      data-component={id}
      data-state={mark}
      filter={marked ? `url(#${glow})` : undefined}
      strokeWidth={mark === 'selected' ? 3.5 : undefined}
      style={{ color: marked ? 'var(--primary)' : color }}
    >
      {children}
    </g>
  );
}

export function CircuitDiagram({ highlightIds, selectedId, onSelect }: CircuitDiagramProps) {
  const glow = `circuit-glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const lit = new Set(highlightIds);
  const markOf = (id: ComponentId): Mark => (selectedId === id ? 'selected' : lit.has(id) ? 'highlight' : 'idle');
  const mk = (id: ComponentId) => ({ id, mark: markOf(id), glow });

  return (
    <figure className="glass rounded-lg p-3">
      <svg
        viewBox="0 0 420 690"
        className={`h-auto w-full text-foreground ${onSelect ? 'cursor-pointer' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Teaching schematic of the three-phase induction motor test circuit"
        onClick={(e) => {
          // A click on any part's group selects that part; a click on the wiring clears the selection.
          const id = (e.target as Element).closest('[data-component]')?.getAttribute('data-component');
          onSelect?.(id && isComponentId(id) ? id : null);
        }}
      >
        <title>Teaching schematic of the three-phase induction motor test circuit</title>
        <defs>
          <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Supply lines from L1 L2 L3 down to the motor terminals. The symbols sit on top and hide them. */}
        <g>
          {PHASES.map((x) => (
            <line key={x} x1={x} y1={26} x2={x} y2={512} />
          ))}
          {PHASES.map((x, i) => (
            <text key={`l${i}`} x={x} y={18} textAnchor="middle" fontSize={15} fontWeight={600} {...label}>
              {`L${i + 1}`}
            </text>
          ))}
        </g>

        <Part {...mk('supply_panel')}>
          <rect x={60} y={50} width={300} height={40} rx={6} style={BOX} />
          <text x={210} y={75} textAnchor="middle" fontSize={15} {...label}>
            Isolator
          </text>
        </Part>

        <Part {...mk('starter')}>
          <rect x={60} y={118} width={300} height={72} rx={6} style={BOX} />
          <text x={210} y={158} textAnchor="middle" fontSize={15} {...label}>
            Starter (contactor)
          </text>
        </Part>

        <Part {...mk('estop')}>
          <line x1={360} y1={154} x2={381} y2={154} strokeDasharray="4 4" />
          <circle cx={394} cy={154} r={13} style={{ fill: '#dc2626' }} />
          <text x={394} y={186} textAnchor="middle" fontSize={14} {...label}>
            E-stop
          </text>
        </Part>

        <Part {...mk('ammeter')}>
          <circle cx={210} cy={262} r={17} style={BOX} />
          <text x={210} y={268} textAnchor="middle" fontSize={16} fontWeight={600} {...label}>
            A
          </text>
          <text x={234} y={268} fontSize={15} {...label}>
            Ammeter
          </text>
        </Part>

        {/* Wattmeter W1: current coil in L1, pressure coil from L1 to the reference line L2 */}
        <Part {...mk('wattmeter_w1')}>
          <circle cx={110} cy={318} r={18} style={BOX} />
          <text x={110} y={323} textAnchor="middle" fontSize={14} fontWeight={600} {...label}>
            W1
          </text>
          <text x={88} y={323} textAnchor="end" fontSize={14} {...label}>
            current coil
          </text>
          <circle cx={110} cy={352} r={3.5} fill="currentColor" stroke="none" />
          <line x1={110} y1={352} x2={135} y2={352} />
          <rect x={135} y={344} width={50} height={16} style={BOX} />
          <line x1={185} y1={352} x2={210} y2={352} />
          <circle cx={210} cy={352} r={3.5} fill="currentColor" stroke="none" />
          <text x={160} y={380} textAnchor="middle" fontSize={14} {...label}>
            pressure coil
          </text>
        </Part>

        {/* Wattmeter W2: current coil in L3, pressure coil from L3 to the reference line L2 */}
        <Part {...mk('wattmeter_w2')}>
          <circle cx={310} cy={318} r={18} style={BOX} />
          <text x={310} y={323} textAnchor="middle" fontSize={14} fontWeight={600} {...label}>
            W2
          </text>
          <text x={332} y={323} textAnchor="start" fontSize={14} {...label}>
            current coil
          </text>
          <circle cx={310} cy={352} r={3.5} fill="currentColor" stroke="none" />
          <line x1={310} y1={352} x2={285} y2={352} />
          <rect x={235} y={344} width={50} height={16} style={BOX} />
          <line x1={235} y1={352} x2={210} y2={352} />
          <circle cx={210} cy={352} r={3.5} fill="currentColor" stroke="none" />
          <text x={260} y={380} textAnchor="middle" fontSize={14} {...label}>
            pressure coil
          </text>
        </Part>

        {/* Voltmeter across L2 and L3 */}
        <Part {...mk('voltmeter')}>
          <circle cx={210} cy={410} r={3.5} fill="currentColor" stroke="none" />
          <line x1={210} y1={410} x2={243} y2={410} />
          <circle cx={260} cy={410} r={17} style={BOX} />
          <text x={260} y={416} textAnchor="middle" fontSize={16} fontWeight={600} {...label}>
            V
          </text>
          <line x1={277} y1={410} x2={310} y2={410} />
          <circle cx={310} cy={410} r={3.5} fill="currentColor" stroke="none" />
          <text x={260} y={444} textAnchor="middle" fontSize={14} {...label}>
            Voltmeter
          </text>
        </Part>

        {/* Motor terminals U V W */}
        <Part {...mk('terminal_box')}>
          {PHASES.map((x, i) => (
            <g key={x}>
              <rect x={x - 14} y={462} width={28} height={24} rx={3} style={BOX} />
              <text x={x} y={479} textAnchor="middle" fontSize={14} fontWeight={600} {...label}>
                {'UVW'[i]}
              </text>
            </g>
          ))}
        </Part>

        {/* Motor: the stator is the outer block, the squirrel-cage rotor sits inside it */}
        <Part {...mk('stator')}>
          <rect x={60} y={512} width={300} height={76} rx={8} style={BOX} />
          <text x={210} y={537} textAnchor="middle" fontSize={15} fontWeight={600} {...label}>
            Induction motor
          </text>
        </Part>
        <Part {...mk('rotor')}>
          <rect x={130} y={546} width={160} height={28} rx={6} strokeDasharray="5 3" style={BOX} />
          <text x={210} y={565} textAnchor="middle" fontSize={14} {...label}>
            Rotor: squirrel cage
          </text>
        </Part>

        {/* Protective earth from the motor frame to earth, in its own colour */}
        <Part {...mk('housing')} color={PE_GREEN}>
          <line x1={360} y1={530} x2={398} y2={530} />
          <line x1={398} y1={530} x2={398} y2={540} />
          <line x1={386} y1={540} x2={410} y2={540} />
          <line x1={390} y1={546} x2={406} y2={546} />
          <line x1={394} y1={552} x2={402} y2={552} />
          <text x={398} y={512} textAnchor="middle" fontSize={14} fontWeight={600} fill="currentColor" stroke="none">
            PE
          </text>
          <text x={398} y={574} textAnchor="middle" fontSize={14} fill="currentColor" stroke="none">
            Earth
          </text>
        </Part>

        {/* Mechanical link from the motor shaft to the brake drum, with the rope to the two balances */}
        <Part {...mk('brake_drum')}>
          <line x1={210} y1={588} x2={210} y2={620} strokeDasharray="4 4" />
          <circle cx={210} cy={640} r={20} style={BOX} />
          <line x1={190} y1={640} x2={140} y2={640} />
          <line x1={230} y1={640} x2={280} y2={640} />
          <text x={210} y={682} textAnchor="middle" fontSize={14} {...label}>
            Brake drum
          </text>
        </Part>

        <Part {...mk('spring_balances')}>
          <rect x={80} y={620} width={60} height={40} rx={4} style={BOX} />
          <text x={110} y={646} textAnchor="middle" fontSize={15} fontWeight={600} {...label}>
            S1
          </text>
          <text x={110} y={676} textAnchor="middle" fontSize={14} {...label}>
            load
          </text>
          <rect x={280} y={620} width={60} height={40} rx={4} style={BOX} />
          <text x={310} y={646} textAnchor="middle" fontSize={15} fontWeight={600} {...label}>
            S2
          </text>
          <text x={310} y={676} textAnchor="middle" fontSize={14} {...label}>
            tare
          </text>
        </Part>
      </svg>
      <figcaption className="mt-3 space-y-1 text-sm text-muted-foreground">
        <span className="block text-foreground">
          Teaching schematic. Follow the approved wiring diagram for real lab work.
        </span>
        <span className="block">Green: protective earth (PE). Amber: parts highlighted from the bench or the procedure.</span>
      </figcaption>
    </figure>
  );
}
