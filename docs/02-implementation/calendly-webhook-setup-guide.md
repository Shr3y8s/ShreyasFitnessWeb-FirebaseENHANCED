# Calendly Webhook Setup Guide

## Overview
This guide explains how to configure Calendly webhooks to automatically deduct session credits when clients book training sessions.

## Prerequisites
- Calendly account with Personal Access Token
- Firebase Cloud Functions deployed
- Webhook signing key from Calendly

## Step 1: Webhook Endpoint

Your Cloud Function webhook endpoint is:
```
https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/calendlyWebhook
```

Replace `YOUR-PROJECT-ID` with your actual Firebase project ID.

## Step 2: Configure Webhook in Calendly Dashboard

1. **Login to Calendly**
   - Go to https://calendly.com
   - Navigate to **Integrations & Apps** → **API & Webhooks**

2. **Create Webhook Subscription**
   - Click **Create Webhook**
   - **Webhook URL**: Enter your Cloud Function URL from Step 1
   - **Events to Subscribe**:
     - ✅ `invitee.created` - When a client books a session
     - ✅ `invitee.canceled` - When a session is canceled
   - **Scope**: Select the 1-hour training session event type
   - Click **Create Webhook**

3. **Get Signing Key**
   - After creating the webhook, Calendly will provide a **Signing Key**
   - Copy this key - you'll need it for environment configuration

## Step 3: Configure Environment Variables

Add the following to `firebase/functions/.env`:

```env
# Calendly Configuration
CALENDLY_PAT=eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzYyNDkxODA4LCJqdGkiOiI3Mjk1YjhlYi0xM2MyLTQ3YTgtYWY1MS0zNTczNjcyNjIyZWEiLCJ1c2VyX3V1aWQiOiI4NGJmMzMzNC02ZjQxLTQxMWYtOWQ4Ni05ZjM4ZmNlMzQwZjUifQ.HUoqNWqcG6PuHgJ8nRKbjAV-vM4U0Y-32XdXbqPkXw9oJk1qOCoYirbQ-KJfCAE_9BntaFz_ilCN3urn9uKM1g
CALENDLY_WEBHOOK_SIGNING_KEY=YOUR_SIGNING_KEY_FROM_STEP_2
```

## Step 4: Redeploy Cloud Functions

After updating the environment variables:

```bash
cd firebase/functions
firebase deploy --only functions:calendlyWebhook
```

## Step 5: Test the Integration

### Test Booking Flow

1. **As a Client**:
   - Login to your dashboard
   - Navigate to **Buy Sessions**
   - Purchase a session package (use Stripe test mode)
   - Verify session balance updates

2. **Schedule a Session**:
   - Navigate to **Schedule Sessions**
   - Book a time in the Calendly widget
   - Complete the booking

3. **Verify Webhook Processing**:
   - Check Firebase Functions logs:
     ```bash
     firebase functions:log --only calendlyWebhook
     ```
   - Verify a new `sessions` document was created in Firestore
   - Verify session balance decreased by 1
   - Check that an email confirmation was sent

### Test Cancellation Flow

1. **Cancel a Session**:
   - In the **Schedule Sessions** page
   - Click "Cancel Session" on an upcoming session
   - If >24h away, verify credit refunded
   - If <24h away, verify no refund

2. **Verify Webhook Processing**:
   - Check that the session status updated to "canceled"
   - If applicable, verify credit returned to balance
   - Check cancellation email sent

## Webhook Payload Examples

### invitee.created Event
```json
{
  "event": "invitee.created",
  "time": "2025-01-15T10:00:00Z",
  "payload": {
    "event_type": {
      "uuid": "event-type-uuid",
      "name": "1:1 Training Session"
    },
    "event": {
      "uuid": "event-uuid",
      "start_time": "2025-01-20T14:00:00Z",
      "end_time": "2025-01-20T15:00:00Z"
    },
    "invitee": {
      "uuid": "invitee-uuid",
      "email": "client@example.com",
      "name": "John Doe"
    }
  }
}
```

### invitee.canceled Event
```json
{
  "event": "invitee.canceled",
  "time": "2025-01-15T10:00:00Z",
  "payload": {
    "event": {
      "uuid": "event-uuid"
    },
    "invitee": {
      "uuid": "invitee-uuid",
      "email": "client@example.com",
      "cancel_reason": "Client requested cancellation"
    }
  }
}
```

## Webhook Handler Logic

The `calendlyWebhook` Cloud Function (`firebase/functions/sessions.js`) handles:

1. **Signature Verification**
   - Verifies webhook came from Calendly
   - Prevents unauthorized requests

2. **Event Processing**
   - `invitee.created`:
     - Finds user by email
     - Verifies session balance > 0
     - Deducts 1 credit using FIFO logic
     - Creates session record
     - Sends confirmation email
   
   - `invitee.canceled`:
     - Finds session by Calendly event ID
     - Checks cancellation time
     - If >24h: Returns credit
     - Updates session status
     - Sends notification email

3. **Error Handling**
   - Idempotent operations (safe to retry)
   - Comprehensive logging
   - Graceful failure handling

## Monitoring & Debugging

### Check Webhook Status
```bash
# View recent webhook deliveries
firebase functions:log --only calendlyWebhook --limit 50
```

### Common Issues

**Issue**: Webhook not firing
- **Solution**: Verify webhook URL is correct in Calendly dashboard
- Check that Cloud Function is deployed: `firebase functions:list`

**Issue**: "Signature verification failed"
- **Solution**: Verify `CALENDLY_WEBHOOK_SIGNING_KEY` is correct in `.env`
- Redeploy functions after updating

**Issue**: "User not found"
- **Solution**: Ensure user email in Calendly matches Firestore email exactly
- Check email is lowercase in Firestore

**Issue**: "Insufficient session balance"
- **Solution**: Verify user has available sessions before booking
- Check `sessionBalance.available` field in Firestore

## Security Considerations

1. **Signature Verification**
   - Always verify webhook signatures
   - Never trust unverified requests

2. **Environment Variables**
   - Keep PAT and signing key secret
   - Never commit to version control
   - Use Firebase Functions config or Secret Manager

3. **Rate Limiting**
   - Calendly webhooks are already rate-limited
   - Additional rate limiting on Cloud Function side recommended

4. **Error Logging**
   - Log errors for debugging
   - Don't expose sensitive data in logs
   - Monitor for suspicious activity

## Testing Webhooks Locally

For local development testing:

1. **Use ngrok for HTTPS tunnel**:
   ```bash
   ngrok http 5001
   ```

2. **Update Calendly webhook URL** to ngrok URL

3. **Run emulator**:
   ```bash
   firebase emulators:start --only functions
   ```

4. **Test booking** and check local logs

⚠️ **Remember**: Switch back to production URL after testing!

## Additional Resources

- [Calendly Webhook Documentation](https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhooks)
- [Calendly API Reference](https://developer.calendly.com/api-docs)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)

## Support

If you encounter issues:
1. Check Cloud Function logs
2. Verify Calendly webhook dashboard shows successful deliveries
3. Test with Calendly's webhook testing tool
4. Review Firestore data for consistency
