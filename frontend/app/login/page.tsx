'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, saveSession } from '@/lib/api';
import AuthShell, { authButton, authInput } from '@/components/AuthShell';
import { afterSignInPath } from '@/lib/welcome';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', { method: 'POST', auth: false, json: { email, password } });
      const data = await res.json();
      if (res.ok && data.token && data.user?.id) {
        saveSession(data.token, data.user);
        router.push(afterSignInPath());
        return;
      }
      setError(data.error || 'We could not sign you in. Please try again.');
    } catch {
      setError('We could not reach Venture-Pro. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to carry on with your business."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="font-semibold text-white underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} required />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-zinc-500">Password</label>
            <Link href="/forgot-password" className="text-xs text-zinc-400 underline underline-offset-4 hover:text-white">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} required />
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className={authButton}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
