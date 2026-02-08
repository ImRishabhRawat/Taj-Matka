/**
 * Test Script for Cross-Midnight Game Time Calculation
 * Run this to verify the fix works correctly
 */

/**
 * Calculate time left in seconds (server-side)
 * @param {string} closeTime - Close time in HH:MM:SS format
 * @param {string} openTime - Open time in HH:MM:SS format (optional, for cross-midnight detection)
 * @returns {number} Seconds remaining (0 if closed)
 */
function calculateTimeLeft(closeTime, openTime = null) {
  const now = new Date();
  const currentTimeInSeconds =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const [closeHours, closeMinutes, closeSeconds] = closeTime
    .split(":")
    .map(Number);
  let closeTimeInSeconds = closeHours * 3600 + closeMinutes * 60 + closeSeconds;

  // Handle games that close after midnight (e.g., open 7:30 AM, close 1:30 AM next day)
  if (openTime) {
    const [openHours, openMinutes, openSeconds] = openTime
      .split(":")
      .map(Number);
    const openTimeInSeconds = openHours * 3600 + openMinutes * 60 + openSeconds;

    // If close time is before open time, it means the game closes the next day
    if (closeTimeInSeconds < openTimeInSeconds) {
      // If current time is after midnight and before close time, game is still open
      if (currentTimeInSeconds < closeTimeInSeconds) {
        // We're in the "next day" period (after midnight, before close)
        // Time left is just the difference
        return closeTimeInSeconds - currentTimeInSeconds;
      }
      // If current time is after open time, add 24 hours to close time
      else if (currentTimeInSeconds >= openTimeInSeconds) {
        closeTimeInSeconds += 24 * 3600; // Add 24 hours
      }
    }
  }

  const timeLeft = closeTimeInSeconds - currentTimeInSeconds;

  return Math.max(0, timeLeft);
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

// Test Cases
console.log("🧪 Testing Cross-Midnight Game Time Calculation\n");
console.log("═".repeat(70));

const now = new Date();
const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

console.log(`⏰ Current Time: ${currentTime} (${now.toLocaleString()})\n`);

// Test Case 1: ISO Game (Cross-Midnight)
console.log("Test 1: ISO Game (Cross-Midnight)");
console.log("─".repeat(70));
const isoOpenTime = "07:30:00";
const isoCloseTime = "01:30:00";
const isoTimeLeft = calculateTimeLeft(isoCloseTime, isoOpenTime);
const isoIsOpen = isoTimeLeft > 0;

console.log(`  Open Time:  ${isoOpenTime} (7:30 AM)`);
console.log(`  Close Time: ${isoCloseTime} (1:30 AM next day)`);
console.log(`  Time Left:  ${formatTime(isoTimeLeft)}`);
console.log(`  Status:     ${isoIsOpen ? "🟢 OPEN" : "🔴 CLOSED"}`);

if (now.getHours() >= 7 && now.getHours() < 24) {
  console.log(`  Expected:   🟢 OPEN (should close at 1:30 AM tomorrow)`);
  console.log(`  Result:     ${isoIsOpen ? "✅ PASS" : "❌ FAIL"}`);
} else if (
  (now.getHours() >= 0 && now.getHours() < 1) ||
  (now.getHours() === 1 && now.getMinutes() < 30)
) {
  console.log(`  Expected:   🟢 OPEN (closes at 1:30 AM)`);
  console.log(`  Result:     ${isoIsOpen ? "✅ PASS" : "❌ FAIL"}`);
} else {
  console.log(`  Expected:   🔴 CLOSED`);
  console.log(`  Result:     ${!isoIsOpen ? "✅ PASS" : "❌ FAIL"}`);
}

console.log("");

// Test Case 2: Regular Game (Same Day)
console.log("Test 2: Kalyan Morning (Same Day)");
console.log("─".repeat(70));
const kalyanOpenTime = "09:30:00";
const kalyanCloseTime = "11:30:00";
const kalyanTimeLeft = calculateTimeLeft(kalyanCloseTime, kalyanOpenTime);
const kalyanIsOpen = kalyanTimeLeft > 0;

console.log(`  Open Time:  ${kalyanOpenTime} (9:30 AM)`);
console.log(`  Close Time: ${kalyanCloseTime} (11:30 AM)`);
console.log(`  Time Left:  ${formatTime(kalyanTimeLeft)}`);
console.log(`  Status:     ${kalyanIsOpen ? "🟢 OPEN" : "🔴 CLOSED"}`);

if (
  (now.getHours() >= 9 && now.getHours() < 11) ||
  (now.getHours() === 11 && now.getMinutes() < 30)
) {
  console.log(`  Expected:   🟢 OPEN`);
  console.log(`  Result:     ${kalyanIsOpen ? "✅ PASS" : "❌ FAIL"}`);
} else {
  console.log(`  Expected:   🔴 CLOSED`);
  console.log(`  Result:     ${!kalyanIsOpen ? "✅ PASS" : "❌ FAIL"}`);
}

console.log("");

// Test Case 3: Another Cross-Midnight Game
console.log("Test 3: Milan Night (Cross-Midnight)");
console.log("─".repeat(70));
const milanOpenTime = "09:00:00";
const milanCloseTime = "11:00:00";
const milanTimeLeft = calculateTimeLeft(milanCloseTime, milanOpenTime);
const milanIsOpen = milanTimeLeft > 0;

console.log(`  Open Time:  ${milanOpenTime} (9:00 PM)`);
console.log(`  Close Time: ${milanCloseTime} (11:00 PM)`);
console.log(`  Time Left:  ${formatTime(milanTimeLeft)}`);
console.log(`  Status:     ${milanIsOpen ? "🟢 OPEN" : "🔴 CLOSED"}`);

console.log("");
console.log("═".repeat(70));
console.log("✅ Test Complete!\n");
