# 🐛 BUG FIX: Cross-Midnight Games Not Working

## Problem

Games that span across midnight (e.g., Open: 7:30 AM, Close: 1:30 AM next day) were incorrectly showing as "Closed" even during their open hours.

## Example

**ISO Game:**

- Open Time: 07:30:00 (7:30 AM)
- Close Time: 01:30:00 (1:30 AM next day)
- Current Time: 22:29:31 (10:29 PM)
- **Expected:** OPEN (should close at 1:30 AM)
- **Actual (Before Fix):** CLOSED ❌

## Root Cause

The `calculateTimeLeft()` function in `controllers/gameController.js` didn't handle games that close after midnight. It simply compared:

- Close time: 01:30:00 = 5,400 seconds
- Current time: 22:29:31 = 80,971 seconds
- Result: 5,400 - 80,971 = **negative** → Game marked as CLOSED ❌

## Solution

Updated `calculateTimeLeft()` to detect cross-midnight games:

```javascript
function calculateTimeLeft(closeTime, openTime = null) {
  // ... existing code ...

  // NEW: Handle games that close after midnight
  if (openTime) {
    const openTimeInSeconds = /* convert open time to seconds */;

    // If close time < open time, game closes next day
    if (closeTimeInSeconds < openTimeInSeconds) {
      // If we're past midnight but before close time
      if (currentTimeInSeconds < closeTimeInSeconds) {
        return closeTimeInSeconds - currentTimeInSeconds;
      }
      // If we're after open time, add 24 hours to close time
      else if (currentTimeInSeconds >= openTimeInSeconds) {
        closeTimeInSeconds += 24 * 3600; // Add 24 hours
      }
    }
  }

  return Math.max(0, closeTimeInSeconds - currentTimeInSeconds);
}
```

## What Changed

1. **Function signature:** Added optional `openTime` parameter
2. **Cross-midnight detection:** If `closeTime < openTime`, game closes next day
3. **Time calculation:** Add 24 hours to close time when calculating time left
4. **All calls updated:** Updated all 3 places where `calculateTimeLeft()` is called

## Files Modified

- `controllers/gameController.js`
  - Line 14: Updated function signature
  - Lines 24-44: Added cross-midnight logic
  - Line 61: Updated call in `getAllGames()`
  - Line 103: Updated call in `getGameById()`
  - Line 142: Updated call in `getGameStatus()`

## Testing

After deploying this fix:

1. **ISO Game (7:30 AM - 1:30 AM):**
   - At 10:29 PM: Should show OPEN ✅
   - At 1:31 AM: Should show CLOSED ✅

2. **Regular Game (9:30 AM - 11:30 AM):**
   - At 10:00 AM: Should show OPEN ✅
   - At 11:31 AM: Should show CLOSED ✅

## Deployment

The fix is already applied to your local code. To deploy to Render:

1. **Commit changes:**

   ```bash
   git add controllers/gameController.js
   git commit -m "Fix: Handle games that close after midnight"
   git push
   ```

2. **Render will auto-deploy** (if auto-deploy is enabled)

3. **Verify:** Check your production app - ISO game should now show as OPEN

## Why Games Weren't Displaying

This was a **separate issue** - your production database had no games. But you've already fixed this by creating the ISO game through the admin panel! 🎉

The game exists in the database but was showing as "Closed" due to the time calculation bug, which is now fixed.
