'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { cardClass, buttonClass, readError } from './shared';

type PaymentStatus = {
  connected: boolean;
  paymentsEnabled: boolean;
  state: 'not_started' | 'pending' | 'action_needed' | 'ready';
  items: string[];
};

// Lets the business take card payments from its customers. Payments go to its own bank through Stripe.
export default function PaymentsSection() {
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
