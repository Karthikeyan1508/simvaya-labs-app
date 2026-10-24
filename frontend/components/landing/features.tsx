const FEATURES = [
  {
    title: 'Four engineering labs',
    body: 'Pelton wheel, induction motor, Zener regulator and sorting. Change the inputs, take readings, check the result.',
    tags: ['PELTON', 'INDUCTION', 'ZENER', 'SORTING'],
  },
  {
    title: 'A voice assistant',
    body: 'Speak to the assistant while you work. It can change the settings and move you to the next step.',
    tags: ['VOICE', 'SETTINGS', 'STEPS'],
  },
  {
    title: 'Oral viva',
    body: 'The assistant asks the questions out loud and keeps a transcript of your answers.',
    tags: ['ORAL', 'TRANSCRIPT', 'PRACTICE'],
  },
  {
    title: 'Recordings you can review',
    body: 'Readings and attempts are saved to your account, so you can look back at them later.',
    tags: ['RECORDINGS', 'READINGS', 'ATTEMPTS'],
  },
];

// Cards show by default. Where the browser supports scroll-driven animation they rise in as they enter (globals.css).
export function Features() {
  return (
    <section id="labs" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-32 md:px-10">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-48 lg:self-start">
          <p className="text-sm font-medium text-primary">What is inside</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-7xl">
            Labs, vivas and records <span className="text-gradient-orange">in one place.</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="surface-gradient flex min-h-72 flex-col justify-between rounded-lg border border-border/60 p-8"
            >
              <div className="space-y-3">
                <h3 className="text-2xl leading-tight font-semibold tracking-tight">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-1.5">
                {f.tags.map((t) => (
                  <span
                    key={t}
                    className="num rounded-md border border-border px-2 py-1 text-[11px] tracking-wide text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
