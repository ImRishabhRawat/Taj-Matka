# Taj Matka API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### Send OTP

```http
POST /api/auth/send-otp
```

**Request Body:**

```json
{
  "phone": "9876543210"
}
```

**Response:**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 5
}
```

---

### Verify OTP & Login

```http
POST /api/auth/verify-otp
```

**Request Body:**

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "name": "John Doe" // Required for new users only
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "phone": "9876543210",
      "name": "John Doe",
      "role": "user",
      "balance": 1000.0,
      "winning_balance": 500.0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Get Current User

```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "phone": "9876543210",
    "name": "John Doe",
    "role": "user",
    "balance": 1000.0,
    "winning_balance": 500.0,
    "held_withdrawal_balance": 0.0,
    "is_active": true
  }
}
```

---

### Logout

```http
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

---

## 🎮 Game Endpoints

### Get All Games

```http
GET /api/games
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SANATANI NIGHT",
      "open_time": "07:00:00",
      "close_time": "20:00:00",
      "is_active": true,
      "session_id": 5,
      "session_date": "2025-12-23",
      "winning_number": null,
      "session_status": "pending",
      "isOpen": true,
      "timeLeft": 14400
    }
  ]
}
```

---

### Get Game by ID

```http
GET /api/games/:id
```

---

### Get Game Status (Real-time)

```http
GET /api/games/:id/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "gameId": 1,
    "isOpen": true,
    "timeLeft": 14400
  }
}
```

---

### Get Results History

```http
GET /api/games/results?gameId=1&limit=50
```

---

## 🎲 Bet Endpoints

### Place Bet (with Palti Logic)

```http
POST /api/bets
```

**Headers:** `Authorization: Bearer <token>`

**Request Body (Jodi with Palti):**

```json
{
  "gameId": 1,
  "betType": "jodi",
  "numbers": ["12", "34"],
  "amount": 100,
  "palti": true
}
```

**Backend creates 4 bets:** 12, 21, 34, 43

**Request Body (Crossing):**

```json
{
  "gameId": 1,
  "betType": "jodi",
  "crossing": true,
  "crossingDigits": "1234",
  "amount": 50
}
```

**Backend creates 12 bets:** All combinations of 1,2,3,4

**Request Body (Haruf):**

```json
{
  "gameId": 1,
  "betType": "haruf_andar",
  "numbers": ["5"],
  "amount": 100
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bets placed successfully",
  "data": {
    "betsCount": 4,
    "totalAmount": 400,
    "newBalance": 600,
    "bets": [...]
  }
}
```

---

### Get Bet History

```http
GET /api/bets/history?limit=50&offset=0
```

**Headers:** `Authorization: Bearer <token>`

---

### Get Winning Bets

```http
GET /api/bets/wins?limit=50
```

**Headers:** `Authorization: Bearer <token>`

---

### Get Bet Statistics

```http
GET /api/bets/stats
```

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "total_bets": 150,
    "total_wins": 12,
    "total_losses": 130,
    "pending_bets": 8,
    "total_bet_amount": 15000.0,
    "total_winnings": 10800.0
  }
}
```

---

## 💰 Wallet Endpoints

### Get Wallet Balance

```http
GET /api/wallet
```

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "balance": 1000.0,
    "winning_balance": 500.0,
    "held_withdrawal_balance": 0.0,
    "total_balance": 1500.0
  }
}
```

---

### Get Transactions

```http
GET /api/wallet/transactions?limit=50&offset=0
```

**Headers:** `Authorization: Bearer <token>`

---

### Get Transaction Summary

```http
GET /api/wallet/summary
```

**Headers:** `Authorization: Bearer <token>`

---

### Request Withdrawal

```http
POST /api/wallet/withdraw
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "amount": 500,
  "bankDetails": {
    "accountNumber": "1234567890",
    "ifsc": "SBIN0001234",
    "accountName": "John Doe"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Withdrawal request submitted. Awaiting admin approval.",
  "data": {
    "id": 1,
    "user_id": 1,
    "amount": 500,
    "status": "pending",
    "created_at": "2025-12-23T20:00:00Z"
  }
}
```

---

### Get Withdrawal Requests

```http
GET /api/wallet/withdrawals
```

**Headers:** `Authorization: Bearer <token>`

---

## 👑 Admin Endpoints

### Declare Result

```http
POST /api/results
```

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**

```json
{
  "gameSessionId": 5,
  "winningNumber": "45"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Result declared successfully",
  "data": {
    "success": true,
    "gameSessionId": 5,
    "winningNumber": "45",
    "totalBets": 150,
    "winCount": 12,
    "lossCount": 138,
    "totalPayout": 108000.0
  }
}
```

---

### Add Funds (Admin)

```http
POST /api/wallet/deposit
```

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**

```json
{
  "userId": 2,
  "amount": 1000,
  "description": "Initial deposit"
}
```

---

### Get All Withdrawal Requests (Admin)

```http
GET /api/wallet/admin/withdrawals?status=pending
```

**Headers:** `Authorization: Bearer <token>` (Admin only)

---

### Approve/Reject Withdrawal (Admin)

```http
PUT /api/wallet/admin/withdrawals/:id
```

**Headers:** `Authorization: Bearer <token>` (Admin only)

**Request Body:**

```json
{
  "status": "approved" // or "rejected"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Bet Types

| Type          | Description                 | Payout |
| ------------- | --------------------------- | ------ |
| `jodi`        | Full 2-digit number (00-99) | 90x    |
| `haruf_andar` | Tens digit (0-9)            | 9x     |
| `haruf_bahar` | Units digit (0-9)           | 9x     |

---

## Palti Logic (Backend)

When `palti: true` is sent with a Jodi bet:

- Input: `{ number: "12", amount: 100, palti: true }`
- Backend creates: 2 bets → "12" (₹100) + "21" (₹100)
- Total deduction: ₹200

---

## Crossing Logic (Backend)

When `crossing: true` with digits:

- Input: `{ crossingDigits: "1234", amount: 50 }`
- Backend creates: 12 bets → All 2-digit combinations
- Total deduction: ₹600 (12 × 50)
