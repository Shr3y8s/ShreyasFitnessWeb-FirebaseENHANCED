// Marketing Campaign presets.
//
// Reusable, ready-to-send starting points for the campaign editor. Each preset
// pre-fills every field in the "Email Content" section (campaign name, subject,
// headline, body, discount code, offer expiry, CTA label + target). The admin
// can load a preset and then tweak any field, or ignore presets entirely and
// compose from scratch.
//
// These are intentionally kept in code (not Firestore) so they can be
// versioned/reviewed with the rest of the app. If we later want admin-authored
// presets, we can layer a Firestore collection on top with the same shape.

import type { CtaTarget } from '@/types/campaigns';

export interface CampaignPreset {
  /** Stable id used by the loader dropdown. */
  id: string;
  /** Human label shown in the loader dropdown. */
  label: string;
  /** Short helper text describing when to use this preset. */
  description: string;
  /** Internal campaign name suggestion. */
  name: string;
  /** Email subject line. */
  subject: string;
  /** Big headline at the top of the email body. */
  headline: string;
  /** Main paragraph copy. */
  body: string;
  /** CTA button label. */
  ctaLabel: string;
  /** Where the CTA button points. */
  ctaTarget: CtaTarget;
  /** Optional promo/discount code to feature. */
  discountCode?: string;
  /** Optional human-readable expiry, e.g. "Nov 30, 2025". */
  expiryDate?: string;
}

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    id: 'launch-special',
    label: 'Launch Special (Beta invite)',
    description: 'Soft-launch invite with a time-limited launch discount.',
    name: 'Launch Special — Beta Invites',
    subject: 'You’re invited to explore SHREY.FIT — launch special inside',
    headline: 'You’re invited to explore SHREY.FIT',
    body:
      'We’re opening the doors to personalized coaching, structured training, and nutrition guidance built around you.\n\n' +
      'As a thank-you for joining us early, use the launch code below for a special rate when you sign up. Come take a look — we’d love to have you.',
    ctaLabel: 'Explore & Join',
    ctaTarget: 'signup',
    discountCode: 'LAUNCH25',
    expiryDate: '',
  },
  {
    id: 'thanksgiving',
    label: 'Thanksgiving Promotion',
    description: 'Seasonal gratitude message with a holiday offer.',
    name: 'Thanksgiving Promotion',
    subject: 'A Thanksgiving thank-you from SHREY.FIT 🦃',
    headline: 'This season, invest in you',
    body:
      'Thank you for being part of our community. As the holidays begin, we’re making it easier to commit to your health goals.\n\n' +
      'Use the code below to get started with personalized coaching and training — our way of saying thanks.',
    ctaLabel: 'Claim Your Offer',
    ctaTarget: 'signup',
    discountCode: 'THANKS25',
    expiryDate: 'Nov 30, 2025',
  },
  {
    id: 'new-year',
    label: 'New Year Kickstart',
    description: 'New-year resolution push with a fresh-start offer.',
    name: 'New Year Kickstart',
    subject: 'Make this the year it sticks — start with SHREY.FIT',
    headline: 'A stronger year starts now',
    body:
      'Resolutions fade — systems last. This year, get a plan built around your goals with coaching, structured training, and nutrition guidance that actually fits your life.\n\n' +
      'Kick off the new year with the offer below.',
    ctaLabel: 'Start Strong',
    ctaTarget: 'signup',
    discountCode: 'NEWYEAR',
    expiryDate: 'Jan 31, 2026',
  },
  {
    id: 'friends-family-beta',
    label: 'Friends & Family (Exclusive Early Access)',
    description:
      'VIP early-reveal invite for a hand-picked inner circle to test the full experience before public launch, with an insider discount.',
    name: 'Friends & Family — Early Access',
    subject: 'You’re in — a private first look at SHREY.FIT ✨',
    headline: 'You’ve been hand-picked for the first look',
    body:
      'Before SHREY.FIT opens to the public, I wanted a small, trusted circle to step inside first — and **you’re one of the few I chose.**\n\n' +
      'This is an exclusive early reveal, and I’d love for you to really use it. Create your account and pick a coaching plan — either **Online Coaching** or the **Complete Transformation** — so you can experience the full client dashboard, workouts, nutrition, and progress tracking the way a real member would. While you’re at it, take your time exploring the site itself — the services, the story, and every page I’ve poured a lot into.\n\n' +
      '**Don’t worry about the cost.** The code below applies a heavy insider discount on the Online Coaching and Complete Transformation plans — it’s there so you can test everything freely, not to charge you real money. (Heads up: the code works only on those two subscription plans. If you’d also like to try booking a one-on-one training session, just reach out and I’ll send you a separate code for that.)\n\n' +
      'Once you’re inside, poke around, click everything, and see how it feels. I’ll follow up with you personally to hear your thoughts — or you can message me anytime right inside the coach chat in your dashboard.\n\n' +
      'Thank you for being part of this from the very beginning. It genuinely means a lot to have you in my corner.',

    ctaLabel: 'Claim My Access',
    ctaTarget: 'signup',
    discountCode: '',
    expiryDate: '',
  },
  {
    id: 'services-tour',
    label: 'Services Tour (No discount)',

    description: 'Straightforward invite to browse services, no promo code.',
    name: 'Explore Our Services',
    subject: 'See what coaching with SHREY.FIT looks like',
    headline: 'Find the right fit for your goals',
    body:
      'From one-on-one coaching to structured training and nutrition guidance, we have options for wherever you are on your journey.\n\n' +
      'Take a look at what’s available and find the fit that’s right for you.',
    ctaLabel: 'View Services',
    ctaTarget: 'services',
    discountCode: '',
    expiryDate: '',
  },
];

export function getPreset(id: string): CampaignPreset | undefined {
  return CAMPAIGN_PRESETS.find((p) => p.id === id);
}
