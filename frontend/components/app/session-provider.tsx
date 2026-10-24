'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, fetchMe, getToken, logout as logoutRequest, saveToken, type User } from '@/lib/account';

type Status = 'loading' | 'authed' | 'anonymous';

interface SessionValue {
  status: Status;
  user: User | null;
  signIn: (token: string, user: User) => void;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

// Holds the signed-in user for the whole app. Checks the stored token once on load.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    fetchMe()
      .then((u) => {
        setUserState(u);
        setStatus('authed');
      })
      .catch(() => {
        clearToken();
        setStatus('anonymous');
      });
  }, []);

  const signIn = useCallback((token: string, u: User) => {
    saveToken(token);
    setUserState(u);
    setStatus('authed');
  }, []);

  const signOut = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    clearToken();
    setUserState(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const value = useMemo<SessionValue>(
    () => ({ status, user, signIn, signOut, setUser: setUserState }),
    [status, user, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

// Renders children only for a signed-in user. Anonymous visitors go to the login page.
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          Loading your workspace
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
