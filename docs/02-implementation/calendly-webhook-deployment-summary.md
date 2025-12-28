# Calendly Webhook Deployment Summary

## Current Status: ✅ WEBHOOK ALREADY CONFIGURED

Your existing Calendly webhook is already set up and will handle both event types automatically!

## What You Have

### Existing Webhook Configuration
- **Signing Key**: Already in `firebase/functions/.env`
- **Webhook URL**: `https://us-central1-shreyfitweb.cloudfunctions.net/calendlyWebhook`
- **Events**: `invitee.created`, `invitee.canceled`
- **Status**: Active and working for 1-on-1 training sessions

### New Cloud Function (Just Created)
- **Function Name**: `calendlyCheckinWebhook`
- **Purpose**: Handles weekly check-in bookings
- **URL**: `https://us-central1-shreyfitweb.cloudfunctions.net/calendlyCheckinWebhook`

## How It Works

When someone books **any** Calendly event:

1. **Calendly fires webhook** → Sends to your Cloud Function
2. **Your backend examines the event URL**:
   - Contains `/1-1-training-session` → Routes to `calendlyWebhook` (existing)
   - Contains `/weekly-checkin` → Routes to `calendlyCheckinWebhook` (new)
3. **Appropriate handler processes the booking**

## Why You Don't Need a Second Webhook

Your existing webhook subscription is **organization-wide** and fires for ALL Calendly events. The routing happens in your Cloud Function code, not in Calendly's configuration.

### Benefits of Single Webhook
✅ Simpler configuration
✅ Single signing key to manage
✅ Less API calls to Calendly
✅ Easier to monitor and debug

## Next Steps: Deploy the New Cloud Function

### 1. Deploy Cloud Functions
```bash
cd firebase/functions
npm install  # Ensure dependencies are current
cd ../..
firebase deploy --only functions
```

This will deploy:
- ✅ `calendlyWebhook` (existing, updated)
- ✅ `calendlyCheckinWebhook` (new)

### 2. Verify Deployment
```bash
firebase functions:list
```

You should see both functions listed.

### 3. Test the Integration

#### Test Check-in Booking
1. Have a user with eligible subscription (online_coaching or complete_transformation)
2. Navigate to `/dashboard/client/checkins`
3. Book a check-in using the Calendly widget
4. Verify:
   - Check-in appears in Firestore `sessions` collection
   - `sessionType` = "checkin"
   - `weekIdentifier` is populated
   - No session credit deducted

#### Test Weekly Limit
1. Try booking a second check-in in the same week
2. Should be prevented by Calendly or handled gracefully by backend

### 4. Monitor Logs
```bash
# Watch for webhook calls
firebase functions:log --only calendlyCheckinWebhook

# Or view all function logs
firebase functions:log
```

## Configuration Files Updated

### Backend Files (Already Updated)
- ✅ `firebase/functions/sessions.js` - Added check-in handlers
- ✅ `firebase/functions/index.js` - Exported new webhook
- ✅ `firebase/functions/.env` - Has signing key

### Frontend Files (Already Updated)  
- ✅ `app/src/lib/constants.ts` - Centralized Calendly URLs
- ✅ `app/src/app/dashboard/client/checkins/page.tsx` - Uses constants

### Database
- ✅ `firestore.indexes.json` - Index for check-in queries exists

## Webhook Verification (Optional)

If you want to verify your webhook configuration via API:

```bash
# Replace YOUR_PAT with your actual Calendly Personal Access Token
curl --request GET \
  --url https://api.calendly.com/webhook_subscriptions \
  --header 'Authorization: Bearer YOUR_PAT' \
  --header 'Content-Type: application/json'
```

This will show you:
- Webhook URL
- Subscribed events
- Signing key (redacted)
- Creation date

## Security Notes

### Webhook Signature Verification
Your Cloud Functions verify webhook signatures using the `CALENDLY_WEBHOOK_SIGNING_KEY`:

```javascript
// Automatically validates that webhooks come from Calendly
const signature = req.headers['calendly-webhook-signature'];
const isValid = verifySignature(payload, signature, signingKey);
```

### Environment Variables
Keep these secure:
- ❌ Never commit `.env` to git
- ✅ Already in `.gitignore`
- ✅ Use Firebase Functions config for production

## Troubleshooting

### "Webhook signature verification failed"
- Verify `CALENDLY_WEBHOOK_SIGNING_KEY` in `.env` is correct
- Redeploy functions after updating

### "User not found"
- Ensure user email in Calendly matches Firestore exactly
- Emails should be lowercase

### "Subscription tier not eligible"
- Only `online_coaching` and `complete_transformation` can book check-ins
- Verify user's subscription tier in Stripe Customer Portal

### "Already scheduled for this week"
- Week identifier is Sunday-Saturday
- User can only book one check-in per week
- Check `weekIdentifier` field in existing sessions

## Summary

✅ **Webhook**: Already configured and working
✅ **Backend Code**: Implemented and ready
✅ **Frontend**: Updated to use centralized constants
✅ **Database**: Indexes in place

**All you need to do**: Deploy the Cloud Functions!

```bash
firebase deploy --only functions
```

Then test by booking a check-in and verify it appears in Firestore.
