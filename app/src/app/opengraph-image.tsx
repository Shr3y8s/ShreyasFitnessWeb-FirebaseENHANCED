/**
 * Dynamic OpenGraph / Twitter card image (site-wide default).
 *
 * Next.js renders this at build/request time via the Edge runtime and serves
 * it as the default social-share image for every route that doesn't define its
 * own. Uses the default brand tagline.
 *
 * Sized at the universal 1200x630 (1.91:1) OG standard — the dimension every
 * platform (Facebook, X, LinkedIn, WhatsApp, Discord, Slack) is built around
 * and that validators expect exactly. (LinkedIn's Post Inspector "prefers"
 * >=1600px wide, but that is a soft hint, not a requirement — 1200x630 renders
 * correctly there; matching the universal standard is the higher-value choice.)
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */
import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

export const runtime = 'edge';
export const alt = `${SITE.name} — Personal Training & Fitness Coaching`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          // The exact app body background: bg-gradient-to-br from-emerald-50
          // via-white to-teal-50. Dark text on this light wash is the highest-
          // contrast, most on-brand option and matches the marketing site 1:1.
          background:
            'linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #f0fdfa 100%)',
          color: '#1f2937',
          fontFamily: 'sans-serif',
        }}
      >
        {/* SHREY·FIT wordmark — reproduces the MarketingNav lockup exactly:
            gray-800 letters with the signature emerald-600 dot. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#1f2937',
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex' }}>SHREY</div>
          <div
            style={{
              display: 'flex',
              color: '#059669',
              fontSize: 44,
              fontWeight: 800,
              margin: '0 2px',
              position: 'relative',
              top: -3,
            }}
          >
            .
          </div>
          <div style={{ display: 'flex' }}>FIT</div>
        </div>
        <div
          style={{
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 960,
          }}
        >
          Personal Training &amp; Fitness Coaching
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            color: '#4b5563',
            marginTop: 32,
            maxWidth: 960,
            lineHeight: 1.35,
          }}
        >
          A sustainable, control-first approach that builds real strength,
          better habits, and lasting results.
        </div>
      </div>
    ),
    { ...size },
  );
}
