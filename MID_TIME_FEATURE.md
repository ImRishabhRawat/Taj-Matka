# Mid-Time Bet Restriction Feature

## Overview

This feature allows admins to set a "mid-time" for each game, after which users can only place bets up to a maximum amount. This helps control risk during the later part of the betting window.

## How It Works

### Admin Configuration

1. Navigate to **Game Management** in the admin panel
2. When creating or editing a game, you'll see two new fields:
   - **Mid Time** (Optional): The time after which bet restrictions apply
   - **Max Bet After Mid Time**: The maximum amount users can bet after mid-time (default: ₹100)

### User Experience

- Before mid-time: Users can bet any amount (subject to their balance)
- After mid-time: Each individual bet is limited to the configured maximum amount
- If a user tries to bet more than the max amount after mid-time, they'll receive an error message

## Example Scenario

**Game Configuration:**

- Open Time: 07:00:00
- Mid Time: 10:00:00
- Close Time: 11:00:00
- Max Bet After Mid Time: ₹50

**Betting Behavior:**

- 07:00 - 09:59: Users can bet any amount (e.g., ₹500, ₹1000)
- 10:00 - 10:59: Users can only bet up to ₹50 per bet
- 11:00+: Game is closed, no betting allowed

## Database Schema Changes

### Games Table

Two new columns were added:

```sql
mid_time TIME                           -- Optional, time when restriction starts
max_bet_after_mid_time DECIMAL(10, 2)  -- Maximum bet amount after mid-time (default: 100.00)
```

## API Changes

### Create/Update Game

**Endpoint:** `POST /api/games` or `PUT /api/games/:id`

**New Request Body Fields:**

```json
{
  "name": "TAJ MORNING",
  "openTime": "07:00",
  "closeTime": "11:00",
  "midTime": "10:00", // Optional
  "maxBetAfterMidTime": 50.0 // Optional, defaults to 100
}
```

### Place Bet

**Endpoint:** `POST /api/bets`

**New Validation:**

- Checks if current time is after mid_time
- If yes, validates that each bet amount ≤ max_bet_after_mid_time
- Returns error if any bet exceeds the limit

**Error Response:**

```json
{
  "success": false,
  "message": "Maximum bet amount is ₹50 after 10:00:00. Please reduce your bet amount."
}
```

## Files Modified

### Backend

1. **database/schema.sql** - Added new columns to games table
2. **database/migrations/add_mid_time_to_games.sql** - SQL migration script
3. **scripts/migrate-add-mid-time.js** - Node.js migration script
4. **models/Game.js** - Updated create() and update() methods
5. **controllers/gameController.js** - Updated createGame() to accept new fields
6. **controllers/betController.js** - Added mid-time validation logic

### Frontend

1. **views/admin/games.ejs** - Added UI fields for mid-time configuration

## Migration

To apply this feature to an existing database, run:

```bash
node scripts/migrate-add-mid-time.js
```

This will add the new columns to the `games` table without affecting existing data.

## Testing

### Test Case 1: Before Mid-Time

1. Set game mid-time to a future time
2. Place a bet with any amount
3. ✅ Bet should be accepted

### Test Case 2: After Mid-Time

1. Set game mid-time to a past time
2. Set max bet amount to ₹50
3. Try to place a bet of ₹100
4. ❌ Should receive error message
5. Try to place a bet of ₹30
6. ✅ Bet should be accepted

### Test Case 3: No Mid-Time Set

1. Create a game without setting mid-time
2. Place bets at any time
3. ✅ No restrictions should apply

## Admin Usage Guide

### Setting Up Mid-Time Restriction

1. **Go to Game Management**
   - Click on "Game Management" in the admin sidebar

2. **Edit Existing Game or Create New**
   - Click "Edit" on an existing game, or "Add New Game"

3. **Configure Mid-Time**
   - Set "Mid Time" to when you want restrictions to start (e.g., 10:00)
   - Set "Max Bet After Mid Time" to your desired limit (e.g., 50)

4. **Save**
   - Click "Save Game"
   - The restriction will apply immediately

### Viewing Current Settings

- The games table now shows "Mid Time" and "Max Bet After Mid" columns
- You can see all configured restrictions at a glance

## Benefits

1. **Risk Management**: Limit exposure during critical betting periods
2. **Fair Play**: Prevent large last-minute bets that could skew results
3. **Flexibility**: Different games can have different restrictions
4. **Optional**: Games without mid-time set work as before

## Notes

- Mid-time is optional - if not set, no restrictions apply
- Max bet amount defaults to ₹100 if not specified
- The restriction applies to individual bet amounts, not total betting
- Multiple small bets under the limit are allowed
- Server-side validation ensures the restriction cannot be bypassed
