'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <MarketingNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <article className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {/* Title */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">
              <strong>Effective Date:</strong> January 1, 2026<br />
              <strong>Last Updated:</strong> October 29, 2025
            </p>
          </div>

          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              SHREY.FIT ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our fitness coaching platform ("Service").
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
                  <li>Password (encrypted)</li>
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
                  <li>Credit card information (processed by Stripe, not stored by us)</li>
                  <li>Billing address and purchase history</li>
                </ul>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">1.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Usage data (pages visited, features used)</li>
              <li>Device information (IP address, browser, OS)</li>
              <li>Location information (approximate from IP)</li>
              <li>Cookies and tracking technologies</li>
            </ul>
          </section>

          {/* 2. How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">To Provide Our Service:</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Create and manage your account</li>
              <li>Process payments and subscriptions</li>
              <li>Deliver customized workout programs</li>
              <li>Track your progress</li>
              <li>Enable communication with trainers</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">To Improve Our Service:</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Analyze usage patterns</li>
              <li>Identify bugs and issues</li>
              <li>Develop new features</li>
              <li>Conduct research and analytics</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">To Communicate With You:</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Send workout reminders and progress updates</li>
              <li>Provide customer support</li>
              <li>Send administrative messages</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">With Your Trainer</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We share relevant information with your assigned trainer including:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Name and contact information</li>
              <li>Fitness goals and progress</li>
              <li>Medical information you provide</li>
              <li>Emergency contact details</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Providers</h3>
            <p className="text-gray-700 leading-relaxed mb-2">We share information with:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Firebase/Google Cloud:</strong> Data storage and infrastructure</li>
              <li><strong>Analytics Providers:</strong> Usage analytics (anonymized)</li>
            </ul>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-green-800 font-semibold">
                ✓ We will NEVER sell your personal information to third parties.
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
              Request deletion of your personal data using the "Delete Account" feature. We will delete within 30 days.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">Right to Object</h3>
            <p className="text-gray-700 leading-relaxed">
              Object to processing for marketing purposes. Opt out of marketing communications anytime.
            </p>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Active Accounts</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We retain your data while your account is active (profile, workouts, messages, etc.).
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">After Account Deletion</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Personal data: Deleted within 30 days</li>
              <li>Payment records: Retained for 7 years (legal requirement)</li>
              <li>Aggregated data: May be retained indefinitely</li>
              <li>Backup data: Deleted within 90 days</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
              <li><strong>Encryption:</strong> TLS/SSL in transit, AES-256 at rest</li>
              <li><strong>Authentication:</strong> Secure Firebase Auth with password hashing</li>
              <li><strong>Access Controls:</strong> Limited employee access with permissions</li>
              <li><strong>Regular Audits:</strong> Security audits and updates</li>
            </ul>
            <p className="text-gray-700 leading-relaxed font-semibold">
              Important: No method of transmission or storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          {/* GDPR & CCPA */}
          <section className="mb-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Rights by Region</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">European Union (GDPR)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you are in the EU, you have rights under GDPR including:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Right to Access (Article 15)</li>
              <li>Right to Rectification (Article 16)</li>
              <li>Right to Erasure (Article 17)</li>
              <li>Right to Data Portability (Article 20)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">California (CCPA)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              California residents have additional rights:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Right to Know what personal information is collected</li>
              <li>Right to Delete your personal information</li>
              <li>Right to Opt-Out of sale (we don't sell data)</li>
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
                <strong>Privacy Inquiries:</strong>{' '}
                <a href="mailto:privacy@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">
                  privacy@shrey.fit
                </a>
              </li>
              <li>
                <strong>Data Requests:</strong>{' '}
                <a href="mailto:privacy@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">
                  privacy@shrey.fit
                </a>{' '}
                (Response time: 30 days)
              </li>
              <li>
                <strong>Data Protection Officer:</strong>{' '}
                <a href="mailto:dpo@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">
                  dpo@shrey.fit
                </a>
              </li>
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
                  <li>✓ Payment info (via Stripe)</li>
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
                  <li>✓ Regular security audits</li>
                  <li>✓ Employee training</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">We Do NOT:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✗ Sell your information</li>
                  <li>✗ Share without consent</li>
                  <li>✗ Use for unrelated purposes</li>
                  <li>✗ Store credit cards ourselves</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer Info */}
          <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-200">
            <p className="mb-2"><strong>Last Updated:</strong> October 29, 2025</p>
            <p className="mb-4"><strong>Version:</strong> 1.0</p>
            <p>
              <Link href="/legal/terms" className="text-blue-600 hover:text-blue-700 underline">Terms of Service</Link>
              {' | '}
              <Link href="/" className="text-blue-600 hover:text-blue-700 underline">Back to Home</Link>
            </p>
          </div>

          {/* Note */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">📄 Full Privacy Policy Available</p>
            <p>
              This page highlights key sections of our Privacy Policy. For the complete document, please see:{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">docs/03-legal/privacy-policy.md</code>
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
