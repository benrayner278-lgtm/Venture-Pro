'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, saveSession } from '@/lib/api';

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
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        auth: false,
        json: { name, email, password },
      });

      const data = await res.json();

      if (res.ok && data.token && data.user?.id) {
        saveSession(data.token, data.user);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Connection error');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-3xl shadow-2xl p-10 border border-gray-800/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-neutral-800 to-black border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-bold text-xl">VP</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Venture-Pro</h1>
            <p className="text-gray-400 text-sm font-medium">Create your account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 font-medium"
                required
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 font-medium"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 font-medium"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 font-medium"
                required
              />
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3">
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3.5 rounded-xl transition shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-gray-400 text-center mt-6 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:text-white font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
