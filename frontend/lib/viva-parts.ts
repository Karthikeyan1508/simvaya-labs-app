import { getExperiment } from './api';
import { getInductionExperiment } from './induction-api';
import type { ComponentInfo } from './types';
import { ZENER_PARTS } from './zener/content';

// The rig parts an oral viva can ask about, per experiment. Sorting has no rig parts to point at.
export async function labParts(experimentId: string): Promise<ComponentInfo[]> {
  switch (experimentId) {
    case 'pelton-wheel':
      return (await getExperiment()).components;
    case 'induction-motor':
      return (await getInductionExperiment()).components;
    case 'zener-regulator':
      return ZENER_PARTS;
    default:
      return [];
  }
}
