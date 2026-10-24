// Circuit of the manual's Figure 1 with the live node values. The electrical truth for the 3D bench.
export function ZenerSchematic({ vOut, iZ, regulating }: { vOut: number | null; iZ: number | null; regulating: boolean }) {
  const node = regulating ? 'var(--primary)' : 'currentColor';
  return (
    <svg viewBox="0 0 300 200" className="w-full text-foreground" role="img" aria-label="Zener shunt regulator schematic">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <line x1="30" y1="30" x2="30" y2="70" />
        <line x1="22" y1="70" x2="38" y2="70" strokeWidth="2.6" />
        <line x1="27" y1="80" x2="33" y2="80" />
        <line x1="30" y1="80" x2="30" y2="160" />
        <line x1="30" y1="30" x2="100" y2="30" />
        <polyline points="100,30 108,18 118,42 128,18 138,42 148,18 158,30" />
        <line x1="158" y1="30" x2="230" y2="30" />
        <line x1="230" y1="30" x2="230" y2="60" />
        <line x1="230" y1="30" x2="260" y2="30" />
        <line x1="195" y1="30" x2="195" y2="66" />
        <polygon points="187,100 203,100 195,84" />
        <line x1="185" y1="84" x2="205" y2="84" />
        <line x1="195" y1="100" x2="195" y2="160" />
        <rect x="224" y="60" width="12" height="50" />
        <line x1="230" y1="110" x2="230" y2="160" />
        <line x1="30" y1="160" x2="230" y2="160" />
      </g>
      <circle cx="195" cy="30" r="4" fill={node} />
      <g className="fill-foreground text-[11px]">
        <text x="6" y="100">Vin</text>
        <text x="120" y="12">Rs 220 Ω</text>
        <text x="210" y="96">Zener</text>
        <text x="244" y="90">RL</text>
        <text x="200" y="22" style={{ fill: node }} className="font-semibold">
          Vout {vOut === null ? '—' : `${vOut.toFixed(2)} V`}
        </text>
        <text x="210" y="122" className="text-muted-foreground">
          {iZ === null ? '' : `Iz ${(iZ * 1000).toFixed(1)} mA`}
        </text>
      </g>
    </svg>
  );
}
