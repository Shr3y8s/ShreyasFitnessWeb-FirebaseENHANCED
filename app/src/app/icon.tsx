/**
 * Dynamic favicon (site-wide).
 *
 * Next.js generates the browser tab icon from this file via the Edge runtime,
 * replacing the framework default that was previously 404/500-ing. Renders the
 * brand mark ("S") on the brand gradient at 32x32.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0f172a 100%)',
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          borderRadius: 6,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
