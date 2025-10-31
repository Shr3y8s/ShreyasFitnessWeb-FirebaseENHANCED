import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export function AuthHeader() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Left */}
          <Link 
            href="/" 
            className="text-xl sm:text-2xl font-bold text-gray-900 hover:text-emerald-600 transition-colors"
          >
            SHREY<span className="text-emerald-600">.</span>FIT
          </Link>

          {/* Help Link - Right */}
          <Link 
            href="/connect#connect-options"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Need Help?</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
