# Training Locations Feature Implementation

## Problem Statement

### The Challenge
When clients book in-person training sessions via Calendly, they specify a location in the booking details. However, these location strings can vary:
- "Ironworks" vs "Ironworks Gym" vs "ironworks gym"
- Different spellings or abbreviations
- New locations added without system updates

Without a centralized location registry, the system has several critical issues:

1. **No Source of Truth**: Location data is scattered across Calendly events with no central management
2. **Inconsistent Display**: Clients see raw Calendly strings rather than standardized addresses
3. **No Fallback Logic**: If a booking location doesn't match any known location, there's no default
4. **Limited Visibility**: Trainers can't see what locations are active or manage them
5. **Historical Data Loss**: If a location changes, historical sessions lose context

### Business Impact
- Poor client experience with inconsistent location information
- Manual work to interpret and standardize location data
- Risk of clients showing up at wrong locations
- No way to phase out old locations while preserving history
- Difficult to add new training locations to the system

## Solution: Centralized Location Registry

### Core Concepts

**Training Location Registry**
A centralized database (`training_locations` collection) that serves as the single source of truth for all training locations.

**Location Matching**
When Calendly webhooks receive a booking:
1. Extract location string from Calendly event
2. Match against predefined location names (case-insensitive, partial matching)
3. If match found → use predefined location ID
4. If no match → use default location (fallback safety)

**Location States**
- **Default**: One location must always be marked as default. Used as fallback when Calendly location doesn't match any defined location.
- **Active**: Visible to clients, available for scheduling, appears in booking system
- **Inactive**: Hidden from clients but preserved for historical sessions. Allows phasing out locations without data loss.

### Key Features

1. **Centralized Management** (`/dashboard/trainer/business/locations`)
   - Add/edit/manage all training locations
   - Set default location for fallback
   - Mark locations as active/inactive

2. **Location Matching Logic**
   - Calendly webhook extracts location from booking
   - Matches against registry using name field
   - Falls back to default if no match

3. **Data Integrity**
   - All sessions reference location by ID (not string)
   - Historical sessions preserve original location even if changed
   - Inactive locations remain accessible for old sessions

4. **Client Experience**
   - See standardized location names and addresses
   - Consistent location information across all touchpoints
   - No confusion about where to show up

### UX Enhancement: Info Card
Added contextual help card on locations page explaining:
- What "Default" means (fallback for unmatched locations)
- What "Active" means (visible and available)
- What "Inactive" means (hidden but preserved)

This prevents confusion and sets clear expectations for trainers managing locations.

## Copy-on-Write Architecture

### Why This Pattern?

When a location's address changes, we face a critical decision: update the existing location or create a new one? We chose the **copy-on-write pattern** for these reasons:

1. **Historical Accuracy**: Past sessions must preserve the exact location where they occurred
2. **Data Integrity**: No risk of accidentally updating historical data
3. **Clean Audit Trail**: Both old and new locations exist as separate records
4. **Simple Queries**: Sessions just reference locationId - no complex logic needed
5. **Rollback Capability**: Old location still exists if needed

### How It Works

#### Creating/AddiI meant the doc you were updating before - training-locations-implementation. dont need yet another doc. In the clietn profile, there is already a location with address that the user can enter. So, if it is set, then we need to use it in display logic. right?
ng New Location (Normal Flow)
```
1. User fills out location form
2. Create new document in training_locations
3. Document gets auto-generated ID
4. Mark as active
```

#### Editing Existing Location (Copy-on-Write Flow)
```
1. User edits location (changes address, name, etc.)
2. Create NEW location document with edited data
   - Gets new auto-generated ID: loc456
   - Contains new address/details
   - Marked as active
3. Mark OLD location document inactive
   - Original ID: loc123
   - Original address preserved forever
   - Set isActive = false
4. Query upcoming sessions with old locationId
   - WHERE locationId = loc123
   - AND status = 'scheduled'
   - AND scheduledDate >= NOW()
5. Batch update those sessions
   - Change locationId from loc123 → loc456
   - Sessions now reference new location
6. Completed sessions remain unchanged
   - Still reference locationId = loc123
   - They point to archived location document
   - Historical accuracy maintained
```

### Data Flow Example

**Before Edit:**
```
Location (loc123):
- name: "Ironworks"
- address: "12708 Northup Way"
- isActive: true

Sessions:
- Session A (completed): locationId = loc123 ✓
- Session B (upcoming): locationId = loc123 ✓
- Session C (upcoming): locationId = loc123 ✓
```

**After Editing Address to "New Address":**
```
Location (loc123) - OLD:
- name: "Ironworks"
- address: "12708 Northup Way"
- isActive: false  ← Archived

Location (loc456) - NEW:
- name: "Ironworks"
- address: "New Address"
- isActive: true   ← Active

Sessions:
- Session A (completed): locationId = loc123 ✓ (unchanged, points to archived)
- Session B (upcoming): locationId = loc456 ✓ (migrated to new)
- Session C (upcoming): locationId = loc456 ✓ (migrated to new)
```

### Benefits

1. **No Complex Logic**: Just look up locationId - always correct
2. **Historical Preservation**: Completed sessions automatically preserve old location
3. **Future Flexibility**: Can add location versioning/history features later
4. **Clear Separation**: Active vs archived locations are distinct documents
5. **Referential Integrity**: No dangling references - both IDs always valid

### Implementation Details

**Location Document Structure:**
```typescript
{
  id: string (auto-generated)
  name: string
  displayName: string
  address: string
  isDefault: boolean
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Session Document (relevant fields):**
```typescript
{
  locationId: string  // References training_locations.id
  status: 'scheduled' | 'completed' | 'canceled' | 'no-show'
  scheduledDate: Timestamp
  // ... other fields
}
```

### Edge Cases Handled

1. **No Upcoming Sessions**: Old location marked inactive, no migration needed
2. **Default Location Edited**: New location becomes default, old loses default flag
3. **Multiple Edits**: Each edit creates new version, forms version chain
4. **Deleted Sessions**: Inactive locations never deleted (preserve references)

## Overview
This document tracks the implementation of the Training Locations management feature for in-person training sessions.

## Business Requirements

### Location Management
- Trainer can add, edit, and manage training locations
- One location must always be marked as default (Ironworks Gym initially)
- Locations can be marked as inactive (soft delete)
- Cannot delete locations completely (preserves referential integrity)

### Location Matching Logic
- When client books via Calendly, location is extracted from event
- Location string is matched against predefined locations
- If match found → use predefined location ID
- If no match → default to Ironworks (ID of default location)

### Session Location Updates
- When location is edited, all future scheduled sessions are updated
- Past/completed sessions preserve original location
- Affected clients are notified via email and in-app notifications

## Implementation Status

### Phase 1: Location Registry ✅ COMPLETE

#### Files Created:
1. **`app/src/types/location.ts`**
   - TrainingLocation interface
   - LocationFormData interface
   - LocationWithCount interface

2. **`firebase/scripts/seed-ironworks-location.js`**
   - Script to seed initial Ironworks location
   - Usage: `node firebase/scripts/seed-ironworks-location.js`

3. **`app/src/app/dashboard/trainer/business/locations/page.tsx`**
   - Main locations management page
   - CRUD operations for locations
   - Real-time session count tracking

4. **`app/src/components/locations/LocationCard.tsx`**
   - Location display card
   - Shows status, session counts
   - Actions: Edit, Set Default, Toggle Active

5. **`app/src/components/locations/LocationModal.tsx`**
   - Add/Edit location form
   - Validation
   - Confirmation dialog for updates affecting sessions

#### Files Modified:
1. **`app/src/components/TrainerSidebar.tsx`**
   - Added "Training Locations" link in Business Management section
   - Added MapPin icon import
   - Added 'locations' to currentPage type

### Phase 2: Session Integration 🔄 IN PROGRESS

#### Next Steps:

1. **Update Session Types** - Add locationId field
   - File: `app/src/types/session.ts`
   - Add `locationId: string` to TrainingSession interface

2. **Modify Calendly Webhook** - Extract and match location
   - File: `firebase/functions/sessions.js`
   - Update `calendlyWebhook` function
   - Fetch location from Calendly event
   - Match against predefined locations
   - Pass locationId to scheduleSession

3. **Update scheduleSession Function** - Store locationId
   - File: `firebase/functions/sessions.js`
   - Add locationId to session document

4. **Create Cloud Function** - Handle location updates
   - New file: `firebase/functions/locations.js`
   - Function: `updateLocationInSessions`
   - Updates future sessions when location edited
   - Sends notifications to affected clients

### Phase 3: Dashboard Display 📝 PENDING

#### Tasks:

1. **Create useUpcomingSessions Hook**
   - File: `app/src/hooks/useUpcomingSessions.ts`
   - Reusable hook with optional limit parameter
   - Returns sessions array and loading state

2. **Update Client Dashboard**
   - File: `app/src/app/dashboard/client/page.tsx`
   - Use hook to fetch next session (limit=1)
   - Display real location from location registry
   - Handle no sessions state

3. **Update Schedule Page**
   - File: `app/src/app/dashboard/client/sessions/schedule/page.tsx`
   - Use same hook (no limit for all sessions)
   - Display locations for all sessions

## Database Schema

### Collection: `training_locations`
```typescript
{
  id: string (auto-generated)
  name: string              // "Ironworks"
  displayName: string       // "Ironworks Gym"
  address: string           // "12708 Northup Way, Bellevue, WA 98005"
  isDefault: boolean        // true for one location
  isActive: boolean         // false = hidden/inactive
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `sessions` (updated)
```typescript
{
  // ... existing fields ...
  locationId: string        // References training_locations.id
  // ... rest of fields ...
}
```

## Initial Data

### Ironworks Gym (Default)
- Name: "Ironworks"
- Display Name: "Ironworks Gym"
- Address: "12708 Northup Way, Bellevue, WA 98005"
- Default: true
- Active: true

## Deployment Steps

### 1. Seed Initial Location
```bash
cd firebase
node scripts/seed-ironworks-location.js
```

### 2. Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### 3. Update Firestore Rules
Add security rules for `training_locations` collection

### 4. Test Location Management
1. Navigate to `/dashboard/trainer/business/locations`
2. Verify Ironworks location is displayed
3. Test adding new location
4. Test editing location
5. Test setting default
6. Test marking inactive

## Future Enhancements

1. **Bulk Location Import**
   - CSV import for multiple locations

2. **Location History**
   - Track location changes over time
   - Audit trail for edits

3. **Google Maps Integration**
   - Autocomplete for addresses
   - Map display for locations

4. **Client Location Preferences**
   - Allow clients to save preferred locations
   - Filter Calendly events by preferred location

## Notes

- Location matching is case-insensitive
- Partial matching supported (e.g., "ironworks" matches "Ironworks Gym")
- Default location used as fallback for unmatched locations
- Past session locations are never modified (historical accuracy)
