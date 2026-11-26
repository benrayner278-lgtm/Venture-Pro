'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, saveSession } from '@/lib/api';
import AuthShell, { authButton, authInput } from '@/components/AuthShell';
import { afterSignInPath } from '@/lib/welcome';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The two passwords do not match. Type the same password in both boxes.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/signup', { method: 'POST', auth: false, json: { name, email, password } });
      const data = await res.json();
      if (res.ok && data.token && data.user?.id) {
        saveSession(data.token, data.user);
        router.push(afterSignInPath());
        return;
      }
      setError(data.error || 'We could not create your account. Please try again.');
    } catch {
      setError('We could not reach Venture-Pro. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes a minute. You can change everything later."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-white underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Your name</label>
          <input id="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={authInput} required />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} required />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} required minLength={8} />
          <p className="mt-1.5 text-xs text-zinc-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={authInput} required />
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Creating your account...' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
