'use client';

import Sidebar from '@/components/Sidebar';
import AssistantChat from '@/components/AssistantChat';

// The Chat page is the one place to talk through a business idea and to change websites.
export default function DashboardPage() {
  return (
    <div className="min-h-screen app-bg flex pt-14 md:pt-0">
      <Sidebar />
      <AssistantChat title="Chat" />
    </div>
  );
}
