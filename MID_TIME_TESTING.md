# Mid-Time Feature - Testing & Verification Guide

## Current Status

✅ **Database Migration**: Completed successfully

- `mid_time` column added to games table
- `max_bet_after_mid_time` column added (default: 100.00)

✅ **Backend Code**: Updated

- Game model supports creating/updating with mid-time fields
- Bet controller validates mid-time restrictions
- API endpoints accept the new fields

✅ **Frontend UI**: Updated

- Game management table shows "Mid Time" and "Max Bet After Mid" columns
- Add/Edit game modal has input fields for both values
- Form submission properly handles the data

## How to Test

### Step 1: Refresh the Admin Page

1. Open your browser and go to: `http://localhost:3000/admin/games`
2. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R) to clear cache
3. You should see the table with "Mid Time" and "Max Bet After Mid" columns

### Step 2: Edit an Existing Game

1. Click the "Edit" button on any game
2. You'll see two new fields in the modal:
   - **Mid Time** (optional) - e.g., enter "10:00"
   - **Max Bet After Mid Time** - e.g., enter "50"
3. Click "Save Game"
4. The page will reload and show the updated values in the table

### Step 3: Create a New Game

1. Click "Add New Game"
2. Fill in all fields including:
   - Game Name: "Test Game"
   - Open Time: "07:00"
   - Close Time: "11:00"
   - Mid Time: "09:30"
   - Max Bet After Mid Time: "75"
3. Click "Save Game"
4. Verify the new game appears in the table with the mid-time values

### Step 4: Test Bet Restrictions

1. Go to the user-facing betting page
2. Select a game that has mid-time set
3. **Before mid-time**: Try placing a large bet (e.g., ₹500) - should work
4. **After mid-time**: Try placing a bet larger than the max (e.g., ₹100 when max is ₹50)
   - You should see error: "Maximum bet amount is ₹50 after 10:00:00. Please reduce your bet amount."
5. Try placing a bet within the limit (e.g., ₹30) - should work

## Troubleshooting

### Issue: Values not showing in table

**Solution**: Hard refresh the page (Ctrl+Shift+R) to clear browser cache

### Issue: Form not saving values

**Check**:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Submit the form
4. Look for the API request to `/api/games` or `/api/games/:id`
5. Check the request payload - it should include `midTime` and `maxBetAfterMidTime`

### Issue: Database not updating

**Verify**:
Run this command to check the database:

```bash
node scripts/view-games.js
```

This will show all games with their mid-time values.

## Quick Database Check

To manually verify the database has the columns and data:

```bash
node scripts/check-games-data.js
```

## What the Feature Does

### Admin Side:

- Admins can set a "mid-time" for each game
- After this time, users can only bet up to a maximum amount
- Both fields are optional - if not set, no restrictions apply

### User Side:

- Before mid-time: Normal betting (any amount)
- After mid-time: Each bet limited to configured maximum
- Clear error messages if bet exceeds limit

## Example Configuration

**Game: FARIDABAD**

- Open Time: 07:00
- Mid Time: 10:00
- Close Time: 18:00
- Max Bet After Mid: ₹50

**Behavior:**

- 07:00 - 09:59: Users can bet ₹10, ₹100, ₹1000, etc.
- 10:00 - 17:59: Users can only bet up to ₹50 per bet
- 18:00+: Game closed, no betting

## Files Modified

1. **database/schema.sql** - Schema definition
2. **database/migrations/add_mid_time_to_games.sql** - Migration SQL
3. **scripts/migrate-add-mid-time.js** - Migration script (already run ✓)
4. **models/Game.js** - Model logic
5. **controllers/gameController.js** - API controller
6. **controllers/betController.js** - Bet validation
7. **views/admin/games.ejs** - Admin UI

## Next Steps

1. **Refresh your browser** and check if the columns appear
2. **Edit a game** to add mid-time values
3. **Test betting** before and after mid-time
4. If issues persist, check browser console for JavaScript errors

## Support

If you're still having issues:

1. Check browser console (F12) for errors
2. Check server logs in the terminal
3. Verify the migration ran: `node scripts/check-games-data.js`
4. Try creating a brand new game with mid-time values
