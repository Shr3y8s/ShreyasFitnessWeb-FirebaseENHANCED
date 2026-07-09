/**
 * Dynamic OpenGraph / Twitter card image (site-wide default).
 *
 * Next.js renders this at build/request time via the Edge runtime and serves
 * it as the default social-share image for every route that doesn't define its
 * own. Uses the default brand tagline. 1200x630 is the standard OG size.
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
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: '#38bdf8',
            marginBottom: 28,
          }}
        >
          {SITE.name}
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
            color: '#cbd5e1',
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
