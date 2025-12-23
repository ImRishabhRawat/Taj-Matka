/**
 * Betting Interface Logic
 * Handles Jodi grid, Crossing, Copy-Paste, and Bet Slip
 */

// Global state
let currentGameId = null;
let selectedNumbers = new Map(); // Map<number, amount>
let betSlipData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Get game ID from URL
    const pathParts = window.location.pathname.split('/');
    currentGameId = pathParts[pathParts.length - 1];
    
    // Load game details
    loadGameDetails();
    
    // Generate Grids
    generateJodiGrid();
    generateHarufGrid('andarGrid', 'andar');
    generateHarufGrid('baharGrid', 'bahar');
    
    // Setup tab switching
    setupTabs();
    
    // Setup crossing preview
    setupCrossingPreview();
    
    // Setup input listeners for total amount
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('bet-box-input')) {
            updateTotalAmount();
        }
    });
});

/**
 * Load game details and initialize timer
 */
async function loadGameDetails() {
    try {
        const response = await fetch(`/api/games/${currentGameId}`);
        const data = await response.json();
        
        if (data.success) {
            const game = data.data;
            document.getElementById('gameName').textContent = game.name;
            
            // Initialize timer
            if (game.timeLeft > 0) {
                const timerCallback = () => {
                    alert('Game closed! Betting time has ended.');
                    window.location.href = '/home';
                };

                // Sync with both header and main timer
                const mainTimer = new GameTimer('gameTimer', game.timeLeft, timerCallback);
                const headerTimer = new GameTimer('headerTimer', game.timeLeft);
                
                mainTimer.start();
                headerTimer.start();
            } else {
                alert('This game is closed');
                window.location.href = '/home';
            }
        }
    } catch (error) {
        console.error('Error loading game:', error);
    }
}

/**
 * Generate 10x10 Jodi Grid (00-99)
 */
function generateJodiGrid() {
    const grid = document.getElementById('jodiGrid');
    let html = '';
    
    for (let i = 0; i <= 99; i++) {
        const number = String(i).padStart(2, '0');
        html += `
            <div class="bet-box">
                <div class="bet-box-header">${number}</div>
                <input type="number" 
                       class="bet-box-input" 
                       data-number="${number}" 
                       data-type="jodi"
                       placeholder="0"
                       min="0">
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

/**
 * Generate 0-9 Haruf Grid
 */
function generateHarufGrid(containerId, type) {
    const grid = document.getElementById(containerId);
    let html = '';
    
    for (let i = 0; i <= 9; i++) {
        html += `
            <div class="bet-box">
                <div class="bet-box-header">${i}</div>
                <input type="number" 
                       class="bet-box-input" 
                       data-number="${i}" 
                       data-type="${type}"
                       placeholder="0"
                       min="0">
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

/**
 * Update total amount in footer
 */
function updateTotalAmount() {
    const inputs = document.querySelectorAll('.bet-box-input');
    let total = 0;
    
    inputs.forEach(input => {
        const val = parseFloat(input.value) || 0;
        total += val;
    });
    
    document.getElementById('footerTotalAmount').textContent = `₹${total}`;
}

/**
 * Setup tab switching
 */
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

/**
 * Setup crossing preview
 */
function setupCrossingPreview() {
    const input = document.getElementById('crossingDigits');
    const preview = document.getElementById('crossingPreview');
    const count = document.getElementById('crossingCount');
    
    input.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = digits;
        
        if (digits.length >= 2) {
            const uniqueDigits = [...new Set(digits.split(''))];
            const combinations = uniqueDigits.length * (uniqueDigits.length - 1);
            count.textContent = combinations;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    });
}

/**
 * Add crossing bets to slip
 */
function addCrossingBets() {
    const digits = document.getElementById('crossingDigits').value;
    const amount = parseFloat(document.getElementById('crossingAmount').value);
    
    if (!digits || digits.length < 2) {
        alert('Please enter at least 2 digits');
        return;
    }
    
    if (!amount || amount < 10) {
        alert('Please enter a valid amount (minimum ₹10)');
        return;
    }
    
    // Generate combinations
    const uniqueDigits = [...new Set(digits.split(''))];
    const combinations = [];
    
    for (let i = 0; i < uniqueDigits.length; i++) {
        for (let j = 0; j < uniqueDigits.length; j++) {
            if (i !== j) {
                combinations.push(uniqueDigits[i] + uniqueDigits[j]);
            }
        }
    }
    
    // Add to grid
    combinations.forEach(num => {
        const input = document.querySelector(`.bet-box-input[data-number="${num}"][data-type="jodi"]`);
        if (input) {
            const currentVal = parseFloat(input.value) || 0;
            input.value = currentVal + amount;
        }
    });
    
    updateTotalAmount();
    
    // Switch to Jodi tab to see results
    document.querySelector('[data-tab="jodi"]').click();
    
    // Clear inputs
    document.getElementById('crossingDigits').value = '';
    document.getElementById('crossingAmount').value = '';
    document.getElementById('crossingPreview').style.display = 'none';
}

/**
 * Add paste bets to slip
 */
function addPasteBets() {
    const numbers = document.getElementById('pasteNumbers').value.trim().split('\n');
    const amount = parseFloat(document.getElementById('pasteAmount').value);
    const palti = document.getElementById('paltiToggle').checked;
    
    if (numbers.length === 0 || numbers[0] === '') {
        alert('Please enter at least one number');
        return;
    }
    
    if (!amount || amount < 10) {
        alert('Please enter a valid amount (minimum ₹10)');
        return;
    }
    
    // Validate and add numbers
    numbers.forEach(num => {
        const cleaned = num.trim();
        if (/^\d{2}$/.test(cleaned)) {
            const inputsToUpdate = [cleaned];
            
            // Add reverse if palti enabled
            if (palti) {
                const reverse = cleaned.split('').reverse().join('');
                if (reverse !== cleaned) {
                    inputsToUpdate.push(reverse);
                }
            }

            inputsToUpdate.forEach(n => {
                const input = document.querySelector(`.bet-box-input[data-number="${n}"][data-type="jodi"]`);
                if (input) {
                    const currentVal = parseFloat(input.value) || 0;
                    input.value = currentVal + amount;
                }
            });
        }
    });
    
    updateTotalAmount();
    
    // Switch to Jodi tab to see results
    document.querySelector('[data-tab="jodi"]').click();
    
    // Clear inputs
    document.getElementById('pasteNumbers').value = '';
    document.getElementById('pasteAmount').value = '';
    document.getElementById('paltiToggle').checked = false;
}

/**
 * Update bet slip display
 */
function updateBetSlip() {
    // Add selected Jodi numbers to slip
    betSlipData = betSlipData.filter(bet => bet.source !== 'jodi-grid');
    
    selectedNumbers.forEach((amount, number) => {
        betSlipData.push({
            number: number,
            amount: amount,
            type: 'jodi',
            source: 'jodi-grid'
        });
    });
    
    // Update summary
    const totalBets = betSlipData.length;
    const totalAmount = betSlipData.reduce((sum, bet) => sum + bet.amount, 0);
    
    document.getElementById('totalBets').textContent = totalBets;
    document.getElementById('totalAmount').textContent = `₹${totalAmount}`;
    
    // Update bet list
    const betList = document.getElementById('betList');
    if (totalBets === 0) {
        betList.innerHTML = '<div style="text-align: center; color: #666; padding: 1rem;">No bets added</div>';
    } else {
        betList.innerHTML = betSlipData.map((bet, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-input); border-radius: 8px; margin-bottom: 0.5rem;">
                <div>
                    <div style="font-weight: 600;">${bet.number}</div>
                    <div style="font-size: 0.75rem; color: #666;">${bet.type} ${bet.palti ? '(Palti)' : ''}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: #FF4500;">₹${bet.amount}</div>
                    <button onclick="removeBet(${index})" style="background: none; border: none; color: #ff4444; font-size: 0.75rem; cursor: pointer;">Remove</button>
                </div>
            </div>
        `).join('');
    }
    
    // Show bet slip if has bets
    if (totalBets > 0) {
        openBetSlip();
    }
}

/**
 * Remove bet from slip
 */
function removeBet(index) {
    const bet = betSlipData[index];
    
    // If from jodi grid, deselect button
    if (bet.source === 'jodi-grid') {
        const button = document.querySelector(`[data-number="${bet.number}"]`);
        if (button) button.classList.remove('selected');
        selectedNumbers.delete(bet.number);
    }
    
    betSlipData.splice(index, 1);
    updateBetSlip();
}

/**
 * Open bet slip
 */
function openBetSlip() {
    document.getElementById('betSlip').classList.add('active');
}

/**
 * Close bet slip
 */
function closeBetSlip() {
    document.getElementById('betSlip').classList.remove('active');
}

/**
 * Place bets (API call)
 */
async function placeBets() {
    const inputs = document.querySelectorAll('.bet-box-input');
    const bets = [];
    
    inputs.forEach(input => {
        const amount = parseFloat(input.value) || 0;
        if (amount > 0) {
            bets.push({
                number: input.dataset.number,
                type: input.dataset.type,
                amount: amount
            });
        }
    });
    
    if (bets.length === 0) {
        alert('Please enter an amount for at least one number');
        return;
    }
    
    if (!isLoggedIn()) {
        alert('Please login to place bets');
        window.location.href = '/login';
        return;
    }
    
    // Show confirmation
    const totalAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (!confirm(`Confirm placing ${bets.length} bets for a total of ₹${totalAmount}?`)) {
        return;
    }
    
    try {
        // Use central API helper for consistency
        const response = await API.post('/bets', {
            gameId: parseInt(currentGameId),
            bets: bets
        });
        
        if (response.success) {
            alert(`✅ Bets placed successfully!\nTotal: ₹${response.data.totalAmount}\nNew Balance: ₹${response.data.newBalance}`);
            
            // Clear inputs
            inputs.forEach(input => input.value = '');
            updateTotalAmount();
            
            // Reload user balance if needed
            if (window.loadUserBalance) loadUserBalance();
        } else {
            alert(`❌ ${response.message || 'Failed to place bets'}`);
        }
    } catch (error) {
        console.error('Error placing bets:', error);
        alert(`❌ Error: ${error.message || 'Connection failed'}`);
    }
}

// Export functions for global use
window.toggleJodiNumber = toggleJodiNumber;
window.addCrossingBets = addCrossingBets;
window.addPasteBets = addPasteBets;
window.removeBet = removeBet;
window.openBetSlip = openBetSlip;
window.closeBetSlip = closeBetSlip;
window.placeBets = placeBets;
