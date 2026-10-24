import { RequireSession } from '@/components/app/session-provider';
import { ZenerLab } from '@/components/zener/zener-lab';

// Signed-in lab, like the other experiments, so visits are logged and the lab shell is the same.
export const instant = false;

export default function ZenerRegulatorPage() {
  return (
    <RequireSession>
      <ZenerLab />
    </RequireSession>
  );
}
