import { Instagram, Youtube, Linkedin, Facebook } from 'lucide-react';
import { SITE } from '@/lib/seo';

/**
 * Company social links.
 *
 * Single source of truth is `SITE.sameAs` in `@/lib/seo`. This component maps
 * each known URL to its brand icon and label so the same set renders
 * consistently in the Footer and on the About page.
 *
 * Note: lucide-react no longer ships TikTok and X (Twitter) brand icons, so
 * those are provided as small inline SVGs below.
 */

type IconProps = { className?: string };

function TikTokIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.53 1.5h3.02c.17 1.03.66 1.98 1.4 2.72a4.9 4.9 0 0 0 2.72 1.4v3.02a7.9 7.9 0 0 1-4.12-1.24v6.03a5.9 5.9 0 1 1-5.9-5.9c.2 0 .4.01.6.03v3.1a2.85 2.85 0 1 0 2 2.72V1.5Z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64Z" />
    </svg>
  );
}

type SocialEntry = {
  label: string;
  href: string;
  Icon: React.ComponentType<IconProps>;
};

/** Match a sameAs URL to its platform metadata. Order defines display order. */
const MATCHERS: { label: string; test: RegExp; Icon: React.ComponentType<IconProps> }[] = [
  { label: 'Instagram', test: /instagram\.com/i, Icon: Instagram },
  { label: 'YouTube', test: /youtube\.com/i, Icon: Youtube },
  { label: 'TikTok', test: /tiktok\.com/i, Icon: TikTokIcon },
  { label: 'LinkedIn', test: /linkedin\.com/i, Icon: Linkedin },
  { label: 'Facebook', test: /facebook\.com/i, Icon: Facebook },
  { label: 'X', test: /(^|\/\/)(x\.com|twitter\.com)/i, Icon: XIcon },
];

/** Company social links derived from SITE.sameAs, in a stable display order. */
export function getCompanySocials(): SocialEntry[] {
  const entries: SocialEntry[] = [];
  for (const { label, test, Icon } of MATCHERS) {
    const href = SITE.sameAs.find((url) => test.test(url));
    if (href) entries.push({ label, href, Icon });
  }
  return entries;
}

type SocialLinksProps = {
  /** Extra classes for the wrapping <div>. */
  className?: string;
  /** Extra classes applied to each anchor. */
  linkClassName?: string;
  /** Extra classes applied to each icon. */
  iconClassName?: string;
};

/**
 * Renders the company social icon row from `SITE.sameAs`.
 * Styling is fully controlled by the caller via the *ClassName props.
 */
export function SocialLinks({
  className,
  linkClassName,
  iconClassName,
}: SocialLinksProps) {
  const socials = getCompanySocials();
  if (socials.length === 0) return null;

  return (
    <div className={className}>
      {socials.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={linkClassName}
        >
          <Icon className={iconClassName} />
        </a>
      ))}
    </div>
  );
}
