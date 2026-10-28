'use client';

import { useEffect, useState } from 'react';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import { abandonViva, errorMessage, listMyVivas, startSelfAssessment } from '@/lib/viva';
import { VivaAttempt } from './viva-attempt';

const LAB_NAMES: Record<string, string> = {
  'pelton-wheel': 'the Pelton wheel',
  'induction-motor': 'the three-phase induction motor',
  'zener-regulator': 'the Zener voltage regulator',
  'sorting-visualiser': 'the sorting algorithm visualiser',
};

// Lab section for students only (the lab page hides it for others). The oral viva runs on this page, not in the viva list.
export function OralSelfAssessment({ experimentId }: { experimentId: string }) {
  const [vivaId, setVivaId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  // An unfinished viva for this lab (for example after a reload) carries on here.
  useEffect(() => {
    listMyVivas()
      .then((vivas) => {
        const open = vivas.find((v) => v.experimentId === experimentId && v.myAttempt?.status !== 'submitted');
        if (open) setVivaId(open.id);
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  // Generating can take up to about a minute when the AI services are slow.
  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await startSelfAssessment(experimentId);
      setVivaId(res.id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const abandon = async () => {
    if (vivaId === null) return;
    setBusy(true);
    setError('');
    try {
      await abandonViva(vivaId);
      setVivaId(null);
      setConfirming(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const abandonUi = (
    <div className="flex flex-wrap items-center gap-3">
      {confirming ? (
        <>
          <span className="text-sm text-muted-foreground">Delete this unfinished attempt?</span>
          <Button variant="destructive" size="sm" onClick={abandon} disabled={busy}>
            Yes, abandon
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
            Keep it
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          Abandon and start again
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <SectionHead
        title="Oral self-assessment"
        subtitle="Answer the examiner about this lab, by dictation or typing. Your score and feedback appear here when you finish."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {vivaId === null ? (
        <div className="max-w-2xl space-y-5">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            The examiner asks about {LAB_NAMES[experimentId]}: its theory, the procedure and what you observed. Writing
            the questions can take up to a minute.
          </p>
          <Button onClick={start} disabled={busy}>
            {busy ? 'Writing your questions…' : 'Start self-assessment'}
          </Button>
        </div>
      ) : (
        <VivaAttempt id={String(vivaId)} onExit={() => setVivaId(null)} unfinishedExtra={abandonUi} />
      )}
    </div>
  );
}
