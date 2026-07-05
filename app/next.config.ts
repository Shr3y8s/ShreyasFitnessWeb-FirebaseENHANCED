import type { NextConfig } from "next";
import * as fs from 'fs';
import * as path from 'path';

// Read firebase-config.json from project root at build time
const firebaseConfigPath = path.resolve(__dirname, '../firebase-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: process.cwd(), // Use app/ directory as Turbopack root
  },
  // Ensure the Apple Pay domain-association data files (read at runtime via fs by
  // the /.well-known/apple-developer-merchantid-domain-association route) are traced
  // into the server bundle. Without this, the readFileSync would 500 in production.
  outputFileTracingIncludes: {
    '/.well-known/apple-developer-merchantid-domain-association': [
      './src/lib/applepay/domain-association.*',
    ],
  },

  eslint: {
    // Don't fail production builds (e.g. Firebase App Hosting / Cloud Build) on
    // ESLint errors. Linting is enforced in development and can be run
    // separately in CI via `npm run lint`. Without this, `next build` aborts on
    // lint-rule violations (react/no-unescaped-entities, no-explicit-any, etc.),
    // which would block App Hosting rollouts.
    ignoreDuringBuilds: true,
  },

  env: {
    // Expose Firebase region from shared config file
    NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION: firebaseConfig.region,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
