# Report User Functionality Implementation

This document outlines the report user functionality that has been added to the Gymsta app.

## Overview

Users can now report other users through the three dots menu on user profiles and post detail screens. When a user is reported, their profile is flagged in the database for administrative review.

## Features

- **Report User Button**: Red "Report User" button underneath the existing "Block User" button
- **Database Tracking**: Reports are stored in the `is_reported` column on the profiles table
- **User Feedback**: Users receive confirmation when they successfully report someone
- **Security**: Users cannot report themselves (enforced by database policy)

## Implementation Details

### Database Changes

1. **New Column**: Added `is_reported` boolean column to the profiles table (defaults to false)
2. **Index**: Created index on `is_reported` for performance when querying reported users
3. **RLS Policy**: Only authenticated users can update the `is_reported` status of other users (not their own)

### UI Changes

1. **Profile Screen** (`app/(tabs)/[username].tsx`):
   - Added red "Report User" button underneath "Block User" in the three dots menu
   - Added `reportLoading` state for loading feedback
   - Added `handleReportUser` function to handle the report action

2. **Post Detail Screen** (`app/(tabs)/profile/[id].tsx`):
   - Added red "Report User" button underneath "Block User" in the three dots menu
   - Added `reportLoading` state for loading feedback
   - Added `handleReportUser` function to handle the report action

### User Experience

1. **Accessing Report**: User taps three dots (⋮) → "Report User" (red button)
2. **Confirmation**: User receives alert: "You have reported [username]. Thank you for helping keep our community safe."
3. **Database Update**: User's `is_reported` column is set to `true`
4. **Menu Closure**: The menu automatically closes after successful report

## Files Modified

### Database
- `supabase/migrations/20250520000002_add_report_user.sql` - Migration to add reporting functionality

### Frontend
- `app/(tabs)/[username].tsx` - Main user profile screen
- `app/(tabs)/profile/[id].tsx` - Post detail screen

## How to Use

1. **Navigate** to any user's profile or post detail page
2. **Tap** the three dots (⋮) menu in the top right
3. **Select** "Report User" (red button underneath "Block User")
4. **Confirm** the report by tapping "OK" in the confirmation dialog

## Administrative Use

Administrators can query reported users with:

```sql
SELECT * FROM profiles WHERE is_reported = true;
```

This allows moderators to review and take action on reported users.

## Security Considerations

- Users cannot report themselves (database policy enforcement)
- Only authenticated users can report others
- The `is_reported` flag is permanent and requires admin intervention to reset
- Uses type assertions (`as any`) due to Supabase schema not including new columns yet

## Future Enhancements

- Add admin panel to view and manage reported users
- Add reporting categories (spam, harassment, etc.)
- Add ability to unreport users (admin only)
- Add reporting history/audit trail 