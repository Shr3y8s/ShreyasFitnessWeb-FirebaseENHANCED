import type { NextConfig } from "next";
import * as fs from 'fs';
import * as path from 'path';

// Read firebase-config.json from project root at build time
const firebaseConfigPath = path.resolve(__dirname, '../firebase-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const nextConfig: NextConfig = {
  /* config options here */
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
