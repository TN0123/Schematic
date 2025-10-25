# Google Calendar Webhook Migration

This document outlines the migration from cron-based Google Calendar sync to webhook-based real-time sync.

## What Changed

### ✅ Removed

- **Old cron job**: `/api/cron/sync-google-calendar` (ran every 5 minutes)
- **Polling-based sync**: No more frequent API calls to Google Calendar
- **Vercel Pro dependency**: No longer need Vercel Pro for cron jobs

### ✅ Added

- **Webhook endpoint**: `/api/google-calendar/webhook` (receives real-time notifications)
- **Watch channel management**: Automatic setup/cleanup of Google Calendar watch channels
- **Channel renewal cron**: `/api/cron/renew-watch-channels` (runs every 6 hours)
- **Real-time sync**: Changes sync within seconds instead of minutes

## New Architecture

```
User changes Google Calendar
         ↓
Google sends webhook notification
         ↓
/api/google-calendar/webhook receives notification
         ↓
performIncrementalSync() runs for specific user
         ↓
Local database updated in real-time
```

## Key Benefits

1. **Real-time sync**: Changes appear within seconds
2. **Cost effective**: No Vercel Pro plan needed
3. **Efficient**: Only syncs when changes occur
4. **Reliable**: Google handles notification delivery
5. **Scalable**: Works with any number of users

## Files Modified

### New Files

- `src/app/api/google-calendar/webhook/route.ts` - Webhook endpoint
- `src/app/api/google-calendar/watch-channel/route.ts` - Watch channel management
- `src/app/api/cron/renew-watch-channels/route.ts` - Channel renewal cron
- `src/scripts/test-webhook.ts` - Test script

### Modified Files

- `src/lib/google-calendar-client.ts` - Added watch channel methods
- `src/lib/google-calendar-sync.ts` - Added webhook management functions
- `src/app/api/google-calendar/sync-settings/route.ts` - Auto-setup watch channels
- `vercel.json` - Updated cron schedule
- `GOOGLE_CALENDAR_SYNC.md` - Updated documentation

### Removed Files

- `src/app/api/cron/sync-google-calendar/route.ts` - Old sync cron

## Deployment Steps

### 1. Environment Variables

Ensure these are set in your production environment:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
CRON_SECRET=your-secret-key
```

### 2. Database Migration

No database changes needed - the required fields already exist:

- `googleCalendarWatchChannelId`
- `googleCalendarWatchExpiration`

### 3. Deploy to Production

```bash
# Deploy to Vercel
vercel --prod

# Or if using git deployment
git push origin main
```

### 4. Test the Implementation

```bash
# Run the test script
npx tsx src/scripts/test-webhook.ts
```

## How It Works

### Watch Channel Setup

When a user enables Google Calendar sync:

1. A unique watch channel is created with Google
2. The channel ID and expiration are stored in the database
3. Google will send notifications to your webhook endpoint

### Webhook Processing

When Google Calendar changes:

1. Google sends a POST request to `/api/google-calendar/webhook`
2. The webhook extracts the user ID from the notification
3. `performIncrementalSync()` runs for that specific user
4. Changes are synced in real-time

### Channel Renewal

Every 6 hours, a cron job:

1. Finds users with expiring watch channels (within 24 hours)
2. Stops the old watch channel
3. Creates a new watch channel
4. Updates the database with new channel info

## Monitoring

### Check Webhook Logs

```bash
# View Vercel function logs
vercel logs --follow

# Look for webhook notifications
grep "Google Calendar webhook" logs
```

### Monitor Watch Channels

```bash
# Check users with expiring channels
curl https://your-domain.com/api/google-calendar/watch-channel
```

### Test Manual Sync

```bash
# Test manual sync for a user
curl -X POST https://your-domain.com/api/google-calendar/manual-sync \
  -H "Authorization: Bearer user-session-token"
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving notifications**

   - Ensure your app is deployed with HTTPS
   - Check that `NEXT_PUBLIC_APP_URL` is set correctly
   - Verify the webhook endpoint is accessible

2. **Watch channels expiring**

   - Check the renewal cron job is running
   - Look for errors in the renewal logs
   - Manually renew channels if needed

3. **Sync not working**
   - Check user has `googleCalendarSyncEnabled: true`
   - Verify the watch channel is active
   - Test manual sync endpoint

### Debug Commands

```bash
# Check webhook endpoint
curl -X GET https://your-domain.com/api/google-calendar/webhook \
  -H "x-goog-channel-id: test" \
  -H "x-goog-resource-id: test"

# Test watch channel setup
curl -X POST https://your-domain.com/api/google-calendar/watch-channel \
  -H "Content-Type: application/json" \
  -d '{"action": "setup", "calendarId": "primary"}'
```

## Rollback Plan

If issues occur, you can temporarily rollback by:

1. **Revert vercel.json**:

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

2. **Restore the old sync cron** (if you have it backed up)

3. **Disable webhook setup** in sync settings

However, the webhook approach is much more efficient and reliable, so rollback should only be temporary while fixing any issues.

## Success Metrics

After deployment, you should see:

- ✅ Webhook notifications in logs
- ✅ Real-time sync working
- ✅ Reduced API calls to Google
- ✅ No Vercel Pro plan needed
- ✅ Better user experience with instant sync
