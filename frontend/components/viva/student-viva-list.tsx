'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { SubmittedVivaList } from './submitted-viva-list';
import { errorMessage, listSubmittedVivas, type SubmittedViva } from '@/lib/viva';

// The student's finished oral self-assessments. Starting one is done from the experiment page.
export function StudentVivaList() {
  const [vivas, setVivas] = useState<SubmittedViva[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listSubmittedVivas()
      .then(setVivas)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Viva"
        description="Your finished oral self-assessments. Open one to see the transcript and the feedback."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!vivas && !error && <p className="text-sm text-muted-foreground">Loading vivas…</p>}
      {vivas?.length === 0 && (
        <div className="glass rounded-lg p-8 text-center">
          <p className="font-medium">No finished vivas yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Start one in the Oral self-assessment section of any lab.
          </p>
        </div>
      )}
      {vivas && vivas.length > 0 && <SubmittedVivaList vivas={vivas} />}
    </div>
  );
}
