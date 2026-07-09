/**
 * Dynamic OpenGraph / Twitter card image (site-wide default).
 *
 * Next.js renders this at build/request time via the Edge runtime and serves
 * it as the default social-share image for every route that doesn't define its
 * own. Uses the default brand tagline.
 *
 * Sized at 1600x840 (1.91:1) — larger than the 1200x630 OG baseline so LinkedIn
 * renders a crisp, full-size card (its Post Inspector warns when images are
 * under ~1600px wide). Still valid for Facebook/X, which cap display anyway.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */
import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/seo';

export const runtime = 'edge';
export const alt = `${SITE.name} — Personal Training & Fitness Coaching`;
export const size = { width: 1600, height: 840 };
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
          padding: '106px',
          // App-brand emerald gradient (light → medium green) so the white
          // wordmark stays legible while matching the marketing site palette.
          background:
            'linear-gradient(135deg, #34d399 0%, #10b981 45%, #059669 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* SHREY·FIT wordmark — white text with the signature green dot,
            mirroring the marketing nav lockup. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 46,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: '#ffffff',
            marginBottom: 37,
          }}
        >
          <div style={{ display: 'flex' }}>SHREY</div>
          <div
            style={{
              display: 'flex',
              color: '#064e3b',
              fontSize: 58,
              fontWeight: 800,
              margin: '0 2px',
              position: 'relative',
              top: -4,
            }}
          >
            .
          </div>
          <div style={{ display: 'flex' }}>FIT</div>
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 1280,
          }}
        >
          Personal Training &amp; Fitness Coaching
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 400,
            color: '#ecfdf5',
            marginTop: 42,
            maxWidth: 1280,
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
