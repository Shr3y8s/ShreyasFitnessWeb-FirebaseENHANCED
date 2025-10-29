# Google Maps API Setup Guide (REST API - Production Ready)

## Overview
This guide explains the **production-ready REST API implementation** of Google Places API (New) for address autocomplete in the profile page. This approach is recommended by Google for Next.js applications.

## Implementation Architecture

### Why REST API vs JavaScript Library?

**REST API (Our Implementation):**
- ✅ Production-ready and stable
- ✅ API key secured server-side
- ✅ Proper session token management
- ✅ Full control over requests/responses
- ✅ Native to Next.js architecture
- ✅ No beta/experimental features

**JavaScript Library (NOT Used):**
- ❌ Only available in beta/alpha
- ❌ TypeScript typing issues
- ❌ Not recommended for production
- ❌ Exposes API key to client
- ❌ Limited control

## Setup Steps

### 1. Enable Google Places API (New)

1. Go to: https://console.cloud.google.com/apis/library
2. Select your Firebase project (`shreyfitweb`)
3. Search for **"Places API (New)"** (WITH "New" in the name)
4. Click **ENABLE**

**Important:** Enable ONLY the new API, not the legacy version.

### 2. Create and Restrict API Key

1. Go to **Credentials** in left sidebar
2. Click **"+ CREATE CREDENTIALS"** → **"API key"**
3. Copy the generated key

**Configure Restrictions:**
1. Click on your new API key
2. Under **"Application restrictions"**:
   - Select "HTTP referrers (web sites)"
   - Add: `localhost:3000/*` (development)
   - Add: `your-production-domain.com/*` (when deploying)
3. Under **"API restrictions"**:
   - Select "Restrict key"
   - Check ONLY: **"Places API (New)"**
4. Click **"Save"**

### 3. Add API Key to Environment

Open `app/.env.local` and add:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here
```

**Note:** Even though prefixed with `NEXT_PUBLIC_`, the key is only used server-side in our API routes.

### 4. Install Required Dependencies

```bash
cd app
npm install uuid
```

## Architecture Overview

Our implementation consists of 3 parts:

### 1. API Routes (Server-Side)

**`/app/api/autocomplete/route.ts`**
- Handles autocomplete requests
- Calls Google's REST endpoint
- Manages session tokens
- Returns suggestions to client

**`/app/api/place-details/route.ts`**
- Fetches full place details when user selects
- Extracts address components (city, state, country, zip)
- Returns structured data

### 2. Client Component

**`/components/profile/AddressAutocomplete.tsx`**
- Clean, modern UI
- Debounced input (300ms)
- Fetches from our API routes (not directly from Google)
- Displays suggestions with structured formatting
- Extracts and returns address data

### 3. Session Token Management

- Generates unique token per user session (UUID v4)
- Passes token with every autocomplete request
- Regenerates after address selection
- Ensures proper billing from Google

## How It Works

### Flow Diagram

```
User Types → (debounce 300ms) → 
  Client Component → 
    /api/autocomplete → 
      Google Places API → 
        Suggestions → 
          Client Component

User Clicks Suggestion →
  Client Component →
    /api/place-details →
      Google Places API →
        Address Components →
          Parsed & Returned →
            Fields Auto-Fill
```

### Session Token Billing

1. **New session**: Generate UUID token
2. **Each keystroke**: Pass same token with autocomplete requests
3. **User selects**: Fetch place details with same token
4. **After selection**: Generate new token for next session

This ensures Google bills you correctly per complete user interaction, not per keystroke.

## Testing

### Test the Implementation

1. Go to `/dashboard/client/profile`
2. Click "Edit" on Location section
3. Start typing an address (e.g., "1600 Pennsylvania")
4. After 3 characters, suggestions appear
5. Suggestions show:
   - Main text (e.g., "1600 Pennsylvania Avenue NW")
   - Secondary text (e.g., "Washington, DC, USA")
6. Click a suggestion
7. Loading spinner appears
8. Fields auto-fill with:
   - City: "Washington"
   - State: "DC"
   - Country: "US"
   - Zip Code: "20500"
9. Click "Save Changes"

### Verify in Browser Console

1. Open DevTools (F12)
2. Go to Network tab
3. Type in autocomplete
4. See requests to `/api/autocomplete` (NOT to Google directly)
5. Click a suggestion
6. See request to `/api/place-details`
7. Check Response for extracted address data

### Check Server Logs

In your terminal running `npm run dev`, you should see:
- No errors
- API requests being processed
- Any Google API errors (if they occur)

## Pricing

### How Billing Works

**Autocomplete + Place Details Session:**
- Charged as one session when user completes selection
- ~$0.017 per session (with Place Details fetch)
- Free tier: $200/month credit = ~11,700 sessions/month

**For Your Use Case:**
- 10-50 clients entering addresses
- ~50-200 address entries per year
- Estimated cost: **$0** (well within free tier)

### Billing Requirements

Even though you'll stay in free tier:
1. Google requires billing to be enabled
2. Add credit card to project (won't be charged until >$200/month)
3. Set up billing alerts at $50, $100, $150

## Troubleshooting

### No Suggestions Appearing

**Check:**
1. Is Places API (New) enabled in Google Cloud?
2. Is API key correct in `.env.local`?
3. Did you restart dev server after adding key?
4. Check browser console for errors
5. Check Network tab - are requests to `/api/autocomplete` succeeding?

**Common Errors:**
- "API key not valid": Check key in `.env.local`
- "Places API (New) is not enabled": Enable it in Google Cloud Console
- "Request failed": Check API key restrictions (HTTP referrers)

### Suggestions Not Parsing Correctly

Check `/api/place-details/route.ts`:
- Verify field mask includes `addressComponents`
- Check console logs for response structure
- Some addresses may lack certain components (normal)

### TypeScript Errors

If you see type errors:
```bash
cd app
npm install --save-dev @types/uuid
```

## Production Deployment

### Before Deploying:

1. **Update HTTP Referrers:**
   - Add your production domain to API key restrictions
   - Format: `yourdomain.com/*`

2. **Environment Variables:**
   - Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in production
   - Most platforms (Vercel, Netlify) have env var settings

3. **Test in Production:**
   - Verify autocomplete works
   - Check billing dashboard after deployment
   - Monitor for any API errors

## Security Notes

### API Key Protection

Even though the key has `NEXT_PUBLIC_` prefix:
- ✅ Only used in server-side API routes
- ✅ Never sent to client browser
- ✅ Restricted to specific HTTP referrers
- ✅ Restricted to only Places API (New)

### Best Practices

1. **Never** commit `.env.local` to git
2. Use HTTP referrer restrictions
3. Use API restrictions (Places API New only)
4. Monitor usage in Google Cloud Console
5. Set up billing alerts

## Additional Resources

- [Places API (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Autocomplete REST Reference](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/autocomplete)
- [Session Token Best Practices](https://developers.google.com/maps/documentation/places/web-service/session-tokens)
- [Google Maps Pricing](https://mapsplatform.google.com/pricing/)

## Summary

You now have a **production-ready, stable** address autocomplete implementation using:
- ✅ Google Places REST API (New)
- ✅ Next.js API routes (server-side)
- ✅ Proper session token management
- ✅ Secure API key handling
- ✅ Clean, modern UI
- ✅ Debounced requests
- ✅ Parsed address components
- ✅ FREE tier usage

No beta features, no workarounds, no hacks - just the proper Google-recommended approach! 🎯
