import { RequireSession } from '@/components/app/session-provider';
import { SortingLab } from '@/components/sorting/sorting-lab';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function SortingVisualiserPage() {
  return (
    <RequireSession>
      <SortingLab />
    </RequireSession>
  );
}
