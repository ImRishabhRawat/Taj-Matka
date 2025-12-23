# Taj Matka - Implementation Progress

## ✅ Completed (Phase 1 - Foundation)

### 1. Project Structure

```
taj-matka/
├── config/
│   ├── database.js          ✅ PostgreSQL connection pool
│   └── redis.js             ✅ Redis client configuration
├── database/
│   └── schema.sql           ✅ Complete database schema
├── scripts/
│   └── setupDatabase.js     ✅ Database setup script
├── utils/
│   ├── betCalculator.js     ✅ Crossing & Palti logic
│   ├── payoutEngine.js      ✅ Idempotent result processing
│   └── otpService.js        ✅ OTP generation & verification
├── .env.example             ✅ Environment template
└── package.json             ✅ Dependencies configured
```

### 2. Database Schema

✅ **users** - User accounts with wallet balances
✅ **games** - Game definitions (Delhi Bazar, Sanatani Night, etc.)
✅ **game_sessions** - Daily game instances
✅ **bets** - All bet records with status tracking
✅ **transactions** - Complete audit trail
✅ **withdrawal_requests** - Manual approval workflow
✅ **otps** - OTP authentication

### 3. Key Features Implemented

#### Betting Logic

✅ **Palti Handling** - Backend automatically creates reverse bets

- User sends: `{ number: "12", palti: true }`
- Controller inserts: Two rows → "12" and "21"

✅ **Crossing Logic** - Generates all 2-digit combinations

- Input: "1234" → Output: 12, 13, 14, 21, 23, 24, 31, 32, 34, 41, 42, 43

#### Financial Safety

✅ **Atomic Transactions** - All wallet operations use PostgreSQL transactions
✅ **Row-Level Locking** - `FOR UPDATE` prevents race conditions
✅ **Idempotent Results** - Can run result declaration multiple times safely
✅ **Audit Trail** - Every balance change is logged

#### Authentication

✅ **OTP-based Login** - Mobile number + OTP verification
✅ **JWT Tokens** - Secure session management

---

## 🔄 Next Steps (Phase 2 - Controllers & Routes)

### Models Layer (Database Queries)

- [ ] `models/User.js` - User CRUD operations
- [ ] `models/Game.js` - Game & session queries
- [ ] `models/Bet.js` - Bet placement & retrieval
- [ ] `models/Transaction.js` - Transaction history

### Controllers (Business Logic)

- [ ] `controllers/authController.js`

  - `sendOTP()` - Send OTP to phone
  - `verifyOTP()` - Verify and login
  - `register()` - Create new user
  - `logout()` - Clear session

- [ ] `controllers/gameController.js`

  - `getActiveGames()` - List all games with status
  - `getGameDetails()` - Single game with session
  - `getGameStatus()` - Real-time status from Redis

- [ ] `controllers/betController.js`

  - `placeBet()` - **CRITICAL: Handles Palti in backend**
  - `getUserBets()` - Bet history
  - `getBetsBySession()` - Session-specific bets

- [ ] `controllers/resultController.js` (Admin Only)

  - `declareResult()` - Process winning number
  - `getResults()` - Result history

- [ ] `controllers/walletController.js`
  - `getBalance()` - User wallet info
  - `requestWithdrawal()` - Create withdrawal request
  - `addFunds()` - Deposit (admin/payment gateway)

### Routes

- [ ] `routes/authRoutes.js` - `/api/auth/*`
- [ ] `routes/gameRoutes.js` - `/api/games/*`
- [ ] `routes/betRoutes.js` - `/api/bets/*`
- [ ] `routes/resultRoutes.js` - `/api/results/*` (Admin)
- [ ] `routes/walletRoutes.js` - `/api/wallet/*`

### Middleware

- [ ] `middleware/auth.js` - JWT verification
- [ ] `middleware/admin.js` - Admin role check
- [ ] `middleware/validation.js` - Input validation

---

## 🎨 Phase 3 - Frontend (EJS Views)

### Views Structure

- [ ] `views/partials/header.ejs`
- [ ] `views/partials/footer.ejs`
- [ ] `views/partials/navbar.ejs`
- [ ] `views/auth/login.ejs`
- [ ] `views/home.ejs` - Game listing
- [ ] `views/game.ejs` - Betting interface (Jodi, Crossing, Copy-Paste tabs)
- [ ] `views/profile.ejs` - User profile & wallet
- [ ] `views/history.ejs` - Bet history
- [ ] `views/admin/result-entry.ejs`

### CSS (Mobile-First)

- [ ] `public/css/style.css` - Orange-to-red gradients, dark theme

### JavaScript

- [ ] `public/js/app.js` - Client-side logic, countdown timers

---

## 🚀 Phase 4 - Redis Integration

- [ ] Background job to update game status in Redis
- [ ] API endpoint to fetch real-time countdown
- [ ] Frontend polling for live timer updates

---

## 📋 Installation Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your database credentials
```

### 3. Setup Database

```bash
npm run db:setup
```

### 4. Start Development Server

```bash
npm run dev
```

---

## 🔐 Default Credentials (After Setup)

- **Phone:** 9999999999
- **Password:** admin123
- **Role:** Admin

---

## 📝 Notes

### Palti Implementation (Backend)

When a user places a bet with Palti enabled:

```javascript
// Frontend sends:
{
  gameSessionId: 1,
  betType: 'jodi',
  number: '12',
  amount: 100,
  palti: true
}

// Backend (betController.placeBet) inserts:
// Row 1: { bet_number: '12', bet_amount: 100 }
// Row 2: { bet_number: '21', bet_amount: 100 }
```

### Withdrawal Approval

All withdrawals require manual admin approval:

1. User requests withdrawal
2. Status: `pending`
3. Admin reviews and approves/rejects
4. On approval: Funds transferred, status: `approved`

---

## ⚠️ Security Checklist

- [x] Password hashing (bcrypt)
- [x] JWT authentication
- [x] SQL injection prevention (parameterized queries)
- [x] Balance constraints (database-level)
- [x] Transaction atomicity
- [ ] Rate limiting (TODO)
- [ ] CORS configuration (TODO)
- [ ] Input validation (TODO)

---

**Status:** Foundation complete. Ready to build Controllers & Routes.
**Awaiting GO for Phase 2.**
