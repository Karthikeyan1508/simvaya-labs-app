# Voice assistant setup (ElevenLabs)

The Pelton lab page has an "Ask the assistant" button. It opens a voice session with an ElevenLabs Conversational AI agent. At the start of each session the app sends the lab content (aim, theory, parts and procedure) as the system prompt, and sends the opening line. The agent drives the 3D model through client tools: it can explode and reassemble the rig, select and highlight parts, change the camera, set the pump, nozzle and procedure step, and read the current numbers.

The API key stays on the server. The browser asks the backend for a signed URL (`GET /voice/signed-url`, login required) and connects to ElevenLabs with it.

## 1. Create the agent

1. In the ElevenLabs dashboard, create a Conversational AI agent. Set its language to English.
2. Voice: choose the voice in the agent's Voice settings. The app does not override the voice, so the dashboard choice is what the student hears. Pick a clear English voice at a moderate pace.
3. First message: paste the text in section 3.
4. System prompt: paste the fallback in section 4. The app replaces it with the full lab content at session start.
5. Overrides: in the agent's security settings, enable overrides for the **first message** and the **system prompt**. The app sends both at session start. With overrides off, the session may be refused or the agent falls back to the dashboard text, which has no lab content.
6. Client tools: add the twelve tools in section 5. Each tool must be set to **block the conversation**, so the agent waits for the tool's result before it speaks. Look for the wait or blocking option in each tool's settings (the label varies by dashboard version). If a tool is not blocking, the agent may answer before the model has moved.
7. Copy the agent ID from the agent's page. You need it for `ELEVENLABS_AGENT_ID`.

## 2. Environment variables

Backend (`backend/`), server only:

| Variable | Value |
|---|---|
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key. Keep it out of the repo and out of any frontend variable. |
| `ELEVENLABS_AGENT_ID` | The agent ID from step 7. |

If either variable is missing, `GET /voice/signed-url` returns `503` and the lab shows a "not set up" message.

Frontend: nothing new. The app uses `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) as before.

## 3. First message

```
Hello, I'm your lab assistant for the Pelton turbine. Do you have any doubts about the apparatus or the procedure?
```

## 4. System prompt (dashboard fallback)

The app sends a fuller prompt with the lab content at each session start. Paste this as the dashboard default:

```
You are the lab assistant for the Simvaya virtual lab. The student is working on the experiment "Performance characteristics of a Pelton turbine".
After your greeting, ask whether the student has doubts about the apparatus or the procedure, then listen.
Keep answers short: two to four sentences unless they ask for more.
When you discuss a part, show it: call focus_part for one part, or highlight_parts for several. Call set_view for an angle.
For facts about one part, call explain_part. For the principle, venturi, efficiency, load or procedure, call explain_topic. Do not make up numbers.
For current numbers, call read_readings.
If you pulled the parts apart to explain them, call reassemble_model before you move on.
Change the pump, the nozzle or the procedure step only when the student asks.
Use they/them for the student unless they tell you otherwise.
```

## 5. Client tools

Create each tool as a **client tool** with the name, description and parameters below. Every tool must block the conversation (section 1, step 6). Each tool returns a short sentence the agent reads back.

Part ids used by the tools: `base`, `pump`, `penstock`, `venturi`, `gauge_p1`, `gauge_p2`, `gauge_p3`, `frame`, `nozzle`, `spear`, `runner`, `casing`, `shaft`, `brake_drum`, `rope`, `deadweights`, `spring`, `tacho`.

### explode_model

Description: Pull the parts of the turbine model apart. 0 is assembled, 1 is fully exploded. Call reassemble_model to put them back.

```json
{
  "type": "object",
  "properties": {
    "amount": { "type": "number", "minimum": 0, "maximum": 1, "description": "How far apart the parts move, 0 to 1. Default 0.5." }
  },
  "required": []
}
```

### reassemble_model

Description: Put the parts of the turbine model back together.

```json
{ "type": "object", "properties": {}, "required": [] }
```

### focus_part

Description: Select one part of the model, label it and frame it in the camera.

```json
{
  "type": "object",
  "properties": {
    "partId": { "type": "string", "enum": ["base", "pump", "penstock", "venturi", "gauge_p1", "gauge_p2", "gauge_p3", "frame", "nozzle", "spear", "runner", "casing", "shaft", "brake_drum", "rope", "deadweights", "spring", "tacho"], "description": "The part to select." }
  },
  "required": ["partId"]
}
```

### highlight_parts

Description: Highlight several parts of the model. Replaces any earlier highlight, including the procedure step's highlight.

```json
{
  "type": "object",
  "properties": {
    "partIds": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "enum": ["base", "pump", "penstock", "venturi", "gauge_p1", "gauge_p2", "gauge_p3", "frame", "nozzle", "spear", "runner", "casing", "shaft", "brake_drum", "rope", "deadweights", "spring", "tacho"] },
      "description": "The parts to highlight."
    }
  },
  "required": ["partIds"]
}
```

### clear_highlight

Description: Remove the highlight from the model. The procedure step's highlight comes back.

```json
{ "type": "object", "properties": {}, "required": [] }
```

### set_view

Description: Move the camera to a preset view.

```json
{
  "type": "object",
  "properties": {
    "view": { "type": "string", "enum": ["iso", "front", "side", "top"], "description": "The camera preset." }
  },
  "required": ["view"]
}
```

### explain_part

Description: Return the label, description and specifications of one part. Use it for facts, then say them in your own words.

```json
{
  "type": "object",
  "properties": {
    "partId": { "type": "string", "enum": ["base", "pump", "penstock", "venturi", "gauge_p1", "gauge_p2", "gauge_p3", "frame", "nozzle", "spear", "runner", "casing", "shaft", "brake_drum", "rope", "deadweights", "spring", "tacho"], "description": "The part to explain." }
  },
  "required": ["partId"]
}
```

### read_readings

Description: Return the current pump state, nozzle opening, shaft speed, pressures and load.

```json
{ "type": "object", "properties": {}, "required": [] }
```

### set_pump

Description: Turn the pump on or off.

```json
{
  "type": "object",
  "properties": {
    "on": { "type": "boolean", "description": "true to start the pump, false to stop it." }
  },
  "required": ["on"]
}
```

### set_nozzle

Description: Set the nozzle opening. 1 is 1/8 open, 8 is fully open (8/8).

```json
{
  "type": "object",
  "properties": {
    "step": { "type": "integer", "minimum": 1, "maximum": 8, "description": "Nozzle opening, 1 to 8." }
  },
  "required": ["step"]
}
```

### go_to_step

Description: Jump to a procedure step (1 to 9). Shows the step's camera view and set-up.

```json
{
  "type": "object",
  "properties": {
    "step": { "type": "integer", "minimum": 1, "maximum": 9, "description": "Procedure step, 1 to 9." }
  },
  "required": ["step"]
}
```

### explain_topic

Description: Return the canonical text for one topic of the experiment.

```json
{
  "type": "object",
  "properties": {
    "topic": { "type": "string", "enum": ["principle", "venturi", "efficiency", "load", "procedure"], "description": "The topic to explain." }
  },
  "required": ["topic"]
}
```

## 6. Voice choice

Set the voice in the agent's Voice settings in the dashboard. The app sends no voice override. If you later want the app to choose the voice, add `overrides.tts.voiceId` in `frontend/components/voice/voice-assistant.tsx` and enable the voice override in the dashboard.

## 7. Test it

1. Set `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in the backend environment, then start the backend (`npm run start` in `backend/` after a build, or the dev script).
2. Start the frontend (`npm run dev` in `frontend/`). The lab is at `/experiments/pelton-wheel`.
3. Sign in, open the Pelton lab, click "Ask the assistant" and allow the microphone.
4. You should hear the greeting. Ask, for example, "What does the venturimeter do?" The agent should call `explain_part` or `focus_part`, and the model should frame the venturi.
5. Ask it to explode the model, then to put it back together. The explode slider should move and then return.
6. Developer check without a microphone: in the browser console of `next dev`, run `simvayaVoiceTools.explode_model({ amount: 1 })`, `simvayaVoiceTools.highlight_parts({ partIds: ["venturi"] })` or `simvayaVoiceTools.reassemble_model()`. The handlers are exposed only outside production builds.

## 8. Troubleshooting

| Message in the lab | Cause and fix |
|---|---|
| "not set up on this server" | `ELEVENLABS_API_KEY` or `ELEVENLABS_AGENT_ID` is missing in the backend environment. |
| "Sign in to use the assistant" | The session token is missing or expired. Sign in again. |
| "Microphone access is blocked" | Allow the microphone for the site in the browser settings, then click the button again. |
| Agent answers before the model moves | A client tool is not set to block the conversation. Turn on the wait option for that tool. |
| Agent has no Pelton knowledge | Overrides for the first message or system prompt are off. Enable them in the agent's security settings. |
