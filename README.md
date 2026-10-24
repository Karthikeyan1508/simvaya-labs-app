# Simvaya

Simvaya is a virtual engineering lab for colleges. Students operate a digital twin of a lab rig in the browser, record readings, check their calculations, and practise a viva before the practical exam.

Live app: https://simvaya-labs-web.onrender.com

---

## What is in the app

### Four labs

| Lab | Route | Discipline | What the student does |
|---|---|---|---|
| Pelton wheel turbine | `/experiments/pelton-wheel` | Mechanical | 3D rig with pump, nozzle and dead weights. Records readings, sweeps 12 loads, calculates efficiency and graphs the results. |
| Three-phase induction motor | `/experiments/induction-motor` | Electrical (EEE) | Load test with a safety checklist (6 items) that must be ticked before supply and start unlock. Circuit and 3D views, observation table, graphs. |
| Zener voltage regulator | `/experiments/zener-regulator` | Electronics (ECE) | Simulated Zener circuit with supply, series resistor and load. Includes a "Wire it yourself" mode where students join terminals and check the wiring. |
| Sorting visualiser | `/experiments/sorting-visualiser` | Computer science (CSE) | Quick sort step by step, with comparison and swap counters and code in five languages. |

Each lab has the same sections where relevant: Aim, Theory, Procedure, Simulation, Calculations, and an Oral self-assessment.

### Features

- **Simulation.** Each lab runs its own model in the browser (Three.js for 3D, SVG for circuit diagrams).
- **Voice assistant.** A floating assistant speaks with an ElevenLabs agent. Its tools change the lab state (for example, turn the pump on, highlight a part, go to a procedure step). On every lab the same 12 tool names are used, mapped to that lab's own controls. The assistant lights up each part it names while it explains.
- **Oral self-assessment.** A student starts a self-assessment on a lab page. The app generates 8 questions from that lab's content, the student answers aloud in an ElevenLabs interview, and each explain answer is marked by Groq against a model answer. The result shows score, verdict, model answer, feedback and transcript.
- **Dashboard.** Shows experiments performed, activity this week, and finished vivas with transcript and feedback.
- **Accounts.** Google sign-in through Firebase (any Google account can sign up). A password login exists for accounts created with one.

### Not in the app (yet)

- Semester and subject views, recordings list and scores list were removed from the dashboard. Their pages (`/dashboard/recordings`, `/dashboard/scores`) still load by direct URL.
- Teacher role. It was removed. The database column `vivas.teacher_id` keeps its old name on purpose; it now holds the student who owns the viva.

---

## Architecture

```
simvaya/
├── backend/            NestJS API (Node 24), Postgres (Neon) via pg
│   ├── src/auth/       session auth, Firebase ID-token login, password login
│   ├── src/db/         schema, startup migrations, repositories
│   ├── src/experiments/  per-lab physics and content (pelton-wheel, induction-motor,
│   │                     zener-regulator, sorting-visualiser)
│   ├── src/viva/       self-assessment: question generation, marking, grading
│   ├── src/agenticorg/ AgenticOrg agent client (question generation for Pelton)
│   └── src/voice/      signed URL for the ElevenLabs agent
├── frontend/           Next.js 16 (App Router), React 19, Tailwind v4
│   ├── app/            routes: landing, login, dashboard, labs, viva pages
│   ├── components/     lab pages, 3D scenes, voice assistant, viva UI
│   └── lib/            API client, lab logic, voice tool handlers, Firebase setup
├── docs/               voice-agent-setup.md
├── tools/pelton/       Python script used to build the Pelton 3D model
└── presentations/      pitch material (not part of the build)
```

### Services and external providers

| Provider | Used for | Where it is configured |
|---|---|---|
| Neon Postgres | All app data | `DATABASE_URL` |
| Firebase Authentication | Google sign-in | `FIREBASE_PROJECT_ID` (backend), `NEXT_PUBLIC_FIREBASE_*` (frontend) |
| Groq | Question generation and marking for the oral self-assessment | `GROQ_API_KEY`, optional `GROQ_MODEL` |
| AgenticOrg | Optional question generation for Pelton | `AGENTIC_ORG_KEY`, `AGENTICORG_VIVA_AGENT_ID` |
| ElevenLabs | Voice assistant and oral interview | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` |
| Render | Hosting: one web service (frontend), one web service (backend) | Render dashboard |

---

## Environment variables

Set these in `backend/.env` for local work and in the Render dashboard for each service. Never commit real values. `.env` files are gitignored.

### Backend (`backend/.env`)

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string. |
| `FIREBASE_PROJECT_ID` | for Google sign-in | Firebase project id. Used to verify ID tokens. No service-account key is needed. |
| `FRONTEND_ORIGIN` / `FRONTEND_URL` | for CORS and links | Origin of the frontend, for example `http://localhost:3100`. |
| `GROQ_API_KEY` | for AI questions and marking | Without it, questions fall back to templates and explain answers stay pending review. |
| `GROQ_MODEL` | no | Defaults to `openai/gpt-oss-120b`. |
| `AGENTIC_ORG_KEY` | no | Enables the AgenticOrg path for Pelton questions. |
| `AGENTICORG_VIVA_AGENT_ID` | no | AgenticOrg agent UUID. |
| `ELEVENLABS_API_KEY` | for voice | Signed URL for the ElevenLabs agent. |
| `ELEVENLABS_AGENT_ID` | for voice | ElevenLabs agent id. |
| `SEED_DEMO_ACCOUNTS` | no | Set to `true` locally to create the demo student `student@simvaya.lab`. Off by default. |
| `PORT` | no | Defaults to 3001. |

### Frontend (`frontend/.env.local`)

| Name | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Backend base URL, for example `http://localhost:3001`. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | for Google sign-in | Firebase web config (public). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | for Google sign-in | Firebase web config (public). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | for Google sign-in | Firebase web config (public). |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | for Google sign-in | Firebase web config (public). |

`NEXT_PUBLIC_*` values are baked in at build time. Redeploy the frontend after changing them.

---

## Local setup

Requirements: Node.js 24, npm, and a Neon database (or any Postgres you point `DATABASE_URL` at).

1. **Install**
   ```bash
   cd backend && npm ci
   cd ../frontend && npm ci
   ```
2. **Configure.** Create `backend/.env` and `frontend/.env.local` with the variables above. For a first run, set `DATABASE_URL`, `SEED_DEMO_ACCOUNTS=true`, `NEXT_PUBLIC_API_URL=http://localhost:3001` and `FRONTEND_ORIGIN=http://localhost:3100`.
3. **Start the backend** (creates tables on startup):
   ```bash
   cd backend && npm run start:dev
   ```
   It listens on port 3001.
4. **Start the frontend**:
   ```bash
   cd frontend && npm run dev -- -p 3100
   ```
5. Open http://localhost:3100. With `SEED_DEMO_ACCOUNTS=true`, sign in with `student@simvaya.lab` and the demo password set in `backend/src/db/db.ts`.

The repo also contains a `.claude/launch.json` used by the preview tooling; it starts the same two servers.

### Scripts

| Where | Command | What it does |
|---|---|---|
| backend | `npm run start:dev` | Watch mode (`nest start --watch`). |
| backend | `npm run build` | Compiles to `dist/`. |
| backend | `npm start` | Runs `dist/main.js`. |
| backend | `npm test` | Jest unit tests. |
| frontend | `npm run dev` | Next.js dev server. |
| frontend | `npm run build` | Production build. Fails on type errors. |
| frontend | `npm start` | Serves the production build. |
| frontend | `node --experimental-strip-types --test lib/*.test.ts` | Node unit tests for the voice and wiring logic. |

Type checks: `npx tsc --noEmit -p tsconfig.json` in `backend/` and `frontend/`.

---

## Deploy (Render)

Two web services, both on Node 24, both auto-deploying from `main`:

| Service | Root | Build command | Start command |
|---|---|---|---|
| `simvaya-labs-api` | repo root | `cd backend && npm ci && npm run build` | `cd backend && node dist/main.js` |
| `simvaya-labs-web` | repo root | `cd frontend && npm ci && npm run build` | `cd frontend && npm start -- -H 0.0.0.0 -p $PORT` |

Checklist before a demo or an external test:
- Backend env: `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `FRONTEND_ORIGIN`.
- Frontend env: the four `NEXT_PUBLIC_FIREBASE_*` values and `NEXT_PUBLIC_API_URL`.
- Firebase console → Authentication → Settings → Authorized domains must include the frontend host (for example `simvaya-labs-web.onrender.com`). Without it, Google sign-in fails with an unauthorized-domain error.
- Google sign-in opens a popup and falls back to a full-page redirect when popups are blocked. Students must allow popups for the site, or they will be sent through the redirect.

See `docs/voice-agent-setup.md` for the ElevenLabs agent configuration.

---

## Tests

- `backend/`: 10 Jest suites, 100 tests (physics, grading, viva generation for every lab, AgenticOrg client, auth guards).
- `frontend/lib/`: Node test files for the voice tool handlers (`voice-*.test.ts`), the zener wiring checks (`lib/zener/*.test.ts`) and the part-matching helper.

Run them with the commands above. The voice tests do not start a live ElevenLabs session.

---

## Known limitations

- **Voice on Zener and induction** cannot set the Zener supply and load, or the induction brake load. The ElevenLabs agent has no tools for those yet. The assistant should say so; it must not claim it changed them.
- **Induction voice:** `set_pump` starts and stops the motor, and start is refused unless supply is on, all safety checks are acknowledged, the E-stop is clear and the rig is not paused. `explode_model` opens a cutaway view. Both behaviours still need product confirmation.
- **AgenticOrg** question generation is set up for the Pelton wheel only. Other labs use Groq, then templates.
- **Lab content is duplicated** for Zener and sorting between the frontend and `backend/src/experiments/*`. Keep them in step when the text changes.
- **Dashboard pages** `/dashboard/recordings` and `/dashboard/scores` still load by direct URL. They are removed from the navigation.
- **Teacher legacy:** the `vivas.teacher_id` column name is kept on purpose. Renaming it needs a migration on the live database.
- **Marking:** explain answers depend on Groq. Without `GROQ_API_KEY` they stay pending review.
- **Mobile layouts** for the newest sections (oral self-assessment on lab pages) were not checked on every device.

---

## Contributing

- Work on a branch, keep changes small, and run both type checks and the relevant tests before pushing.
- Do not commit `.env` files, API keys or Firebase service-account files.
- Commit messages describe the change in the imperative. Keep the body short.
