/**
 * Express Application Setup
 */

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");

// Import routes
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const betRoutes = require("./routes/betRoutes");
const resultRoutes = require("./routes/resultRoutes");
const walletRoutes = require("./routes/walletRoutes");

const adminRoutes = require("./routes/adminRoutes");
const Settings = require("./models/Settings");

const app = express();

// Trigger restart 5

// Middleware
app.use(morgan("dev")); // Logging
app.use(cors()); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Static files
app.use(express.static(path.join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Public popup API (no auth required) - defined early
const adminController = require("./controllers/adminController");
app.get("/api/popups/active", adminController.getActivePopups);
app.get("/api/banners/active", adminController.getActiveBanners);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/bets", betRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/wallet", walletRoutes);

app.use("/admin", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

const {
  requireAuth,
  redirectIfAuth,
  requireAdmin,
} = require("./middleware/viewAuth");

// Global middleware to inject settings into locals
app.use(async (req, res, next) => {
  try {
    // Only fetch settings for GET requests that render views
    if (
      req.method === "GET" &&
      !req.path.startsWith("/api") &&
      !req.path.startsWith("/css") &&
      !req.path.startsWith("/js") &&
      !req.path.startsWith("/images")
    ) {
      const settings = await Settings.getAll();
      res.locals.settings = settings;
    }
  } catch (error) {
    console.error("Error fetching settings middleware:", error);
    res.locals.settings = {};
  }
  next();
});

// Root route - redirect to login
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Auth routes (redirect to /home if already logged in)
app.get("/login", redirectIfAuth, (req, res) => {
  res.render("auth/login", { title: "Login" });
});

// Protected routes (require authentication)
app.get("/home", requireAuth, (req, res) => {
  res.render("home", { title: "Taj Matka - Home" });
});

app.get("/results", requireAuth, (req, res) => {
  res.render("results", { title: "Results" });
});

app.get("/betting/:id", requireAuth, (req, res) => {
  res.render("betting", { title: "Place Bet", gameId: req.params.id });
});

app.get("/game/:id", requireAuth, (req, res) => {
  res.render("game", { title: "Play Game", gameId: req.params.id });
});

app.get("/profile", requireAuth, (req, res) => {
  res.render("profile", { title: "My Profile" });
});

app.get("/history", requireAuth, (req, res) => {
  res.render("history", { title: "Bet History" });
});

app.get("/chart", requireAuth, (req, res) => {
  res.render("chart", { title: "Chart" });
});

app.get("/deposit", requireAuth, (req, res) => {
  res.render("deposit", { title: "Add Money" });
});

app.get("/withdraw", requireAuth, (req, res) => {
  res.render("withdraw", { title: "Withdraw" });
});

app.get("/how-to-play", requireAuth, (req, res) => {
  res.render("how-to-play", { title: "How To Play" });
});

// Winning History page
app.get("/winning-history", requireAuth, (req, res) => {
  res.render("winning-history", { title: "Winning History" });
});

app.get("/bid-history", requireAuth, (req, res) => {
  res.render("bid-history", { title: "Bid History" });
});

app.get("/banking-details", requireAuth, (req, res) => {
  res.render("banking-details", { title: "Banking Details" });
});

app.get("/game-rate", requireAuth, (req, res) => {
  res.render("game-rate", { title: "Game Rate" });
});

app.get("/contact", requireAuth, (req, res) => {
  res.render("contact", { title: "Contact Us" });
});

app.get("/privacy-policy", requireAuth, (req, res) => {
  res.render("privacy-policy", { title: "Privacy Policy" });
});

app.get("/wallet", requireAuth, (req, res) => {
  res.render("wallet", { title: "My Wallet" });
});

app.get("/help", requireAuth, (req, res) => {
  res.render("help", { title: "Help Center" });
});

// Admin routes are now handled in routes/adminRoutes.js

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
