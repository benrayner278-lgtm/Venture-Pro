'use client';

import Sidebar from '@/components/Sidebar';
import PaymentsSection from '@/components/settings/PaymentsSection';

export default function PaymentsPage() {
  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Take card payments from your customers, straight to your own bank</p>
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-2xl">
            <PaymentsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
