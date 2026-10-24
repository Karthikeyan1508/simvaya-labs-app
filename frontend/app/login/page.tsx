import { LoginForm } from '@/components/auth/login-form';
import { ShaderBackground } from '@/components/lab/shader-background';

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <ShaderBackground />

      <section className="relative z-10 hidden flex-col justify-between p-12 lg:flex">
        <p className="text-sm text-muted-foreground">For engineering colleges</p>
        <div className="max-w-lg space-y-5">
          <h2 className="text-5xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
            Hands-on labs that run on any laptop.
          </h2>
          <p className="text-[17px] leading-relaxed text-muted-foreground">
            Operate real rigs in 3D, follow the lab sheet step by step, and keep every reading in one place.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Simulation readings are approximate and not calibrated.</p>
      </section>

      <section className="relative z-10 flex items-center justify-center p-6 md:p-12">
        <div className="glass w-full max-w-md rounded-xl p-8 md:p-10">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
