import { DemoLabs } from '@/components/dashboard/demo';

// Content depends on the signed-in user, so there is no static shell to validate for instant navigation.
export const instant = false;

export default function DemoPage() {
  return <DemoLabs />;
}
