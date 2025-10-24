# Google Calendar Sync Implementation

This document describes the bidirectional Google Calendar sync feature implemented in Schematic.

## Overview

The Google Calendar sync feature allows users to:

- Enable/disable sync with their Google Calendar
- Select which Google Calendar to sync with
- Automatically sync events between the app and Google Calendar
- Sync todo items with due dates as 30-minute calendar events
- Resolve conflicts during initial sync

## Architecture

### Database Schema

The sync feature adds the following fields to the `User` model:

- `googleCalendarSyncEnabled`: Boolean flag to enable/disable sync
- `googleCalendarId`: Selected calendar ID for sync
- `googleCalendarSyncToken`: Token for incremental sync
- `googleCalendarLastSyncAt`: Timestamp of last successful sync
- `googleCalendarWatchChannelId`: For future webhook support
- `googleCalendarWatchExpiration`: Watch channel expiration

A new `SyncedEvent` model tracks the relationship between local and Google Calendar events:

- Maps local event IDs to Google Calendar event IDs
- Stores sync metadata (hash, timestamps)
- Enables conflict detection and resolution

### Core Components

1. **GoogleCalendarClient** (`src/lib/google-calendar-client.ts`)

   - OAuth2 client wrapper with automatic token refresh
   - Rate limiting and retry logic with exponential backoff
   - Error handling for common Google API issues

2. **Sync Library** (`src/lib/google-calendar-sync.ts`)

   - Initial sync with conflict detection
   - Incremental sync using sync tokens
   - Todo item sync for scheduled tasks
   - Event CRUD operations with sync hooks

3. **Conflict Resolution** (`src/lib/sync-conflict-resolver.ts`)

   - Detects conflicts between local and Google events
   - Generates sync hashes for change detection
   - Provides resolution strategies

4. **Timezone Handling** (`src/lib/timezone.ts`)
   - Converts between app and Google Calendar time formats
   - Handles all-day events and timezone conversions
   - Ensures accurate time representation

### API Routes

#### Settings & Configuration

- `GET /api/google-calendar/calendars` - List user's Google Calendars
- `GET /api/google-calendar/sync-settings` - Get current sync settings
- `POST /api/google-calendar/sync-settings` - Update sync settings

#### Sync Operations

- `POST /api/google-calendar/initial-sync` - Trigger initial sync
- `POST /api/google-calendar/resolve-conflicts` - Resolve sync conflicts
- `POST /api/google-calendar/manual-sync` - Manual sync trigger

#### Background Sync

- `GET /api/cron/sync-google-calendar` - Periodic sync endpoint (every 5 minutes)

### UI Components

1. **Settings Page Integration**

   - Toggle to enable/disable sync
   - Calendar selection dropdown
   - Manual sync button with status display
   - Error handling and user feedback

2. **Conflict Resolution Modal**
   - Side-by-side comparison of conflicting events
   - Bulk action options (keep all local, keep all Google, skip all)
   - Individual conflict resolution
   - Progress tracking

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local`:

```bash
# Google OAuth (required for calendar sync)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Cron job security
CRON_SECRET="your-cron-secret-key"
```

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 3. Database Migration

Run the Prisma migration to add sync fields:

```bash
npx prisma migrate dev --name add_google_calendar_sync
```

### 4. Vercel Cron Setup

For production, add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-google-calendar",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Usage

### Enabling Sync

1. User goes to Settings page
2. Toggles "Enable Calendar Sync"
3. Selects a Google Calendar from dropdown
4. Initial sync runs automatically
5. Conflicts are presented for resolution
6. Periodic sync begins (every 5 minutes)

### Todo Item Sync

When a todo item has both `dueDate` and `dueTime`:

- A 30-minute event is created in Google Calendar
- The `linkedEventId` is stored in the todo item
- Changes to the todo item update the Google Calendar event
- Removing the date/time deletes the Google Calendar event

### Conflict Resolution

During initial sync, conflicts are detected when:

- Same event exists in both systems with different data
- Event was deleted in one system but modified in the other
- Event was modified in both systems since last sync

Users can resolve conflicts by:

- Keeping the local version
- Keeping the Google Calendar version
- Skipping the conflict (leaves both versions)

## Error Handling

### Rate Limiting

- Exponential backoff for 429 (rate limit) errors
- Automatic retry with increasing delays
- Maximum 3 retry attempts per operation

### Token Refresh

- Automatic OAuth token refresh when expired
- Seamless user experience without re-authentication
- Error handling for refresh failures

### Network Issues

- Retry logic for network timeouts
- Graceful degradation when Google API is unavailable
- User notifications for persistent errors

## Security Considerations

### OAuth Scopes

The implementation requests minimal required scopes:

- `https://www.googleapis.com/auth/calendar` - Read/write calendar events
- `https://www.googleapis.com/auth/calendar.events` - Manage events

### Data Privacy

- All sync operations are user-initiated
- No data is shared between users
- Users can disable sync at any time
- All data remains in user's Google Calendar

### API Security

- Cron endpoint protected with optional secret
- All API routes require authentication
- Rate limiting prevents abuse

## Monitoring & Debugging

### Logging

- All sync operations are logged with user ID and operation type
- Error details logged for debugging
- Sync statistics tracked

### Health Checks

- Sync status available via API
- Last sync timestamp tracking
- Error count monitoring

### User Feedback

- Real-time sync status in UI
- Error messages for failed operations
- Progress indicators for long operations

## Performance Considerations

### Batch Processing

- Events processed in batches to avoid rate limits
- Incremental sync using Google's sync tokens
- Efficient change detection using hashes

### Caching

- User cache invalidation after sync operations
- Minimal API calls through smart change detection
- Optimized database queries

### Scalability

- Horizontal scaling support through stateless design
- Database indexing for efficient queries
- Background processing for heavy operations

## Testing

### Unit Tests

- Test individual sync functions
- Mock Google API responses
- Test error handling scenarios

### Integration Tests

- Test with real Google Calendar accounts
- Test conflict resolution flows
- Test timezone handling across different zones

### Load Testing

- Test with users having 1000+ events
- Test concurrent sync operations
- Test rate limit handling

## Recurring Events

### Current Handling

The sync implementation **filters out recurring events** from Google Calendar since your calendar system doesn't support recurring events yet. This prevents:

- Confusion from syncing events that can't be properly represented in your calendar
- Data inconsistency between systems
- User confusion about missing recurring patterns

### Future Support

When you add recurring event support to your calendar system, you can:

1. **Remove the filter** in `src/lib/google-calendar-client.ts` (line 160-164)
2. **Add recurring event fields** to your Event model
3. **Update sync logic** to handle recurring patterns
4. **Add UI controls** for managing recurring events

### What This Means

- ✅ Regular one-time events sync normally
- ✅ All-day events sync normally
- ❌ Recurring events are ignored during sync
- ✅ Users can still create recurring events in Google Calendar - they just won't appear in your app

## Troubleshooting

### Common Issues

1. **"Failed to fetch calendars"**

   - Check Google OAuth credentials
   - Ensure calendar API is enabled
   - Verify redirect URIs match

2. **"Sync failed"**

   - Check user's Google Calendar permissions
   - Verify selected calendar exists
   - Check for rate limiting

3. **"Token expired"**
   - Automatic refresh should handle this
   - User may need to re-authenticate
   - Check OAuth configuration

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=google-calendar-sync
```

## Future Enhancements

### Planned Features

- Webhook support for real-time sync
- Multiple calendar sync support
- Recurring event handling
- Event attachment sync
- Calendar sharing support

### Performance Improvements

- WebSocket-based real-time updates
- Advanced conflict resolution algorithms
- Bulk operation optimizations
- Predictive sync scheduling

## Support

For issues with Google Calendar sync:

1. Check the error messages in the settings page
2. Verify Google Calendar permissions
3. Try disabling and re-enabling sync
4. Contact support with specific error details

## Changelog

### v1.0.0 (Initial Implementation)

- Basic bidirectional sync
- Conflict resolution UI
- Todo item sync
- Periodic background sync
- Error handling and retry logic
