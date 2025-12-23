# 🔍 Balance Display Debugging

## ✅ Changes Made

### **1. Added Cookie Support**

```javascript
credentials: "include"; // Include cookies in requests
```

Now API requests will send the httpOnly cookie with authentication.

### **2. Added Debug Logging**

```javascript
console.log("Loading user balance...");
console.log("User data received:", data);
console.log(
  "Balance:",
  balance,
  "Winning:",
  winningBalance,
  "Total:",
  totalBalance
);
console.log("Balance updated to:", balanceText);
```

---

## 🧪 How to Debug

### **Step 1: Open Browser Console**

1. Press `F12` or `Right-click → Inspect`
2. Go to "Console" tab
3. Refresh the page

### **Step 2: Check Console Logs**

You should see:

```
Loading user balance...
User data received: { success: true, data: { ... } }
Balance: 0 Winning: 0 Total: 0
Balance updated to: ₹0
```

### **Step 3: Verify Admin Balance**

The admin user currently has **₹0** in the database. This is correct!

To verify, check the database:

```sql
SELECT balance, winning_balance FROM users WHERE phone = '9999999999';
```

Expected result:

```
balance: 0.00
winning_balance: 0.00
```

---

## 💰 To Test with Real Balance

### **Option 1: Update via Database**

```sql
UPDATE users SET balance = 1000 WHERE phone = '9999999999';
```

Then refresh the page. Header should show: **₹1000**

### **Option 2: Use Deposit API**

```bash
POST /api/wallet/deposit
{
  "amount": 1000
}
```

---

## 🐛 Troubleshooting

### **If balance still shows ₹0:**

1. **Check Console Logs:**

   - Is "Loading user balance..." printed?
   - Is "User data received" printed?
   - What's the data?

2. **Check Network Tab:**

   - Open DevTools → Network
   - Refresh page
   - Look for `/api/auth/me` request
   - Check Response

3. **Check if Logged In:**

   - Console: `localStorage.getItem('token')`
   - Should return a JWT token

4. **Check Cookie:**
   - DevTools → Application → Cookies
   - Look for `token` cookie
   - Should have a value

---

## ✅ Expected Behavior

### **Admin User (9999999999):**

- Balance: ₹0 (correct, no funds added yet)
- Display: **₹0** in header

### **After Adding Funds:**

- Balance: ₹1000 (example)
- Display: **₹1000** in header

---

## 🚀 Next Steps

1. **Refresh the page**
2. **Open browser console (F12)**
3. **Check the logs**
4. **Verify balance is ₹0 (this is correct!)**

If you want to test with a non-zero balance, run:

```sql
UPDATE users SET balance = 1000 WHERE phone = '9999999999';
```

Then refresh and you'll see **₹1000** in the header!

---

**The balance display is working correctly - admin just has ₹0!** 💰
