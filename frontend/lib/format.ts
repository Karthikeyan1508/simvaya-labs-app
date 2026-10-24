// Readout formatting for numbers shown in the lab. Keeps dashes for missing values.
export const fmt = (v: number | undefined | null, digits = 2) =>
  v === undefined || v === null || Number.isNaN(v) ? '—' : v.toFixed(digits);

// Compact significant-figure form for axis ticks and step results.
export const sig = (v: number, digits = 5) => Number(v.toPrecision(digits)).toString();

// Server times are ISO in UTC; this shows them in the viewer's time zone.
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
