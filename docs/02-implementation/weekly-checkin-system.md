# Weekly Check-in System Implementation

**Date**: December 28, 2025  
**Status**: Active Development  
**Version**: 1.0

---

## Overview

The Weekly Check-in System allows online coaching clients to schedule a weekly 15-30 minute check-in call with their trainer. This feature is included with online coaching and complete transformation subscriptions and enforces a "one check-in per week" rule.

---

## Business Rules

### **Eligibility**
- ✅ Included with: Online Coaching, Complete Transformation subscriptions
- ❌ Not available: No subscription, 1-on-1 training only
- ✅ Check-ins do NOT consume session credits

### **Scheduling Rules**
- **One per week**: Clients can only schedule one check-in per calendar week (Sunday-Saturday)
- **Future scheduling**: Clients can schedule for any future week
- **Reschedule allowed**: Can cancel and rebook within same week
- **Cancel anytime**: No penalties for cancellation

### **Trainer Notes**
- Notes captured in Weekly Focus section
- Summary visible to client in "This Week's Focus"
- Trainer can edit during or after call
- Auto-links to check-in date

---

## Data Model

### **Shared Collection: `sessions`**

Both training sessions and check-ins live in the same Firestore collection, differentiated by `sessionType` field.

```typescript
interface BaseSession {
  // Identity
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  trainerId: string;
  
  // Calendly Integration
  calendlyEventId: string;
  calendlyEventUri: string;
  
  // Scheduling
  scheduledDate: Timestamp;
  duration: number;  // 15 or 30 minutes
  status: 'scheduled' | 'completed' | 'canceled' | 'no-show';
  
  // Cancellation
  canceledBy?: 'client' | 'trainer';
  canceledAt?: Timestamp;
  cancelReason?: string;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  notes?: string;
}

interface TrainingSession extends BaseSession {
  sessionType: 'training';
  
  // Training-specific fields
  locationId: string;
  locationType: 'public' | 'private';
  packageId: string;
  creditReturned: boolean;
}

interface CheckinSession extends BaseSession {
  sessionType: 'checkin';
  
  // Check-in-specific fields
  weekIdentifier: string;  // ISO week format: "2025-W01"
}

type Session = TrainingSession | CheckinSession;
```

### **Week Identifier Format**
- Format: `YYYY-Www` (e.g., "2025-W01", "2025-W52")
- Follows ISO 8601 week date system
- Week starts on Sunday
- Used to enforce "one per week" rule

---

## Calendly Integration

### **Event URLs**

**Temporary (Development):**
```
https://calendly.com/shreyas-annapureddy/1-1-training-session
```

**Production (TODO):**
```
https://calendly.com/shreyas-annapureddy/weekly-checkin
```

### **Webhook Endpoints**

**Training Sessions:**
```
https://us-central1-[PROJECT-ID].cloudfunctions.net/calendlyWebhook
```

**Check-ins:**
```
https://us-central1-[PROJECT-ID].cloudfunctions.net/calendlyCheckinWebhook
```

### **URL Swap Instructions**

1. **Update Client Page:**
   ```typescript
   // In: app/src/app/dashboard/client/checkins/page.tsx
   // Change line ~30:
   const CHECKIN_CALENDLY_URL = 'https://calendly.com/shreyas-annapureddy/weekly-checkin';
   ```

2. **Configure Calendly:**
   - Create new event type: "Weekly Check-in" (15-30 min)
   - Set up webhook subscription
   - Copy webhook signing key

3. **Update Environment Variables:**
   ```bash
   # In: firebase/functions/.env
   CALENDLY_CHECKIN_WEBHOOK_SIGNING_KEY=[key_from_calendly]
   ```

4. **Deploy Functions:**
   ```bash
   firebase deploy --only functions:calendlyCheckinWebhook
   ```

---

## Backend Implementation

### **Cloud Functions**

**File**: `firebase/functions/sessions.js`

```javascript
// Webhook endpoint for check-ins
exports.calendlyCheckinWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Verify webhook signature
  // 2. Parse Calendly event data
  // 3. Call scheduleCheckin()
  // 4. Return success response
});

// Unified scheduling with type branching
async function scheduleSession(data) {
  const { sessionType, clientId, scheduledDate } = data;
  
  // Type-specific validation
  if (sessionType === 'training') {
    await validateAndDeductCredit(clientId);
  } else if (sessionType === 'checkin') {
    await validateOnePerWeek(clientId, scheduledDate);
  }
  
  // Create session document
  return await createSessionDocument(data);
}

// Week validation logic
async function validateOnePerWeek(clientId, scheduledDate) {
  const weekIdentifier = getWeekIdentifier(scheduledDate);
  
  // Check if check-in already exists for this week
  const existing = await db.collection('sessions')
    .where('clientId', '==', clientId)
    .where('sessionType', '==', 'checkin')
    .where('weekIdentifier', '==', weekIdentifier)
    .where('status', 'in', ['scheduled', 'completed'])
    .get();
  
  if (!existing.empty) {
    throw new Error('Check-in already scheduled for this week');
  }
}

// Calculate ISO week identifier
function getWeekIdentifier(date) {
  // Returns format: "2025-W01"
  const year = date.getFullYear();
  const weekNum = getISOWeek(date);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}
```

---

## Frontend Implementation

### **Client Page**

**File**: `app/src/app/dashboard/client/checkins/page.tsx`

**Features:**
- Current week status display
- Calendly widget embed
- Week restriction messaging
- Check-in history (last 4 weeks)
- Reschedule/Cancel buttons
- Subscription eligibility check

**UI Layout:**
```
┌─────────────────────────────────────┐
│ Weekly Check-ins                    │
├─────────────────────────────────────┤
│ Current Week (Dec 22-28, 2025)      │
│ ✓ Check-in Scheduled                │
│ Monday, Dec 23 at 3:00 PM (15 min)  │
│ [Reschedule] [Cancel]               │
├─────────────────────────────────────┤
│ Schedule Your Check-in              │
│ [Calendly Widget]                   │
├─────────────────────────────────────┤
│ Upcoming Check-ins                  │
│ • Next Week: Not scheduled          │
│ • Week of Jan 5: Scheduled          │
├─────────────────────────────────────┤
│ Past Check-ins                      │
│ • Dec 15-21: Completed ✓            │
│ • Dec 8-14: Completed ✓             │
└─────────────────────────────────────┘
```

### **Sidebar Integration**

**File**: `app/src/components/dashboard/client-sidebar.tsx`

Add in Support section:
```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild className={pathname === '/dashboard/client/checkins' ? 'bg-primary text-white hover:bg-primary/90' : ''}>
    <Link href="/dashboard/client/checkins">
      <PhoneCall className="w-4 h-4" />
      <span className="font-medium">Weekly Check-ins</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

---

## Firestore Indexes

### **Composite Index**

**File**: `firestore.indexes.json`

```json
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "sessionType", "order": "ASCENDING" },
        { "fieldPath": "scheduledDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "sessionType", "order": "ASCENDING" },
        { "fieldPath": "weekIdentifier", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Deploy:**
```bash
firebase deploy --only firestore:indexes
```

---

## Trainer Integration

### **Weekly Focus Editor**

**File**: `app/src/components/trainer/plan/WeeklyFocusEditor.tsx`

**Enhancements:**
- Show check-in status for active week
- Auto-populate `lastCallDate` when check-in completed
- Visual indicator: "📞 Check-in scheduled: Mon Dec 23, 3:00 PM"

### **My Plan Display**

**File**: `app/src/app/dashboard/client/plan/page.tsx`

**Changes:**
- Display real `coachNotes` from Weekly Focus (already implemented)
- Show last call date
- Highlight current week if check-in scheduled

---

## API Functions

### **Frontend Utilities**

**File**: `app/src/lib/checkin-api.ts` (new)

```typescript
// Get check-ins for client
export async function getClientCheckins(clientId: string): Promise<CheckinSession[]> {
  const q = query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'checkin'),
    orderBy('scheduledDate', 'desc'),
    limit(10)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheckinSession));
}

// Check if check-in scheduled for week
export async function hasCheckinForWeek(clientId: string, weekIdentifier: string): Promise<boolean> {
  const q = query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'checkin'),
    where('weekIdentifier', '==', weekIdentifier),
    where('status', 'in', ['scheduled', 'completed'])
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
```

---

## Testing Checklist

### **Frontend Testing**
- [ ] Navigate to /dashboard/client/checkins
- [ ] Verify Calendly widget loads
- [ ] Check subscription eligibility message
- [ ] Test with no check-in scheduled
- [ ] Test with check-in already scheduled this week
- [ ] Verify week restriction message appears
- [ ] Test check-in history display

### **Backend Testing** (After URL swap)
- [ ] Book a check-in via Calendly
- [ ] Verify webhook fires
- [ ] Check session document created with `sessionType: 'checkin'`
- [ ] Verify `weekIdentifier` populated correctly
- [ ] Try booking second check-in same week (should fail)
- [ ] Test cancellation
- [ ] Verify notes sync to Weekly Focus

### **Integration Testing**
- [ ] Trainer sees check-in in Weekly Focus
- [ ] Trainer adds notes after call
- [ ] Client sees notes in My Plan
- [ ] Week restriction enforced across reschedules
- [ ] Check-in shows in trainer's schedule view

---

## Known Limitations

### **Current**
1. **Temporary URL**: Using training session URL for development
2. **Manual week calculation**: No automatic week rollover notification
3. **No email reminders**: Not implemented yet

### **Future Enhancements**
1. **Automated reminders**: 24h before check-in
2. **Rescheduling UI**: In-app reschedule without Calendly
3. **Check-in templates**: Pre-filled notes templates for trainers
4. **Analytics**: Check-in completion rate tracking
5. **No-show handling**: Auto-mark status after missed call

---

## Success Metrics

### **Technical**
- ✅ Zero duplicate check-ins per week
- ✅ <2s page load time
- ✅ 100% webhook delivery rate

### **Business**
- Track: Check-in booking rate (% of eligible clients)
- Track: Completion rate (scheduled vs completed)
- Track: Average notes length (trainer engagement)
- Track: Client retention correlation

---

## Support & Troubleshooting

### **Common Issues**

**"Widget not loading"**
- Check browser console for errors
- Verify Calendly URL is correct
- Test in incognito mode (ad blockers)

**"Already scheduled this week" error**
- Verify `weekIdentifier` calculation
- Check for ghost sessions (status not updated)
- Review Firestore query filters

**"Webhook not firing"**
- Check Calendly webhook dashboard
- Verify Cloud Function deployed
- Review function logs

### **Getting Help**
1. Check Cloud Function logs: `firebase functions:log`
2. Review Calendly webhook delivery status
3. Verify Firestore rules allow read/write
4. Contact support with error logs

---

## Deployment Checklist

**Before Launch:**
- [ ] Create production Calendly event
- [ ] Configure webhook in Calendly dashboard
- [ ] Update environment variables
- [ ] Deploy Cloud Functions
- [ ] Deploy Firestore indexes
- [ ] Update client page URL
- [ ] Test end-to-end flow
- [ ] Update documentation

**After Launch:**
- [ ] Monitor webhook success rate
- [ ] Track booking metrics
- [ ] Gather user feedback
- [ ] Plan enhancements

---

## Version History

**v1.0** - December 28, 2025
- Initial implementation
- Shared collection architecture
- Week restriction enforcement
- Weekly Focus integration
