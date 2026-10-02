'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/');
  };

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { href: '/dashboard', label: 'Chat', icon: '💬' },
    { href: '/projects', label: 'Projects', icon: '📁' },
    { href: '/business-plan', label: 'Business Plan', icon: '📋' },
    { href: '/website-builder', label: 'Website Builder', icon: '🌐' },
    { href: '/email-templates', label: 'Email Templates', icon: '✉️' },
    { href: '/legal-documents', label: 'Legal Docs', icon: '📄' },
    { href: '/billing', label: 'Billing', icon: '💳' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-gray-900/50 border-r border-gray-800/50 h-screen flex flex-col backdrop-blur-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800/50">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">VP</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Venture-Pro</h2>
            <p className="text-xs text-gray-400">AI Builder</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              isActive(item.href)
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-800/50 space-y-3">
        <div className="px-4 py-2">
          <p className="text-xs text-gray-500">Signed in as</p>
          <p className="text-sm font-medium text-white truncate">
            {typeof window !== 'undefined' && localStorage.getItem('userEmail') || 'User'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg transition font-semibold text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
