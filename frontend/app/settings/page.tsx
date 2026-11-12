'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch, clearSession } from '@/lib/api';

type Account = {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
};

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  standard: 'Standard',
  premium: 'Premium',
  business: 'Business',
  corporate: 'Corporate',
  starter: 'Standard',
  professional: 'Premium',
  enterprise: 'Corporate',
};

const inputClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500';
const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';
const cardClass = 'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6';
const buttonClass =
  'bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';

// Reads the error the server sends back, or a fallback message.
const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => ({}));
  return data.error || fallback;
};

function ProfileSection({ account, onSaved }: { account: Account; onSaved: (account: Account) => void }) {
  const [name, setName] = useState(account.name);
  const [email, setEmail] = useState(account.email);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch('/api/auth/me', { method: 'PATCH', json: { name, email } });
      if (!response.ok) throw new Error(await readError(response, 'Could not save your details'));
      const data = await response.json();
      localStorage.setItem('userName', data.user.name || '');
      onSaved(data.user);
      setMessage('Your details are saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardClass}>
      <h2 className="text-base font-semibold text-white">Your details</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">The name and email you use to sign in.</p>
      <form onSubmit={save} className="space-y-5">
        <div>
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-gray-300">{message}</p>}
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? 'Saving...' : 'Save details'}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch('/api/auth/password', {
        method: 'POST',
        json: { currentPassword, newPassword },
      });
      if (!response.ok) throw new Error(await readError(response, 'Could not change your password'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Your password has been changed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardClass}>
      <h2 className="text-base font-semibold text-white">Password</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">Use at least 8 characters.</p>
      <form onSubmit={save} className="space-y-5">
        <div>
          <label className={labelClass}>Current password</label>
          <input className={inputClass} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>New password</label>
          <input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        <div>
          <label className={labelClass}>Confirm new password</label>
          <input className={inputClass} type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-gray-300">{message}</p>}
        <button type="submit" disabled={saving} className={buttonClass}>
          {saving ? 'Changing...' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

type PaymentStatus = {
  connected: boolean;
  paymentsEnabled: boolean;
  state: 'not_started' | 'pending' | 'action_needed' | 'ready';
  items: string[];
};

// Lets the business take card payments from its customers. Payments go to its own bank through Stripe.
function PaymentsSection() {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await apiFetch('/api/connect/status');
    if (!response.ok) throw new Error(await readError(response, 'Could not check payment setup'));
    setStatus(await response.json());
  };

  useEffect(() => {
    // Stripe sends the owner back here with payments=done or payments=refresh.
    const returned = new URLSearchParams(window.location.search).get('payments');
    if (returned === 'done') setMessage('Thanks. Stripe is checking your details, which can take a few minutes.');
    if (returned === 'refresh') setMessage('Your Stripe sign-up was not finished. Carry on below.');
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not check payment setup'));
  }, []);

  const start = async () => {
    setStarting(true);
    setError('');
    try {
      const response = await apiFetch('/api/connect/onboard', { method: 'POST' });
      if (!response.ok) throw new Error(await readError(response, 'Could not start payment setup'));
      const data = await response.json();
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment setup');
      setStarting(false);
    }
  };

  const ready = Boolean(status?.paymentsEnabled);
  const state = status?.state ?? 'not_started';

  return (
    <div className={cardClass}>
      <h2 className="text-base font-semibold text-white mb-1">Payments</h2>
      <p className="text-sm text-gray-400 mb-5">
        Take card payments from your customers. The money goes straight to your bank through Stripe. Venture-Pro takes no fee on it.
      </p>

      {status === null && !error && <p className="text-sm text-gray-500">Checking your payment setup...</p>}
      {status && (
        <div className="text-sm mb-4 space-y-3">
          {state === 'ready' && <p className="text-emerald-400">Payments are ready. Your shop can now take card payments.</p>}
          {state === 'pending' && (
            <p className="text-amber-300">Stripe is checking your details. This usually takes a few minutes, and you do not need to do anything else for now.</p>
          )}
          {state === 'action_needed' && (
            <>
              <p className="text-amber-300">Stripe needs a little more information before you can take payments.</p>
              {status.items.length > 0 && (
                <ul className="list-disc pl-5 text-gray-300 space-y-1">
                  {status.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </>
          )}
          {state === 'not_started' && <p className="text-gray-400">Payments are not set up yet.</p>}
        </div>
      )}

      {state !== 'ready' && state !== 'pending' && (
        <button type="button" onClick={start} disabled={starting || status === null} className={buttonClass}>
          {starting ? 'Opening Stripe...' : state === 'action_needed' ? 'Continue Stripe setup' : 'Set up payments'}
        </button>
      )}
      {message && <p className="text-sm text-gray-300 mt-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
    </div>
  );
}

function PlanSection({ account }: { account: Account }) {
  const planName = PLAN_NAMES[account.plan] || account.plan;
  return (
    <section className={cardClass}>
      <h2 className="text-base font-semibold text-white">Plan and billing</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        You are on the <span className="text-white">{planName}</span> plan. Subscription status: {account.subscriptionStatus}.
      </p>
      <Link href="/billing" className="inline-block border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition">
        Manage plan and invoices
      </Link>
    </section>
  );
}

function DangerSection({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const paid = account.subscriptionStatus !== 'inactive' && account.subscriptionStatus !== 'canceled';

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setError('');
    try {
      const response = await apiFetch('/api/auth/me', { method: 'DELETE', json: { password } });
      if (!response.ok) throw new Error(await readError(response, 'Could not delete your account'));
      clearSession();
      window.location.assign('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your account');
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-red-500/30 bg-red-500/[0.03] p-6">
      <h2 className="text-base font-semibold text-white">Delete account</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        This permanently removes your account, your business plans, your websites and your photos. It cannot be undone.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border border-red-500/40 hover:bg-red-500/10 text-red-300 px-4 py-2.5 rounded-xl text-sm font-medium transition"
        >
          Delete my account
        </button>
      ) : paid ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">You have a paid subscription. Cancel it on the Billing page before you delete your account.</p>
          <Link href="/billing" className="inline-block border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition">
            Go to Billing
          </Link>
        </div>
      ) : (
        <form onSubmit={remove} className="space-y-4">
          <div>
            <label className={labelClass}>Enter your password to confirm</label>
            <input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={deleting || !password} className="bg-red-500 hover:bg-red-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40">
              {deleting ? 'Deleting...' : 'Permanently delete account'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-200 px-3 py-2.5 text-sm transition">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(async (response) => {
        if (!response.ok) throw new Error(await readError(response, 'Could not load your account'));
        const data = await response.json();
        setAccount(data.user);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load your account'));
  }, []);

  const signOut = () => {
    clearSession();
    window.location.assign('/login');
  };

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Manage your account</p>
          </div>
          <button onClick={signOut} className="border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition">
            Sign out
          </button>
        </div>

        <div className="flex-1 p-8">
          {loadError && <p className="text-sm text-red-400">{loadError}</p>}
          {!account && !loadError && <p className="text-sm text-gray-400">Loading your account...</p>}
          {account && (
            <div className="max-w-2xl space-y-6">
              <ProfileSection account={account} onSaved={setAccount} />
              <PasswordSection />
              <PlanSection account={account} />
              <PaymentsSection />
              <DangerSection account={account} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
