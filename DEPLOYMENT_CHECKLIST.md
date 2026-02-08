# Quick Deployment Checklist

## ✅ Before Pushing to Render

1. **Verify package.json has all dependencies**

   ```bash
   npm install
   npm start  # Test locally first
   ```

2. **Test migration script locally** (optional but recommended)

   ```bash
   # Make sure your local .env has DATABASE_URL or individual DB params
   npm run db:migrate
   ```

3. **Commit and push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

---

## 🚀 Render Setup (5 Minutes)

### Option A: Using render.yaml (Recommended - Easiest)

1. Go to https://dashboard.render.com/
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Render will detect `render.yaml` and create everything automatically
5. Set `ADMIN_PASSWORD` in the web service environment variables
6. Click "Apply" and wait for deployment

### Option B: Manual Setup

Follow the detailed steps in `DEPLOYMENT_GUIDE.md`

---

## 🔍 What Happens During Deployment

1. **Build Phase** (`npm install && npm run build`):
   - Installs all dependencies
   - Runs `scripts/runAllMigrations.js`
   - Creates all database tables
   - Creates admin user (phone: 9999999999)
   - Seeds sample games

2. **Start Phase** (`npm start`):
   - Starts the server on port 10000
   - Initializes game scheduler
   - Application becomes live

---

## ⚠️ Common Errors & Quick Fixes

### Error: "Cannot connect to database"

**Fix**: Use **Internal Database URL** (not External)

- Format: `postgresql://user:pass@internal-host/dbname`

### Error: "relation 'users' does not exist"

**Fix**: Migrations didn't run

- Check build logs for migration errors
- Manually run: `node scripts/runAllMigrations.js` in Shell

### Error: "Port already in use"

**Fix**: Make sure `PORT` env var is set to `10000`

### Error: "Application timeout"

**Fix**:

- Free tier spins down after 15 min inactivity
- First request takes 30-60 seconds to wake up
- This is normal on free tier

---

## 🔐 Environment Variables You MUST Set

```env
DATABASE_URL=<from-render-database-dashboard>
ADMIN_PASSWORD=<your-secure-password>
JWT_SECRET=<long-random-string>
```

All other variables have defaults in the code.

---

## 📊 Post-Deployment Checks

1. ✅ Build logs show "All migrations completed successfully"
2. ✅ Application logs show "Taj Matka Server Started"
3. ✅ Can access the URL (e.g., https://taj-matka.onrender.com)
4. ✅ Can login to admin panel (/admin/login)
5. ✅ Can see games on homepage

---

## 🔄 Updating After Deployment

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin main
# Render auto-deploys in 2-3 minutes
```

---

## 💡 Pro Tips

1. **Always test locally first** before pushing
2. **Check build logs** if deployment fails
3. **Use Render Shell** to debug database issues
4. **Free tier is fine for testing**, upgrade for production
5. **Set up custom domain** in Render dashboard (free on all plans)

---

## 🆘 Still Having Issues?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Review Render logs (Build + Application)
3. Test database connection using Render's PSQL command
4. Verify all environment variables are set correctly

---

## 📞 Your Deployment URLs

After deployment, you'll have:

- **Web App**: `https://taj-matka.onrender.com` (or your custom domain)
- **Admin Panel**: `https://taj-matka.onrender.com/admin/login`
- **API**: `https://taj-matka.onrender.com/api/*`

**Default Admin Credentials**:

- Phone: `9999999999`
- Password: `<whatever-you-set-in-ADMIN_PASSWORD>`

---

**That's it! Your app should be live in under 5 minutes! 🎉**
