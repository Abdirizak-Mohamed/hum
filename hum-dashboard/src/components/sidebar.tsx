'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Fleet', href: '/', icon: '⊞' },
  { label: 'Intake', href: '/intake', icon: '⊙' },
  { label: 'Clients', href: '/clients', icon: '⊡' },
  { label: 'Content', href: '/content', icon: '⊟' },
  { label: 'Issues', href: '/issues', icon: '⊠' },
];

function useIssueCount() {
  return useQuery<{ count: number }>({
    queryKey: ['issues', 'count'],
    queryFn: async () => {
      const res = await fetch('/api/issues?countOnly=true');
      if (!res.ok) throw new Error('Failed to fetch issue count');
      return res.json();
    },
    refetchInterval: 30 * 1000,
  });
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: issueData } = useIssueCount();
  const issueCount = issueData?.count ?? 0;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <Link
          href="/"
          className="text-xl font-bold text-white hover:text-gray-300 transition-colors"
        >
          hum
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const isIssues = item.label === 'Issues';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </span>
              {isIssues && issueCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white min-w-[1.25rem]">
                  {issueCount > 99 ? '99+' : issueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
