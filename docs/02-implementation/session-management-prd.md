# Product Requirements Document (PRD)
## In-Person Training Session Management System

**Document Version:** 1.0  
**Date:** November 6, 2025  
**Author:** Product Team  
**Status:** Draft - Pending Approval

---

## 1. Executive Summary

### 1.1 Overview
The In-Person Training Session Management System enables clients to purchase prepaid training session packages and schedule appointments with their trainer through an integrated, seamless experience. This feature bridges the gap between payment and scheduling, providing a credit-based system that encourages commitment while offering flexibility.

### 1.2 Business Objectives
- **Revenue Growth**: Increase upfront cash flow through package sales
- **Client Commitment**: Reduce no-shows by 40%+ through prepaid sessions
- **Operational Efficiency**: Automate session tracking and scheduling
- **Client Retention**: Improve 90-day retention rate by 25%
- **Upsell Opportunities**: Create natural touchpoints for package renewal

### 1.3 Success Metrics
- Package purchase conversion rate: >30%
- No-show rate: <15% (vs 35-45% industry average)
- Session utilization rate: >85% before expiration
- Client satisfaction score: >4.5/5
- Average sessions per client per month: >2

---

## 2. User Personas

### 2.1 Primary Users

**Persona 1: Active Client "Sarah"**
- Age: 32, working professional
- Has subscription ($40/mo)
- Wants in-person training 2x/week
- Budget-conscious, values discounts
- Prefers prepaying to commit to fitness goals
- Uses mobile device primarily

**Persona 2: Occasional Client "Mike"**
- Age: 45, busy executive
- Has subscription ($40/mo)
- Wants check-ins every 2-3 weeks
- Willing to pay premium for flexibility
- Travels frequently, needs extension options
- Uses desktop/mobile equally

**Persona 3: Trainer "Shreya"**
- Manages 20-30 active clients
- Needs to track session utilization
- Wants flexibility to extend/refund
- Requires visibility into upcoming schedule
- Needs revenue forecasting data

---

## 3. User Stories & Acceptance Criteria

### 3.1 Client Stories

**Story 1: Purchase Sessions**
```
As a client,
I want to buy training session packages,
So that I can schedule sessions with my trainer.

Acceptance Criteria:
- Can view pricing for Single ($70) and 4-Pack ($240)
- See savings clearly displayed ($40 saved with 4-pack)
- Complete purchase via Stripe in <60 seconds
- Receive confirmation email immediately
- See session balance updated instantly
- Know expiration date (60 days from purchase)
```

**Story 2: View Session Balance**
```
As a client,
I want to see my available sessions at a glance,
So that I know when I need to buy more.

Acceptance Criteria:
- Balance visible in sidebar navigation
- Can see total available sessions
- Can view next expiration date
- Can see purchase history with status
- Receive warning 7 days before expiration
- Can filter expired vs active packages
```

**Story 3: Schedule Training Session**
```
As a client,
I want to book a training session using my credits,
So that I can train with my coach.

Acceptance Criteria:
- Scheduling disabled when balance = 0
- Clear messaging if no sessions available
- Calendly widget loads within 2 seconds
- Booking automatically deducts 1 session
- Receive confirmation email
- Can see upcoming sessions list
```

**Story 4: Manage Scheduled Sessions**
```
As a client,
I want to view/cancel upcoming sessions,
So that I can manage my schedule.

Acceptance Criteria:
- See all upcoming booked sessions
- Can cancel up to 24 hours before
- Canceled session returns to balance
- Late cancellation (< 24h) = lost session
- Can see past session history
```

### 3.2 Trainer Stories

**Story 5: View Client Session Balances**
```
As a trainer,
I want to see which clients have sessions available,
So that I can encourage them to schedule.

Acceptance Criteria:
- Dashboard shows all client balances
- Can filter by balance (>0, =0, expiring soon)
- Can see last purchase date
- Can see utilization percentage
- Can export report
```

**Story 6: Extend Session Expiration**
```
As a trainer,
I want to extend a client's session expiration,
So that I can accommodate special circumstances.

Acceptance Criteria:
- Can add days to any package
- Requires written reason/note
- Client notified via email
- Extension logged in system
- Can undo within 24 hours
```

**Story 7: Issue Refunds**
```
As a trainer,
I want to refund unused sessions,
So that I can handle special cases.

Acceptance Criteria:
- Only within 7 days of purchase
- Only for unused sessions
- Requires admin approval
- Refund processed via Stripe
- Sessions removed from balance
- Client notified immediately
```

---

## 4. Functional Requirements

### 4.1 Session Package Management

**FR-1: Package Types**
- Single session: $70, 1 credit
- 4-Pack: $240, 4 credits ($60/session)
- Both have 60-day expiration from purchase date
- Subscription members get same 4-pack pricing

**FR-2: Purchase Flow**
- Integrate with existing Stripe products/prices
- Use Stripe Checkout for payment
- Create package record on webhook success
- Update user balance atomically
- Send confirmation email with details

**FR-3: Session Balance Tracking**
- Track available, purchased, used, expired counts
- Calculate from package array (source of truth)
- Update on purchase, use, expiration
- Display prominently in UI
- Show next expiration date

**FR-4: Expiration System**
- Automatic at 60 days from purchase
- Nightly cron job checks all packages
- Warn at 7 days before expiration
- Move to "expired" status automatically
- Remaining sessions moved to expired count

### 4.2 Session Scheduling

**FR-5: Calendly Integration**
- Embed Calendly widget on schedule page
- Prefill with client name/email
- Only show when balance > 0
- Capture webhook on booking
- Store event ID and details

**FR-6: Session Deduction Logic**
- Deduct from oldest unexpired package first (FIFO)
- Create session record with package reference
- Update balance immediately
- Send confirmation email
- Prevent double-booking

**FR-7: Session Cancellation**
- Client can cancel >24h before: credit returned
- <24h cancellation: session lost (no-show policy)
- Trainer can cancel anytime: credit returned
- Cancellation via Calendly or platform
- Email notifications sent

### 4.3 Trainer Management Tools

**FR-8: Client Session Dashboard**
- List all clients with session balances
- Filter/sort capabilities
- Export to CSV
- Revenue analytics
- Utilization metrics

**FR-9: Administrative Actions**
- Extend expiration dates
- Issue refunds (within 7 days)
- Add bonus sessions
- View session history
- Add manual notes

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **Page Load**: <2 seconds for all pages
- **API Response**: <500ms for balance queries
- **Webhook Processing**: <3 seconds end-to-end
- **Calendly Embed**: <2 seconds to interactive
- **Database Queries**: <200ms average

### 5.2 Scalability
- Support 1000+ active clients
- Handle 100+ concurrent purchases
- Process 500+ bookings per day
- Store 10,000+ session records
- 99.9% uptime SLA

### 5.3 Security
- PCI compliance via Stripe (no card storage)
- HTTPS everywhere
- Firebase authentication required
- Row-level security in Firestore
- Rate limiting on API endpoints
- CSRF protection

### 5.4 Reliability
- Idempotent webhook handlers
- Transaction-based balance updates
- Automatic retry on failures
- Dead letter queue for failed webhooks
- Comprehensive error logging

### 5.5 Usability
- Mobile-responsive design
- Accessible (WCAG 2.1 AA)
- Clear error messages
- Intuitive navigation
- <3 clicks to complete any action

---

## 6. Data Model

### 6.1 Firestore Collections

**users/{userId}**
```typescript
{
  // Existing fields...
  sessionBalance: {
    available: number,      // Computed: sum of active packages
    purchased: number,      // Lifetime total
    used: number,          // Lifetime used
    expired: number,       // Lifetime expired unused
    lastUpdated: Timestamp
  },
  sessionPackages: [
    {
      id: string,          // Auto-generated
      type: 'single' | '4-pack',
      quantity: number,    // 1 or 4
      remaining: number,   // How many left in this package
      purchaseDate: Timestamp,
      expirationDate: Timestamp,
      expired: boolean,
      stripePaymentIntentId: string,
      stripePriceId: string,
      extendedBy?: {
        trainerId: string,
        date: Timestamp,
        daysAdded: number,
        reason: string
      }
    }
  ]
}
```

**sessions/{sessionId}**
```typescript
{
  clientId: string,
  clientName: string,
  clientEmail: string,
  trainerId: string,
  packageId: string,           // Which package was used
  calendlyEventId: string,
  calendlyEventUri: string,
  scheduledDate: Timestamp,
  duration: number,            // minutes
  status: 'scheduled' | 'completed' | 'canceled' | 'no-show',
  canceledBy?: 'client' | 'trainer',
  canceledAt?: Timestamp,
  cancelReason?: string,
  creditReturned: boolean,     // Was session credit returned?
  createdAt: Timestamp,
  updatedAt: Timestamp,
  completedAt?: Timestamp,
  notes?: string
}
```

**session_refunds/{refundId}**
```typescript
{
  clientId: string,
  packageId: string,
  requestedBy: string,         // trainer ID
  reason: string,
  sessionsRefunded: number,
  stripeRefundId: string,
  status: 'pending' | 'approved' | 'completed' | 'rejected',
  requestedAt: Timestamp,
  processedAt?: Timestamp,
  processedBy?: string
}
```

### 6.2 Indexes Required
```
sessions: clientId, scheduledDate DESC
sessions: trainerId, scheduledDate DESC
sessions: status, scheduledDate DESC
users: sessionBalance.available, sessionBalance.lastUpdated
```

---

## 7. API Specifications

### 7.1 Cloud Functions

**Function: purchaseSessionPackage**
```typescript
Input: {
  userId: string,
  priceId: string  // Stripe price ID
}

Process:
1. Validate user exists
2. Create Stripe Checkout Session
3. Return checkout URL

Output: {
  checkoutUrl: string,
  sessionId: string
}
```

**Function: stripeWebhook**
```typescript
Input: Stripe webhook event

Process (checkout.session.completed):
1. Verify webhook signature
2. Extract payment details
3. Create session package
4. Update user balance
5. Send confirmation email
6. Log transaction

Output: 200 OK
```

**Function: getSessionBalance**
```typescript
Input: {
  userId: string
}

Output: {
  available: number,
  packages: PackageDetails[],
  nextExpiration: Timestamp | null,
  upcomingExpirations: PackageDetails[]
}
```

**Function: scheduleSession**
```typescript
Input: {
  userId: string,
  calendlyEventId: string,
  eventDetails: {
    scheduledDate: Timestamp,
    duration: number,
    eventUri: string
  }
}

Process:
1. Verify balance > 0
2. Find oldest unexpired package
3. Deduct 1 session
4. Create session record
5. Update user balance
6. Send confirmation email

Output: {
  success: boolean,
  sessionId: string,
  remainingBalance: number
}
```

**Function: calendlyWebhook**
```typescript
Input: Calendly webhook payload

Process (invitee.created):
1. Extract event details
2. Find user by email
3. Call scheduleSession
4. Handle errors gracefully

Output: 200 OK
```

**Function: cancelSession**
```typescript
Input: {
  sessionId: string,
  canceledBy: 'client' | 'trainer',
  reason?: string
}

Process:
1. Verify session exists & not past
2. Check if >24h notice
3. If yes: return credit to package
4. Update session status
5. Cancel in Calendly
6. Send notification emails

Output: {
  success: boolean,
  creditReturned: boolean
}
```

**Function: expireSessionPackages (Scheduled)**
```typescript
Schedule: Daily at 2 AM UTC

Process:
1. Query packages with expiration < now
2. For each package:
   - Mark as expired
   - Move remaining to expired count
   - Send notification email
3. Update user balances
4. Log expired sessions

Output: {
  packagesExpired: number,
  sessionsExpired: number
}
```

**Function: extendPackageExpiration**
```typescript
Input: {
  userId: string,
  packageId: string,
  daysToAdd: number,
  reason: string,
  trainerId: string
}

Process:
1. Verify trainer permissions
2. Update expiration date
3. Log extension
4. Notify client

Output: {
  success: boolean,
  newExpirationDate: Timestamp
}
```

---

## 8. User Interface Specifications

### 8.1 Navigation Updates

**Client Sidebar**
```
Dashboard
Workouts
Nutrition  
Messages

IN-PERSON TRAINING          ← New section
├─ Buy Sessions (3)         ← Badge shows balance
└─ Schedule Sessions 🔒     ← Locked if balance = 0

Billing
Profile
```

### 8.2 Buy Sessions Page

**Layout:**
- Header: "Buy Training Sessions"
- Balance card (prominent)
- Pricing comparison cards
- Purchase history table
- Expiration warnings

**Balance Card:**
```
┌─────────────────────────────────┐
│ 📊 Your Session Balance         │
├─────────────────────────────────┤
│ Available Sessions: 3           │
│ Next Expiration: Jan 15, 2026   │
│                                 │
│ ⚠️ 2 sessions expire in 5 days  │
└─────────────────────────────────┘
```

**Pricing Cards:**
```
┌────────────────┬───────────────────┐
│ Single Session │ 4-Pack Sessions   │
├────────────────┼───────────────────┤
│ $70            │ $240              │
│ per session    │ Save $40!         │
│                │ $60/session       │
│ • Pay as you   │ • Best value      │
│   go           │ • 14% discount    │
│ • 60 days to   │ • 60 days to use  │
│   use          │                   │
│                │                   │
│ [Buy Now]      │ [Buy Now] ⭐      │
└────────────────┴───────────────────┘
```

**Purchase History:**
```
Date       Type    Price   Expires     Status    Used
───────────────────────────────────────────────────
Nov 1      4-Pack  $240    Jan 1       Active    2/4
Oct 15     Single  $70     Dec 15      Expired   0/1
Sep 20     4-Pack  $240    Nov 20      Complete  4/4
```

### 8.3 Schedule Sessions Page

**When Balance > 0:**
```
┌─────────────────────────────────┐
│ Schedule Training Session       │
├─────────────────────────────────┤
│ Available Sessions: 3           │
│                                 │
│ ┌─────────────────────────┐    │
│ │                         │    │
│ │  [Calendly Widget Here]  │    │
│ │                         │    │
│ └─────────────────────────┘    │
│                                 │
│ Upcoming Sessions               │
│ ┌─────────────────────────┐    │
│ │ Nov 20, 2:00 PM         │    │
│ │ 60 min • Confirmed      │    │
│ │ [Cancel] [Reschedule]   │    │
│ └─────────────────────────┘    │
└─────────────────────────────────┘
```

**When Balance = 0:**
```
┌─────────────────────────────────┐
│ Schedule Training Session       │
├─────────────────────────────────┤
│ ⚠️ No sessions available        │
│                                 │
│ You need to purchase sessions   │
│ before you can schedule.        │
│                                 │
│ [Buy Sessions]                  │
└─────────────────────────────────┘
```

### 8.4 Mobile Responsive Design

**Key Considerations:**
- Single column layout on mobile
- Sticky balance summary
- Touch-friendly buttons (min 44px)
- Simplified purchase history table
- Full-width Calendly on mobile

---

## 9. Edge Cases & Error Handling

### 9.1 Purchase Edge Cases

**Case 1: Payment Fails**
- Show clear error message
- Offer retry option
- Don't create package
- Log for investigation

**Case 2: Webhook Delayed/Lost**
- Implement webhook retry logic
- Manual reconciliation tool
- Client can contact support
- Refund if unresolved

**Case 3: Duplicate Purchases**
- Check for duplicate checkout sessions
- Prevent double-charge
- Use idempotency keys

### 9.2 Scheduling Edge Cases

**Case 4: Balance Depleted During Booking**
- Check balance before AND after Calendly webhook
- If depleted: cancel booking, notify client
- Offer immediate purchase option

**Case 5: Calendly Webhook Fails**
- Retry webhook delivery (exponential backoff)
- Dead letter queue after 5 attempts
- Manual session creation tool
- Client notified of issue

**Case 6: Package Expires Mid-Booking**
- Check expiration in real-time
- Block booking if expired
- Show expiration message
- Offer extension option

**Case 7: Double Booking**
- Check for existing session at same time
- Prevent if conflict detected
- Show available slots only

### 9.3 Cancellation Edge Cases

**Case 8: Cancel After Completed**
- Prevent cancellation
- Show "Already completed" message

**Case 9: Late Cancellation**
- Clearly show no-show policy
- No credit returned
- Mark as "canceled-late"

**Case 10: Trainer Cancels**
- Always return credit
- High-priority notification
- Offer immediate rebook

---

## 10. Security Considerations

### 10.1 Authentication & Authorization
- All API calls require Firebase Authentication
- Balance queries: user can only see own data
- Trainer functions: verify trainer role
- Refunds: require admin approval

### 10.2 Data Protection
- No credit card data stored
- PII encrypted at rest
- Audit log for all admin actions
- GDPR-compliant data retention

### 10.3 Fraud Prevention
- Rate limiting on purchases (max 5/hour)
- Suspicious activity monitoring
- Manual review for large packages
- IP-based geo-restrictions

### 10.4 Webhook Security
- Verify Stripe webhook signatures
- Verify Calendly webhook signatures
- Whitelist webhook source IPs
- Replay attack prevention

---

## 11. Testing Strategy

### 11.1 Unit Tests
- Balance calculation logic
- Package expiration logic
- Session deduction (FIFO)
- Refund calculations

### 11.2 Integration Tests
- Stripe checkout flow
- Webhooks processing
- Calendly integration
- Email notifications

### 11.3 End-to-End Tests
- Complete purchase flow
- Complete booking flow
- Cancellation flow
- Expiration flow

### 11.4 Load Testing
- 100 concurrent purchases
- 500 concurrent bookings
- Webhook flood handling

### 11.5 Manual Testing
- Mobile responsiveness
- Accessibility audit
- Cross-browser testing
- Error message clarity

---

## 12. Analytics & Monitoring

### 12.1 Key Metrics to Track
- **Purchase Metrics**
  - Conversion rate (visitors → buyers)
  - Average package size
  - Single vs 4-pack split
  - Revenue per client

- **Utilization Metrics**
  - Sessions used before expiration
  - Average time to first booking
  - Booking frequency
  - Cancellation rate

- **Business Metrics**
  - Monthly recurring session revenue
  - Client lifetime value
  - No-show rate
  - Extension/refund rate

### 12.2 Monitoring & Alerts
- Webhook failure rate >1%
- Purchase failure rate >5%
- API response time >1s
- Expiration job failures
- Low session balance (<20 clients)

---

## 13. Implementation Timeline

### Phase 1: Foundation (Days 1-3)
- [ ] Database schema implementation
- [ ] TypeScript interfaces
- [ ] Firestore security rules
- [ ] Basic Cloud Functions setup

### Phase 2: Purchase Flow (Days 4-6)
- [ ] Buy Sessions page UI
- [ ] Stripe integration
- [ ] Webhook handler
- [ ] Package creation logic
- [ ] Email notifications

### Phase 3: Balance System (Days 7-8)
- [ ] Balance calculation
- [ ] Balance display component
- [ ] Purchase history table
- [ ] Sidebar updates

### Phase 4: Scheduling (Days 9-11)
- [ ] Schedule page UI
- [ ] Calendly integration
- [ ] Session deduction logic
- [ ] Calendly webhook
- [ ] Confirmation emails

### Phase 5: Session Management (Days 12-13)
- [ ] Upcoming sessions list
- [ ] Cancellation flow
- [ ] Session history
- [ ] Status updates

### Phase 6: Expiration System (Days 14-15)
- [ ] Expiration cron job
- [ ] Warning notifications
- [ ] Expired package handling
- [ ] Email reminders

### Phase 7: Trainer Tools (Days 16-18)
- [ ] Client balance dashboard
- [ ] Extend expiration UI
- [ ] Refund handling
- [ ] Analytics/reports

### Phase 8: Testing & Polish (Days 19-20)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Bug fixes
- [ ] Documentation

**Total: 20 working days (4 weeks)**

---

## 14. Future Enhancements (Post-V1)

### 14.1 V1.1 Enhancements
- Session package gifting
- Group session bookings
- Recurring session scheduling
- Mobile app push notifications
- Session feedback/rating

### 14.2 V1.2 Enhancements
- Multiple trainer support
- Package transfer between clients
- Loyalty program integration
- Advanced analytics dashboard
- API for third-party integrations

### 14.3 V2.0 Vision
- AI-powered scheduling recommendations
- Automated reschedule suggestions
- Video session integration
- Nutrition session tracking
- Comprehensive fitness journey tracking

---

## 15. Dependencies & Risks

### 15.1 External Dependencies
- Stripe API availability
- Calendly API availability
- Firebase service uptime
- Email service (SendGrid/etc)

### 15.2 Technical Risks
- **Risk:** Webhook delivery failures
  - **Mitigation:** Retry logic + manual reconciliation tool

- **Risk:** Race conditions in balance updates
  - **Mitigation:** Firestore transactions

- **Risk:** Calendly integration changes
  - **Mitigation:** Version pinning + monitoring

### 15.3 Business Risks
- **Risk:** Low adoption rate
  - **Mitigation:** Onboarding flow + incentives

- **Risk:** High expiration rate
  - **Mitigation:** Proactive reminders + extensions

- **Risk:** High refund rate
  - **Mitigation:** Clear policies + trial period

---

## 16. Open Questions

1. **Should we allow package transfers between clients?**
   - Recommendation: Not in V1, consider for V1.1

2. **What happens to sessions if subscription is canceled?**
   - Recommendation: Sessions remain valid until expiration

3. **Should we offer automatic package renewal?**
   - Recommendation: Not in V1, too complex

4. **How do we handle time zone differences?**
   - Recommendation: Always use client's local time zone

5. **Should trainers be able to create custom packages?**
   - Recommendation: Not in V1, too complex

---

## 17. Approval & Sign-off

**PRD Author:** Product Team  
**Date:** November 6, 2025  
**Version:** 1.0  
**Status:** Draft - Pending Approval

**Pending Approval:**
- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Design Lead
- [ ] Business Stakeholder

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 6, 2025 | Product Team | Initial draft |

---

**Ready to proceed with implementation once approved!**
