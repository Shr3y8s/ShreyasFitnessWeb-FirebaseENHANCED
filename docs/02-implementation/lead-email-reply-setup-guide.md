# Lead Email Reply Integration - Setup Guide

**Date:** November 23, 2024  
**Status:** ✅ Code Implemented - Configuration Required  
**Feature:** Email notifications when trainer replies to leads

---

## Overview

This guide walks through setting up email notifications for the lead inbox system. When trainers reply to leads in the Contact Inbox, the reply is now:
1. ✅ Saved to Firestore (existing functionality)
2. ✅ Sent via email to the lead (NEW!)

**Implementation:** Option 1 - Email Integration
- First reply goes via email notification
- Lead replies directly to trainer's Gmail
- Subsequent conversation happens via email (not tracked in Firestore)

---

## Setup Steps

### **Step 1: Create Resend Account** (5 minutes)

1. Go to https://resend.com/signup
2. Sign up with your email
3. Verify your email address
4. Complete account setup

---

### **Step 2: Get API Key** (2 minutes)

1. Log in to Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Copy the key (starts with `re_...`)
5. Store it safely - you'll only see it once!

---

### **Step 3: Add API Key to Environment** (2 minutes)

1. Open `app/.env.local` in your project
2. Add this line:
   ```
   RESEND_API_KEY=re_YOUR_API_KEY_HERE
   ```
3. Replace `re_YOUR_API_KEY_HERE` with your actual API key
4. Save the file

**Important:** 
- Never commit `.env.local` to Git (it's already in `.gitignore`)
- Keep your API key secret

---

### **Step 4: Install Resend SDK** (2 minutes)

Open terminal in the `app` directory and run:

```bash
cd app
npm install resend
```

Wait for installation to complete.

---

### **Step 5: Restart Development Server** (1 minute)

If your dev server is running:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

The server needs to restart to load the new environment variable.

---

### **Step 6: Test the Email Flow** (10 minutes)

#### **Create a Test Lead Submission:**

1. Go to your contact form: `http://localhost:3000/connect`
2. Fill out the form with **your own email address**
3. Submit the form
4. Verify it appears in the lead inbox

#### **Send a Test Reply:**

1. Go to lead inbox: `http://localhost:3000/dashboard/trainer/inbox`
2. Click on your test submission
3. Click the **Reply** button
4. Type a test message (e.g., "Thanks for your interest in training with me!")
5. Click **Send Reply**
6. Look for success message: "Reply sent successfully! Email notification sent to lead."

#### **Check Your Email:**

1. Check your inbox (the email you used in the form)
2. You should receive an email from: `Shreyas at Shreyas Method Fitness <onboarding@resend.dev>`
3. Subject: `Re: Your message to Shreyas Method Fitness`
4. The email should contain your reply message

#### **Test Reply-To:**

1. In your email client, click **Reply** to the email
2. Verify it's addressed to: `shreyas.annapureddy@gmail.com`
3. (Optional) Send a test reply to confirm it reaches your Gmail

---

## Email Template Details

### **What Leads Receive:**

```
From: Shreyas at Shreyas Method Fitness <onboarding@resend.dev>
Reply-To: shreyas.annapureddy@gmail.com
Subject: Re: Your message to Shreyas Method Fitness

───────────────────────────────

Hi [Lead Name],

Thank you for reaching out! Here's my response to your inquiry:

┌──────────────────────────────────┐
│ [Your reply message here]        │
└──────────────────────────────────┘

Feel free to reply to this email directly and I'll get back 
to you as soon as possible.

Best regards,
Shreyas Annapureddy
Shreyas Method Fitness
shreyas.annapureddy@gmail.com
(425) 829-9961

───────────────────────────────────
```

### **Key Features:**

- **From Address:** Uses Resend test domain (`onboarding@resend.dev`)
- **Reply-To:** All replies go to `shreyas.annapureddy@gmail.com`
- **HTML Formatted:** Professional styling with your brand colors
- **Plain Text Fallback:** Works in all email clients
- **Contact Info:** Includes email and phone in signature

---

## Troubleshooting

### **Issue: "Email notification failed to send"**

**Possible Causes:**

1. **Missing API Key**
   - Check `app/.env.local` has `RESEND_API_KEY=...`
   - Verify the key is correct (starts with `re_`)
   - Restart dev server after adding the key

2. **Invalid Email Address**
   - Lead's email must be valid format
   - Check for typos in the email

3. **Resend API Error**
   - Check Resend dashboard for error logs
   - Verify account is active and not suspended

**How to Debug:**

1. Open browser console (F12)
2. Check Network tab for `/api/send-reply-email` request
3. Look at the response for error details
4. Check terminal logs for server-side errors

---

### **Issue: Email Not Received**

1. **Check Spam Folder**
   - Resend test domain might be flagged as spam
   - Mark as "Not Spam" to whitelist

2. **Check Email Address**
   - Verify lead's email is correct in Firestore
   - Try sending to a different email

3. **Wait 2-3 Minutes**
   - Emails can take a few minutes to arrive
   - Check Resend dashboard for delivery status

4. **Verify Resend Account**
   - Make sure you verified your email with Resend
   - Check account isn't in sandbox mode

---

### **Issue: Replies Don't Go to Gmail**

**Check Reply-To Header:**

1. Open the email
2. View email headers (varies by client)
3. Look for: `Reply-To: shreyas.annapureddy@gmail.com`
4. If missing, check API route code

**If Still Not Working:**

- Some email clients ignore Reply-To
- Lead can manually copy/paste your email address
- Contact info is in email signature

---

## Upgrading to Custom Domain (Future)

### **When You Get shrey.fit Domain:**

**Benefits:**
- Professional sender address: `shreyas@shrey.fit`
- Better deliverability (no spam flags)
- Branded sender name

**Setup Steps:**

1. **Add Domain to Resend**
   - Go to Resend dashboard → Domains
   - Click "Add Domain"
   - Enter: `shrey.fit`

2. **Configure DNS**
   - Resend provides DNS records
   - Add them to your domain registrar (GoDaddy, Namecheap, etc.)
   - Wait 24-48 hours for DNS propagation

3. **Update API Route** (2 minutes)

   **File:** `app/src/app/api/send-reply-email/route.ts`

   ```typescript
   // CHANGE THIS LINE:
   from: 'Shreyas at Shreyas Method Fitness <onboarding@resend.dev>',
   
   // TO THIS:
   from: 'Shreyas at Shreyas Method Fitness <shreyas@shrey.fit>',
   
   // AND UPDATE REPLY-TO:
   replyTo: 'shreyas@shrey.fit',
   ```

4. **Update Email Signature**

   In the same file, update contact info in the HTML template:

   ```typescript
   <a href="mailto:shreyas@shrey.fit">shreyas@shrey.fit</a><br />
   <a href="tel:+1YOURNEWPHONE">(XXX) XXX-XXXX</a>
   ```

5. **Deploy & Test**
   - Restart dev server
   - Send test email
   - Verify new domain appears

---

## Cost Information

### **Resend Pricing:**

| Tier | Emails/Month | Cost |
|------|--------------|------|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20/month |
| Business | 500,000 | $100/month |

### **Your Usage Estimate:**

- **Expected:** 10-50 replies/month
- **Cost:** $0 (well within free tier)
- **Buffer:** Can handle 3,000 emails/month for free

---

## Security Best Practices

### **API Key Security:**

✅ **DO:**
- Store in `.env.local` (never in code)
- Keep `.env.local` in `.gitignore`
- Use different keys for dev/production
- Rotate keys if exposed

❌ **DON'T:**
- Commit API key to Git
- Share key in screenshots
- Use same key across environments
- Hardcode in source files

### **Email Validation:**

The API route validates:
- Email format (regex)
- Required fields (name, email, message)
- Non-empty content

### **Rate Limiting:**

Consider adding rate limiting in production:
- Max 10 replies per minute per trainer
- Prevents API abuse
- Protects Resend quota

---

## Monitoring & Analytics

### **Resend Dashboard:**

Track email performance:
- Delivery rate
- Bounce rate
- Failed sends
- API usage

**Access:** https://resend.com/dashboard

### **Recommended Alerts:**

1. **Approaching Quota**
   - Alert at 2,500 emails (83% of free tier)
   - Gives time to upgrade if needed

2. **High Failure Rate**
   - Alert if >10% emails fail
   - Indicates configuration issue

3. **Unusual Activity**
   - Spike in email volume
   - Could indicate abuse or bug

---

## Files Modified

### **New Files:**

1. `app/src/app/api/send-reply-email/route.ts`
   - API route for sending emails via Resend
   - Validates input, formats email, sends via Resend API

### **Modified Files:**

1. `app/src/app/dashboard/trainer/inbox/page.tsx`
   - Updated `handleSendReply()` function
   - Added email API call after Firestore save
   - Graceful error handling

### **Configuration Files:**

1. `app/.env.local`
   - Added: `RESEND_API_KEY=...`

2. `app/package.json`
   - Added: `resend` dependency

---

## Next Steps

### **Immediate (Before Launch):**

- [ ] Complete setup steps above
- [ ] Test email flow end-to-end
- [ ] Verify replies go to Gmail
- [ ] Test with different email providers (Gmail, Outlook, Yahoo)

### **Short Term (First Month):**

- [ ] Monitor email delivery rate in Resend dashboard
- [ ] Collect feedback from first leads who receive emails
- [ ] Adjust email template if needed
- [ ] Consider custom domain setup

### **Long Term (After Domain Purchase):**

- [ ] Purchase shrey.fit domain
- [ ] Configure custom domain in Resend
- [ ] Update API route with new domain
- [ ] Test updated email flow
- [ ] Update contact info (email, phone)

---

## Support & Resources

### **Resend Documentation:**
- Getting Started: https://resend.com/docs/introduction
- Send Email API: https://resend.com/docs/api-reference/emails/send-email
- Dashboard: https://resend.com/dashboard

### **Troubleshooting:**
- Resend Status: https://status.resend.com
- Email Deliverability: https://resend.com/docs/knowledge-base/deliverability

### **Questions?**
- Resend Support: support@resend.com
- Resend Discord: https://discord.gg/resend

---

## Summary

**What's Working:**
- ✅ Lead inbox displays submissions
- ✅ Trainer can reply in dashboard
- ✅ Reply saved to Firestore
- ✅ Email code implemented

**What You Need to Do:**
1. Sign up for Resend (5 min)
2. Get API key (2 min)
3. Add to `.env.local` (2 min)
4. Install `resend` package (2 min)
5. Test email flow (10 min)

**Total Setup Time:** ~20 minutes

**Result:** Leads receive email notifications when you reply, and can respond directly to your Gmail! 🎉

---

**Document Version:** 1.0  
**Last Updated:** November 23, 2024  
**Status:** Ready for Setup
