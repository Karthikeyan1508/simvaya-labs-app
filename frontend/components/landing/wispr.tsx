import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const STEPS = [
  { n: '01', title: 'Speak', body: 'Focus the message box, hold your Wispr Flow key and talk. Your words land there as clean text.' },
  { n: '02', title: 'The lab acts', body: 'The pump starts, controls move and the parts being explained glow on the rig.' },
  { n: '03', title: 'It talks back', body: 'Only the assistant’s replies are spoken, so the app never asks for your microphone.' },
];

// Why this build is voice-first. Shown to visitors who have not opened a lab yet.
export function Wispr({ href }: { href: string }) {
  return (
    <section id="voice" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-32 md:px-10">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <p className="text-sm font-medium text-primary">Voice first</p>
          <h2 className="mt-4 text-5xl leading-[0.95] font-semibold tracking-[-0.035em] md:text-7xl">
            Built to be spoken to, <span className="text-gradient-orange">with Wispr Flow.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Ask the lab assistant a question, or answer the examiner in the oral viva, just by talking. Wispr Flow turns
            your speech into text, and the lab answers out loud.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={href} className={buttonVariants({ size: 'lg' })}>
              Try the live demo
              <ArrowRight />
            </Link>
            <span className="text-sm text-muted-foreground">Wispr Flow runs on your desktop. Typing works too.</span>
          </div>
        </div>

        <ol className="grid gap-4">
          {STEPS.map((s) => (
            <li key={s.n} className="surface-gradient flex gap-6 rounded-lg border border-border/60 p-7">
              <span className="num text-sm text-primary">{s.n}</span>
              <div className="space-y-2">
                <h3 className="text-2xl leading-tight font-semibold tracking-tight">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
