import { RequireSession } from '@/components/app/session-provider';
import { LabPage } from '@/components/lab/lab-page';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function PeltonWheelPage() {
  return (
    <RequireSession>
      <LabPage />
    </RequireSession>
  );
}
