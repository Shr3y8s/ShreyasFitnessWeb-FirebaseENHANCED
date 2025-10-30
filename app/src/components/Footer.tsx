import Link from 'next/link';
import { getMarketingUrl } from '@/lib/config';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-2xl font-bold mb-4">SHREY.FIT</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your certified fitness professional dedicated to helping you achieve your goals through personalized training and coaching.
            </p>
          </div>

          {/* Services Section */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <a href="/services.html" className="text-gray-400 hover:text-white transition-colors text-sm">
                  In-Person Training
                </a>
              </li>
              <li>
                <a href="/services.html" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Online Coaching
                </a>
              </li>
              <li>
                <a href="/services.html" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Complete Transformation
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href={getMarketingUrl('/about.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  About Me
                </a>
              </li>
              <li>
                <a href={getMarketingUrl('/blogs/')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Blog
                </a>
              </li>
              <li>
                <a href={getMarketingUrl('/connect.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Contact
                </a>
              </li>
              <li>
                <a href={getMarketingUrl('/faq.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  FAQ
                </a>
              </li>
              <li>
                <a href={getMarketingUrl('/services.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  In-Person Training
                </a>
              </li>
              <li>
                <a href={getMarketingUrl('/services.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Online Coaching
                </a>
              </li>
              <li>
                <a href={getMarketingUrl('/services.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                  Complete Transformation
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} SHREY.FIT. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/legal/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                Terms
              </Link>
              <Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                Privacy
              </Link>
              <a href={getMarketingUrl('/connect.html')} className="text-gray-400 hover:text-white transition-colors text-sm">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
