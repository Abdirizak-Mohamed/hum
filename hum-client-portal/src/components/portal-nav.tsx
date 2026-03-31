'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Home, FileText, Upload, User, Link2, LogOut } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/account', label: 'Account', icon: User },
  { href: '/connect', label: 'Connect', icon: Link2 },
] as const;

export function PortalNav({ businessName }: { businessName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch {
      // Silently fail
    } finally {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Top nav bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="font-bold text-lg text-gray-900 truncate">
            {businessName}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -mr-2 text-gray-700 hover:text-gray-900 transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Overlay menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setMenuOpen(false)}>
          <nav
            className="absolute top-14 right-0 w-64 bg-white shadow-xl rounded-bl-lg border-l border-b border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="py-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-gray-200 mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Bottom mobile tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 sm:hidden">
        <ul className="flex items-center justify-around h-14">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                  isActive(href) ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
