  /**
 * Taj Matka - Client-side JavaScript
 */

// API Helper
const API = {
  baseURL: '/api',
  
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      ...options,
      credentials: 'include', // Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }
};

// Load user balance
async function loadUserBalance() {
  try {
    console.log('Loading user balance...');
    const data = await API.get('/auth/me');
    
    console.log('User data received:', data);
    
    if (data.success) {
      const balance = parseFloat(data.data.balance) || 0;
      const winningBalance = parseFloat(data.data.winning_balance) || 0;
      const totalBalance = balance + winningBalance;
      const balanceText = `₹${totalBalance.toFixed(0)}`;
      
      console.log('Balance:', balance, 'Winning:', winningBalance, 'Total:', totalBalance);
      
      // Update balance in header (home page uses balanceAmount)
      const balanceElement = document.getElementById('balanceAmount') || document.getElementById('userBalance');
      if (balanceElement) {
        balanceElement.textContent = balanceText;
        console.log('Balance updated to:', balanceText);
      } else {
        console.warn('Balance element not found');
      }
    }
  } catch (error) {
    console.error('Failed to load balance:', error);
  }
}

// Check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load balance if logged in
  if (isLoggedIn() && document.getElementById('userBalance')) {
    loadUserBalance();
  }
  
  // Menu button handler
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      // TODO: Implement sidebar menu in Phase 3
      alert('Menu functionality coming in Phase 3');
    });
  }
});

// Export for use in other scripts
window.API = API;
window.isLoggedIn = isLoggedIn;
window.logout = logout;
window.loadUserBalance = loadUserBalance;

// Share functions
function shareOnWhatsApp() {
  const text = encodeURIComponent('Join Taj Matka - India\'s No.1 Matka App! Fast and Secure. Download now!');
  const url = encodeURIComponent(window.location.origin);
  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
}

function shareOnTelegram() {
  const text = encodeURIComponent('Join Taj Matka - India\'s No.1 Matka App!');
  const url = encodeURIComponent(window.location.origin);
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
}

window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnTelegram = shareOnTelegram;
