'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';

type Step = {
  key: string;
  title: string;
  description: string;
  done: boolean;
  state: 'done' | 'next' | 'todo' | 'locked';
  href: string;
  action: string;
};
type Journey = { steps: Step[]; doneCount: number; total: number; nextKey: string | null };

const STATE_LABEL: Record<Step['state'], string> = {
  done: 'Done',
  next: 'Next',
  todo: 'To do',
  locked: 'Needs a plan upgrade',
};

export default function StartPage() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/journey')
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your progress');
        setJourney(await res.json());
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your progress'));
  }, []);

  const percent = journey ? Math.round((journey.doneCount / journey.total) * 100) : 0;

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-white/[0.06] px-4 md:px-8 py-4">
          <h1 className="text-base font-semibold text-white tracking-tight">Start here</h1>
          <p className="text-xs text-gray-500 mt-0.5">Four steps from your idea to a business that takes bookings and payments.</p>
        </div>

        <div className="p-4 md:p-8 max-w-3xl space-y-6">
          {error && <p className="text-sm text-red-400">{error}</p>}

          {journey && (
            <div className="rounded-2xl border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-200">
                  {journey.doneCount} of {journey.total} steps done
                </span>
                <span className="text-gray-500">{percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-white transition-all" style={{ width: `${percent}%` }} />
              </div>
              {journey.nextKey === null && <p className="text-sm text-emerald-400">Everything is set up. Keep an eye on your bookings and orders.</p>}
            </div>
          )}

          {!journey && !error && <p className="text-sm text-gray-500">Loading your progress...</p>}

          <ol className="space-y-3">
            {journey?.steps.map((step, index) => (
              <li
                key={step.key}
                className={`rounded-2xl border p-5 flex gap-4 items-start ${step.state === 'next' ? 'border-white/40 bg-white/[0.04]' : 'border-white/10'}`}
              >
                <span
                  className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step.state === 'done' ? 'bg-emerald-400 text-black' : 'border border-white/20 text-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {step.state === 'done' ? '✓' : index + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{step.title}</p>
                    <span
                      className={`text-[11px] uppercase tracking-wider ${
                        step.state === 'next' ? 'text-white' : step.state === 'done' ? 'text-emerald-400' : 'text-gray-500'
                      }`}
                    >
                      {STATE_LABEL[step.state]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{step.description}</p>
                  <Link href={step.href} className="inline-block pt-2 text-sm text-gray-200 underline underline-offset-4 hover:text-white">
                    {step.action}
                  </Link>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-xs text-gray-500">
            Each step is done with the assistant, which explains what happens and asks you to confirm before anything is published, charged or sent.
          </p>
        </div>
      </div>
    </div>
  );
}
