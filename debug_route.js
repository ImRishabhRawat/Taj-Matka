const adminController = require('./controllers/adminController');
console.log('getMarketMonitor type:', typeof adminController.getMarketMonitor);

const router = require('./routes/adminRoutes');
console.log('Router stack length:', router.stack.length);

router.stack.forEach((r, i) => {
  if (r.route) {
    console.log(`Route ${i}: ${r.route.path} [${Object.keys(r.route.methods)}]`);
  } else {
    console.log(`Middleware ${i}: ${r.name}`);
  }
});
