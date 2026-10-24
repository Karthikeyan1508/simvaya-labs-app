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

// The parts of one lab. Ids can repeat across labs (shaft, ammeter), so each question is checked against its own lab.
export interface PartTable {
  labels: Record<string, string>;
  aliases: Record<string, string[]>;
}

export const PELTON_PARTS: PartTable = {
  labels: Object.fromEntries(PELTON_WHEEL.components.map((c) => [c.id, c.label])),
  aliases: PART_ALIASES,
};

export const isPartId = (id: unknown, parts: PartTable = PELTON_PARTS): id is string =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(parts.labels, id);

export const partLabel = (id: string, parts: PartTable = PELTON_PARTS) => parts.labels[id] ?? id;
