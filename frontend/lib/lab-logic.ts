import type { ViewName } from '@/components/pelton/views';
import type { RigState } from '@/lib/types';

// Camera view for each procedure step (index = step - 1).
export const STEP_VIEW: ViewName[] = [
  'nozzle',
  'front',
  'front',
  'brake',
  'gauges',
  'brake',
  'brake',
  'venturi',
  'iso',
];

export const VIEW_LABEL: Record<ViewName, string> = {
  iso: 'Iso',
  front: 'Front',
  side: 'Side',
  top: 'Top',
  nozzle: 'Nozzle',
  gauges: 'Gauges',
  brake: 'Brake',
  venturi: 'Venturi',
};

export const HANGER_KG = 1; // T0, matches backend constant

// Steps the rig state can confirm by itself. The rest are ticked by hand.
export function autoDone(index: number, s: RigState, rowCount: number): boolean {
  switch (index) {
    case 1: // start the pump
      return s.pumpOn;
    case 2: // water turns the runner
      return s.speedRpm > 0;
    case 4: // read the gauges
      return s.pumpOn;
    case 5: // load the turbine
    case 6: // note the dead weights
      return s.deadWeightKg > 0;
    case 7: // note the head level
      return s.pumpOn;
    case 8: // repeat for more loads
      return rowCount >= 3;
    default:
      return false;
  }
}
