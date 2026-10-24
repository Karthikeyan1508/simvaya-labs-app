import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_LABEL, type VivaStatus } from '@/lib/viva';

const TONE: Record<VivaStatus, string> = {
  draft: 'bg-foreground/[0.06] text-muted-foreground',
  published: 'bg-primary/15 text-primary',
  closed: 'bg-foreground/10 text-foreground',
};

export function StatusBadge({ status }: { status: VivaStatus }) {
  return <Badge className={cn('rounded-md border-0 font-medium', TONE[status])}>{STATUS_LABEL[status]}</Badge>;
}

export function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
