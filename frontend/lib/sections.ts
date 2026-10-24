import {
  BookOpen,
  Box,
  Calculator,
  ClipboardCheck,
  GraduationCap,
  Library,
  ListOrdered,
  MessageSquare,
  Table2,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface SectionDef<T extends string> {
  id: T;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const SECTION_IDS = [
  'aim',
  'theory',
  'pretest',
  'procedure',
  'simulation',
  'calculations',
  'posttest',
  'references',
  'feedback',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTIONS: SectionDef<SectionId>[] = [
  { id: 'aim', label: 'Aim', hint: 'Objectives and apparatus', icon: Target },
  { id: 'theory', label: 'Theory', hint: 'Principle and equations', icon: BookOpen },
  { id: 'pretest', label: 'Pretest', hint: 'Quick check, 5 questions', icon: ClipboardCheck },
  { id: 'procedure', label: 'Procedure', hint: 'Nine steps to follow', icon: ListOrdered },
  { id: 'simulation', label: 'Simulation', hint: 'Operate the 3D rig', icon: Box },
  { id: 'calculations', label: 'Calculations', hint: 'Tables, formulas, graphs', icon: Calculator },
  { id: 'posttest', label: 'Posttest', hint: 'Check your learning', icon: GraduationCap },
  { id: 'references', label: 'References', hint: 'Sources', icon: Library },
  { id: 'feedback', label: 'Feedback', hint: 'Tell us what you think', icon: MessageSquare },
];

export const isSectionId = (v: string): v is SectionId => (SECTION_IDS as readonly string[]).includes(v);

export const SORT_SECTION_IDS = [
  'aim',
  'theory',
  'visualiser',
  'calculations',
  'graphs',
  'quiz',
  'references',
  'feedback',
] as const;

export type SortSectionId = (typeof SORT_SECTION_IDS)[number];

export const SORT_SECTIONS: SectionDef<SortSectionId>[] = [
  { id: 'aim', label: 'Aim', hint: 'Objectives and apparatus', icon: Target },
  { id: 'theory', label: 'Theory', hint: 'Partition and cost', icon: BookOpen },
  { id: 'visualiser', label: 'Visualiser', hint: 'Step through the sort', icon: Box },
  { id: 'calculations', label: 'Calculations', hint: 'Counts, formulas, runs', icon: Calculator },
  { id: 'graphs', label: 'Time complexity', hint: 'Work against input size', icon: TrendingUp },
  { id: 'quiz', label: 'Quiz', hint: 'Five questions', icon: ClipboardCheck },
  { id: 'references', label: 'References', hint: 'Sources', icon: Library },
  { id: 'feedback', label: 'Feedback', hint: 'Tell us what you think', icon: MessageSquare },
];

export const isSortSectionId = (v: string): v is SortSectionId =>
  (SORT_SECTION_IDS as readonly string[]).includes(v);

export const EEE_SECTION_IDS = [
  'aim',
  'theory',
  'procedure',
  'simulation',
  'observations',
  'graphs',
  'calculations',
  'viva',
  'references',
  'feedback',
] as const;

export type EeeSectionId = (typeof EEE_SECTION_IDS)[number];

export const EEE_SECTIONS: SectionDef<EeeSectionId>[] = [
  { id: 'aim', label: 'Aim', hint: 'Objectives and apparatus', icon: Target },
  { id: 'theory', label: 'Theory', hint: 'Principle and nameplate', icon: BookOpen },
  { id: 'procedure', label: 'Procedure', hint: 'Ten stages and safety', icon: ListOrdered },
  { id: 'simulation', label: 'Simulation', hint: 'Operate the motor', icon: Box },
  { id: 'observations', label: 'Observations', hint: 'Readings table and CSV', icon: Table2 },
  { id: 'graphs', label: 'Graphs', hint: 'Against output power', icon: TrendingUp },
  { id: 'calculations', label: 'Calculations', hint: 'Formulas for one row', icon: Calculator },
  { id: 'viva', label: 'Viva', hint: 'Check your understanding', icon: ClipboardCheck },
  { id: 'references', label: 'References', hint: 'Sources', icon: Library },
  { id: 'feedback', label: 'Feedback', hint: 'Tell us what you think', icon: MessageSquare },
];

export const isEeeSectionId = (v: string): v is EeeSectionId => (EEE_SECTION_IDS as readonly string[]).includes(v);
