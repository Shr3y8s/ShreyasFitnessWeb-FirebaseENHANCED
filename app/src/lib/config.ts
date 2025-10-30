/**
 * Site Configuration
 * Manages URLs for different parts of the application based on environment
 */

export const SITE_CONFIG = {
  // Marketing site URLs (static HTML pages)
  marketingSiteUrl: process.env.NEXT_PUBLIC_MARKETING_URL || '',
  
  // App URLs (Next.js application)
  appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
};

/**
 * Helper to get marketing site URL
 * In development: Points to separate static server (localhost:8080)
 * In production: Points to same domain (relative paths work)
 */
export function getMarketingUrl(path: string = ''): string {
  // In production, use relative paths (same domain)
  if (process.env.NODE_ENV === 'production') {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // In development, use the marketing site URL from env vars
  const baseUrl = SITE_CONFIG.marketingSiteUrl;
  if (!baseUrl) {
    console.warn('NEXT_PUBLIC_MARKETING_URL not set, using relative path');
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Helper to get app URL (Next.js routes)
 */
export function getAppUrl(path: string = ''): string {
  const baseUrl = SITE_CONFIG.appUrl;
  if (!baseUrl) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
