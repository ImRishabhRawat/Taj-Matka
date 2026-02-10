# 🚨 CRITICAL FIX: "Failed to get games" Error

## Problem

The error `{"success": false, "message": "Failed to get games"}` on production is caused by **missing database columns**.

The local database has columns `scheduled_winning_number` and `is_scheduled` in the `game_sessions` table, but the **production database does not**. When the code tries to read these columns, the database query fails.

## Solution

I have updated the migration script `scripts/runAllMigrations.js` to automatically add these missing columns.

### Method 1: Redeploy (Easiest)

Since your `build` command runs migrations (`npm run build`), simply deploying the latest changes will fix the issue.

1. **Commit and Push:**

   ```bash
   git add scripts/runAllMigrations.js
   git commit -m "Fix: Add missing columns to production database"
   git push
   ```

2. **Wait for Deployment:**
   Render will build and deploy. During the build process, it will run the migration and add the missing columns.

### Method 2: Manual Fix (Faster)

If you don't want to wait for a full redeploy, you can run the fix manually in the **Render Shell**.

1. Go to Render Dashboard > Your Service > **Shell**
2. Run this command:

   ```bash
   node scripts/runAllMigrations.js
   ```

   **OR**

   ```bash
   node scripts/update-schema.js
   ```

3. You should see:
   ```
   ✅ Schema updated for scheduled results!
   ```

## Verification

After the fix is applied:

1. Reload your website (or call `/api/games`).
2. The error `Failed to get games` should disappear.
3. Your games (including the ISO game) should appear correctly.

---

# ✅ FEATURE: Admin Dashboard Auto-Redirect

## Problem

When an admin user logs in, they were being redirected to the regular user home page (`/home`) instead of the admin dashboard (`/admin/dashboard`). This required an extra manual navigation step.

## Solution

Updated the login page (`views/auth/login.ejs`) to implement role-based redirection:

1. **Login Form Handler**: After successful login, the app now checks the user's role from the API response
2. **Auto-Redirect Logic**:
   - If `role === 'admin'` → Redirect to `/admin/dashboard`
   - Otherwise → Redirect to `/home` (regular users)
3. **Already Logged In Check**: The `checkAuth()` function also implements the same logic for users who are already authenticated

## Changes Made

**File**: `views/auth/login.ejs`

- Modified the login success handler (lines 268-278)
- Updated the `checkAuth()` function (lines 209-228)

## Testing

To test this feature:

1. Log in with an admin account
2. You should be automatically redirected to `/admin/dashboard`
3. Log in with a regular user account
4. You should be redirected to `/home`
