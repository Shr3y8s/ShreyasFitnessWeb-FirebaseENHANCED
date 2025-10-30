import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-6 !py-6 mt-auto border-t border-gray-800">
      <div className="container mx-auto px-6 !px-6">
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Brand */}
          <div className="flex items-center">
            <h3 className="text-xl font-bold tracking-tight">SHREY.FIT</h3>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-6">
            <Link 
              href="/about" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              About
            </Link>
            <Link 
              href="/services" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              Services
            </Link>
            <Link 
              href="/blog" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              Blog
            </Link>
            <Link 
              href="/faq" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              FAQ
            </Link>
            <Link 
              href="/connect" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 !pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} SHREY.FIT. All rights reserved.
          </p>
          
          <div className="flex items-center gap-6">
            <Link 
              href="/legal/terms" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              Terms of Service
            </Link>
            <Link 
              href="/legal/privacy" 
              className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
