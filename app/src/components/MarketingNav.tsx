'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
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

  // Shared classes for each nav link: full-width tappable row + divider on mobile,
  // reverts to inline desktop styling at md+.
  const linkClass =
    'block w-full md:w-auto px-2 py-3 md:p-0 text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline';

  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b-2 border-[#4CAF50] z-[1000] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
      <div className="flex justify-between items-center h-20 px-8 max-w-7xl mx-auto">
        {/* Logo */}
        <div>
          <Link href="/" className="block no-underline">
            <div className="flex items-center">
              <span className="text-[1.6rem] font-bold text-gray-800 tracking-wide flex items-center leading-none">
                SHREY
                <span className="inline-block text-[#4CAF50] text-[2rem] font-bold mx-[1px] relative -top-[2px]">.</span>
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
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/" className={linkClass} onClick={() => setIsOpen(false)}>
              Home
            </Link>
          </li>
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/about" className={linkClass} onClick={() => setIsOpen(false)}>
              About
            </Link>
          </li>
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/services" className={linkClass} onClick={() => setIsOpen(false)}>
              Services
            </Link>
          </li>
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/connect" className={linkClass} onClick={() => setIsOpen(false)}>
              Connect
            </Link>
          </li>
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/faq" className={linkClass} onClick={() => setIsOpen(false)}>
              FAQ
            </Link>
          </li>
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/blog" className={linkClass} onClick={() => setIsOpen(false)}>
              Blog
            </Link>
          </li>
          <li className="md:ml-8 border-b border-gray-100 md:border-0">
            <Link href="/library" className={linkClass} onClick={() => setIsOpen(false)}>
              Library
            </Link>
          </li>
          {!loading && (
            user ? (
              <>
                <li className="md:ml-8 border-b border-gray-100 md:border-0">
                  <Link href="/dashboard" className={linkClass} onClick={() => setIsOpen(false)}>
                    Dashboard
                  </Link>
                </li>
                <li className="md:ml-8 my-3 md:my-0">
                  <button
                    onClick={handleLogout}
                    className="w-full md:w-auto bg-[#4CAF50] text-white px-5 py-2 rounded text-[0.95rem] font-medium hover:bg-[#388E3C] transition-all duration-300"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="md:ml-8 border-b border-gray-100 md:border-0">
                  <Link href="/login" className={linkClass} onClick={() => setIsOpen(false)}>
                    Login
                  </Link>
                </li>
                <li className="md:ml-8 my-3 md:my-0">
                  <Link
                    href="/signup"
                    className="block text-center w-full md:w-auto bg-[#4CAF50] text-white px-5 py-2 rounded text-[0.95rem] font-medium hover:bg-[#388E3C] transition-all duration-300 no-underline"
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
