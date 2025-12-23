/**
 * Express Application Setup
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const betRoutes = require('./routes/betRoutes');
const resultRoutes = require('./routes/resultRoutes');
const walletRoutes = require('./routes/walletRoutes');

const app = express();

// Middleware
app.use(morgan('dev')); // Logging
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/wallet', walletRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root route - redirect to home
app.get('/', (req, res) => {
  res.redirect('/home');
});

// View routes
app.get('/home', (req, res) => {
  res.render('home', { title: 'Taj Matka - Home' });
});

app.get('/betting/:id', (req, res) => {
  res.render('betting', { title: 'Place Bet', gameId: req.params.id });
});

app.get('/game/:id', (req, res) => {
  res.render('game', { title: 'Play Game', gameId: req.params.id });
});

app.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

app.get('/profile', (req, res) => {
  res.render('profile', { title: 'My Profile' });
});

app.get('/history', (req, res) => {
  res.render('history', { title: 'Bet History' });
});

app.get('/results', (req, res) => {
  res.render('results', { title: 'Results' });
});

app.get('/chart', (req, res) => {
  res.render('chart', { title: 'Chart' });
});

// Admin routes
app.get('/admin/result-entry', (req, res) => {
  res.render('admin/result-entry', { title: 'Declare Result' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
