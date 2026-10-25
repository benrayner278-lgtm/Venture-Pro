'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { clearSession } from '@/lib/api';

const ICON_PATHS: Record<string, string[]> = {
  chat: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  projects: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  plan: ['M9 4h6v3H9z', 'M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2', 'M8 12h8', 'M8 16h5'],
  web: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3c2.5 3 2.5 15 0 18', 'M12 3c-2.5 3-2.5 15 0 18'],
  mail: ['M3 5h18v14H3z', 'M3 7l9 6 9-6'],
  legal: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', 'M14 3v6h6', 'M8 13h8', 'M8 17h8'],
  billing: ['M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z', 'M2 10h20', 'M6 15h4'],
  logo: ['M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z'],
  settings: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    clearSession();
    router.push('/');
  };

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { href: '/dashboard', label: 'Chat', icon: 'chat' },
    { href: '/projects', label: 'Projects', icon: 'projects' },
    { href: '/business-plan', label: 'Business Plan', icon: 'plan' },
    { href: '/website-builder', label: 'Website Builder', icon: 'web' },
    { href: '/logo-builder', label: 'Logo Builder', icon: 'logo' },
    { href: '/email-templates', label: 'Email Templates', icon: 'mail' },
    { href: '/legal-documents', label: 'Legal Docs', icon: 'legal' },
    { href: '/billing', label: 'Billing', icon: 'billing' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className="w-64 h-screen flex flex-col bg-black border-r border-white/[0.08]">
      <div className="px-6 pt-7 pb-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-white via-zinc-300 to-zinc-500 shadow-[0_0_24px_-4px_rgba(255,255,255,0.35)] flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-white">Venture-Pro</h2>
            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">AI Builder</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white/[0.06] text-white'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-100'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
              <span className={active ? 'text-white' : 'text-gray-500'}>
                <NavIcon name={item.icon} />
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-5 pt-4 border-t border-white/[0.06] space-y-3">
        <div className="px-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-gray-500">Signed in as</p>
          <p className="text-sm text-gray-200 truncate">
            {(typeof window !== 'undefined' && localStorage.getItem('userName')) || 'Account'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
