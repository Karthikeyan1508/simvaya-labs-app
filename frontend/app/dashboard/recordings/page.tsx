import { Recordings } from '@/components/dashboard/recordings';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function RecordingsPage() {
  return <Recordings />;
}
