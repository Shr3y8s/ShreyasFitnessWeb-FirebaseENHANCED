'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingNav } from '@/components/MarketingNav';
import { Footer } from '@/components/Footer';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <MarketingNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <article className="bg-white/90 backdrop-blur rounded-2xl shadow-xl ring-1 ring-emerald-100 p-8 md:p-12">
          {/* Title */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200">
              🛡️ Legal
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <div className="h-1 w-24 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mb-4" />
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700"><strong>Effective:</strong> June 25, 2026</span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700"><strong>Updated:</strong> June 25, 2026</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800"><strong>Version</strong> 2.0</span>
            </div>
          </div>


          {/* Welcome */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Shrey.Fit</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your access to and use of the Shrey.Fit fitness coaching platform, website (shrey.fit), and related services (the "Service"). The Service is operated by <strong>Shrey.Fit, a sole proprietorship operated by Shreyas Annapureddy</strong> ("Shrey.Fit," "we," "us," or "our"), based in the State of Washington, United States.
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold">
              Please read these Terms carefully before using our Service. By accessing or using the Service, you agree to these Terms and our <Link href="/legal/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link>.
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
            <p className="text-gray-700 leading-relaxed mb-3">Shrey.Fit provides:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong>Personal fitness coaching</strong> from qualified trainers</li>
              <li><strong>Customized workout programs</strong> tailored to your goals</li>
              <li><strong>Progress tracking</strong> and performance monitoring</li>
              <li><strong>Nutrition guidance</strong> and meal-planning support</li>
              <li><strong>Online platform access</strong> via web application</li>
              <li><strong>Direct messaging</strong> with your assigned trainer</li>
              <li><strong>In-person and/or virtual training sessions</strong> (depending on your plan or package)</li>
            </ul>
          </section>

          {/* 3. Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Age Requirement</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              You must be at least 18 years old to create an account and use our Service. By using our Service, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Medical Clearance</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Before beginning any fitness program, you should consult with your physician or healthcare provider. You represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>You are in good physical health and able to participate in exercise</li>
              <li>You have no medical condition that would make exercise unsafe</li>
              <li>You have obtained medical clearance if you have any health concerns</li>
              <li>You will inform your trainer of any medical conditions or injuries</li>
            </ul>
          </section>

          {/* 5. Payments */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Subscriptions, Sessions &amp; Payments</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Current prices for all plans and session packages are displayed on our pricing page and at checkout before you complete a purchase. The price shown and agreed to at the time of your transaction governs that transaction.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Subscriptions auto-renew at the then-current price each billing period until cancelled.</li>
              <li>Certain plans may include a one-time setup fee.</li>
              <li>Payments are processed securely by our payment processor (currently <strong>PayPal</strong>). We do not store full card numbers.</li>
              <li>We provide at least <strong>30 days' notice</strong> of price changes affecting renewals.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">5.1 Pre-Paid Multi-Month Plans</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Some subscriptions are offered on a <strong>pre-paid multi-month billing cadence</strong> (for example, billed once every 3 months). For these plans:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>You are charged the <strong>full multi-month amount up front</strong> at the start of each billing period, and the plan auto-renews for another full multi-month period until cancelled.</li>
              <li>Pre-paid periods are <strong className="text-red-600">non-refundable</strong>. If you cancel, your access continues until the end of the period you have already paid for, and your subscription is not renewed afterward — we do not refund or prorate the unused portion of a pre-paid period.</li>
              <li>Cancelling stops the <strong>next</strong> renewal only; it does not refund the current pre-paid period.</li>
            </ul>
          </section>


          {/* 6. Subscription Management */}
          <section className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subscription Management</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">6.1 Pause Subscription</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You may pause an eligible subscription:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Maximum pause duration: 3 months per pause</li>
              <li>Maximum pauses per year: 3</li>
              <li>Billing pauses during the pause period</li>
              <li>Subscription automatically resumes on the selected date</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.2 Cancel Subscription</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You may cancel your subscription at any time:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>No future billing after cancellation</li>
              <li>Access continues until the end of your current billing period</li>
              <li>Your data is preserved (subject to the Privacy Policy)</li>
              <li><strong className="text-red-600">No refunds</strong> for the unused portion of the current billing period</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">6.3 Delete Account</h3>
            <p className="text-gray-700 leading-relaxed mb-3">You may permanently delete your account:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li>Any active subscription is cancelled immediately</li>
              <li>Personal data is removed per our Privacy Policy; <strong>financial/transaction records are retained for legal compliance</strong></li>
              <li>Deletion cannot be undone</li>
              <li><strong className="text-red-600">No refund</strong> for the unused portion of the current billing period</li>
              <li><strong>Session-credit refund:</strong> up to <strong>2</strong> unused, non-expired session credits may be refunded at the per-session rate you actually paid; additional credits at your trainer's discretion</li>
            </ul>
          </section>

          {/* 7. Refund Policy */}
          <section className="mb-8 bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Refund Policy</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.1 General Policy</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Except as expressly stated in these Terms or required by law, <strong className="text-red-600">all sales are final.</strong> We do not provide refunds or proration for:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Cancelled subscriptions (unused portion of the billing period)</li>
              <li>Unused training sessions, except as provided in Sections 6.3 and 8</li>
              <li>Paused subscriptions</li>
              <li>Change of mind or dissatisfaction with results</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.2 Discretionary Exceptions</h3>
            <p className="text-gray-700 leading-relaxed mb-2">Refunds may be issued at our sole discretion for:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li><strong>Billing errors:</strong> incorrect charges or duplicate transactions</li>
              <li><strong>Unauthorized charges:</strong> confirmed fraudulent transactions</li>
              <li><strong>Service unavailability:</strong> extended outage or trainer unavailability attributable to us</li>
              <li><strong>Documented medical emergencies</strong></li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">7.3 Requesting a Refund</h3>
            <p className="text-gray-700 leading-relaxed">
              To request a refund, email <a href="mailto:billing@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">billing@shrey.fit</a> or <a href="mailto:support@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">support@shrey.fit</a>.
            </p>
          </section>

          {/* 11. Communications */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Communications &amp; Notifications</h2>
            <p className="text-gray-700 leading-relaxed">
              By creating an account, you consent to receive transactional and service messages (verification codes, account/billing notices, workout and check-in reminders, and security alerts) by email and, where you opt in, by SMS. With your consent, we may also send marketing communications, which you can opt out of at any time via the unsubscribe link or your profile preferences.
            </p>
          </section>

          {/* 14/15. Disclaimers */}
          <section className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Disclaimers &amp; Limitation of Liability</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.1 No Medical Advice</h3>
            <p className="text-gray-700 leading-relaxed mb-3"><strong>IMPORTANT:</strong></p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 mb-4">
              <li>Our Service provides fitness coaching, NOT medical advice</li>
              <li>Trainers are fitness professionals, NOT physicians</li>
              <li>Consult your physician before beginning any exercise program</li>
              <li>Medical advice from a licensed provider takes precedence over trainer guidance</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">15.2 Assumption of Risk</h3>
            <p className="text-gray-700 leading-relaxed font-bold text-red-700">
              WARNING: Exercise involves inherent risks, including serious injury or death. By using our Service, you knowingly and voluntarily assume all such risks, including physical injury, property damage, medical complications, and death.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">15.5 Limitation of Liability</h3>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages, and our total liability is limited to the greater of the amount you paid us in the prior 12 months or USD&nbsp;$100.
            </p>
          </section>

          {/* 17. Arbitration */}
          <section className="mb-8 bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Dispute Resolution &amp; Arbitration</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              <strong>Please read carefully — this affects your legal rights.</strong> Most disputes can be resolved informally by contacting <a href="mailto:legal@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">legal@shrey.fit</a>. If not resolved, disputes are settled by <strong>binding individual arbitration</strong> (AAA Consumer Arbitration Rules) rather than in court, and you and Shrey.Fit waive the right to participate in a <strong>class action</strong>.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li><strong>Small-claims carve-out:</strong> qualifying claims may still be brought in small-claims court.</li>
              <li><strong>30-day opt-out:</strong> you may opt out of arbitration by emailing legal@shrey.fit within 30 days of first accepting these Terms.</li>
              <li><strong>Governing law:</strong> State of Washington, United States.</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-8 bg-gray-50 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">For questions about these Terms:</p>
            <ul className="space-y-2 text-gray-700">
              <li><strong>Legal:</strong> <a href="mailto:legal@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">legal@shrey.fit</a></li>
              <li><strong>Support:</strong> <a href="mailto:support@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">support@shrey.fit</a></li>
              <li><strong>Billing:</strong> <a href="mailto:billing@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">billing@shrey.fit</a></li>
              <li><strong>Privacy:</strong> <a href="mailto:privacy@shrey.fit" className="text-blue-600 hover:text-blue-700 underline">privacy@shrey.fit</a></li>
              <li><strong>Mailing address:</strong> available upon request to legal@shrey.fit</li>
            </ul>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8 border-2 border-gray-300 p-6 rounded-lg bg-gray-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Acknowledgment</h2>
            <p className="text-gray-700 leading-relaxed font-semibold mb-4">
              BY CLICKING "I AGREE" OR BY ACCESSING OR USING OUR SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE, INCLUDING THE ARBITRATION AGREEMENT AND CLASS-ACTION WAIVER (SECTION 17) AND THE ASSUMPTION OF RISK (SECTION 15.2).
            </p>
            <p className="text-gray-700 leading-relaxed font-semibold">
              YOU FURTHER ACKNOWLEDGE THAT YOU ASSUME ALL RISKS ASSOCIATED WITH PHYSICAL EXERCISE AND THAT SHREY.FIT IS NOT LIABLE FOR ANY INJURIES OR DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Footer Info */}
          <div className="text-center text-gray-600 text-sm pt-8 border-t border-gray-200">
            <p className="mb-2"><strong>Last Updated:</strong> June 25, 2026</p>
            <p className="mb-4"><strong>Version:</strong> 2.0</p>
            <p>
              <Link href="/legal/privacy" className="text-blue-600 hover:text-blue-700 underline">Privacy Policy</Link>
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
