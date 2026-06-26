'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <MarketingNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <article className="bg-white/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-emerald-100 p-8 md:p-12">
          {/* Title */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200">
              🔒 Privacy
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <div className="h-1 w-24 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mb-4" />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700"><strong>Effective:</strong> June 25, 2026</span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700"><strong>Updated:</strong> June 25, 2026</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800"><strong>Version</strong> 2.0</span>
            </div>
          </div>


          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Shrey.Fit, a sole proprietorship operated by Shreyas Annapureddy ("Shrey.Fit," "we," "us," or "our"), based in the State of Washington, United States, respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our fitness coaching platform and website at shrey.fit (the "Service").
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold">
              Please read this Privacy Policy carefully. By using our Service, you consent to the practices described in this policy.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Information You Provide</h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-800 mb-2">Account Information:</p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Name, email address, phone number</li>
                  <li>Date of birth, gender</li>
                  <li>Password (stored only in hashed/encrypted form)</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-800 mb-2">Profile Information:</p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Profile photo</li>
                  <li>Physical address</li>
                  <li>Emergency contact details</li>
                  <li>Medical notes and health information</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-800 mb-2">Fitness Information:</p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Fitness goals and workout history</li>
                  <li>Progress measurements</li>
                  <li>Exercise performance data</li>
                  <li>Progress photos</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-gray-800 mb-2">Payment Information:</p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>Payment details processed by our payment processor (we do not store full card numbers)</li>
                  <li>Billing information and purchase history</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">1.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Usage data (pages visited, features used)</li>
              <li>Device information (IP address, browser, OS)</li>
              <li>Login/security information (timestamps, approximate location from IP)</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          {/* 2. How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">To Provide Our Service:</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Create and manage your account</li>
              <li>Process payments, subscriptions, and session packages</li>
              <li>Deliver customized workout and nutrition programs</li>
              <li>Track your progress and enable trainer communication</li>
              <li>Provide customer support</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">To Improve Our Service:</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Analyze usage patterns and diagnose issues</li>
              <li>Develop new features and conduct internal analytics</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">To Communicate With You:</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Send verification codes, account/billing notices, and reminders (transactional/service messages)</li>
              <li>Provide customer support and security alerts</li>
              <li>With your consent, send marketing communications you can opt out of anytime</li>
            </ul>
          </section>

          {/* 4. Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">With Your Trainer</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We share relevant information with your assigned trainer, including:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Name and contact information</li>
              <li>Fitness goals and progress</li>
              <li>Medical information you provide</li>
              <li>Emergency contact details</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Providers (Sub-Processors)</h3>
            <p className="text-gray-700 leading-relaxed mb-2">We share information with trusted third parties who process data on our behalf:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li><strong>PayPal:</strong> payment processing</li>
              <li><strong>Google Firebase / Google Cloud:</strong> hosting, database, authentication, file storage</li>
              <li><strong>Resend:</strong> transactional and notification email delivery</li>
              <li><strong>Google Maps Platform:</strong> address autocomplete</li>
              <li><strong>Google reCAPTCHA:</strong> bot/abuse prevention at signup</li>
              <li><strong>Google Analytics:</strong> usage analytics (aggregated/pseudonymized)</li>
            </ul>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-green-800 font-semibold">
                ✓ We do NOT sell your personal information, and we do NOT "share" it for cross-context behavioral advertising.
              </p>
            </div>
          </section>

          {/* 5. Your Privacy Rights */}
          <section className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Privacy Rights</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Right to Access</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Request a copy of your personal data and review what information we have.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Right to Data Portability</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Download your data in JSON format using the "Download My Data" feature in your profile.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Right to Erasure ("Right to be Forgotten")</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Request deletion of your personal data using the "Delete Account" feature. We delete personal data within 30 days, except financial/transaction records retained for legal compliance.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Right to Object</h3>
            <p className="text-gray-700 leading-relaxed">
              Object to processing for marketing purposes. Opt out of marketing communications anytime. To exercise any right, contact <a href="mailto:privacy@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">privacy@shrey.fit</a>.
            </p>
          </section>

          {/* 6. Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Active Accounts</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain your data while your account is active (profile, workouts, messages, etc.).
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">After Account Deletion</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Personal data: deleted within 30 days</li>
              <li>Financial/transaction records: retained as required by law (generally up to 7 years)</li>
              <li>Aggregated/anonymized data: may be retained indefinitely</li>
              <li>Backups: purged within ~90 days</li>
            </ul>
          </section>

          {/* 7. Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li><strong>Encryption:</strong> TLS in transit, encryption at rest</li>
              <li><strong>Authentication:</strong> secure Firebase Authentication with password hashing</li>
              <li><strong>Access Controls:</strong> least-privilege permissions</li>
              <li><strong>Breach notification:</strong> we notify affected users and authorities as required by law (e.g., within 72 hours under the GDPR)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed font-semibold">
              Important: No method of transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          {/* GDPR & CCPA */}
          <section className="mb-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Rights by Region</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">European Union / UK (GDPR)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you are in the EU/EEA/UK, you have rights under the GDPR including:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Right to Access (Article 15)</li>
              <li>Right to Rectification (Article 16)</li>
              <li>Right to Erasure (Article 17)</li>
              <li>Right to Data Portability (Article 20)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">California (CCPA/CPRA)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              California residents have additional rights:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Right to Know what personal information is collected</li>
              <li>Right to Delete and Correct your personal information</li>
              <li>Right to Opt-Out of sale/sharing (we do not sell or share)</li>
              <li>Right to Non-Discrimination</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              For privacy-related questions or to exercise your rights:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Privacy &amp; Data Requests:</strong>{' '}
                <a href="mailto:privacy@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">
                  privacy@shrey.fit
                </a>{' '}
                (our designated Privacy Contact)
              </li>
              <li>
                <strong>Support:</strong>{' '}
                <a href="mailto:support@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">
                  support@shrey.fit
                </a>
              </li>
              <li>
                <strong>Legal:</strong>{' '}
                <a href="mailto:legal@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">
                  legal@shrey.fit
                </a>
              </li>
              <li><strong>Mailing address:</strong> available upon request to privacy@shrey.fit</li>
            </ul>
          </section>

          {/* Summary */}
          <section className="mb-8 border-2 border-gray-300 p-6 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">What We Collect:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Account and profile information</li>
                  <li>✓ Fitness and health data</li>
                  <li>✓ Usage and device information</li>
                  <li>✓ Payment info (via PayPal)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Your Rights:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Access your data</li>
                  <li>✓ Download your data (JSON)</li>
                  <li>✓ Delete your data</li>
                  <li>✓ Opt out of marketing</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Security:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Industry-standard encryption</li>
                  <li>✓ Secure Firebase infrastructure</li>
                  <li>✓ Access controls</li>
                  <li>✓ Breach notification</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">We Do NOT:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✗ Sell your information</li>
                  <li>✗ Share for behavioral ads</li>
                  <li>✗ Use for unrelated purposes</li>
                  <li>✗ Store full card numbers</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer Info */}
          <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-200">
            <p className="mb-2"><strong>Last Updated:</strong> June 25, 2026</p>
            <p className="mb-4"><strong>Version:</strong> 2.0</p>
            <p>
              <Link href="/legal/terms" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</Link>
              {' | '}
              <Link href="/" className="text-blue-600 hover:text-blue-700 underline">Back to Home</Link>
            </p>
          </div>
        </article>

      </main>

      <Footer />
    </div>
  );
}
