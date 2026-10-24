'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RS_OHM, type OperatingPoint } from '@/lib/zener/solver';
import {
  type CheckReport,
  checkWiring,
  EMPTY_WIRING,
  expectedText,
  joinError,
  KINDS_ORDER,
  meterReading,
  PART_NAME,
  partOf,
  type PartKind,
  type PartPos,
  termId,
  TERMINALS,
  type Wiring,
} from '@/lib/zener/wiring';

// Point-to-point bench in board units. The SVG scales to the panel width, so a unit is about 0.6 px on a phone.
const W = 560;
const H = 330;
const HIT = 20; // terminal touch radius
const SNAP = 30; // how far a drop may miss a terminal and still join it
const GEOM: Record<PartKind, { w: number; h: number; t: Record<string, [number, number]> }> = {
  supply: { w: 120, h: 90, t: { '+': [120, 26], '-': [120, 64] } },
  resistor: { w: 110, h: 34, t: { a: [0, 17], b: [110, 17] } },
  zener: { w: 90, h: 34, t: { anode: [0, 17], cathode: [90, 17] } },
  load: { w: 110, h: 34, t: { a: [0, 17], b: [110, 17] } },
  meter: { w: 130, h: 96, t: { red: [40, 96], black: [90, 96] } },
};
const SHORT: Record<string, string> = { '+': '+', '-': '−', a: 'a', b: 'b', anode: 'A', cathode: 'K', red: '+', black: 'COM' };

type Sel = { type: 'wire'; index: number } | { type: 'part'; kind: PartKind } | null;
// bx, by: pointer on the board. dx, dy: where a dragged part was grabbed. from: the terminal a wire starts at.
interface Drag {
  type: 'tray' | 'part' | 'wire';
  kind?: PartKind;
  from?: string;
  bx: number;
  by: number;
  dx: number;
  dy: number;
}
type Pt = { x: number; y: number };

const termPos = (w: Wiring, t: string): Pt | null => {
  const [kind, key] = t.split('.') as [PartKind, string];
  const p = w.parts[kind];
  if (!p) return null;
  const [dx, dy] = GEOM[kind].t[key];
  return { x: p.x + dx, y: p.y + dy };
};

const wirePath = (p: Pt, q: Pt) => {
  const mx = (p.x + q.x) / 2;
  return `M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`;
};

function nearestTerminal(w: Wiring, p: Pt): string | null {
  let best: string | null = null;
  let bestD = SNAP;
  for (const kind of KINDS_ORDER) {
    if (!w.parts[kind]) continue;
    for (const t of TERMINALS[kind]) {
      const id = termId(kind, t.key);
      const pos = termPos(w, id);
      const d = pos ? Math.hypot(pos.x - p.x, pos.y - p.y) : Infinity;
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
  }
  return best;
}

const clampPos = (kind: PartKind, x: number, y: number): PartPos => ({
  x: Math.round(Math.min(Math.max(x, 0), W - GEOM[kind].w)),
  y: Math.round(Math.min(Math.max(y, 0), H - GEOM[kind].h - 24)),
});

const toBoard = (svg: SVGSVGElement, cx: number, cy: number): Pt => {
  const r = svg.getBoundingClientRect();
  return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
};

// Inside the board, the terminal label sits on the body side of its lead.
function PartBody({ kind, supplyV, rl, reading }: { kind: PartKind; supplyV: number; rl: number | null; reading: string }) {
  const { w, h } = GEOM[kind];
  const mid = { x: w / 2, y: h / 2 + 5 };
  return (
    <>
      <rect width={w} height={h} rx={6} className="fill-card stroke-foreground/60" strokeWidth={1.5} />
      {kind === 'supply' && (
        <text x={mid.x} y={mid.y} textAnchor="middle" className="num fill-foreground text-[14px]">
          {supplyV.toFixed(1)} V
        </text>
      )}
      {(kind === 'resistor' || kind === 'load') && (
        <text x={mid.x} y={mid.y} textAnchor="middle" className="num fill-foreground text-[13px]">
          {kind === 'resistor' ? `${RS_OHM} Ω` : rl === null ? 'open' : `${rl} Ω`}
        </text>
      )}
      {kind === 'zener' && (
        <g className="fill-foreground stroke-foreground" strokeWidth={2.5}>
          <polygon points="28,9 28,25 50,17" className="fill-foreground/70" />
          <line x1={54} y1={8} x2={54} y2={26} />
        </g>
      )}
      {kind === 'meter' && (
        <>
          <rect x={12} y={10} width={w - 24} height={30} rx={4} className="fill-background stroke-foreground/40" />
          <text x={w / 2} y={31} textAnchor="middle" className="num fill-foreground text-[13px]">
            {reading}
          </text>
        </>
      )}
    </>
  );
}

export interface ZenerWireBenchProps {
  wiring: Wiring;
  onWiring: (w: Wiring) => void;
  vs: number; // supply slider
  switchOn: boolean;
  rl: number | null;
  op: OperatingPoint | null; // solver result for the current setting
}

// "Wire it yourself": a parts tray, a bench to drop parts on, and point-to-point wires between terminals.
export function ZenerWireBench({ wiring, onWiring, vs, switchOn, rl, op }: ZenerWireBenchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [msg, setMsg] = useState('');
  const [report, setReport] = useState<CheckReport | null>(null);
  // Window handlers below read the latest values from here, not from the render they were bound in.
  const live = useRef({ wiring, onWiring, drag: null as Drag | null });
  live.current = { wiring, onWiring, drag };

  const commit = (w: Wiring) => {
    live.current.onWiring(w);
    setReport(null);
  };

  // A part being dragged shows where it would land; its wires follow it.
  const shown: Wiring =
    drag?.type === 'part' && drag.kind
      ? { ...wiring, parts: { ...wiring.parts, [drag.kind]: clampPos(drag.kind, drag.bx - drag.dx, drag.by - drag.dy) } }
      : wiring;
  const supplyV = switchOn ? vs : 0;
  const reading = wiring.parts.meter ? meterReading(shown, rl, op, supplyV) : '';

  // Pointer moves and release are read on the window, so a drag keeps going off the board.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const finish = (e: PointerEvent, d: Drag) => {
      const svg = svgRef.current;
      if (!svg) return;
      const { wiring: w } = live.current;
      const b = toBoard(svg, e.clientX, e.clientY);
      if (d.type === 'tray' && d.kind) {
        const r = svg.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside || w.parts[d.kind]) return;
        const { w: pw, h: ph } = GEOM[d.kind];
        commit({ ...w, parts: { ...w.parts, [d.kind]: clampPos(d.kind, b.x - pw / 2, b.y - ph / 2) } });
        setSel({ type: 'part', kind: d.kind });
      } else if (d.type === 'part' && d.kind) {
        commit({ ...w, parts: { ...w.parts, [d.kind]: clampPos(d.kind, b.x - d.dx, b.y - d.dy) } });
      } else if (d.type === 'wire' && d.from) {
        const to = nearestTerminal(w, b);
        if (!to) return;
        const err = joinError(w, d.from, to);
        if (err) return setMsg(err);
        setMsg('');
        commit({ ...w, wires: [...w.wires, [d.from, to]] });
      }
    };
    const move = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const b = toBoard(svg, e.clientX, e.clientY);
      setDrag((d) => (d ? { ...d, bx: b.x, by: b.y } : d));
    };
    const up = (e: PointerEvent) => {
      const d = live.current.drag;
      if (d) finish(e, d);
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
  }, [dragging]);

  // Delete removes the selected wire, or the selected part with its wires. Re-bound when the selection or wiring changes.
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      e.preventDefault();
      removeSel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, wiring]);

  const removeSel = () => {
    if (!sel) return;
    if (sel.type === 'wire') {
      commit({ ...wiring, wires: wiring.wires.filter((_, i) => i !== sel.index) });
    } else {
      const parts = { ...wiring.parts };
      delete parts[sel.kind];
      commit({ parts, wires: wiring.wires.filter(([a, b]) => partOf(a) !== sel.kind && partOf(b) !== sel.kind) });
    }
    setSel(null);
    setMsg('');
  };

  const issues = report ? report.missing.length + report.wrong.length + report.extra.length : 0;
  const settings = `Vs ${vs.toFixed(1)} V, ${rl === null ? 'no load' : `RL ${rl} Ω`}${switchOn ? '' : ', switch open'}`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag a part from the tray onto the bench. Drag from one terminal to another to wire them. Click a wire or a part, then press
        Delete to remove it.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {KINDS_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            className="btn-chip px-2.5 text-xs"
            disabled={Boolean(wiring.parts[k])}
            style={{ touchAction: 'none' }}
            onPointerDown={() => {
              setSel(null);
              setDrag({ type: 'tray', kind: k, bx: 0, by: 0, dx: 0, dy: 0 });
            }}
          >
            {PART_NAME[k]}
          </button>
        ))}
      </div>

      {/* Always rendered: a message that appears or clears would shift the board under the pointer mid-drag. */}
      <p role="status" className="min-h-5 text-sm text-destructive">
        {msg}
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none rounded-lg border border-border bg-background/60 select-none"
        role="group"
        aria-label="Wiring bench"
        onPointerDown={() => setSel(null)}
      >
        <g className="text-foreground/80">
          {shown.wires.map(([a, b], i) => {
            const p = termPos(shown, a);
            const q = termPos(shown, b);
            if (!p || !q) return null;
            const isSel = sel?.type === 'wire' && sel.index === i;
            const red = [a, b].some((t) => t === termId('supply', '+') || t === termId('meter', 'red'));
            return (
              <g key={`${a}|${b}`}>
                <path
                  d={wirePath(p, q)}
                  fill="none"
                  strokeWidth={isSel ? 6 : 4}
                  strokeLinecap="round"
                  stroke={isSel ? 'var(--primary)' : red ? '#c62828' : 'currentColor'}
                />
                <path
                  d={wirePath(p, q)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSel({ type: 'wire', index: i });
                    setMsg('');
                  }}
                />
              </g>
            );
          })}
        </g>

        {drag?.type === 'wire' && drag.from && termPos(shown, drag.from) && (
          <path
            d={wirePath(termPos(shown, drag.from)!, { x: drag.bx, y: drag.by })}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={3}
            strokeDasharray="6 5"
          />
        )}

        {KINDS_ORDER.map((kind) => {
          const pos = shown.parts[kind];
          if (!pos) return null;
          const { h } = GEOM[kind];
          return (
            <g
              key={kind}
              transform={`translate(${pos.x} ${pos.y})`}
              className="cursor-grab"
              role="group"
              aria-label={PART_NAME[kind]}
              onPointerDown={(e) => {
                e.stopPropagation();
                const svg = svgRef.current;
                if (!svg) return;
                const b = toBoard(svg, e.clientX, e.clientY);
                setSel({ type: 'part', kind });
                setDrag({ type: 'part', kind, bx: b.x, by: b.y, dx: b.x - pos.x, dy: b.y - pos.y });
              }}
            >
              <PartBody kind={kind} supplyV={supplyV} rl={rl} reading={reading} />
              <text x={GEOM[kind].w / 2} y={h + 16} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {PART_NAME[kind]}
              </text>
              {TERMINALS[kind].map((t) => {
                const [tx, ty] = GEOM[kind].t[t.key];
                const onEdge = ty >= h - 1;
                const lx = onEdge ? tx : tx > 0 ? tx - 12 : tx + 12;
                const ly = onEdge ? ty - 9 : ty + 4;
                const anchor = onEdge ? 'middle' : tx > 0 ? 'end' : 'start';
                const id = termId(kind, t.key);
                return (
                  <g
                    key={t.key}
                    className="cursor-crosshair"
                    role="button"
                    aria-label={`${t.name}: drag to another terminal to wire`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const svg = svgRef.current;
                      if (!svg) return;
                      const b = toBoard(svg, e.clientX, e.clientY);
                      setSel(null);
                      setMsg('');
                      setDrag({ type: 'wire', from: id, bx: b.x, by: b.y, dx: 0, dy: 0 });
                    }}
                  >
                    <circle cx={tx} cy={ty} r={HIT} fill="transparent" />
                    <circle cx={tx} cy={ty} r={6} className="fill-card stroke-foreground" strokeWidth={2} />
                    <text x={lx} y={ly} textAnchor={anchor} className="fill-foreground text-[11px]">
                      {SHORT[t.key]}
                    </text>
                    <title>{t.name}</title>
                  </g>
                );
              })}
            </g>
          );
        })}

        {drag?.type === 'wire' &&
          (() => {
            const snap = nearestTerminal(shown, { x: drag.bx, y: drag.by });
            const at = snap ? termPos(shown, snap) : null;
            return at ? <circle cx={at.x} cy={at.y} r={11} fill="none" stroke="var(--primary)" strokeWidth={3} /> : null;
          })()}
      </svg>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setReport(checkWiring(wiring, rl))}>Check wiring</Button>
        <Button variant="outline" onClick={removeSel} disabled={!sel}>
          {sel?.type === 'wire' ? 'Delete wire' : 'Remove part'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            commit(EMPTY_WIRING);
            setSel(null);
            setMsg('');
          }}
          disabled={Object.keys(wiring.parts).length === 0}
        >
          Clear bench
        </Button>
      </div>

      {report && (
        <div className="space-y-2 rounded-md border border-border p-3 text-sm" role="status">
          <p className={cn('font-medium', report.ok ? 'text-primary' : 'text-destructive')}>
            {report.ok ? 'Correct. Every connection for these settings is made.' : `Not correct yet: ${issues} to fix.`}
          </p>
          <p className="num text-xs text-muted-foreground">
            At {settings}. Expected: {expectedText(op)}
          </p>
          <ul className="space-y-0.5">
            {report.correct.map((s) => (
              <li key={`ok ${s}`} className="text-primary">
                Correct: {s}.
              </li>
            ))}
            {report.missing.map((s) => (
              <li key={`miss ${s}`} className="text-destructive">
                {s}
              </li>
            ))}
            {report.wrong.map((s) => (
              <li key={`wrong ${s}`} className="text-destructive">
                {s}
              </li>
            ))}
            {report.extra.map((s) => (
              <li key={`extra ${s}`} className="text-amber-600 dark:text-amber-400">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
