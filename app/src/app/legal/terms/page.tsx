'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <MarketingNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <article className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {/* Title */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">
              <strong>Effective Date:</strong> January 1, 2026<br />
              <strong>Last Updated:</strong> October 29, 2025
            </p>
          </div>

          {/* Welcome */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to SHREY.FIT</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your use of SHREY.FIT fitness coaching platform ("Service") operated by SHREY.FIT ("we," "us," or "our"). By accessing or using our Service, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold">
              Please read these Terms carefully before using our Service.
            </p>
          </section>

          {/* 1. Acceptance of Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By creating an account, accessing, or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use our Service.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-3">SHREY.FIT provides:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Personal fitness coaching</strong> from certified trainers</li>
              <li><strong>Customized workout programs</strong> tailored to your goals</li>
              <li><strong>Progress tracking</strong> and performance monitoring</li>
              <li><strong>Nutrition guidance</strong> and meal planning support</li>
              <li><strong>Online platform access</strong> via web application</li>
              <li><strong>Direct messaging</strong> with your assigned trainer</li>
            </ul>
          </section>

          {/* 3. Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Age Requirement</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You must be at least 18 years old to use our Service. By using our Service, you represent and warrant that you are at least 18 years of age.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Medical Clearance</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Before beginning any fitness program, you should consult with your physician or healthcare provider. You represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>You are in good physical health</li>
              <li>You have no medical conditions that would prevent safe exercise</li>
              <li>You have obtained medical clearance if you have any health concerns</li>
              <li>You will inform your trainer of any medical conditions or injuries</li>
            </ul>
          </section>

          {/* 6. Subscription Management */}
          <section className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subscription Management</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Pause Subscription</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You may pause your subscription for 1-3 months:</p>
            <p className="font-semibold text-gray-800 mb-2">Terms:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Maximum pause duration: 3 months</li>
              <li>Maximum pauses per year: 3</li>
              <li>Billing automatically stops during pause period</li>
              <li>Subscription automatically resumes on selected date</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.2 Cancel Subscription</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You may cancel your subscription at any time:</p>
            <p className="font-semibold text-gray-800 mb-2">Terms:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>No future billing after cancellation</li>
              <li>Access continues until end of current billing period</li>
              <li><strong className="text-red-600">NO REFUNDS</strong> for unused time in current billing period</li>
              <li>Unused session pack sessions are forfeited</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.3 Delete Account</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You may permanently delete your account:</p>
            <p className="font-semibold text-gray-800 mb-2">Terms:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Immediate cancellation of subscription</li>
              <li>ALL data permanently deleted</li>
              <li>Cannot be undone</li>
              <li><strong className="text-red-600">NO REFUNDS</strong> for any unused time or sessions</li>
            </ul>
          </section>

          {/* 7. Refund Policy */}
          <section className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Refund Policy</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 No Refunds Policy</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong className="text-red-600">IMPORTANT:</strong> All sales are final. We do not provide refunds or prorating for:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Cancelled subscriptions (unused portion of billing period)</li>
              <li>Unused training sessions (session packs)</li>
              <li>Paused subscriptions</li>
              <li>Deleted accounts</li>
              <li>Change of mind</li>
              <li>Dissatisfaction with service</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Exceptions</h3>
            <p className="text-gray-700 leading-relaxed mb-2">Refunds may be issued at our sole discretion for:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li><strong>Medical Emergencies:</strong> With valid medical documentation</li>
              <li><strong>Service Unavailability:</strong> Due to our fault (extended outage, trainer unavailability)</li>
              <li><strong>Billing Errors:</strong> Incorrect charges or duplicate transactions</li>
              <li><strong>Fraud:</strong> Unauthorized charges</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Requesting a Refund</h3>
            <p className="text-gray-700 leading-relaxed">
              To request a refund, email: <a href="mailto:support@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">support@shrey.fit</a>
            </p>
          </section>

          {/* 14. Disclaimers */}
          <section className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Disclaimers and Limitation of Liability</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">14.1 No Medical Advice</h3>
            <p className="text-gray-700 leading-relaxed mb-3"><strong>IMPORTANT:</strong></p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Our Service provides fitness coaching, NOT medical advice</li>
              <li>Trainers are fitness professionals, NOT medical doctors</li>
              <li>Consult your physician before beginning any exercise program</li>
              <li>Medical advice takes precedence over trainer guidance</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">14.2 Health Risks</h3>
            <p className="text-gray-700 leading-relaxed mb-3"><strong>WARNING:</strong></p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Exercise involves inherent risks including injury or death</li>
              <li>You assume all risks associated with participating in exercise</li>
              <li>Stop immediately if you experience pain, dizziness, or discomfort</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">14.6 Assumption of Risk</h3>
            <p className="text-gray-700 leading-relaxed font-bold text-red-700">
              BY USING OUR SERVICE, YOU EXPRESSLY ASSUME THE RISK OF: Physical injury, Property damage, Medical complications, and Death.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">For questions about these Terms:</p>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Email:</strong> <a href="mailto:legal@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">legal@shrey.fit</a></li>
              <li><strong>Support:</strong> <a href="mailto:support@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">support@shrey.fit</a></li>
            </ul>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8 border-2 border-gray-300 p-6 rounded-lg bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Acknowledgment</h2>
            <p className="text-gray-700 leading-relaxed font-semibold mb-4">
              BY CLICKING "I AGREE" OR BY ACCESSING OR USING OUR SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold">
              YOU FURTHER ACKNOWLEDGE THAT YOU ASSUME ALL RISKS ASSOCIATED WITH PHYSICAL EXERCISE AND THAT SHREY.FIT IS NOT LIABLE FOR ANY INJURIES OR DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Footer Info */}
          <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-200">
            <p className="mb-2"><strong>Last Updated:</strong> October 29, 2025</p>
            <p className="mb-4"><strong>Version:</strong> 1.0</p>
            <p>
              <Link href="/legal/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link>
              {' | '}
              <Link href="/" className="text-blue-600 hover:text-blue-700 underline">Back to Home</Link>
            </p>
          </div>

          {/* Note */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">📄 Full Terms Available</p>
            <p>
              This page highlights key sections of our Terms of Service. For the complete document, please see:{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">docs/03-legal/terms-of-service.md</code>
            </p>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
