import { Award } from 'lucide-react';
import { Block, PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EXPERIMENT_TITLES } from '@/lib/account';

// Placeholder until the viva module is built. The layout is final; the values are not.
export const instant = false;

export default function ScoresPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Scores"
        description="Each experiment ends with a short oral self-assessment. Your scores appear here once it is marked."
      />

      <div className="flex items-center gap-5 rounded-lg bg-card p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground/[0.05] text-muted-foreground">
          <Award className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Viva results are in the Viva section</p>
          <p className="text-xs text-muted-foreground">
            Start a self-assessment on an experiment page. Finished ones are listed under Viva.
          </p>
        </div>
      </div>

      <Block title="Experiments" meta="Viva status">
        <div className="overflow-hidden rounded-lg bg-card">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">No.</TableHead>
                <TableHead>Experiment</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="num text-muted-foreground">08</TableCell>
                <TableCell className="font-medium">{EXPERIMENT_TITLES['pelton-wheel']}</TableCell>
                <TableCell className="num text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="rounded-md">
                    Not taken
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Block>
    </div>
  );
}
