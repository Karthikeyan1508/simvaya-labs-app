import { VivaAttempt } from '@/components/viva/viva-attempt';

export const instant = false;

export default async function StudentVivaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VivaAttempt id={id} />;
}
