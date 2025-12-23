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
    const data = await API.get('/auth/me');
    
    if (data.success) {
      const totalBalance = parseFloat(data.data.balance) + parseFloat(data.data.winning_balance);
      document.getElementById('userBalance').textContent = `₹${totalBalance.toFixed(2)}`;
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
