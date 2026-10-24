'use client';

import { LogOut } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Block, PageHeader } from '@/components/app/page-header';
import { useSession } from '@/components/app/session-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { changePassword, updateProfile } from '@/lib/account';
import { cn } from '@/lib/utils';

type Notice = { ok: boolean; text: string };

export function AccountSettings() {
  const { signOut } = useSession();

  return (
    <div className="space-y-10">
      <PageHeader
        title="Settings"
        description="Keep your name and roll number up to date. Email, branch and semester come from your college."
      />

      <Tabs defaultValue="profile">
        <TabsList variant="line" className="w-full justify-start gap-6 rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="profile" className="flex-none px-0.5 text-sm">
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-none px-0.5 text-sm">
            Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="pt-8">
          <ProfileForm />
        </TabsContent>
        <TabsContent value="security" className="pt-8">
          <SecurityForm />
        </TabsContent>
      </Tabs>

      <Block title="Session" meta="This browser">
        <div className="flex max-w-2xl flex-wrap items-center justify-between gap-4 rounded-lg bg-card p-5">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">Ends your session on this browser.</p>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </Block>
    </div>
  );
}

function ProfileForm() {
  const { user, setUser } = useSession();
  const [form, setForm] = useState({
    name: user?.name ?? '',
    rollNo: user?.rollNo ?? '',
    college: user?.college ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!user) return null;

  const dirty = form.name !== user.name || form.rollNo !== user.rollNo || form.college !== user.college;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      setUser(await updateProfile(form));
      setNotice({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setNotice({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <dl className="grid gap-5 rounded-lg bg-card p-5 sm:grid-cols-3">
        {[
          ['Email', user.email],
          ['Branch', user.branch],
          ['Active semester', `Semester ${user.semester}`],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={submit} className="grid gap-6">
        <Field id="name" label="Full name">
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="roll" label="Roll number">
            <Input id="roll" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} />
          </Field>
          <Field id="college" label="College">
            <Input id="college" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
          </Field>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {notice && (
            <p className={cn('text-sm', notice.ok ? 'text-muted-foreground' : 'text-destructive')}>{notice.text}</p>
          )}
        </div>
      </form>
    </div>
  );
}

function SecurityForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && next.length >= 8 && next === confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setNotice({ ok: true, text: 'Password changed.' });
    } catch (err) {
      setNotice({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid max-w-md gap-6">
      <Field id="current" label="Current password">
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </Field>
      <Field id="next" label="New password" hint="At least 8 characters.">
        <Input
          id="next"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <Field
        id="confirm"
        label="Confirm new password"
        hint={mismatch ? 'Passwords do not match.' : undefined}
        error={mismatch}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={!ready || saving}>
          {saving ? 'Updating…' : 'Update password'}
        </Button>
        {notice && (
          <p className={cn('text-sm', notice.ok ? 'text-muted-foreground' : 'text-destructive')}>{notice.text}</p>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{hint}</p>}
    </div>
  );
}
