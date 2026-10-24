import { AppShell } from '@/components/app/app-shell';
import { RequireSession } from '@/components/app/session-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  );
}
