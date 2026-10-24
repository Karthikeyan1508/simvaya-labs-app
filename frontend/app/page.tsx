import { Landing } from '@/components/landing/landing';

// Visitors and signed-in users both see the landing page. The calls to action follow the session.
export const instant = false;

export default function Home() {
  return <Landing />;
}
