// Client Resources hub content (static config — Option A).
//
// Single source of truth for the paywalled Resources page at
// /dashboard/client/resources. Add/curate entries here; no backend needed.
// A later iteration can move this to Firestore for trainer-editable resources.

export interface ResourceLink {
  title: string;
  description: string;
  href: string;
  /** External links open in a new tab. */
  external?: boolean;
  /** Optional badge, e.g. "Free", "New". */
  badge?: string;
}

export interface ResourceSection {
  id: string;
  title: string;
  description: string;
  /** lucide-react icon name resolved in the page. */
  icon:
    | 'PlayCircle'
    | 'BookOpen'
    | 'Apple'
    | 'HelpCircle'
    | 'Compass'
    | 'Download'
    | 'MessageSquare';
  links: ResourceLink[];
}

export const resourceSections: ResourceSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New here? Learn how to get the most out of your dashboard.',
    icon: 'Compass',
    links: [
      {
        title: 'Log your daily activity',
        description: 'Record weight, steps, water, and habits in Daily Activities to power your progress metrics.',
        href: '/dashboard/client/activity',
      },
      {
        title: 'Complete your workouts',
        description: 'Find assigned workouts, log your sets, and build your training streak.',
        href: '/dashboard/client/workouts',
      },
      {
        title: 'Submit your weekly survey',
        description: 'Give your coach a snapshot of your energy, sleep, and adherence each week.',
        href: '/dashboard/client/survey',
      },
      {
        title: 'Upload progress photos',
        description: 'Track visual changes over time — a powerful complement to the scale.',
        href: '/dashboard/client/photos',
      },
    ],
  },
  {
    id: 'video-library',
    title: 'Exercise Video Library',
    description: 'Browse demonstrations with form cues for every movement in your plan.',
    icon: 'PlayCircle',
    links: [
      {
        title: 'Open the Exercise Library',
        description: 'Searchable video demos organized by muscle group and movement pattern.',
        href: '/library',
        badge: 'Free',
        external: true,
      },

    ],
  },
  {
    id: 'guides',
    title: 'Training Guides & Articles',
    description: 'Coaching philosophy and practical guides to train smarter.',
    icon: 'BookOpen',
    links: [
      {
        title: 'The 40/60 Rule',
        description: 'Why nutrition and training work together — and how to balance them.',
        href: '/blog/forty-sixty-rule',
        external: true,
      },
      {
        title: 'Control First',
        description: 'Master control and tempo before chasing heavier weight.',
        href: '/blog/control-first',
        external: true,
      },
      {
        title: 'Mind-Muscle Connection',
        description: 'How to actually feel the target muscle working for better results.',
        href: '/blog/mind-muscle',
        external: true,
      },
      {
        title: 'A Sustainable Approach',
        description: 'Building habits that last instead of chasing quick fixes.',
        href: '/blog/sustainable-approach',
        external: true,
      },
      {
        title: 'Nutrition Framework',
        description: 'A simple framework for eating to support your goals.',
        href: '/blog/nutrition-framework',
        external: true,
      },
      {
        title: 'All Articles',
        description: 'Browse the full blog for more training and nutrition insights.',
        href: '/blog',
        external: true,
      },

    ],
  },
  {
    id: 'nutrition',
    title: 'Nutrition Resources',
    description: 'Tools and guidance to dial in your nutrition.',
    icon: 'Apple',
    links: [
      {
        title: 'Nutrition Hub',
        description: 'Your macros, meal plan, and habits — all in one place.',
        href: '/dashboard/client/nutrition',
      },
      {
        title: 'Nutrition Resources',
        description: 'Guides and references curated by your coach in the Nutrition Hub.',
        href: '/dashboard/client/nutrition?tab=resources',
      },

    ],
  },
  {
    id: 'support',
    title: 'Help & Support',
    description: 'Questions about training, billing, or the app? Start here.',
    icon: 'HelpCircle',
    links: [
      {
        title: 'Message your coach',
        description: 'Reach out directly with questions about your plan or progress.',
        href: '/dashboard/client/messages',
      },
      {
        title: 'Your trainer',
        description: 'See who your coach is and how to work with them.',
        href: '/dashboard/client/trainer',
      },
      {
        title: 'Membership & Billing',
        description: 'Manage your subscription, invoices, and payment method.',
        href: '/dashboard/client/membership',
      },
      {
        title: 'FAQ',
        description: 'Answers to common questions about coaching and the platform.',
        href: '/faq',
        external: true,
      },

    ],
  },
];

// Quick FAQ shown as accordions on the Resources page.
export interface ResourceFaq {
  question: string;
  answer: string;
}

export const resourceFaqs: ResourceFaq[] = [
  {
    question: 'How do my dashboard metrics update?',
    answer:
      'Metrics like weight, steps, and streaks update as you log data in Daily Activities and complete your assigned workouts. Strength metrics update automatically when you log weights and reps on your workouts.',
  },
  {
    question: 'How do I reach my coach?',
    answer:
      'Use Coach Chat (in the Support section of the sidebar) to message your coach anytime. For coaching clients, your coach also leaves notes and adjustments in your plan each week.',
  },
  {
    question: 'When will I see my Personal Records?',
    answer:
      'Personal Records appear on your dashboard once you complete a strength workout with logged weight and reps. Each new all-time best for an exercise is recorded automatically.',
  },
  {
    question: 'How do I schedule a session or check-in?',
    answer:
      'Use "Schedule 1-on-1" or "Weekly Check-ins" in the Training section of the sidebar to book time with your coach.',
  },
];
