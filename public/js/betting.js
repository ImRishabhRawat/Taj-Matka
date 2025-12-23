/**
 * Betting Interface Logic
 * FINALIZED & STRESS-TESTED
 */

// Global state
let currentGameId = null;
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

    // Pulse effect for footer total when it changes
    const totalObserver = new MutationObserver(() => {
        const el = document.getElementById('footerTotalAmount');
        el.style.transform = 'scale(1.1)';
        setTimeout(() => el.style.transform = 'scale(1)', 100);
    });
    const totalEl = document.getElementById('footerTotalAmount');
    if (totalEl) totalObserver.observe(totalEl, { childList: true, characterData: true, subtree: true });
});

/**
 * Load game details and initialize timers
 */
async function loadGameDetails() {
    try {
        const response = await fetch(`/api/games/${currentGameId}`);
        const data = await response.json();
        
        if (data.success) {
            const game = data.data;
            document.getElementById('gameName').textContent = game.name;
            
            // Initialize all timers (Header, Main, and Footer)
            if (game.timeLeft > 0) {
                const timerCallback = () => {
                    showNotification('Game Closed', 'Betting time has ended for this session.', 'error');
                    setTimeout(() => window.location.href = '/home', 3000);
                };

                // Sync all timer displays
                const timers = ['gameTimer', 'headerTimer', 'footerTimer'];
                timers.forEach(id => {
                    const t = new GameTimer(id, game.timeLeft, id === 'footerTimer' ? timerCallback : null);
                    t.start();
                });
            } else {
                showNotification('Game Closed', 'This game is currently not accepting bets.', 'error');
                setTimeout(() => window.location.href = '/home', 2000);
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
 * Update total amount in footer (Center Display)
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
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

/**
 * Setup crossing preview logic (Fixed to include doubles)
 */
function setupCrossingPreview() {
    const input = document.getElementById('crossingDigits');
    const preview = document.getElementById('crossingPreview');
    const count = document.getElementById('crossingCount');
    
    input.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = digits;
        
        if (digits.length >= 1) {
            const uniqueDigits = [...new Set(digits.split(''))];
            // Requirements: 123 -> 11, 12, 13, 21, 22, 23, 31, 32, 33 (Total = digits * digits)
            const combinations = uniqueDigits.length * uniqueDigits.length;
            count.textContent = combinations;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    });
}

/**
 * Add crossing bets to the grid
 */
function addCrossingBets() {
    const digits = document.getElementById('crossingDigits').value;
    const amount = parseFloat(document.getElementById('crossingAmount').value);
    
    if (!digits || digits.length < 1) {
        showNotification('Invalid Input', 'Please enter digits', 'error');
        return;
    }
    
    if (!amount || amount < 1) {
        showNotification('Invalid Amount', 'Please enter a valid amount', 'error');
        return;
    }
    
    const uniqueDigits = [...new Set(digits.split(''))];
    let addedCount = 0;
    
    uniqueDigits.forEach(d1 => {
        uniqueDigits.forEach(d2 => {
            const num = d1 + d2;
            const input = document.querySelector(`.bet-box-input[data-number="${num}"][data-type="jodi"]`);
            if (input) {
                const currentVal = parseFloat(input.value) || 0;
                input.value = currentVal + amount;
                addedCount++;
            }
        });
    });
    
    updateTotalAmount();
    document.querySelector('[data-tab="jodi"]').click();
    showNotification('Added', `${addedCount} crossing bets added to grid`, 'success');
}

/**
 * Add paste bets to the grid
 */
function addPasteBets() {
    const text = document.getElementById('pasteNumbers').value;
    const amount = parseFloat(document.getElementById('pasteAmount').value);
    const palti = document.getElementById('paltiToggle').checked;
    
    if (!text) {
        showNotification('Empty', 'Please paste some numbers', 'error');
        return;
    }
    
    if (!amount || amount < 1) {
        showNotification('Invalid Amount', 'Please enter a valid amount', 'error');
        return;
    }
    
    // Parse complex text for 2-digit numbers
    const matches = text.match(/\b\d{2}\b/g) || [];
    if (matches.length === 0) {
        showNotification('No Numbers', 'No valid 2-digit numbers found', 'error');
        return;
    }
    
    let addedCount = 0;
    matches.forEach(num => {
        const targets = [num];
        if (palti) {
            const rev = num.split('').reverse().join('');
            if (rev !== num) targets.push(rev);
        }
        
        targets.forEach(n => {
            const input = document.querySelector(`.bet-box-input[data-number="${n}"][data-type="jodi"]`);
            if (input) {
                const currentVal = parseFloat(input.value) || 0;
                input.value = currentVal + amount;
                addedCount++;
            }
        });
    });
    
    updateTotalAmount();
    document.querySelector('[data-tab="jodi"]').click();
    showNotification('Success', `${addedCount} bets parsed and added`, 'success');
}

/**
 * Final Place Bets Action
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
        showNotification('Empty Slip', 'Please enter an amount for at least one number', 'error');
        return;
    }
    
    if (!isLoggedIn()) {
        showNotification('Auth Required', 'Please login to place bets', 'error');
        setTimeout(() => window.location.href = '/login', 1500);
        return;
    }
    
    const playBtn = document.querySelector('.play-btn');
    playBtn.disabled = true;
    playBtn.textContent = 'WAIT...';
    
    try {
        const response = await API.post('/bets', {
            gameId: parseInt(currentGameId),
            betType: 'jodi', // Fallback for old controller
            numbers: bets.map(b => b.number), // Fallback
            amount: bets[0].amount, // Fallback for single bet
            bets: bets
        });
        
        if (response.success) {
            showNotification('Success', `✅ Bets placed! New Balance: ₹${response.data.newBalance.toFixed(2)}`, 'success');
            
            // Clear inputs on success
            inputs.forEach(input => input.value = '');
            updateTotalAmount();
            
            if (window.loadUserBalance) loadUserBalance();
        } else {
            // DO NOT clear inputs on error (Requirement)
            showNotification('Failed', `❌ ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Error placing bets:', error);
        showNotification('Error', `❌ ${error.message || 'Server connection failed'}`, 'error');
    } finally {
        playBtn.disabled = false;
        playBtn.textContent = 'PLAY';
    }
}

/**
 * UI Helper: Custom Notification
 */
function showNotification(title, message, type = 'success') {
    // Remove existing
    const existing = document.querySelector('.floating-notify');
    if (existing) existing.remove();
    
    const notify = document.createElement('div');
    notify.className = `floating-notify ${type}`;
    notify.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 2px;">${title}</div>
        <div style="font-size: 0.8rem; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(notify);
    
    // Animate in
    setTimeout(() => notify.classList.add('active'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        notify.classList.remove('active');
        setTimeout(() => notify.remove(), 300);
    }, 3000);
}

// Add styles for notification dynamically if not in CSS
if (!document.getElementById('notifyStyles')) {
    const style = document.createElement('style');
    style.id = 'notifyStyles';
    style.innerHTML = `
        .floating-notify {
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            width: 90%;
            max-width: 400px;
            padding: 12px 20px;
            border-radius: 10px;
            z-index: 9999;
            color: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            pointer-events: none;
        }
        .floating-notify.active {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        .floating-notify.success { background: linear-gradient(135deg, #00c853 0%, #009624 100%); }
        .floating-notify.error { background: linear-gradient(135deg, #ff1744 0%, #d50000 100%); }
    `;
    document.head.appendChild(style);
}

// Global Exports
window.addCrossingBets = addCrossingBets;
window.addPasteBets = addPasteBets;
window.placeBets = placeBets;
window.showNotification = showNotification;
