import { PELTON_WHEEL } from '../experiments/pelton-wheel/pelton-wheel.content';

// Grading only. Extra names a student may type for each part in a highlight question. Never sent to students.
export const PART_ALIASES: Record<string, string[]> = {
  base: ['base', 'base frame', 'sump'],
  pump: ['pump', 'centrifugal pump'],
  penstock: ['penstock', 'penstock pipe', 'pipe'],
  venturi: ['venturi', 'venturimeter', 'venturi meter', 'manometer'],
  gauge_p1: ['gauge p1', 'p1 gauge', 'p1', 'throat gauge'],
  gauge_p2: ['gauge p2', 'p2 gauge', 'p2', 'inlet gauge'],
  gauge_p3: ['gauge p3', 'p3 gauge', 'p3', 'penstock gauge'],
  frame: ['support frame', 'gauge board', 'chrome rods', 'rods'],
  nozzle: ['nozzle', 'jet nozzle'],
  spear: ['spear', 'needle valve', 'spear valve'],
  runner: ['runner', 'pelton runner', 'wheel', 'buckets', 'bucket'],
  casing: ['casing', 'turbine casing', 'housing'],
  shaft: ['shaft'],
  brake_drum: ['brake drum', 'drum', 'brake'],
  rope: ['rope', 'brake rope', 'wire rope'],
  deadweights: ['dead weights', 'dead weight', 'deadweights', 'hanger', 'weights'],
  spring: ['spring', 'spring balance'],
  tacho: ['tacho', 'tachometer', 'speed meter', 'rev counter'],
};

const PART_IDS = new Set(PELTON_WHEEL.components.map((c) => c.id));

export const isPartId = (id: unknown): id is string => typeof id === 'string' && PART_IDS.has(id);

export const partLabel = (id: string) => PELTON_WHEEL.components.find((c) => c.id === id)?.label ?? id;
