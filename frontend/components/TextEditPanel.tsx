'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

type Check = { corrected: string; changes: { from: string; to: string }[] };

const textClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition resize-y';

export default function TextEditPanel({
  label,
  initialText,
  multiline,
  onSave,
  onCancel,
}: {
  label: string;
  initialText: string;
  multiline: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const changeText = (value: string) => {
    setText(value);
    setCheck(null);
  };

  const runCheck = async () => {
    setChecking(true);
    setError('');
    setCheck(null);
    try {
      const response = await apiFetch('/api/website/proofread', { method: 'POST', json: { text } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check the text');
      setCheck({ corrected: data.corrected, changes: data.changes || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the text');
    } finally {
      setChecking(false);
    }
  };

  const useSuggestion = () => {
    if (!check) return;
    setText(check.corrected);
    setCheck(null);
  };

  const save = () => {
    // Single-line fields such as headlines cannot take line breaks, so they are joined into one line.
    const cleaned = multiline ? text.trim() : text.replace(/\s*\n\s*/g, ' ').trim();
    onSave(cleaned);
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Editing</p>
          <p className="text-sm font-medium text-white mt-1">{label}</p>
        </div>
        <p className="text-xs text-gray-500 max-w-xs text-right">Changes show in the preview once you save. Nothing is published until you click Update live site.</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => changeText(e.target.value)}
        rows={multiline ? 6 : 2}
        className={textClass}
        aria-label={label}
      />

      {check && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          {check.changes.length === 0 ? (
            <p className="text-sm text-gray-200">No spelling or punctuation problems found.</p>
          ) : (
            <>
              <p className="text-sm text-gray-200">
                Found {check.changes.length} {check.changes.length === 1 ? 'problem' : 'problems'}:
              </p>
              <ul className="space-y-1 text-sm text-gray-300">
                {check.changes.map((change, i) => (
                  <li key={i}>
                    <span className="text-gray-500 line-through">{change.from}</span> → <span className="text-white">{change.to}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={useSuggestion}
                className="border border-white/15 hover:bg-white/5 text-gray-100 px-3 py-2 rounded-lg text-xs font-medium"
              >
                Use the corrected text
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runCheck}
          disabled={checking || !text.trim()}
          className="border border-white/10 hover:bg-white/5 text-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Run spelling and punctuation check'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!text.trim()}
          className="bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save edit
        </button>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-200 px-3 py-2.5 text-sm transition">
          Cancel
        </button>
      </div>
    </div>
  );
}
