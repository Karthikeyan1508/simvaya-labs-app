'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { call, clearToken, saveToken, type User } from '@/lib/account';
import { useSession } from '@/components/app/session-provider';

// Google sign-in lands here with the session token in the URL fragment. Store it, load the user, go in.
export default function GoogleCallbackPage() {
  const router = useRouter();
  const { signIn } = useSession();

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', '/auth/callback'); // keep the token out of the address bar
    if (!token) {
      router.replace('/login?error=google-token');
      return;
    }
    saveToken(token);
    call<User>('/auth/me')
      .then((user) => {
        signIn(token, user);
        router.replace(user.role === 'teacher' ? '/teacher' : '/dashboard');
      })
      .catch(() => {
        clearToken();
        router.replace('/login?error=google-token');
      });
  }, [router, signIn]);

  return <p className="p-8 text-sm text-muted-foreground">Signing you in…</p>;
}
