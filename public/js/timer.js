/**
 * Game Timer Utility
 * Handles client-side countdown with server-time sync
 * 
 * SECURITY: Timer starts with server-provided initialTimeLeft
 * This prevents users from manipulating countdown by changing device clock
 */

class GameTimer {
  constructor(elementId, initialTimeLeft, onComplete) {
    this.element = document.getElementById(elementId);
    this.timeLeft = initialTimeLeft; // Seconds from server
    this.onComplete = onComplete || function() {};
    this.intervalId = null;
  }

  /**
   * Format seconds to HH:MM:SS
   */
  formatTime(seconds) {
    if (seconds <= 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Update display
   */
  updateDisplay() {
    if (this.element) {
      this.element.textContent = this.formatTime(this.timeLeft);
    }
  }

  /**
   * Start countdown
   */
  start() {
    // Initial display
    this.updateDisplay();
    
    // Start interval
    this.intervalId = setInterval(() => {
      this.timeLeft--;
      
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.updateDisplay();
        this.stop();
        this.onComplete();
      } else {
        this.updateDisplay();
      }
    }, 1000);
  }

  /**
   * Stop countdown
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Reset with new time
   */
  reset(newTimeLeft) {
    this.stop();
    this.timeLeft = newTimeLeft;
    this.start();
  }
}

/**
 * Initialize timer for a game card
 * @param {string} gameId - Game ID
 * @param {number} initialTimeLeft - Initial time in seconds from server
 * @param {string} timerElementId - ID of timer display element
 * @param {string} playButtonId - ID of play button to disable
 */
function initGameTimer(gameId, initialTimeLeft, timerElementId, playButtonId) {
  const playButton = document.getElementById(playButtonId);
  
  // If already closed
  if (initialTimeLeft <= 0) {
    if (playButton) {
      playButton.disabled = true;
      playButton.textContent = 'Closed';
      playButton.classList.add('btn-closed');
      playButton.classList.remove('btn-open');
    }
    return null;
  }
  
  // Create timer
  const timer = new GameTimer(timerElementId, initialTimeLeft, () => {
    // On complete callback
    console.log(`Game ${gameId} closed`);
    
    if (playButton) {
      playButton.disabled = true;
      playButton.textContent = 'Closed';
      playButton.classList.add('btn-closed');
      playButton.classList.remove('btn-open');
    }
    
    // Optional: Show notification
    if (window.showNotification) {
      window.showNotification('Game closed', 'Betting time has ended');
    }
  });
  
  timer.start();
  return timer;
}

/**
 * Sync all game timers with server
 * Call this periodically (e.g., every 5 minutes) to prevent drift
 */
async function syncGameTimers() {
  try {
    const response = await fetch('/api/games');
    const data = await response.json();
    
    if (data.success) {
      data.data.forEach(game => {
        const timerElementId = `timer-${game.id}`;
        const timerElement = document.getElementById(timerElementId);
        
        if (timerElement && window.gameTimers && window.gameTimers[game.id]) {
          // Reset timer with server time
          window.gameTimers[game.id].reset(game.timeLeft);
        }
      });
    }
  } catch (error) {
    console.error('Failed to sync timers:', error);
  }
}

// Export for use in HTML
window.GameTimer = GameTimer;
window.initGameTimer = initGameTimer;
window.syncGameTimers = syncGameTimers;

// Auto-sync every 5 minutes to prevent drift
setInterval(syncGameTimers, 5 * 60 * 1000);
