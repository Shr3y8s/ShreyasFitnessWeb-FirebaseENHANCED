# Calendly Webhook Management - Quick Reference

**Status:** Active as of January 6, 2026  
**Purpose:** Quick commands to check, delete, and recreate Calendly webhook

---

## Your Configuration

**Organization URI:**
```
https://api.calendly.com/organizations/ffdb8d65-c5ad-4112-b3d0-bdcdba2ccc0d
```

**Webhook URL:**
```
https://us-west1-shreyfitweb.cloudfunctions.net/calendlyWebhook
```

**Current Webhook ID:** (changes when recreated)
```
b266bcc6-ed87-4bc2-8517-f176e099a627
```

---

## Step 1: Get Your PAT Token

**From Firebase Secret Manager:**
```bash
firebase functions:secrets:access CALENDLY_PAT
```

Copy the output token (starts with `eyJ...`) - this is your decrypted PAT.

Set as environment variable for convenience:
```bash
export CALENDLY_PAT="paste_token_here"
```

---

## Step 2: Check Webhook Status

```bash
curl -H "Authorization: Bearer $CALENDLY_PAT" \
"https://api.calendly.com/webhook_subscriptions?organization=https%3A%2F%2Fapi.calendly.com%2Forganizations%2Fffdb8d65-c5ad-4112-b3d0-bdcdba2ccc0d&scope=organization"
```

**Look for:**
- `"state": "active"` ✅ Good
- `"state": "disabled"` ❌ Webhook broken, needs recreation
- `"callback_url"`: Should match your function URL
- `"events"`: Should include `["invitee.created", "invitee.canceled"]`

---

## Step 3: Delete Webhook (If Disabled)

**Get webhook ID from Step 2**, then:

```bash
curl -X DELETE \
  -H "Authorization: Bearer $CALENDLY_PAT" \
  https://api.calendly.com/webhook_subscriptions/YOUR_WEBHOOK_ID
```

**Example with current ID:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $CALENDLY_PAT" \
  https://api.calendly.com/webhook_subscriptions/b266bcc6-ed87-4bc2-8517-f176e099a627
```

---

## Step 4: Create Fresh Webhook

```bash
curl -X POST \
  -H "Authorization: Bearer $CALENDLY_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://us-west1-shreyfitweb.cloudfunctions.net/calendlyWebhook",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "https://api.calendly.com/organizations/ffdb8d65-c5ad-4112-b3d0-bdcdba2ccc0d",
    "scope": "organization"
  }' \
  https://api.calendly.com/webhook_subscriptions
```

**Success response should include:**
```json
{
  "resource": {
    "state": "active",
    "callback_url": "https://us-west1-shreyfitweb.cloudfunctions.net/calendlyWebhook",
    "events": ["invitee.created", "invitee.canceled"],
    "uri": "https://api.calendly.com/webhook_subscriptions/NEW_ID"
  }
}
```

Save the new webhook ID from `uri` for future reference.

---

## Testing After Webhook Creation

### 1. Test Cloud Function is Running:
```bash
curl https://us-west1-shreyfitweb.cloudfunctions.net/calendlyWebhook
```

Should return: `{"received":true}`

### 2. Book a Test Event:
- Schedule a check-in or consultation via Calendly
- Event should appear in Firestore `sessions` collection within seconds

### 3. Check Cloud Function Logs:
```bash
firebase functions:log --only calendlyWebhook --lines 20
```

Look for:
- `🚨 WEBHOOK ENTRY POINT` - Confirms webhook called
- `✅ Event is invitee.created` - Confirms routing
- `Successfully scheduled...` - Confirms session created

---

## Common Issues

### Webhook Gets Disabled

**Cause:** Repeated failures (bad code, crashes, timeouts)  
**Symptoms:** `"state": "disabled"`, `"retry_started_at"` not null  
**Fix:** Delete and recreate webhook (Steps 3 & 4)

### No Webhook Calls in Logs

**Cause:** Webhook not configured or disabled  
**Fix:** Check status (Step 2), recreate if needed (Steps 3 & 4)

### Transaction Errors

**Cause:** Firestore transaction reads after writes  
**Fix:** Ensure all `transaction.get()` calls before any `transaction.set()` or `transaction.update()`

---

## Webhook Event Handling

The `calendlyWebhook` Cloud Function handles 3 event types:

1. **Onboarding Consultation** (`/30-min-onboarding-consultation`)
   - Creates `sessionType: "onboarding"` 
   - Marks setup goal milestone #1 complete
   - No session credit required

2. **Weekly Check-in** (`/weekly-checkin`)
   - Creates `sessionType: "checkin"`
   - Subscription-based (no credit deduction)
   - Max 2 active check-ins at a time

3. **1-on-1 Training** (all other events)
   - Creates `sessionType: "training"`
   - Deducts session credit from package
   - Requires active session package

Routing is automatic based on event URL - no configuration needed.

---

## Emergency Rollback

If webhook changes break existing functionality:

```bash
# See recent commits
git log firebase/functions/sessions.js --oneline

# Rollback to specific commit
git checkout COMMIT_HASH firebase/functions/sessions.js

# Redeploy
firebase deploy --only functions:calendlyWebhook
```

---

## Notes

- Webhook auto-disables after ~5 failed attempts
- Always test with fresh booking after recreating webhook
- PAT tokens can expire - regenerate in Calendly if needed
- Function URL should never change unless you change regions
- Organization URI is permanent for your Calendly account

**Last Updated:** January 6, 2026  
**Webhook Status:** Active ✅
