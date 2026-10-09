'use client';

import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  return (
    <div className="min-h-screen app-bg flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-8 py-5 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-gray-400 text-sm font-medium mt-1">Manage your account</p>
        </div>

        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-4">Settings Coming Soon</h2>
            <p className="text-gray-400">Account settings will be available soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
