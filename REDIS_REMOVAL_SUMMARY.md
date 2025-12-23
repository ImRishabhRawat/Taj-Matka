# Redis Removal & Lightweight Timer Implementation

## ✅ Changes Completed

### 1. **Removed Redis Infrastructure**

**Files Deleted:**

- ❌ `config/redis.js`

**Files Modified:**

- ✅ `package.json` - Removed `redis` dependency
- ✅ `server.js` - Removed Redis client import and shutdown logic

---

### 2. **Updated Game Controller (Server-Side Time Calculations)**

**File:** `controllers/gameController.js`

**Key Changes:**

```javascript
/**
 * Calculate time left in seconds (SERVER-SIDE)
 */
function calculateTimeLeft(closeTime) {
  const now = new Date();
  const currentTimeInSeconds =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const [closeHours, closeMinutes, closeSeconds] = closeTime
    .split(":")
    .map(Number);
  const closeTimeInSeconds =
    closeHours * 3600 + closeMinutes * 60 + closeSeconds;

  const timeLeft = closeTimeInSeconds - currentTimeInSeconds;

  return Math.max(0, timeLeft);
}
```

**API Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SANATANI NIGHT",
      "close_time": "20:00:00",
      "isOpen": true,
      "timeLeft": 14400,
      "status": "open"
    }
  ],
  "serverTime": "2025-12-23T21:21:22.000Z"
}
```

**Security:** All time calculations use `new Date()` on the server. Client cannot manipulate this.

---

### 3. **Enhanced Bet Controller (Critical Security Validation)**

**File:** `controllers/betController.js`

**Added Server-Side Time Check:**

```javascript
// CRITICAL SECURITY: Validate game is open using SERVER TIME
// This prevents users from manipulating their device clock
const game = await Game.findById(gameId);

if (!game || !game.is_active) {
  return res.status(400).json({
    success: false,
    message: "Game not found or inactive",
  });
}

// Calculate if game is open based on SERVER time
const now = new Date();
const currentTimeInSeconds =
  now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

const [closeHours, closeMinutes, closeSeconds] = game.close_time
  .split(":")
  .map(Number);
const closeTimeInSeconds = closeHours * 3600 + closeMinutes * 60 + closeSeconds;

if (currentTimeInSeconds >= closeTimeInSeconds) {
  return res.status(400).json({
    success: false,
    message: "Game is currently closed. Betting time has ended.",
  });
}
```

**Security:** Even if client timer is manipulated, server will reject bets after close time.

---

### 4. **Client-Side Timer Script**

**File:** `public/js/timer.js`

**Features:**

1. **Server-Time Initialization:**

   ```javascript
   const timer = new GameTimer("timer-1", initialTimeLeft, onComplete);
   timer.start();
   ```

2. **Auto-Disable Play Button:**

   ```javascript
   onComplete: () => {
     playButton.disabled = true;
     playButton.textContent = "Closed";
     playButton.classList.add("btn-closed");
   };
   ```

3. **Auto-Sync Every 5 Minutes:**
   ```javascript
   setInterval(syncGameTimers, 5 * 60 * 1000);
   ```

---

## 🔒 Security Architecture

### **How It Prevents Clock Manipulation:**

1. **Server Provides Initial Time:**

   - API returns `timeLeft` in seconds
   - Calculated using server's system time
   - Client cannot influence this value

2. **Client Displays Countdown:**

   - Uses `setInterval` to count down locally
   - Only for UI/UX purposes
   - No security implications

3. **Server Validates on Bet Placement:**
   - **CRITICAL:** Server re-checks time before accepting bet
   - Uses `new Date()` on server (not client time)
   - Rejects bet if past close time

### **Attack Scenario & Defense:**

**Attack:** User changes phone clock to 2 hours earlier

**What Happens:**

1. ✅ Timer still counts down correctly (uses server-provided initial time)
2. ✅ User tries to place bet after actual close time
3. ✅ Server checks: `currentTimeInSeconds >= closeTimeInSeconds`
4. ✅ Server rejects bet: "Game is currently closed"

**Result:** Attack fails. Server time is source of truth.

---

## 📋 Usage in EJS Views

### **Example: Game Card with Timer**

```html
<!-- Include timer script -->
<script src="/js/timer.js"></script>

<!-- Game Card -->
<div class="game-card">
  <h3>SANATANI NIGHT</h3>

  <!-- Timer Display -->
  <div class="timer">
    Time Left: <span id="timer-<%= game.id %>">00:00:00</span>
  </div>

  <!-- Play Button -->
  <button
    id="play-btn-<%= game.id %>"
    class="btn-play <%= game.isOpen ? 'btn-open' : 'btn-closed' %>"
    <%= game.isOpen ? '' : 'disabled' %>
  >
    <%= game.isOpen ? 'Play Now' : 'Closed' %>
  </button>
</div>

<script>
  // Initialize timer with server-provided time
  const timer = initGameTimer(
    <%= game.id %>,
    <%= game.timeLeft %>, // From server
    'timer-<%= game.id %>',
    'play-btn-<%= game.id %>'
  );

  // Store for later sync
  window.gameTimers = window.gameTimers || {};
  window.gameTimers[<%= game.id %>] = timer;
</script>
```

---

## 🧪 Testing

### **Test 1: Normal Flow**

```bash
# Get games
curl http://localhost:3000/api/games

# Response includes timeLeft
{
  "success": true,
  "data": [{
    "id": 1,
    "timeLeft": 14400,
    "isOpen": true
  }]
}
```

### **Test 2: Bet Placement (Game Open)**

```bash
curl -X POST http://localhost:3000/api/bets \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": 1,
    "betType": "jodi",
    "numbers": ["12"],
    "amount": 100
  }'

# Success if server time < close time
```

### **Test 3: Bet Placement (Game Closed)**

```bash
# Same request after close time
# Response: 400 Bad Request
{
  "success": false,
  "message": "Game is currently closed. Betting time has ended."
}
```

---

## 📊 Performance Impact

**Before (Redis):**

- Redis connection overhead
- Network latency to Redis
- Additional dependency

**After (Lightweight):**

- ✅ Simple time calculation (microseconds)
- ✅ No external dependencies
- ✅ No network overhead
- ✅ Easier to maintain

---

## ✅ Summary

| Feature                       | Status |
| ----------------------------- | ------ |
| Redis Removed                 | ✅     |
| Server-Side Time Calc         | ✅     |
| Bet Controller Security       | ✅     |
| Client Timer Script           | ✅     |
| Auto-Disable Button           | ✅     |
| Timer Sync                    | ✅     |
| Clock Manipulation Prevention | ✅     |

**Ready for Phase 3 UI Implementation!** 🚀
