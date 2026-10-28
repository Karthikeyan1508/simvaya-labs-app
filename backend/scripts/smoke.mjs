// API smoke test. No dependencies. Usage:
//   API_URL=https://host node scripts/smoke.mjs
//   API_URL=... DEMO_EMAIL=a@b.c DEMO_PASSWORD=pw node scripts/smoke.mjs
// Does not create vivas and never reaches ElevenLabs or Groq (voice is only hit without a token or with empty text,
// both rejected before any upstream call).
const base = (process.env.API_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.error('Set API_URL, e.g. API_URL=https://simvaya-wisprflow-api.onrender.com');
  process.exit(2);
}
const { DEMO_EMAIL, DEMO_PASSWORD } = process.env;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000), // free hosts cold-start slowly
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

let failed = 0;
const check = async (name, want, fn) => {
  try {
    const r = await fn();
    const ok = r.status === want;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (want ${want}, got ${r.status})`);
    return r;
  } catch (e) {
    failed++;
    console.log(`FAIL ${name} (${e.message})`);
  }
};

await check('GET /auth/me without token', 401, () => call('GET', '/auth/me'));
await check('POST /auth/firebase bad token', 401, () =>
  call('POST', '/auth/firebase', { body: { idToken: 'not-a-token' } }),
);
await check('POST /voice/speak without token', 401, () => call('POST', '/voice/speak', { body: { text: 'hi' } }));
await check('POST /experiments/induction-motor/simulate', 201, () =>
  call('POST', '/experiments/induction-motor/simulate', { body: { loadKg: 4, running: true, supplyOn: true } }),
);

if (DEMO_EMAIL && DEMO_PASSWORD) {
  const login = await check('POST /auth/login demo user', 200, () =>
    call('POST', '/auth/login', { body: { email: DEMO_EMAIL, password: DEMO_PASSWORD } }),
  );
  if (login?.json?.token) {
    await check('POST /voice/speak empty text', 400, () =>
      call('POST', '/voice/speak', { token: login.json.token, body: { text: '' } }),
    );
    await call('POST', '/auth/logout', { token: login.json.token }).catch(() => {});
  }
}

console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
process.exit(failed ? 1 : 0);
