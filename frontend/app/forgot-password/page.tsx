'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot', { method: 'POST', auth: false, json: { email } });
      const data = await res.json();
      if (res.ok) setMessage(data.message);
      else setError(data.error || 'Could not send the reset link');
    } catch {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-3xl shadow-2xl p-10 border border-gray-800/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Reset your password</h1>
            <p className="text-gray-400 text-sm font-medium">Enter your email and we will send you a link.</p>
          </div>

          {message ? (
            <p className="text-emerald-300 text-sm text-center">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition placeholder-gray-500 font-medium"
                required
              />
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3">
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3.5 rounded-xl transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-gray-400 text-center mt-6 text-sm">
            <Link href="/login" className="text-white hover:text-white font-semibold">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
