'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/theme';

// The owner's report. The workbook is built from live data each time it is downloaded.
export default function AnalyticsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch('/api/analytics/report.xlsx');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not download the report');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'venture-pro-analytics.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader title="Analytics" subtitle="Visitors, sign-ups and paying accounts, by hour, day, week, month and year." accent="sky" />
        <div className="p-4 md:p-8 max-w-2xl space-y-4">
          <p className="text-sm text-gray-300">
            Download the latest report as an Excel workbook. It has the headline numbers, visitors for each period, paying accounts by plan and the average payment.
          </p>
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40"
          >
            {busy ? 'Building report...' : 'Download report (Excel)'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
