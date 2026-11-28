'use client';

import Sidebar from '@/components/Sidebar';
import PaymentsSection from '@/components/settings/PaymentsSection';
import { PageHeader } from '@/components/theme';

export default function PaymentsPage() {
  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <PageHeader title="Payments" subtitle="Take card payments from your customers, straight to your own bank" accent="butter" />

        <div className="flex-1 p-8">
          <div className="max-w-2xl">
            <PaymentsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
