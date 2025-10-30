# URL Configuration Guide

This guide explains how the application handles URLs for static HTML pages vs Next.js pages, and how to set up your development environment.

## Architecture Overview

The application has two parts:
1. **Static HTML Pages** (Marketing site) - About, Services, FAQ, Blog, Contact
2. **Next.js Application** - Login, Dashboard, Account Management

## Development Setup

### Prerequisites
- Node.js installed
- Python 3 installed (for serving static files)

### Running the Development Environment

You need to run **TWO servers** simultaneously:

#### Terminal 1: Static HTML Server
```bash
cd static
python -m http.server 8080
```
This serves the static HTML files at `http://localhost:8080`

#### Terminal 2: Next.js Server
```bash
cd app
npm run dev
```
This serves the Next.js app at `http://localhost:3000`

### How It Works

**In Development:**
- Static pages (About, Blog, etc.) → `http://localhost:8080/about.html`
- Next.js pages (Login, Dashboard) → `http://localhost:3000/login`
- **Next.js Footer** → Uses environment variables to link TO static pages
- **Static HTML Nav** → Uses relative paths `/login` (won't work in dev)

**In Production:**
- Everything on same domain
- Static pages → `yourdomain.com/about.html`
- Next.js pages → `yourdomain.com/login`
- All links use relative paths and work correctly

## Environment Variables

Located in `app/.env.local`:

```bash
# Development URLs
NEXT_PUBLIC_MARKETING_URL=http://localhost:8080
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Files Modified

1. **`app/src/lib/config.ts`** - Environment-aware URL configuration
2. **`app/.env.local`** - Development URL settings
3. **`app/src/components/Footer.tsx`** - Uses config for marketing site links

## Testing

### From Next.js App (localhost:3000)
1. Start both servers (steps above)
2. Navigate to `http://localhost:3000` (Next.js app)
3. Click footer links:
   - "About Me" should go to `http://localhost:8080/about.html` ✅
   - "My Account" should stay on `http://localhost:3000/login` ✅
   - Legal pages should stay on `http://localhost:3000/legal/terms` ✅

### From Static HTML (localhost:8080)
1. Navigate to `http://localhost:8080/index.html`
2. Browse static pages (About, Services, Blog, etc.)
3. **Note:** "Sign Up / Login" button won't work in dev (expected)
   - Links to `/login` which doesn't exist on port 8080
   - This is by design - works in production

### Primary Development Access Point
**Always start development from `http://localhost:3000`** - this is your Next.js app where everything works correctly.

## Production Deployment

For production, both the static files and Next.js app will be on the same domain. The `getMarketingUrl()` function automatically switches to relative paths when `NODE_ENV === 'production'`.

No code changes needed - just deploy both:
- Static files to root
- Next.js app (following Next.js deployment guide)

## Development Limitations

### Expected Behavior in Development

❌ **What WON'T work in dev:**
- Clicking "Sign Up / Login" from static HTML pages (localhost:8080)
  - These link to `/login` which tries localhost:8080/login (doesn't exist)
  - This is expected and correct - works in production

✅ **What WILL work in dev:**
- All navigation within Next.js app (localhost:3000)
- Footer links FROM Next.js TO static pages (uses env vars)
- All navigation within static HTML pages (localhost:8080)

### Why This Architecture?

Static HTML files cannot read environment variables (they're just plain HTML). The choice was:
1. Hardcode `localhost:3000` everywhere (bad for production)
2. Use relative paths that work in production (current approach)

We chose option 2: Production-ready paths that don't work perfectly in dev, but work flawlessly in production.

## Troubleshooting

**Issue:** Footer links FROM Next.js still showing localhost:3000 for static pages

**Solution:** 
1. Check `.env.local` has `NEXT_PUBLIC_MARKETING_URL=http://localhost:8080`
2. Restart Next.js dev server (`npm run dev`) to pick up env var changes
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

**Issue:** Static pages return 404

**Solution:** Make sure python server is running in the `/static` folder on port 8080

**Issue:** "Sign Up / Login" doesn't work from static HTML pages in dev

**Solution:** This is expected. Access the app from `http://localhost:3000` for testing login/dashboard features.

**Issue:** Links work in dev but break in production

**Solution:** Verify firebase.json hosting config serves static files and rewrites Next.js routes properly

## Future: Convert to Full Next.js

Consider converting static HTML pages to Next.js pages for:
- Consistent styling with Tailwind
- Component reusability
- Better performance (SSG)
- Simpler deployment (one server)

This would eliminate the need for separate servers entirely.
