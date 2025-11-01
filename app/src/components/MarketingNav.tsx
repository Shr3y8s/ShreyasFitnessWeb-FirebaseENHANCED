'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user, userData, loading } = useAuth();

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

  return (
    <nav className="fixed top-0 left-0 w-full bg-white z-[1000] shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
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

        {/* Desktop Navigation */}
        <ul className={`
          md:!flex
          ${isOpen ? 'flex' : 'hidden'}
          fixed md:static left-0 top-20 flex-col md:flex-row w-full md:w-auto 
          bg-white md:bg-transparent shadow-[0_10px_27px_rgba(0,0,0,0.05)] md:shadow-none 
          py-5 md:py-0 text-center md:text-left
          justify-between items-center
          transition-all duration-300
        `}>
          <li className="md:ml-8 my-4 md:my-0">
            <Link 
              href="/" 
              className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
          </li>
          <li className="md:ml-8 my-4 md:my-0">
            <Link 
              href="/about" 
              className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
          </li>
          <li className="md:ml-8 my-4 md:my-0">
            <Link 
              href="/services" 
              className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
              onClick={() => setIsOpen(false)}
            >
              Services
            </Link>
          </li>
          <li className="md:ml-8 my-4 md:my-0">
            <Link 
              href="/connect" 
              className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
              onClick={() => setIsOpen(false)}
            >
              Connect
            </Link>
          </li>
          <li className="md:ml-8 my-4 md:my-0">
            <Link 
              href="/faq" 
              className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </Link>
          </li>
          <li className="md:ml-8 my-4 md:my-0">
            <Link 
              href="/blog" 
              className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
              onClick={() => setIsOpen(false)}
            >
              Blog
            </Link>
          </li>
          {!loading && (
            user ? (
              <>
                <li className="md:ml-8 my-4 md:my-0">
                  <Link 
                    href="/dashboard" 
                    className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                </li>
                <li className="md:ml-8 my-4 md:my-0">
                  <button 
                    onClick={handleLogout}
                    className="bg-[#4CAF50] text-white px-5 py-2 rounded text-[0.95rem] font-medium hover:bg-[#388E3C] transition-all duration-300"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="md:ml-8 my-4 md:my-0">
                  <Link 
                    href="/login" 
                    className="text-[0.95rem] font-medium text-gray-800 hover:text-[#4CAF50] transition-all duration-300 no-underline"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                </li>
                <li className="md:ml-8 my-4 md:my-0">
                  <Link 
                    href="/signup"
                    className="bg-[#4CAF50] text-white px-5 py-2 rounded text-[0.95rem] font-medium hover:bg-[#388E3C] transition-all duration-300 inline-block no-underline"
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
