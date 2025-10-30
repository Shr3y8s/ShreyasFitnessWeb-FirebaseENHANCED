'use client';

import Link from 'next/link';
import { useState } from 'react';

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);

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
            <Link href="/about" className="nav-link">About Me</Link>
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
          <li className="nav-item">
            <Link href="/login" className="nav-link account-btn">Sign Up / Login</Link>
          </li>
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
