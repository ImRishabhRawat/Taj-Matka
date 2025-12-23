# 🎰 Taj Matka - High-Performance Lottery Application

A production-ready, mobile-first Matka (lottery) application built with Node.js, PostgreSQL, and Redis.

## 🎯 Features

### Betting Types

- **Jodi (00-99)** - Full number betting with 90x payout
- **Haruf Andar** - Tens digit betting with 9x payout
- **Haruf Bahar** - Units digit betting with 9x payout
- **Crossing** - Auto-generate all 2-digit combinations from input digits
- **Palti** - Automatic reverse digit betting (e.g., "12" → "12" + "21")

### Financial System

- ✅ Multi-wallet system (balance, winning_balance, held_withdrawal_balance)
- ✅ Atomic transactions with PostgreSQL
- ✅ Complete audit trail
- ✅ Manual withdrawal approval workflow
- ✅ Idempotent result processing (no double-crediting)

### Authentication

- 📱 OTP-based login via mobile number
- 🔐 JWT token authentication
- 👤 Role-based access (User/Admin)

### Real-Time Features

- ⏱️ Redis-powered countdown timers
- 🔴 Live game status (Open/Closed)
- 📊 Instant result processing

## 🛠️ Tech Stack

| Layer            | Technology                 |
| ---------------- | -------------------------- |
| **Backend**      | Node.js + Express.js       |
| **Frontend**     | EJS Templates + Vanilla JS |
| **Database**     | PostgreSQL (Core Data)     |
| **Cache**        | Redis (Real-time Status)   |
| **Auth**         | JWT + OTP                  |
| **Architecture** | MVC Pattern                |

## 📁 Project Structure

```
taj-matka/
├── config/              # Database & Redis connections
├── models/              # Database query functions
├── controllers/         # Business logic
├── routes/              # API endpoints
├── middleware/          # Auth & validation
├── utils/               # Bet calculators, payout engine
├── views/               # EJS templates
├── public/              # CSS & JS
├── database/            # SQL schema
└── scripts/             # Setup scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- Redis (v6+)

### Installation

1. **Clone & Install**

```bash
cd "Taj Matka"
npm install
```

2. **Configure Environment**

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
# Required: DB_PASSWORD, JWT_SECRET
```

3. **Setup Database**

```bash
npm run db:setup
```

4. **Start Development Server**

```bash
npm run dev
```

5. **Access Application**

```
http://localhost:3000
```

### Default Admin Credentials

```
Phone: 9999999999
Password: admin123
```

## 🎮 How It Works

### 1. Palti Logic (Backend Handled)

When a user enables Palti:

```javascript
// User Input
{ number: "12", amount: 100, palti: true }

// Backend Creates
Bet 1: { number: "12", amount: 100 }
Bet 2: { number: "21", amount: 100 }
Total Deduction: ₹200
```

### 2. Crossing Logic

```javascript
// User Input
{ digits: "1234", amount: 50 }

// Generated Bets (12 combinations)
12, 13, 14, 21, 23, 24, 31, 32, 34, 41, 42, 43
Total Deduction: ₹600 (12 × 50)
```

### 3. Result Declaration (Idempotent)

```javascript
// Admin declares winning number: "45"

// System automatically:
1. Locks game session (prevents duplicate processing)
2. Fetches all pending bets
3. Checks winners:
   - Jodi: bet_number === "45" → 90x payout
   - Haruf Andar: bet_number === "4" → 9x payout
   - Haruf Bahar: bet_number === "5" → 9x payout
4. Credits winning_balance
5. Records all transactions
6. Updates bet status (win/loss)

// Safe to run multiple times - only processes once
```

## 🔒 Security Features

- ✅ Bcrypt password hashing
- ✅ JWT token authentication
- ✅ Parameterized SQL queries (SQL injection prevention)
- ✅ Database-level balance constraints
- ✅ Row-level locking for concurrent operations
- ✅ Transaction atomicity

## 📊 Database Schema

### Core Tables

- `users` - User accounts & wallets
- `games` - Game definitions
- `game_sessions` - Daily game instances
- `bets` - All betting records
- `transactions` - Complete audit trail
- `withdrawal_requests` - Withdrawal workflow
- `otps` - OTP authentication

## 🎨 UI Design

- **Mobile-First** - Optimized for small screens only
- **Dark Theme** - High-contrast cards
- **Gradient Buttons** - Orange-to-dark red linear gradients
- **Tab Navigation** - Jodi, Crossing, Copy-Paste tabs
- **Real-Time Countdown** - Live game timers

## 📝 API Endpoints (Planned)

### Authentication

- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify & login
- `POST /api/auth/logout` - Logout

### Games

- `GET /api/games` - List active games
- `GET /api/games/:id` - Game details
- `GET /api/games/:id/status` - Real-time status

### Bets

- `POST /api/bets` - Place bet (handles Palti)
- `GET /api/bets/user` - User bet history
- `GET /api/bets/session/:id` - Session bets

### Results (Admin)

- `POST /api/results` - Declare result
- `GET /api/results` - Result history

### Wallet

- `GET /api/wallet` - Get balance
- `POST /api/wallet/withdraw` - Request withdrawal
- `POST /api/wallet/deposit` - Add funds (admin)

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taj_matka
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# OTP
OTP_EXPIRY_MINUTES=5
SMS_API_KEY=your_sms_api_key
```

## 🧪 Testing

### Manual Testing Workflow

1. Register new user via OTP
2. Add funds (admin panel)
3. Place Jodi bet with Palti
4. Place Crossing bet
5. Admin declares result
6. Verify wallet credit
7. Request withdrawal
8. Admin approves withdrawal

## 📈 Roadmap

- [x] Database schema
- [x] Bet calculation utilities
- [x] Payout engine
- [x] OTP service
- [ ] Controllers & routes
- [ ] EJS views
- [ ] CSS styling
- [ ] Redis integration
- [ ] SMS provider integration
- [ ] Payment gateway integration
- [ ] Admin dashboard

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for high-performance lottery operations**
