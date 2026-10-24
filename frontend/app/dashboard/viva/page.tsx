import { StudentVivaList } from '@/components/viva/student-viva-list';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function VivaPage() {
  return <StudentVivaList />;
}
