import Link from 'next/link';
import { SocialLinks } from '@/components/SocialLinks';

export function Footer() {

  return (
    <footer className="bg-gray-900 text-white py-6 mt-auto border-t border-gray-800">
      <div className="container mx-auto px-6">
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Brand */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold tracking-tight text-white hover:text-[#4CAF50] transition-colors">
              SHREY<span className="text-[#4CAF50]">.</span>FIT
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-6">
            <Link 
              href="/about" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              About
            </Link>
            <Link 
              href="/services" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Services
            </Link>
            <Link 
              href="/blog" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Blog
            </Link>
            <Link 
              href="/faq" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              FAQ
            </Link>
            <Link 
              href="/connect" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Follow SHREY.FIT */}
        <div className="flex flex-col items-center gap-3 py-4 border-t border-gray-800 sm:flex-row sm:justify-center">
          <span className="text-sm font-medium text-gray-300">Follow SHREY.FIT</span>
          <SocialLinks
            className="flex items-center gap-3"
            linkClassName="flex size-9 items-center justify-center rounded-full border border-gray-700 text-gray-400 transition-colors hover:border-[#4CAF50] hover:bg-[#4CAF50] hover:text-white"
            iconClassName="size-4"
          />
        </div>


        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SHREY.FIT. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <Link 
              href="/legal/terms" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Terms of Service
            </Link>
            <Link 
              href="/legal/privacy" 
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
