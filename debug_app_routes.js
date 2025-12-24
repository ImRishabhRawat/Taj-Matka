const app = require('./app');

console.log('--- Printing Stack ---');
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.path)
  } else if (r.name === 'router') {
    console.log('Router Middleware (likely mounted path, check regexp): ' + r.regexp);
    // Drill into the sub-router
    if (r.handle.stack) {
        console.log('  Sub-router stack:');
        r.handle.stack.forEach(sub => {
            if (sub.route) {
                console.log('  - ' + sub.route.path + ' [' + Object.keys(sub.route.methods).join(', ') + ']');
            }
        });
    }
  }
});
