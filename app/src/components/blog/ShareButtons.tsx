'use client';

/**
 * ShareButtons — "Share this" affordance for blog posts / marketing pages.
 *
 * Renders LinkedIn, X, Facebook, and Copy-link controls. Every link is
 * UTM-tagged (via `shareIntentUrl`) so Phase 3 GA4 tracking can attribute
 * inbound clicks back to the network. Network share links open in a popup;
 * copy-link writes the tagged URL to the clipboard with a toast confirmation.
 *
 * When `enableNativeShare` is set and the browser supports the Web Share API
 * (primarily mobile), a native "Share" button is shown first — ideal for
 * short-form video that spreads via WhatsApp/iMessage/Instagram DMs.
 *
 * Growth & Acquisition — Phase 2 (social presence & launch), task Track B.1.
 * See docs/02-implementation/growth-acquisition/requirements.md (US-4 / AC-4.1).
 */

import { useEffect, useState } from 'react';
import {
  Linkedin,
  Facebook,
  Link2,
  Check,
  Share2,
  Send,
  MessageCircle,
  Mail,
} from 'lucide-react';

import { shareIntentUrl, shareTargetUrl } from '@/lib/share';
import { SITE } from '@/lib/seo';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShareButtonsProps {
  /** Root-relative path being shared, e.g. `/blog/forty-sixty-rule`. */
  path: string;
  /** Title used for the X/Twitter compose text (and native share sheet). */
  title: string;
  /** Optional campaign label to override the default `share_button`. */
  campaign?: string;
  /** Optional heading shown above the buttons. */
  label?: string;
  /**
   * Show a native OS share button when the Web Share API is available.
   * Best for video/mobile-first content. Falls back silently on desktop.
   */
  enableNativeShare?: boolean;
  className?: string;
}

/** X logo (not in lucide's stable set) as an inline glyph. */
function XGlyphIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const BTN =
  'inline-flex size-10 items-center justify-center rounded-full border border-emerald-600/20 bg-white text-stone-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-600/40 hover:text-emerald-700 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50';

export function ShareButtons({
  path,
  title,
  campaign,
  label = 'Share this article',
  enableNativeShare = false,
  className,
}: ShareButtonsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Detect Web Share API on the client only (avoids SSR/hydration mismatch).
  useEffect(() => {
    if (enableNativeShare && typeof navigator !== 'undefined' && !!navigator.share) {
      setCanNativeShare(true);
    }
  }, [enableNativeShare]);

  const openPopup = (network: 'linkedin' | 'x' | 'facebook' | 'whatsapp') => {
    const url = shareIntentUrl({
      path,
      network,
      title,
      via: SITE.twitterHandle,
      campaign,
    });
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
  };

  const shareByEmail = () => {
    // mailto: must navigate the current window; a popup would be blank/blocked.
    window.location.href = shareIntentUrl({ path, network: 'email', title, campaign });
  };


  const nativeShare = async () => {
    // Reuse the copy-link UTM tagging (source=copy_link) for native shares.
    const url = shareTargetUrl(path, 'copy', campaign);
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled or share failed — no-op (not an error worth surfacing).
    }
  };

  const copyLink = async () => {
    const url = shareTargetUrl(path, 'copy', campaign);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied', description: 'Share it anywhere you like.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Your browser blocked clipboard access. Copy from the address bar instead.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600">
        <Share2 className="size-4 text-emerald-600" />
        {label}
      </span>
      <div className="flex items-center gap-2">
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className={BTN}
            aria-label="Share"
            title="Share"
          >
            <Send className="size-[18px]" />
          </button>
        )}
        <button
          type="button"
          onClick={() => openPopup('linkedin')}
          className={BTN}
          aria-label="Share on LinkedIn"
          title="Share on LinkedIn"
        >
          <Linkedin className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => openPopup('x')}
          className={BTN}
          aria-label="Share on X"
          title="Share on X"
        >
          <XGlyphIcon className="size-[16px]" />
        </button>
        <button
          type="button"
          onClick={() => openPopup('facebook')}
          className={BTN}
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <Facebook className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => openPopup('whatsapp')}
          className={BTN}
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
        >
          <MessageCircle className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={shareByEmail}
          className={BTN}
          aria-label="Share by email"
          title="Share by email"
        >
          <Mail className="size-[18px]" />
        </button>
        <button
          type="button"
          onClick={copyLink}

          className={cn(BTN, copied && 'border-emerald-600/50 text-emerald-700')}
          aria-label="Copy link"
          title="Copy link"
        >
          {copied ? <Check className="size-[18px]" /> : <Link2 className="size-[18px]" />}
        </button>
      </div>
    </div>
  );
}
