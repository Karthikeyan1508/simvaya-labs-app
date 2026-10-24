'use client';

import { ArrowRight, Droplets } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { googleSignIn, login } from '@/lib/account';
import { useSession } from '@/components/app/session-provider';

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await login(email.trim(), password);
      signIn(res.token, res.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.');
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await googleSignIn();
      signIn(res.token, res.user);
      router.replace('/dashboard');
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
          ? 'Google sign-in was cancelled.'
          : err instanceof Error
            ? err.message
            : 'Google sign-in failed. Try again.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 flex items-center gap-2.5">
        <span className="orange-gradient grid size-9 place-items-center rounded-md text-primary-foreground shadow-[0_10px_24px_-14px_rgba(217,119,6,0.9)]">
          <Droplets className="size-4" />
        </span>
        <span className="text-base font-semibold tracking-tight">Simvaya</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-[-0.025em]">Sign in</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Use your college email to open your labs.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@college.edu"
            className="h-10 bg-card px-3"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 bg-card px-3"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={busy} className="h-10 w-full justify-between px-4">
          {busy ? 'Signing in…' : 'Sign in'}
          <ArrowRight />
        </Button>
      </form>

      <div className="mt-8">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={busy}
          onClick={google}
        >
          Continue with Google
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">Forgot password? Ask your lab admin.</p>
    </div>
  );
}
