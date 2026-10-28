# Simvaya — the lab, in every browser

**Built for the [No Hands: The Wispr Challenge](https://www.wemakedevs.org/wispr) (WeMakeDevs × Wispr Flow). Track: Builders. Solo entry.**

Simvaya turns an engineering lab into something a student can operate alone, in a browser, and talk to. Students run a digital twin of the rig, record readings, check the formulas, and practise the viva. In this version the student's side of every conversation is **dictated with Wispr Flow**, and the app answers out loud.

- **Live demo:** https://simvaya-wisprflow-web.onrender.com
- **API:** https://simvaya-wisprflow-api.onrender.com
- **Code:** this repository, branch `whisprflow`

---

## The problem

Engineering lab time is one rig, about 60 students and 45 minutes. One student touches the equipment and the rest watch. Students arrive without knowing what each component does, which values to record, how the formulas connect to the readings, or what the examiner will ask. Faculty then explain the same rig, procedure and calculations to every batch. Practical learning ends up as observation, memorisation and last-minute viva panic.

## Who it is for

- **Students** in mechanical, electrical, electronics and computer science labs who need to practise before the practical exam, in their own time.
- **Faculty** who want students to arrive understanding the rig, not asking which gauge is which.

Initial labs: Pelton wheel (mechanical), three-phase induction motor (EEE), Zener regulator (ECE) and a sorting visualiser (CSE).

---

## How Wispr Flow is used

Wispr Flow is the input method of the product. The challenge asks for tools you can speak into existence, so the product itself is built to be spoken to.

**In the product**
- **Lab assistant.** A floating assistant on every lab. The student holds the Wispr Flow key, speaks to the message box, and the dictated text goes to the assistant. The assistant answers in text *and* out loud, and it acts on the lab: it turns the pump on, sets a control, jumps to a procedure step, highlights the part it is explaining.
- **Oral viva.** The examiner's questions are read aloud. The student answers by dictating with Wispr Flow. Each answer is saved as it is given, then marked.
- **No microphone in the app.** The browser never asks for mic access. Wispr Flow handles speech-to-text on the desktop, and the app handles text in and speech out. This keeps the app simple and lets Wispr do what it does best: clean, punctuated text in whatever field has focus.
- **Speech out.** Only the assistant's replies are spoken, through a server endpoint (`POST /voice/speak`) that uses the same voice as the agent.

**In the build** (fill this in before submitting; keep it true)
- Which parts of the code, prompts, specs, docs and commit messages you dictated with Wispr Flow:
  - _…_
- Wispr Insights words dictated during the challenge: _…_
- Weekly check-in posts (#NoHandsChallenge): _…_

---

## What you can do in the app

| Lab | Route | What the student does |
|---|---|---|
| Pelton wheel turbine | `/experiments/pelton-wheel` | 3D rig with pump, nozzle and dead weights. Records readings, sweeps 12 loads, calculates efficiency, graphs the results. |
| Three-phase induction motor | `/experiments/induction-motor` | Load test behind a six-item safety checklist. Circuit and 3D views, observation table, graphs. |
| Zener voltage regulator | `/experiments/zener-regulator` | Supply, series resistor and load. A "Wire it yourself" mode where the student joins terminals and gets the wiring checked. |
| Sorting visualiser | `/experiments/sorting-visualiser` | Quick sort step by step, with comparison and swap counters and code in five languages. |

Across the labs:
- **Simulation** in the browser (Three.js for 3D, SVG for circuits).
- **Voice assistant** with the same 13 tools on every lab, mapped to that lab's own parts and controls (`set_pump`, `set_control`, `go_to_step`, `focus_part`, `highlight_parts`, `read_readings`, `explain_topic` and more). It lights up each part it names while explaining.
- **Oral self-assessment.** Eight questions generated from that lab's own content. Explain answers are marked by an LLM against a model answer, with feedback. Multiple choice, formula, calculation, part and step questions are marked by the app. Results show score, verdict, model answer, feedback and the full transcript.
- **Dashboard** with experiments performed, weekly activity and finished vivas.
- **Sign-in** with Google (Firebase). Any Google account can sign up.

---

## Demo

A two-minute walkthrough for the submission video:

1. Open the live link and sign in with Google.
2. Open the Pelton lab. Hold the Wispr Flow key and say: *"Turn the pump on and explain the nozzle."* The pump starts and the nozzle lights up while the assistant explains it, out loud.
3. Say: *"Set the nozzle to four, then take me to step three."* The rig and the procedure change.
4. Start the oral self-assessment. The examiner asks a question aloud. Dictate an answer.
5. Show the result: score, the marker's feedback, the model answer and the transcript.
6. Open the induction lab and say *"Start the motor."* The assistant refuses until the safety checks are done, and says why.

---

## Submission checklist

| Required by the challenge | Status |
|---|---|
| Link to a working project | https://simvaya-wisprflow-web.onrender.com |
| Demo video, up to 2 minutes | _add link_ |
| Wispr usage card (screenshot from Insights in the desktop app) | _add screenshot_ |
| A few lines on the problem, who it is for and how Wispr was used | see the sections above |
| Submitted on the challenge site by 31 Oct, 11:59 pm IST | _pending_ |

---

## Architecture

```
simvaya/
├── backend/            NestJS API (Node 24), Postgres (Neon) via pg
│   ├── src/auth/       sessions, Firebase ID-token login, optional cookie sessions
│   ├── src/db/         schema, startup migrations, repositories
│   ├── src/experiments/  per-lab physics and content
│   ├── src/viva/       self-assessment: generation, marking, grading
│   ├── src/agenticorg/ AgenticOrg client (question generation for Pelton)
│   ├── src/voice/      signed session URL and text-to-speech for replies
│   └── src/http/       request logging, exception filter, rate limiter
├── frontend/           Next.js 16 (App Router), React 19, Tailwind v4
│   ├── app/            landing, login, dashboard, lab and viva routes
│   ├── components/     lab pages, 3D scenes, voice assistant, message box, viva UI
│   └── lib/            API client, voice tools per lab, Firebase setup
├── docs/               voice-agent-setup.md
├── tools/pelton/       script that builds the Pelton 3D model
└── presentations/      pitch material
```

| Provider | Used for | Configured by |
|---|---|---|
| Wispr Flow | The student's dictated input (desktop app, outside this repo) | The student's own install |
| ElevenLabs | Agent conversation (text-only session) and spoken replies | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, optional `ELEVENLABS_VOICE_ID` |
| Groq | Question generation and marking | `GROQ_API_KEY`, optional `GROQ_MODEL` |
| AgenticOrg | Optional Pelton question generation | `AGENTIC_ORG_KEY`, `AGENTICORG_VIVA_AGENT_ID` |
| Firebase Authentication | Google sign-in | `FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_*` |
| Neon Postgres | All app data | `DATABASE_URL` |
| Render | Hosting | Render dashboard |

How a spoken turn flows: Wispr Flow types into the message box → the app sends the text to the ElevenLabs agent over a text-only session → the agent replies and may call lab tools (the app runs them in the browser) → each reply is sent to `POST /voice/speak` and played back.

---

## Environment variables

Set these in `backend/.env` locally and in the Render dashboard for each service. Never commit real values; `.env` files are gitignored.

### Backend

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string. |
| `FIREBASE_PROJECT_ID` | for Google sign-in | Used to verify ID tokens. No service-account key needed. |
| `FRONTEND_ORIGIN` / `FRONTEND_URL` | for CORS and links | The frontend origin, for example `http://localhost:3100`. |
| `GROQ_API_KEY` | for AI questions and marking | Without it, questions fall back to templates and explain answers stay pending review. |
| `GROQ_MODEL` | no | Defaults to `openai/gpt-oss-120b`. |
| `AGENTIC_ORG_KEY`, `AGENTICORG_VIVA_AGENT_ID` | no | Enable the AgenticOrg path for Pelton questions. |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` | for voice | Agent session and speech. |
| `ELEVENLABS_VOICE_ID` | no | Voice for spoken replies. Defaults to the agent's voice. |
| `SESSION_COOKIE` | no | `true` enables httpOnly cookie sessions. Default is bearer tokens only. |
| `SEED_DEMO_ACCOUNTS` | no | `true` locally creates the demo student `student@simvaya.lab`. |
| `PORT` | no | Defaults to 3001. |

### Frontend

| Name | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Backend base URL. |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | for Google sign-in | Firebase web config (public). |

`NEXT_PUBLIC_*` values are baked in at build time. Redeploy the frontend after changing them.

---

## Run it locally

Requirements: Node.js 24, npm, and a Postgres database (Neon works).

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

Create `backend/.env` and `frontend/.env.local` from the tables above. For a first run: `DATABASE_URL`, `SEED_DEMO_ACCOUNTS=true`, `FRONTEND_ORIGIN=http://localhost:3100` in the backend, and `NEXT_PUBLIC_API_URL=http://localhost:3001` in the frontend.

```bash
cd backend && npm run start:dev          # API on :3001, creates tables on startup
cd frontend && npm run dev -- -p 3100    # web on :3100
```

Open http://localhost:3100 and sign in with the demo student. To use Wispr Flow, install the desktop app, focus the assistant's message box, hold your Wispr key and speak.

---

## Deploy

Two Render web services, both Node 24, both auto-deploying from the `whisprflow` branch:

| Service | Build | Start |
|---|---|---|
| `simvaya-wisprflow-api` | `cd backend && npm ci && npm run build` | `cd backend && node dist/main.js` |
| `simvaya-wisprflow-web` | `cd frontend && npm ci && npm run build` | `cd frontend && npm start -- -H 0.0.0.0 -p $PORT` |

Checklist:
- API env: `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `FRONTEND_ORIGIN`.
- Web env: the four `NEXT_PUBLIC_FIREBASE_*` values and `NEXT_PUBLIC_API_URL`.
- Firebase console → Authentication → Settings → Authorized domains must include `simvaya-wisprflow-web.onrender.com`.
- The free Render plan sleeps when idle. Open the site a few minutes before a demo.

`docs/voice-agent-setup.md` covers the ElevenLabs agent configuration.

---

## Tests

| What | Command |
|---|---|
| Backend unit tests (physics, grading, viva generation for every lab, auth, rate limiter, log redaction, content drift guard) | `cd backend && npm test` |
| Frontend voice and wiring logic | `cd frontend && node --experimental-strip-types --test lib/*.test.ts lib/zener/*.test.ts` |
| Type checks | `npx tsc --noEmit -p tsconfig.json` in `backend/` and `frontend/` |
| API smoke check (no vivas created, no ElevenLabs or Groq calls) | `API_URL=https://<api-host> node backend/scripts/smoke.mjs` |
| Web smoke check | `BASE_URL=https://<web-host> node frontend/scripts/smoke.mjs` |

---

## Limits and known gaps

- **Rate limits** per signed-in user: speech 40 a minute and 400 an hour, signed URL 10 a minute, starting a self-assessment 5 per 10 minutes and 20 a day. Over the limit the API returns 429 with `Retry-After`. Counts are in memory, so each API instance has its own budget.
- **Wispr Flow sends nothing by itself.** The student presses Enter after dictating.
- **Induction voice:** `set_pump` starts the motor only when supply is on, all safety checks are done, the emergency stop is clear and the rig is not paused. `explode_model` opens a cutaway.
- **AgenticOrg** question generation covers the Pelton wheel only. Other labs use Groq, then templates.
- **Lab text** for Zener and sorting exists in both the frontend and the backend. A test fails if they drift apart.
- **Teacher legacy:** the `vivas.teacher_id` column keeps its name. A migration script exists in `backend/scripts/` and has not been run.
- **Cookie sessions** are built but off by default; across two different `onrender.com` sites some browsers block third-party cookies.
- **Marking** of explain answers needs `GROQ_API_KEY`; without it they stay pending review.
- **Free-tier cold starts** can delay the first request after idle.

---

## Contributing

Work on a branch, keep changes small, and run both type checks and the relevant tests before pushing. Do not commit `.env` files or API keys.
