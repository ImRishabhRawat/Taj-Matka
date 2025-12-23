/**
 * Bet Calculator Utilities
 * Handles Crossing, Palti, and other bet generation logic
 */

/**
 * Generate Crossing Bets
 * Takes a string of digits and generates all possible 2-digit combinations
 * @param {string} digits - String of digits (e.g., "1234")
 * @param {number} amount - Bet amount per combination
 * @returns {Array} Array of bet objects with number and amount
 */
function generateCrossingBets(digits, amount) {
  const bets = [];
  const uniqueDigits = [...new Set(digits.split(''))].filter(d => /\d/.test(d));
  
  for (let i = 0; i < uniqueDigits.length; i++) {
    for (let j = 0; j < uniqueDigits.length; j++) {
      if (i !== j) {
        bets.push({
          number: uniqueDigits[i] + uniqueDigits[j],
          amount: parseFloat(amount)
        });
      }
    }
  }
  
  return bets;
}

/**
 * Apply Palti Logic
 * If enabled, creates reverse digit bet automatically
 * @param {string} number - 2-digit number (e.g., "12")
 * @param {number} amount - Bet amount
 * @returns {Array} Array with original and reversed bet
 */
function applyPalti(number, amount) {
  const reverse = number.split('').reverse().join('');
  const bets = [
    { number: number, amount: parseFloat(amount) }
  ];
  
  // Only add reverse if it's different from original
  if (reverse !== number) {
    bets.push({ number: reverse, amount: parseFloat(amount) });
  }
  
  return bets;
}

/**
 * Validate Jodi Number
 * @param {string} number - Number to validate
 * @returns {boolean} True if valid (00-99)
 */
function isValidJodiNumber(number) {
  const num = parseInt(number);
  return /^\d{2}$/.test(number) && num >= 0 && num <= 99;
}

/**
 * Validate Haruf Number
 * @param {string} number - Number to validate
 * @returns {boolean} True if valid (0-9)
 */
function isValidHarufNumber(number) {
  const num = parseInt(number);
  return /^\d{1}$/.test(number) && num >= 0 && num <= 9;
}

/**
 * Calculate total bet amount
 * @param {Array} bets - Array of bet objects
 * @returns {number} Total amount
 */
function calculateTotalAmount(bets) {
  return bets.reduce((total, bet) => total + parseFloat(bet.amount), 0);
}

/**
 * Get payout multiplier based on bet type
 * @param {string} betType - 'jodi', 'haruf_andar', 'haruf_bahar'
 * @returns {number} Multiplier
 */
function getPayoutMultiplier(betType) {
  const multipliers = {
    'jodi': 90,
    'haruf_andar': 9,
    'haruf_bahar': 9
  };
  return multipliers[betType] || 0;
}

module.exports = {
  generateCrossingBets,
  applyPalti,
  isValidJodiNumber,
  isValidHarufNumber,
  calculateTotalAmount,
  getPayoutMultiplier
};
