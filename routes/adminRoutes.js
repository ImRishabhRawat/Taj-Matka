const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/viewAuth");

// Public API route (no auth required) - must be before requireAdmin middleware
router.get("/api/popups/active", adminController.getActivePopups);

// Apply requireAdmin middleware to all routes in this router
router.use((req, res, next) => {
  console.log("Admin Route Hit:", req.method, req.path);
  next();
});
router.use(requireAdmin);

// Monitor routes
router.get("/bid-monitor", adminController.getMarketMonitor);
router.get("/market-monitor", adminController.getMarketMonitor);
router.get("/game-rates", adminController.getGameRates);
router.post("/game-rates", adminController.updateGameRates);
router.get("/bid-history", adminController.getBidHistory);

router.get("/dashboard", adminController.getDashboard);
router.get("/games", adminController.getGames);
router.get("/result-entry", adminController.getResultEntry);
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUserDetails);
router.delete("/api/users/:id", adminController.deleteUser);
router.put("/api/users/:id/status", adminController.updateUserStatus);
router.get("/withdrawals", adminController.getWithdrawals);
router.get("/api/bids/:gameId", adminController.getBidStatsAPI);
router.get("/api/market-stats", adminController.getMarketStatsByDateAPI);
router.post("/api/results/declare", adminController.declareResult);
router.post("/api/results/schedule", adminController.scheduleResult);

// New routes
router.get("/notifications", adminController.getNotifications);
router.get("/popup", adminController.getPopup);
router.get("/banners", adminController.getBanners);
router.get("/deposit-requests", adminController.getDepositRequests);
router.get("/withdraw-requests", adminController.getWithdrawRequests);
router.get("/withdraw-bank-requests", adminController.getWithdrawBankRequests);
router.get("/jantri-report", adminController.getJantriReport);
router.get("/result-history", adminController.getResultHistory);
router.get("/winner-history", adminController.getWinnerHistory);

// API routes for new features
router.post("/api/notifications/create", adminController.createNotification);
router.post("/api/popups/create", adminController.createPopup);
router.put("/api/popups/:id/toggle", adminController.togglePopup);
router.delete("/api/popups/:id", adminController.deletePopup);
router.post("/api/banners/create", adminController.createBanner);
router.put("/api/banners/:id/toggle", adminController.toggleBanner);
router.delete("/api/banners/:id", adminController.deleteBanner);
router.post("/api/withdrawals/:id/approve", adminController.approveWithdrawal);
router.post("/api/withdrawals/:id/reject", adminController.rejectWithdrawal);

module.exports = router;
