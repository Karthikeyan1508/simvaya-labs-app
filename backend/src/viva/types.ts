export const VIVA_KINDS = ['explain', 'mcq', 'point', 'step', 'highlight', 'calc', 'graph', 'formula'] as const;
export type VivaKind = (typeof VIVA_KINDS)[number];
export type VivaStatus = 'draft' | 'published' | 'closed';
export const EXPERIMENT_IDS = ['pelton-wheel'] as const;

// Holds the answer key. Only the server reads it; students get StudentQuestion.
export interface DraftQuestion {
  id?: number;
  kind: VivaKind;
  prompt: string;
  points: number;
  options?: string[];
  answer?: number;
  partId?: string;
  step?: number;
  expected?: number;
  tolerance?: number;
  unit?: string;
  graph?: { x: number[]; y: number[]; xLabel: string; yLabel: string; peakX?: number };
  explanation?: string;
  source?: 'template' | 'ai' | 'manual';
}

// A saved question, always with its id.
export type Question = DraftQuestion & { id: number };

// Student view. No answer key.
export interface StudentQuestion {
  id: number;
  kind: VivaKind;
  prompt: string;
  points: number;
  options?: string[];
  unit?: string;
  graph?: { x: number[]; y: number[]; xLabel: string; yLabel: string };
  highlightPartId?: string;
}

// The answer payload a student sends, by kind. Stored as JSON.
export type StoredAnswer =
  | { text: string }
  | { option: number }
  | { partId: string }
  | { step: number }
  | { value: number };
