// Frontend smoke test: node scripts/smoke.mjs  (BASE_URL defaults to http://localhost:3100)
const base = process.env.BASE_URL ?? 'http://localhost:3100';
const checks = [
  ['/', undefined],
  ['/login', 'Sign in'],
  ...['pelton-wheel', 'induction-motor', 'zener-regulator', 'sorting-visualiser'].map((l) => [`/experiments/${l}`, undefined]),
];
let failed = 0;
for (const [path, text] of checks) {
  let ok = false, why = '';
  try {
    const res = await fetch(base + path);
    ok = res.status === 200;
    if (!ok) why = `status ${res.status}`;
    else if (text && !(await res.text()).includes(text)) (ok = false), (why = `missing "${text}"`);
  } catch (e) {
    why = e.message;
  }
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path}${why ? ' ' + why : ''}`);
}
process.exit(failed ? 1 : 0);
