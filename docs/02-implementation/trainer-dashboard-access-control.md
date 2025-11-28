# Trainer Dashboard Access Control Implementation

**Version:** 1.0  
**Date:** November 27, 2025  
**Status:** Planning Phase  

## Executive Summary

This document outlines the implementation of role-based access control for the trainer dashboard, specifically focusing on the `canTrain` permission flag for admin users. The goal is to separate business management functions (admin dashboard) from training operations (trainer dashboard) while allowing flexible access based on user roles.

---

## 1. User Types & Access Matrix

### 1.1 User Type Definitions

| User Type | Collection | Role Field | canTrain Field | Description |
|-----------|-----------|------------|----------------|-------------|
| **Client** | `users/` | `'client'` | N/A | Paying customers receiving training services |
| **Staff Trainer** | `trainers/` | `'trainer'` | N/A | Employees focused solely on training clients |
| **Admin + Trainer** | `admins/` | `'admin'` | `true` | Owner/admin who also trains clients personally |
| **Business Admin** | `admins/` | `'admin'` | `false` or `undefined` | Admin focused on business operations, not training |

### 1.2 Dashboard Access Matrix

| User Type | Client Dashboard | Trainer Dashboard | Admin Dashboard |
|-----------|-----------------|-------------------|-----------------|
| Client | ✅ Full Access | ❌ No Access | ❌ No Access |
| Staff Trainer | ❌ No Access | ✅ Full Access | ❌ No Access |
| Admin + Trainer | ❌ No Access | ✅ Full Access | ✅ Full Access |
| Business Admin | ❌ No Access | ❌ No Access | ✅ Full Access |

### 1.3 Feature Access Matrix

| Feature Area | Client | Trainer | Admin+Trainer | Business Admin |
|--------------|--------|---------|---------------|----------------|
| **Training Operations** |
| View assigned clients | ❌ | ✅ | ✅ | ❌ |
| Manage workouts | ❌ | ✅ | ✅ | ❌ |
| Send client messages | ❌ | ✅ | ✅ | ❌ |
| Exercise library | ❌ | ✅ | ✅ | ❌ |
| Workout assignments | ❌ | ✅ | ✅ | ❌ |
| **Business Operations** |
| Revenue dashboard | ❌ | ❌ | ✅ | ✅ |
| Pending accounts | ❌ | ❌ | ✅ | ✅ |
| Training locations | ❌ | ❌ | ✅ | ✅ |
| System settings | ❌ | ❌ | ✅ | ✅ |
| **Dashboard Switching** |
| Switch to Admin | ❌ | ❌ | ✅ | N/A |
| Switch to Trainer | ❌ | N/A | ✅ | ❌ |

---

## 2. Current Architecture

### 2.1 Authentication Context (`auth-context.tsx`)

**Current Permission Logic:**
```typescript
const canAccessAdminDashboard = userData?.role === 'admin';
const canAccessTrainerDashboard = 
  userData?.role === 'admin' || userData?.role === 'trainer';
```

**Problem:**
- ALL admins can access trainer dashboard (ignores `canTrain` flag)
- Business-only admins have unnecessary access to training operations

### 2.2 Trainer Dashboard Structure

**Current Pages:**
```
/dashboard/trainer/
├── page.tsx                    (Dashboard home)
├── clients/page.tsx            (Client list)
├── clients-messages/page.tsx   (Client messages)
├── workouts/page.tsx           (Workout templates)
├── assignments/page.tsx        (Workout assignments)
└── profile/page.tsx            (Trainer profile)
```

**Current Access Control:**
- No page-level guards
- Relies solely on routing and sidebar visibility
- Any user who can navigate to URL can access the page

### 2.3 Sidebar Components

**TrainerSidebar:**
- Shows admin dashboard switcher for ALL admins
- Already has business sections removed (Part 1 complete)

**AdminSidebar:**
- Shows trainer dashboard switcher for ALL admins
- Needs conditional rendering based on `canTrain`

---

## 3. Required Changes

### 3.1 Authentication Context Updates

**File:** `app/src/lib/auth-context.tsx`

**Change:**
```typescript
// OLD
const canAccessTrainerDashboard = 
  userData?.role === 'admin' || userData?.role === 'trainer';

// NEW
const canAccessTrainerDashboard = 
  userData?.role === 'trainer' || 
  (userData?.role === 'admin' && userData?.canTrain === true);
```

**Impact:**
- Core permission logic that affects all access decisions
- Business admin (canTrain=false) will now be blocked from trainer dashboard
- Admin+Trainer (canTrain=true) retains full access

### 3.2 Trainer Dashboard Pages - Add Access Guards

**Files to Update (6 pages):**
1. `app/src/app/dashboard/trainer/page.tsx`
2. `app/src/app/dashboard/trainer/clients/page.tsx`
3. `app/src/app/dashboard/trainer/clients-messages/page.tsx`
4. `app/src/app/dashboard/trainer/workouts/page.tsx`
5. `app/src/app/dashboard/trainer/assignments/page.tsx`
6. `app/src/app/dashboard/trainer/profile/page.tsx`

**Standard Guard Pattern:**
```typescript
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TrainerPage() {
  const router = useRouter();
  const { userData, canAccessTrainerDashboard, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for auth to load
    
    if (!canAccessTrainerDashboard) {
      // If they're an admin without canTrain, redirect to admin dashboard
      if (userData?.role === 'admin') {
        router.push('/dashboard/admin');
      } else {
        // Otherwise redirect to login
        router.push('/login');
      }
    }
  }, [canAccessTrainerDashboard, userData, loading, router]);

  // Show loading state while auth is loading
  if (loading) {
    return <div>Loading...</div>;
  }

  // Show nothing while redirecting
  if (!canAccessTrainerDashboard) {
    return null;
  }

  // Rest of component code...
}
```

**Why This Pattern:**
- Checks auth state before rendering
- Redirects admins to admin dashboard (better UX than login)
- Redirects others to login
- Prevents flash of unauthorized content
- Handles loading states properly

### 3.3 AdminSidebar Dashboard Switcher Update

**File:** `app/src/components/AdminSidebar.tsx`

**Current Code:**
```typescript
<SidebarMenuButton onClick={() => router.push('/dashboard/trainer')}>
  <Briefcase className="w-4 h-4" />
  <span className="font-medium">Training Dashboard</span>
</SidebarMenuButton>
```

**New Code:**
```typescript
import { useAuth } from '@/lib/auth-context';

export default function AdminSidebar({ currentPage }: AdminSidebarProps) {
  const router = useRouter();
  const { userData, canAccessTrainerDashboard } = useAuth();
  
  // ... rest of component
  
  {/* Dashboard Switcher - Only if user can train */}
  {canAccessTrainerDashboard && (
    <>
      <div className="my-2 border-t border-sidebar-border" />
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={() => router.push('/dashboard/trainer')}
                className="cursor-pointer"
              >
                <Briefcase className="w-4 h-4" />
                <span className="font-medium">Training Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )}
}
```

**Impact:**
- Business admin will NOT see trainer dashboard button
- Admin+Trainer will see button and can switch freely
- Maintains consistency with TrainerSidebar pattern

### 3.4 Login Routing Logic

**File:** May need to check login/redirect logic

**Current Behavior:**
- After login, user is redirected based on role
- Need to ensure proper initial landing page

**Desired Behavior:**
| User Type | Initial Redirect |
|-----------|-----------------|
| Client | `/dashboard/client` |
| Staff Trainer | `/dashboard/trainer` |
| Admin + Trainer | `/dashboard/admin` (can switch to trainer) |
| Business Admin | `/dashboard/admin` |

---

## 4. Implementation Checklist

### Phase 1: Core Permission Logic
- [ ] Update `canAccessTrainerDashboard` in `auth-context.tsx`
- [ ] Test permission logic with different user types
- [ ] Verify `canTrain` flag is properly read from Firestore

### Phase 2: Page Guards
- [ ] Add access guard to `/dashboard/trainer/page.tsx`
- [ ] Add access guard to `/dashboard/trainer/clients/page.tsx`
- [ ] Add access guard to `/dashboard/trainer/clients-messages/page.tsx`
- [ ] Add access guard to `/dashboard/trainer/workouts/page.tsx`
- [ ] Add access guard to `/dashboard/trainer/assignments/page.tsx`
- [ ] Add access guard to `/dashboard/trainer/profile/page.tsx`

### Phase 3: Sidebar Updates
- [ ] Update AdminSidebar to conditionally show trainer switcher
- [ ] Verify TrainerSidebar admin switcher still works
- [ ] Test dashboard switching both directions

### Phase 4: Testing
- [ ] Test as Staff Trainer (should access trainer only)
- [ ] Test as Business Admin (should access admin only)
- [ ] Test as Admin+Trainer (should access both)
- [ ] Test as Client (should access client only)
- [ ] Test direct URL navigation attempts
- [ ] Test dashboard switching functionality

---

## 5. Testing Scenarios

### 5.1 Staff Trainer Tests

**Setup:** User in `trainers/` collection, role='trainer'

| Test | Expected Result |
|------|----------------|
| Login | Redirect to `/dashboard/trainer` |
| Navigate to trainer pages | ✅ Access granted |
| Try `/dashboard/admin` URL | ❌ Redirect to `/login` |
| Sidebar shows admin switcher | ❌ No (not admin) |

### 5.2 Business Admin Tests

**Setup:** User in `admins/` collection, role='admin', canTrain=false

| Test | Expected Result |
|------|----------------|
| Login | Redirect to `/dashboard/admin` |
| Navigate to admin pages | ✅ Access granted |
| Try `/dashboard/trainer` URL | ❌ Redirect to `/dashboard/admin` |
| Sidebar shows trainer switcher | ❌ No (canTrain=false) |

### 5.3 Admin + Trainer Tests

**Setup:** User in `admins/` collection, role='admin', canTrain=true

| Test | Expected Result |
|------|----------------|
| Login | Redirect to `/dashboard/admin` |
| Navigate to admin pages | ✅ Access granted |
| Click "Switch to Training" | ✅ Navigate to `/dashboard/trainer` |
| Navigate to trainer pages | ✅ Access granted |
| Click "Switch to Admin" | ✅ Navigate to `/dashboard/admin` |
| Sidebar shows trainer switcher (in admin) | ✅ Yes |
| Sidebar shows admin switcher (in trainer) | ✅ Yes |

### 5.4 Client Tests

**Setup:** User in `users/` collection, role='client'

| Test | Expected Result |
|------|----------------|
| Login | Redirect to `/dashboard/client` |
| Navigate to client pages | ✅ Access granted |
| Try `/dashboard/trainer` URL | ❌ Redirect to `/login` |
| Try `/dashboard/admin` URL | ❌ Redirect to `/login` |
| Sidebar shows any switcher | ❌ No |

---

## 6. Edge Cases & Considerations

### 6.1 Migration of Existing Admins

**Issue:** Existing admin users may not have `canTrain` field

**Solution:** 
- `canTrain=undefined` or `canTrain=false` treated the same (no trainer access)
- Must explicitly set `canTrain=true` for admins who should train

**Migration Path:**
```javascript
// For Shreyas (owner who trains)
await updateDoc(doc(db, 'admins', shreyasUserId), {
  canTrain: true
});

// Business admins default to false (no update needed)
```

### 6.2 Loading States

**Issue:** Flash of wrong content during auth check

**Solution:**
- Show loading spinner while `loading=true`
- Return `null` while redirecting
- Only render content after permissions verified

### 6.3 Direct URL Navigation

**Issue:** Users can type URLs directly

**Solution:**
- Page-level guards catch this
- useEffect redirects before render
- No sensitive data exposed

### 6.4 Client Count Badge in TrainerSidebar

**Current Behavior:** Shows total client count from all trainers

**Consideration:** 
- Staff trainers should only see their assigned clients
- Admin+Trainer might want to see all clients
- Badge logic may need filtering (future enhancement)

### 6.5 Profile Page

**Issue:** Trainer profile page shows trainer-specific fields

**Consideration:**
- Admin+Trainer accesses this through trainer dashboard
- Business admin should NOT access (no trainer profile to edit)
- Current guard pattern handles this correctly

---

## 7. Future Enhancements (Not in Part 2)

### 7.1 Admin Message Monitoring

**Requirement:** Admins need to monitor trainer-client communications

**Proposed Solution:**
- New page: `/dashboard/admin/messages`
- Shows ALL trainer-client messages
- Filters by trainer, client, date
- Read-only for business admins
- Interactive for admin+trainers (via trainer dashboard)

**Why Separate:**
- Clean separation of concerns
- Admin-specific filtering and search
- Scalable for multiple trainers
- Easier audit trail

### 7.2 Client Filtering in Trainer Dashboard

**Consideration:** When multiple trainers exist:
- Staff trainers see only their assigned clients
- Admin+Trainers might see all clients or only their personal clients
- Requires client-trainer assignment logic
- Database queries need filtering

### 7.3 Role-Based UI Customization

**Examples:**
- Different dashboard widgets for different roles
- Conditional feature toggles
- Usage analytics by role
- Performance optimizations

---

## 8. Rollback Plan

If issues arise during implementation:

### Quick Rollback
```typescript
// Revert auth-context.tsx permission logic
const canAccessTrainerDashboard = 
  userData?.role === 'admin' || userData?.role === 'trainer';
```

### Partial Rollback
- Remove page guards but keep sidebar changes
- Allows testing of individual components
- Gradual rollout possible

### Data Rollback
- No database changes required
- All changes are code-level only
- `canTrain` field is additive (doesn't break existing data)

---

## 9. Implementation Timeline

**Estimated Effort:** 2-3 hours

1. **Core Logic (30 mins):**
   - Update auth context
   - Test permission flags

2. **Page Guards (60 mins):**
   - Add guards to 6 pages
   - Test each page

3. **Sidebar Updates (20 mins):**
   - Update AdminSidebar
   - Test switching

4. **Testing (40 mins):**
   - Test all 4 user types
   - Test edge cases
   - Verify redirects

5. **Documentation (20 mins):**
   - Update README
   - Document testing results

---

## 10. Success Criteria

Implementation is complete when:

- ✅ Staff trainers can access trainer dashboard only
- ✅ Business admins can access admin dashboard only
- ✅ Admin+Trainers can switch between both dashboards
- ✅ Clients remain unaffected
- ✅ Direct URL attempts are blocked with proper redirects
- ✅ No unauthorized access to any pages
- ✅ All tests pass for all user types
- ✅ Loading states work correctly
- ✅ No console errors or warnings
- ✅ Dashboard switcher buttons appear correctly

---

## 11. References

- Authentication Context: `app/src/lib/auth-context.tsx`
- TrainerSidebar: `app/src/components/TrainerSidebar.tsx`
- AdminSidebar: `app/src/components/AdminSidebar.tsx`
- Trainer Pages: `app/src/app/dashboard/trainer/*`
- Admin Account Setup: `docs/02-implementation/admin-account-setup-guide.md`

---

**Document Status:** Ready for Implementation  
**Next Step:** Review and approve, then toggle to Act mode to implement  
**Estimated Implementation Time:** 2-3 hours  
**Risk Level:** Low (no database changes, easily reversible)
