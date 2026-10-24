import { VivaDetail } from '@/components/viva/viva-detail';

export const instant = false;

export default async function TeacherVivaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VivaDetail id={id} />;
}
