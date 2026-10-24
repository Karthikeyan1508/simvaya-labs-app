import { TeacherVivaList } from '@/components/viva/teacher-viva-list';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function TeacherPage() {
  return <TeacherVivaList />;
}
