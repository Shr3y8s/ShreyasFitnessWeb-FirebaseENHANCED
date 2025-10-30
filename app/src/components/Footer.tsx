import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 !py-12 mt-auto">
      <div className="container mx-auto px-6 !px-6">
        <div className="grid md:grid-cols-3 gap-8 mb-8 !mb-8">
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
                <Link href="/services" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  In-Person Training
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  Online Coaching
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  Complete Transformation
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  About Me
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/connect" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                  My Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-6 !pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} SHREY.FIT. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/legal/terms" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                Terms of Service
              </Link>
              <Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                Privacy Policy
              </Link>
              <Link href="/connect" className="text-gray-400 hover:text-white transition-colors text-sm !text-gray-400 hover:!text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
