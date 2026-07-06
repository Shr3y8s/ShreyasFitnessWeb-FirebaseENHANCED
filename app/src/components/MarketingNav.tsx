'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/connect', label: 'Connect' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/library', label: 'Library' },
];

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        setIsOpen(false);
        router.push('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  // Nav link: full-width tappable row on mobile → inline on desktop.
  // Desktop gets an animated underline that grows from the left on hover;
  // the active page keeps a persistent emerald underline + emerald text.
  const linkClass = (href: string) => {
    const active = isActive(href);
    return [
      'group relative block w-full md:w-auto px-2 py-3 md:px-0 md:py-1',
      'text-[0.95rem] font-medium no-underline transition-colors duration-200',
      active ? 'text-emerald-700' : 'text-gray-800 hover:text-emerald-700',
    ].join(' ');
  };

  const underlineClass = (href: string) => {
    const active = isActive(href);
    return [
      'pointer-events-none absolute left-2 right-2 md:left-0 md:right-0 bottom-1 md:-bottom-0.5 h-0.5 rounded-full bg-emerald-600',
      'origin-left transition-transform duration-300',
      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
    ].join(' ');
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/85 supports-[backdrop-filter]:bg-white/55 backdrop-blur-xl backdrop-saturate-150 border-b border-emerald-600/20 z-[1000] shadow-[0_1px_12px_rgba(16,120,80,0.08)]">



      <div className="flex justify-between items-center h-20 px-8 max-w-7xl mx-auto">
        {/* Logo */}
        <div>
          <Link href="/" className="block no-underline">
            <div className="flex items-center">
              <span className="text-[1.6rem] font-bold text-gray-800 tracking-wide flex items-center leading-none">
                SHREY
                <span className="inline-block text-emerald-600 text-[2rem] font-bold mx-[1px] relative -top-[2px]">.</span>
                FIT
              </span>
            </div>
          </Link>
        </div>

        {/* Hamburger toggle (mobile/tablet only) */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          className="flex md:!hidden flex-col justify-center items-center gap-[5px] w-10 h-10 -mr-2 z-[1001]"
        >
          <span className={`block h-[2px] w-6 bg-gray-800 rounded transition-all duration-300 ${isOpen ? 'translate-y-[7px] rotate-45' : ''}`}></span>
          <span className={`block h-[2px] w-6 bg-gray-800 rounded transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block h-[2px] w-6 bg-gray-800 rounded transition-all duration-300 ${isOpen ? '-translate-y-[7px] -rotate-45' : ''}`}></span>
        </button>

        {/* Navigation */}
        <ul className={`
          md:!flex
          ${isOpen ? 'flex' : 'hidden'}
          fixed md:static left-0 top-20 flex-col md:flex-row w-full md:w-auto
          bg-white md:bg-transparent shadow-[0_10px_27px_rgba(0,0,0,0.08)] md:shadow-none
          px-6 py-2 md:p-0 text-left md:text-left
          justify-start md:justify-between items-stretch md:items-center
          max-h-[calc(100vh-5rem)] overflow-y-auto md:max-h-none md:overflow-visible
          transition-all duration-300
        `}>
          {NAV_LINKS.map((link) => (
            <li key={link.href} className="md:ml-8 border-b border-gray-100 md:border-0">
              <Link href={link.href} className={linkClass(link.href)} onClick={() => setIsOpen(false)}>
                {link.label}
                <span className={underlineClass(link.href)} />
              </Link>
            </li>
          ))}

          {!loading && (
            user ? (
              <>
                <li className="md:ml-8 border-b border-gray-100 md:border-0">
                  <Link href="/dashboard" className={linkClass('/dashboard')} onClick={() => setIsOpen(false)}>
                    Dashboard
                    <span className={underlineClass('/dashboard')} />
                  </Link>
                </li>
                <li className="md:ml-8 my-3 md:my-0">
                  <button
                    onClick={handleLogout}
                    className="w-full md:w-auto bg-emerald-600 text-white px-6 py-2 rounded-full text-[0.95rem] font-medium shadow-sm hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="md:ml-8 border-b border-gray-100 md:border-0">
                  <Link href="/login" className={linkClass('/login')} onClick={() => setIsOpen(false)}>
                    Login
                    <span className={underlineClass('/login')} />
                  </Link>
                </li>
                <li className="md:ml-8 my-3 md:my-0">
                  <Link
                    href="/signup"
                    className="block text-center w-full md:w-auto bg-emerald-600 text-white px-6 py-2 rounded-full text-[0.95rem] font-medium shadow-sm hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 no-underline"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )
          )}
        </ul>

      </div>
    </nav>
  );
}
