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
        setIsOpen(false); // Close mobile menu if open
        router.push('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link href="/" className="logo-link">
            <div className="logo-container">
              <div className="logo-text">
                <span className="brand-name">SHREY<span className="brand-dot">.</span>FIT</span>
              </div>
            </div>
          </Link>
        </div>
        <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link href="/" className="nav-link">Home</Link>
          </li>
          <li className="nav-item">
            <Link href="/about" className="nav-link">About</Link>
          </li>
          <li className="nav-item">
            <Link href="/services" className="nav-link">Services</Link>
          </li>
          <li className="nav-item">
            <Link href="/connect" className="nav-link">Connect</Link>
          </li>
          <li className="nav-item">
            <Link href="/faq" className="nav-link">FAQ</Link>
          </li>
          <li className="nav-item">
            <Link href="/blog" className="nav-link">Blog</Link>
          </li>
          {!loading && (
            user ? (
              // Logged in - show Dashboard and Logout
              <>
                <li className="nav-item">
                  <Link href="/dashboard" className="nav-link">Dashboard</Link>
                </li>
                <li className="nav-item">
                  <button onClick={handleLogout} className="nav-link account-btn">Logout</button>
                </li>
              </>
            ) : (
              // Logged out - show Login and Sign Up
              <>
                <li className="nav-item">
                  <Link href="/login" className="nav-link">Login</Link>
                </li>
                <li className="nav-item">
                  <Link href="/signup" className="nav-link account-btn">Sign Up</Link>
                </li>
              </>
            )
          )}
        </ul>
        <div 
          className={`hamburger ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </div>
    </nav>
  );
}
