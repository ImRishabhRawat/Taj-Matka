# Admin Panel Setup Guide

## Database Setup

### 1. Run the Migration SQL

To add the required tables for the new admin panel features, run the migration file:

```bash
psql -U your_username -d taj_matka -f database/migrations/add_admin_panel_tables.sql
```

Or connect to your PostgreSQL database and execute the SQL file manually.

### 2. Tables Added

The migration adds the following tables:

- **notifications** - Stores push notifications sent to users
- **popups** - Manages popup messages on user site

It also updates existing tables with new columns:

- **transactions** - Added `payment_method`, `transaction_id`, `type` columns
- **withdrawal_requests** - Added `payment_method`, `upi_id` columns
- **game_sessions** - Added `session_type` column for open/close sessions

## Features Implemented

### ✅ Notifications System

- Create and send notifications to all users or specific users
- View notification history
- **Ready for Twilio Integration** - Just add credentials later

### ✅ Popup Management

- Create popups with title, message, dates
- Target specific user groups (all, new, active)
- Activate/deactivate popups
- Delete popups

### ✅ Deposit Requests

- View all deposit history
- Filter by payment method (UPI/Bank), date range, user
- Stats showing total deposits by method

### ✅ Withdraw Requests

- Approve or reject pending withdrawals
- Filter by status
- Stats for pending, approved, rejected requests
- Automatic balance management

### ✅ Withdraw Bank Requests

- Dedicated page for bank transfer withdrawals
- Display detailed bank account information
- Approve/reject functionality

### ✅ Jantri Report

- Historical results chart for Matka games
- Filter by game and month
- Shows open, close, and jodi results

### ✅ Result History

- View all past game results
- Filter by game, date, session type
- Shows bet statistics and profit/loss

### ✅ Winner History

- View all winning bets
- User details with stats
- Filter by user, game, date

## Twilio Integration (To be added later)

When the client provides Twilio credentials, follow these steps:

### 1. Install Twilio SDK

```bash
npm install twilio
```

### 2. Add Environment Variables

Add to your `.env` file:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 3. Create Twilio Service

Create `services/twilioService.js`:

```javascript
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

async function sendNotification(notification) {
  try {
    let phoneNumbers = [];

    if (notification.target_type === "all") {
      // Get all user phone numbers
      const result = await pool.query(
        "SELECT phone FROM users WHERE is_active = true",
      );
      phoneNumbers = result.rows.map((row) => row.phone);
    } else if (
      notification.target_type === "specific" &&
      notification.target_user_ids
    ) {
      // Get specific user phone numbers
      const result = await pool.query(
        "SELECT phone FROM users WHERE id = ANY($1)",
        [notification.target_user_ids],
      );
      phoneNumbers = result.rows.map((row) => row.phone);
    }

    // Send SMS to each number
    const promises = phoneNumbers.map((phone) =>
      client.messages.create({
        body: `${notification.title}\n\n${notification.message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      }),
    );

    await Promise.all(promises);

    return {
      success: true,
      sentCount: phoneNumbers.length,
    };
  } catch (error) {
    console.error("Twilio error:", error);
    throw error;
  }
}

module.exports = {
  sendNotification,
};
```

### 4. Update Notification Controller

In `controllers/adminController.js`, uncomment the Twilio integration code:

```javascript
// Find this section in createNotification function:
// TODO: When client provides Twilio credentials, add this code:
const twilioService = require("../services/twilioService");
const result = await twilioService.sendNotification(notification);

// Update notification with sent count
await pool.query(
  "UPDATE notifications SET status = $1, sent_count = $2 WHERE id = $3",
  ["sent", result.sentCount, notification.id],
);
```

## API Endpoints

### Notifications

- `POST /admin/api/notifications/create` - Create and send notification

### Popups

- `POST /admin/api/popups/create` - Create new popup
- `PUT /admin/api/popups/:id/toggle` - Toggle popup status
- `DELETE /admin/api/popups/:id` - Delete popup

### Withdrawals

- `POST /admin/api/withdrawals/:id/approve` - Approve withdrawal
- `POST /admin/api/withdrawals/:id/reject` - Reject withdrawal

## Testing

1. Start the server:

```bash
npm run dev
```

2. Navigate to admin panel pages:

- http://localhost:3000/admin/notifications
- http://localhost:3000/admin/popup
- http://localhost:3000/admin/deposit-requests
- http://localhost:3000/admin/withdraw-requests
- http://localhost:3000/admin/withdraw-bank-requests
- http://localhost:3000/admin/jantri-report
- http://localhost:3000/admin/result-history
- http://localhost:3000/admin/winner-history

## Notes

- All pages handle missing tables gracefully
- Error handling is in place for database queries
- Withdrawal approval/rejection automatically manages user balances
- Transaction records are created for all financial operations
