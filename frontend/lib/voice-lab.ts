// What every lab shares with the voice assistant: the parts the agent can name, the prompt, and the tool names.
// Each lab has its own bridge (the state and setters its tools use) and its own tool set, but all of them answer the
// same tool names, because the ElevenLabs agent has one fixed set of client tools.

export interface VoicePart {
  id: string;
  label: string;
  description: string;
  specs: string[];
}

// The part of a lab that the voice panel reads. A lab's bridge extends it with its own state and setters.
export interface VoiceLabBridge {
  parts: VoicePart[] | null; // null while the lab content loads
  prompt: string | null; // the agent's system prompt for this lab; null while the content loads
  firstMessage: string;
  setVoiceHighlight: (ids: string[] | null) => void;
}

export type VoiceToolName =
  | 'explode_model'
  | 'reassemble_model'
  | 'focus_part'
  | 'highlight_parts'
  | 'clear_highlight'
  | 'set_view'
  | 'explain_part'
  | 'read_readings'
  | 'set_pump'
  | 'set_nozzle'
  | 'go_to_step'
  | 'explain_topic'
  | 'set_control';

export type VoiceToolHandler = (params: Record<string, unknown>) => string;
export type VoiceTools = Record<VoiceToolName, VoiceToolHandler>;

// Builds one lab's tools. The handlers read the lab through the getter, so each call sees the latest state.
export type VoiceToolFactory<L extends VoiceLabBridge> = (get: () => L) => VoiceTools;

export const LOADING = 'The lab content is still loading. Ask again in a moment.';

// Handlers take the agent's arguments as they arrive, so every one is checked. The model sometimes sends 3.0 or "3".
export function num(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

// A whole number in range.
export function whole(v: unknown, min: number, max: number): number | null {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= min && r <= max ? r : null;
}

export function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 'on') return true;
  if (v === 'false' || v === 'off') return false;
  return null;
}

export function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

// The agent's control name, lower-cased with spaces as underscores, so "Supply Voltage" matches supply_voltage.
export const controlName = (v: unknown): string => str(v).toLowerCase().replace(/[\s-]+/g, '_');

export const isOneOf = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

export const partOf = (parts: VoicePart[] | null, id: string): VoicePart | undefined => parts?.find((c) => c.id === id);

// The known part ids in the order the agent gave them, without repeats.
export function partIds(parts: VoicePart[] | null, v: unknown): string[] {
  const ids = [...new Set((Array.isArray(v) ? v : []).map(str))];
  return ids.filter((id) => partOf(parts, id));
}

export function partText(c: VoicePart): string {
  return `${c.label}. ${c.description}${c.specs.length ? ` Specs: ${c.specs.join('; ')}.` : ''}`;
}

export function unknownPart(parts: VoicePart[] | null): string {
  return `Unknown part. Use one of: ${parts?.map((c) => c.id).join(', ') ?? ''}.`;
}
