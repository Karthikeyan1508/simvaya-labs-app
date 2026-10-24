// The formulas are in the product as code, so the page shows the same kind of lines.
const LINES = [
  { text: '// Power from the readings, in watts', tone: 'muted' },
  { text: 'const power = voltage * current;', tone: 'code' },
  { text: '// Efficiency: output power over input power', tone: 'muted' },
  { text: 'const efficiency = (outputPower / inputPower) * 100;', tone: 'accent' },
] as const;

export function CodeBand() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-32 md:px-10">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="text-sm font-medium text-primary">Under the hood</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-6xl">
            The physics is <span className="text-gradient-orange">code you can read.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            No black box. Each number on the screen comes from a formula you can open and check.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-[0_30px_80px_-40px_rgb(0_0_0/0.4)]">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="num ml-3 text-xs text-muted-foreground">lab.physics.ts</span>
          </div>
          <pre className="num space-y-2 overflow-x-auto p-6 text-[13px] leading-relaxed md:text-sm">
            {LINES.map((l) => (
              <span
                key={l.text}
                className={`block whitespace-pre ${
                  l.tone === 'muted'
                    ? 'text-muted-foreground'
                    : l.tone === 'accent'
                      ? 'text-gradient-orange font-semibold'
                      : 'text-foreground'
                }`}
              >
                {l.text}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
