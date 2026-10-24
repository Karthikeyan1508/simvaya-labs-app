import { RequireSession } from '@/components/app/session-provider';
import { LabInduction } from '@/components/induction/lab-induction';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function InductionMotorPage() {
  return (
    <RequireSession>
      <LabInduction />
    </RequireSession>
  );
}
