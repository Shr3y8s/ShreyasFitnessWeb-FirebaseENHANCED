'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, FormEvent } from 'react';

import { validateAndFormatPhone } from '@/lib/phoneUtils';
import Mailcheck from 'mailcheck';
import disposableDomains from 'disposable-email-domains/index.json';
import { loadRecaptcha, executeRecaptcha } from '@/lib/recaptcha';
import { trackEvent } from '@/lib/firebase';
import { getAttribution, getAttributionForRecord } from '@/lib/attribution';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Dumbbell,

  ExternalLink,
  Handshake,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/shreyas-annapureddy/30min';


export default function ConnectPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'message'>('schedule');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
    newsletter: false,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showCalendlyFallback, setShowCalendlyFallback] = useState(false);


  // Calendly widget initialization is handled ENTIRELY by widget.js's built-in
  // auto-scan of the `.calendly-inline-widget` div (via its `data-url`). We do
  // NOT call `initInlineWidget` manually — combining a manual init with the
  // auto-scan is what previously created two stacked widgets intermittently.
  //
  // The widget div is also kept ALWAYS MOUNTED and toggled with CSS `display`
  // (see the Schedule panel in the JSX below) instead of being conditionally
  // rendered. That way the single auto-scanned iframe persists across tab
  // switches — so switching to "Send a Message" and back never leaves a blank
  // widget and never needs a page reload.

  useEffect(() => {

    // Check for #message hash in URL
    if (window.location.hash === '#message') {
      setActiveTab('message');
      setTimeout(() => {
        const messageElement = document.getElementById('message');
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Load Calendly script. If the script itself fails to load (blocked by an
    // ad blocker, content filter, or offline network), show the fallback link
    // immediately rather than leaving a permanently blank widget area.
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    script.onerror = () => {
      setShowCalendlyFallback(true);
    };
    document.body.appendChild(script);

    // Safety-net timeout: even if the script loads, Calendly's auto-scan may
    // be blocked further downstream (e.g. the iframe request itself is
    // blocked). If no iframe has appeared inside the widget container after
    // a few seconds, show the fallback too.
    const fallbackTimer = setTimeout(() => {
      const widgetEl = document.querySelector('.calendly-inline-widget');
      const hasIframe = widgetEl?.querySelector('iframe');
      if (!hasIframe) {
        setShowCalendlyFallback(true);
      }
    }, 6000);

    // Load reCAPTCHA script
    loadRecaptcha().catch((error) => {
      console.error('Failed to load reCAPTCHA:', error);
    });

    return () => {
      document.body.removeChild(script);
      clearTimeout(fallbackTimer);
    };
  }, []);


  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, phone: value });
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    if (emailSuggestion) {
      setEmailSuggestion(null);
    }
  };

  const handleEmailBlur = () => {
    if (!formData.email.trim()) {
      setEmailSuggestion(null);
      return;
    }
    Mailcheck.run({
      email: formData.email,
      suggested: (suggestion: { full: string }) => {
        setEmailSuggestion(suggestion.full);
      },
      empty: () => {
        setEmailSuggestion(null);
      },
    });
  };

  const acceptEmailSuggestion = () => {
    if (emailSuggestion) {
      setFormData({ ...formData, email: emailSuggestion });
      setEmailSuggestion(null);
    }
  };

  const handlePhoneBlur = () => {
    if (!formData.phone.trim()) {
      setPhoneError(null);
      return;
    }
    const validation = validateAndFormatPhone(formData.phone);
    if (!validation.isValid) {
      setPhoneError(validation.errorMessage || 'Invalid phone number');
    } else {
      setPhoneError(null);
      setFormData({ ...formData, phone: validation.formatted });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    if (!validateEmail(formData.email)) {
      setSubmitError('Please enter a valid email address.');
      setIsSubmitting(false);
      return;
    }

    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    if (emailDomain && disposableDomains.includes(emailDomain)) {
      setSubmitError('Disposable email addresses are not allowed. Please use a permanent email address.');
      setIsSubmitting(false);
      return;
    }

    if (formData.phone.trim()) {
      const phoneValidation = validateAndFormatPhone(formData.phone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.errorMessage || 'Invalid phone number');
        setSubmitError('Please correct the errors in the form.');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const recaptchaToken = await executeRecaptcha('contact_form');

      const phoneValidation = validateAndFormatPhone(formData.phone);
      const phoneToStore = phoneValidation.isValid ? phoneValidation.e164 : null;

      const serviceSelect = document.getElementById('service') as HTMLSelectElement;
      const serviceDisplayText = serviceSelect?.options[serviceSelect.selectedIndex]?.text || '';

      const response = await fetch('/api/submit-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: phoneToStore,
          service: formData.service,
          serviceDisplayText: serviceDisplayText,
          message: formData.message.trim(),
          newsletter: formData.newsletter,
          recaptchaToken: recaptchaToken,
          // Marketing attribution (UTM/gclid) so the lead can be traced back to
          // the channel that drove it. null when the visitor arrived with no
          // campaign params (e.g. direct/organic).
          attribution: getAttributionForRecord(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      // GA4 funnel: lead captured. Attribution is spread flat so it surfaces as
      // event params in GA4 (source/medium/campaign) for channel reporting.
      trackEvent('connect_form_submit', {
        service: formData.service || undefined,
        ...getAttribution(),
      });

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        service: '',
        message: '',
        newsletter: false,
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      setSubmitError(error.message || 'There was an error sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceDisplayName = () => {
    const serviceSelect = document.getElementById('service') as HTMLSelectElement;
    if (serviceSelect && serviceSelect.selectedIndex !== -1) {
      return serviceSelect.options[serviceSelect.selectedIndex].text;
    }
    return 'our services';
  };

  const inputClass =
    'w-full rounded-lg border border-emerald-600/25 bg-white px-4 py-2.5 text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      {/* ===================== MOTIVATIONAL BANNER ===================== */}
      <section className="pt-28 pb-8 md:pt-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-12 text-center shadow-xl md:px-14">
            <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
              THE BEST TIME TO START WAS YESTERDAY.
              <br />
              THE SECOND BEST TIME IS TODAY.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-emerald-50">
              As your dedicated fitness coach, I&apos;ll provide the <strong>expert guidance</strong>,{' '}
              <strong>accountability</strong>, and <strong>personalized attention</strong> you need to
              achieve lasting results – whether you&apos;re a{' '}
              <span className="font-semibold text-white">complete beginner</span> or looking to reach{' '}
              <span className="font-semibold text-white">new heights</span>.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 rounded-full bg-white px-7 text-base text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/services">
                Take the first step <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== CONNECT OPTIONS ===================== */}
      <section id="connect-options" className="pb-16">
        <div className="mx-auto max-w-5xl px-6">
          {/* Connection cards / tab switcher */}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-start gap-4 rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)] ${
                activeTab === 'schedule'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-[0_0_18px_oklch(65%_0.16_151_/_0.2)]'
                  : 'border-emerald-600/25 bg-white hover:border-emerald-600/40'
              }`}

            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CalendarCheck className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Schedule a Free Consultation</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Book a 15-minute slot directly on my calendar
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  Select this option <ArrowRight className="size-3.5" />
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('message')}
              className={`flex items-start gap-4 rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)] ${
                activeTab === 'message'
                  ? 'border-emerald-600 bg-emerald-50/70 shadow-[0_0_18px_oklch(65%_0.16_151_/_0.2)]'
                  : 'border-emerald-600/25 bg-white hover:border-emerald-600/40'
              }`}

            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Send className="size-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Send a Message</h3>
                <p className="mt-1 text-sm text-stone-600">Get a response within 2-4 hours</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  Select this option <ArrowRight className="size-3.5" />
                </span>
              </div>
            </button>
          </div>

          {/* Content area */}
          <div className="mt-8">
            {/* Schedule content — ALWAYS MOUNTED, toggled with CSS `display` so the
                single auto-scanned Calendly iframe persists across tab switches
                (never unmounted → never blank on return, never duplicated). */}
            <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
              <Card className="border-emerald-600/25 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">

                <CardContent className="p-6 md:p-8">
                  <div className="text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <CalendarCheck className="size-6" />

                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-stone-900">
                      Schedule a Free Consultation
                    </h2>
                    <p className="mt-2 text-stone-600">
                      Book a 15-minute consultation directly on my calendar
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700">
                      <Clock className="size-4" />
                      Available Monday-Friday, 8am-6pm PST
                    </div>
                  </div>

                  <div className="mt-6">
                    {/* Auto-scanned by Calendly's widget.js via data-url — no manual
                        init. Kept mounted (parent toggles display) so the iframe
                        survives tab switches. */}
                    <div
                      className="calendly-inline-widget"
                      data-url="https://calendly.com/shreyas-annapureddy/30min"
                      style={{ minWidth: '320px', height: '800px' }}
                    ></div>
                  </div>

                  {showCalendlyFallback && (
                    <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-800">
                      <span>Having trouble loading the scheduler?</span>
                      <a
                        href={CALENDLY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-emerald-700 underline hover:text-emerald-800"
                      >
                        Book directly on Calendly <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-stone-500">

                    <Info className="size-4 text-emerald-600" />
                    <span>
                      Select a time that works for you. You&apos;ll receive a confirmation email with
                      details
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Message content */}
            {activeTab === 'message' && (
              <Card id="message" className="border-emerald-600/25 bg-white transition-all duration-300 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.2)]">

                <CardContent className="p-6 md:p-8">
                  <div className="text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Send className="size-6" />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-stone-900">Send a Message</h2>
                    <p className="mt-2 text-stone-600">
                      Fill out the form below and I&apos;ll get back to you within 24 hours
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700">
                      <Clock className="size-4" />
                      Typical response time: 2-4 hours
                    </div>
                  </div>

                  {!submitSuccess ? (
                    <form onSubmit={handleSubmit} id="contact-form" className="mt-8 space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="name" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                            <User className="size-4 text-emerald-600" /> Your Name{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label htmlFor="email" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                            <Mail className="size-4 text-emerald-600" /> Email Address{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            placeholder="Enter your email address"
                            required
                            value={formData.email}
                            onChange={handleEmailChange}
                            onBlur={handleEmailBlur}
                            className={inputClass}
                          />
                          {emailSuggestion && (
                            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
                              Did you mean{' '}
                              <button
                                type="button"
                                onClick={acceptEmailSuggestion}
                                className="font-medium text-emerald-700 underline"
                              >
                                {emailSuggestion}
                              </button>
                              ?
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="phone" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                            <Phone className="size-4 text-emerald-600" /> Phone Number{' '}
                            <span className="text-stone-400">(Optional)</span>
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            autoComplete="tel"
                            placeholder="(555) 123-4567"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            onBlur={handlePhoneBlur}
                            className={`${inputClass} ${phoneError ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                          />
                          {phoneError && (
                            <span className="mt-1 block text-sm text-red-500">{phoneError}</span>
                          )}
                        </div>

                        <div>
                          <label htmlFor="service" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                            <Dumbbell className="size-4 text-emerald-600" /> Service Interest{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="service"
                            name="service"
                            required
                            value={formData.service}
                            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                            className={inputClass}
                          >
                            <option value="" disabled>
                              Select a service
                            </option>
                            <option value="inperson">In-Person Training</option>
                            <option value="online">Online Coaching</option>
                            <option value="complete">Complete Transformation</option>
                            <option value="questions">General Questions</option>
                            <option value="other">Other Inquiry</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message-text" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-stone-700">
                          <MessageSquare className="size-4 text-emerald-600" /> Your Message{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="message-text"
                          name="message"
                          rows={5}
                          placeholder="Tell me about your fitness goals, current fitness level, any injuries or concerns, and what you hope to achieve through training..."
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className={inputClass}
                        ></textarea>
                      </div>

                      <label
                        htmlFor="newsletter"
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-600/20 bg-emerald-50/40 p-4"
                      >
                        <input
                          type="checkbox"
                          id="newsletter"
                          name="newsletter"
                          checked={formData.newsletter}
                          onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                          className="mt-1 size-4 accent-emerald-600"
                        />
                        <span>
                          <span className="block font-medium text-stone-800">
                            Subscribe to my fitness newsletter
                          </span>
                          <span className="block text-sm text-stone-500">
                            Get weekly tips, workout ideas, and nutrition advice
                          </span>
                        </span>
                      </label>

                      {submitError && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                          {submitError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 w-full rounded-full bg-emerald-600 text-base hover:bg-emerald-700"
                      >
                        <Send className="size-4" />
                        {isSubmitting ? 'Sending...' : 'Send Message'}
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
                        <ShieldCheck className="size-4 text-emerald-600" />
                        <span>Your information is secure and will never be shared</span>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-8 text-center">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="size-8" />
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-stone-900">
                        Message Sent Successfully!
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-stone-600">
                        Thank you for reaching out. I&apos;ll get back to you regarding your interest
                        in <strong>{serviceDisplayName()}</strong> within 2-4 hours.
                      </p>
                      <Button
                        onClick={() => setSubmitSuccess(false)}
                        className="mt-6 rounded-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        Send Another Message <Send className="size-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Get In Touch Section */}
          <div className="mt-14">
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Handshake className="size-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-stone-900">Get In Touch</h2>
              <p className="mt-2 text-stone-600">
                Have questions or ready to start your fitness journey? I&apos;m here to help
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <Card className="border-emerald-600/20 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Mail className="size-5" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-900">Email</h3>
                      <p className="mt-1 text-sm">
                        <a href="mailto:info@shrey.fit" className="text-emerald-700 hover:underline">
                          info@shrey.fit
                        </a>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-600/20 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Phone className="size-5" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-900">WhatsApp</h3>
                      <p className="mt-1 text-sm">
                        <a
                          href="https://wa.me/14258299961"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline"
                        >
                          (425) 829-9961
                        </a>
                      </p>
                      <p className="text-xs text-stone-500">Available Monday-Friday, 8am-6pm PST</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-600/20 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <MapPin className="size-5" />
                    </div>

                    <div>
                      <h3 className="font-semibold text-stone-900">Location</h3>
                      <p className="mt-1 text-sm text-stone-700">Ironworks Gym</p>
                      <p className="text-sm">
                        <a
                          href="https://maps.google.com/?q=12708+Northup+Way,+Bellevue,+WA+98005"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline"
                        >
                          12708 Northup Way, Bellevue, WA 98005
                        </a>
                      </p>
                      <p className="text-xs text-stone-500">
                        In-person sessions available at this location
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-hidden rounded-2xl border border-emerald-600/20 bg-white">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3427.596730827469!2d-122.17353032360579!3d47.62884567119191!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x54906cfb814a2ebb%3A0x19407c747d7bf0e2!2s12708%20Northup%20Way%2C%20Bellevue%2C%20WA%2098005!5e1!3m2!1sen!2sus!4v1753525549530!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: '360px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
