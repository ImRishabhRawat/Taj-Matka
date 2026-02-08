# Taj Matka - Render Deployment Guide

This guide will walk you through deploying your Taj Matka application to Render with PostgreSQL database.

## 📋 Prerequisites

- GitHub account with your code pushed to a repository
- Render account (free tier works fine)
- Your code should be committed and pushed to GitHub

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your PostgreSQL Database on Render

1. **Log in to Render Dashboard**: https://dashboard.render.com/

2. **Create a New PostgreSQL Database**:
   - Click "New +" button → Select "PostgreSQL"
   - Fill in the details:
     - **Name**: `taj-matka-db` (or any name you prefer)
     - **Database**: `taj_matka`
     - **User**: `taj_matka_user` (auto-generated)
     - **Region**: Choose closest to your users (e.g., Singapore for India)
     - **PostgreSQL Version**: 16 (latest)
     - **Plan**: Free (or paid for production)
3. **Create Database** - Wait for it to provision (takes 1-2 minutes)

4. **Copy Database Connection Details**:
   - After creation, you'll see the database dashboard
   - **IMPORTANT**: Copy the **Internal Database URL** (not External)
   - It looks like: `postgresql://user:password@hostname/database`
   - Keep this handy - you'll need it in Step 2

---

### Step 2: Deploy Your Web Service

1. **Create a New Web Service**:
   - Click "New +" → Select "Web Service"
   - Connect your GitHub repository
   - Select the `Taj-Matka` repository

2. **Configure the Web Service**:
   - **Name**: `taj-matka` (or your preferred name)
   - **Region**: Same as your database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave blank (unless your code is in a subdirectory)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

3. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable" and add these:

   ```env
   # Database (MOST IMPORTANT)
   DATABASE_URL=<paste-your-internal-database-url-from-step-1>

   # Server Configuration
   NODE_ENV=production
   PORT=10000

   # JWT Secret (CHANGE THIS!)
   JWT_SECRET=your_super_secret_production_jwt_key_change_this_to_random_string
   JWT_EXPIRES_IN=7d

   # Admin Password (CHANGE THIS!)
   ADMIN_PASSWORD=YourSecureAdminPassword123!

   # OTP Configuration
   OTP_EXPIRY_MINUTES=5
   SMS_API_KEY=your_sms_api_key_if_you_have_one
   SMS_SENDER_ID=TAJMAT

   # Application Settings
   MIN_BET_AMOUNT=10
   MAX_BET_AMOUNT=10000
   MIN_WITHDRAWAL_AMOUNT=100
   ```

   **⚠️ IMPORTANT NOTES**:
   - Replace `DATABASE_URL` with the **Internal Database URL** from Step 1
   - Change `JWT_SECRET` to a long random string (use a password generator)
   - Change `ADMIN_PASSWORD` to a secure password
   - If you don't have SMS API yet, leave `SMS_API_KEY` as placeholder

4. **Create Web Service** - Click the button and wait for deployment

---

### Step 3: Verify Deployment

1. **Check Build Logs**:
   - The build process will:
     - Install dependencies (`npm install`)
     - Run migrations (`npm run build`)
     - Create database tables
     - Create admin user
     - Seed sample games
2. **Look for Success Messages**:

   ```
   ✅ Main schema executed successfully!
   ✅ Admin panel tables created successfully!
   ✅ Banners table created successfully!
   ✅ Default admin user created!
   ✅ Sample games created!
   🎉 All migrations completed successfully!
   ```

3. **Check Application Logs**:
   - After build completes, check the "Logs" tab
   - You should see:
     ```
     🚀 Taj Matka Server Started
     📡 Server running on http://localhost:10000
     🌍 Environment: production
     ```

4. **Access Your Application**:
   - Render will provide a URL like: `https://taj-matka.onrender.com`
   - Click on it to open your application
   - Try logging in with admin credentials:
     - Phone: `9999999999`
     - Password: (whatever you set in `ADMIN_PASSWORD`)

---

## 🔧 Common Issues & Solutions

### Issue 1: "Cannot connect to database"

**Solution**:

- Make sure you used the **Internal Database URL** (not External)
- Verify the `DATABASE_URL` environment variable is set correctly
- Check that your database is in the same region as your web service

### Issue 2: "Migration failed" or "Table already exists"

**Solution**:

- The migration script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- If you need to reset the database:
  1. Go to your PostgreSQL database dashboard
  2. Click "Connect" → "PSQL Command"
  3. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
  4. Redeploy your web service (it will run migrations again)

### Issue 3: "Application Error" or 500 errors

**Solution**:

- Check the "Logs" tab for detailed error messages
- Common causes:
  - Missing environment variables
  - Database connection issues
  - Missing dependencies in package.json

### Issue 4: Build succeeds but app doesn't start

**Solution**:

- Make sure `PORT` environment variable is set to `10000`
- Check that your `server.js` uses `process.env.PORT`
- Verify all dependencies are in `dependencies` (not `devDependencies`)

### Issue 5: "Free instance will spin down with inactivity"

**Note**:

- Render's free tier spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- For production, upgrade to a paid plan ($7/month)

---

## 🔄 Updating Your Deployment

When you make code changes:

1. **Commit and push to GitHub**:

   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Render auto-deploys**:
   - Render automatically detects the push
   - Rebuilds and redeploys your application
   - No manual intervention needed!

3. **Manual deploy** (if needed):
   - Go to your web service dashboard
   - Click "Manual Deploy" → "Deploy latest commit"

---

## 📊 Database Management

### Accessing Your Database

**Option 1: Using Render's PSQL Command**

1. Go to your PostgreSQL database dashboard
2. Click "Connect" → "PSQL Command"
3. Copy the command and run it in your terminal

**Option 2: Using a GUI Tool (Recommended)**

1. Download [pgAdmin](https://www.pgadmin.org/) or [TablePlus](https://tableplus.com/)
2. Use the **External Database URL** from Render
3. Connect and manage your database visually

### Running Migrations Manually

If you need to run migrations manually:

```bash
# Locally (for testing)
npm run db:migrate

# On Render (via shell)
# Go to web service → Shell tab
node scripts/runAllMigrations.js
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Change `ADMIN_PASSWORD` to a secure password
- [ ] Update admin user's phone number and password in database
- [ ] Set up proper SMS API for OTP
- [ ] Enable HTTPS (Render provides this automatically)
- [ ] Review and update CORS settings if needed
- [ ] Set up proper logging and monitoring
- [ ] Configure database backups (available in paid plans)

---

## 📱 Testing Your Deployment

1. **Test Admin Login**:
   - Go to: `https://your-app.onrender.com/admin/login`
   - Login with: Phone `9999999999`, Password: `<your-admin-password>`

2. **Test User Registration**:
   - Go to: `https://your-app.onrender.com/auth/register`
   - Register a new user

3. **Test Game Functionality**:
   - Login as user
   - View games
   - Place a bet
   - Check wallet balance

---

## 💰 Pricing

**Free Tier** (Good for testing):

- PostgreSQL: 1GB storage, 97 hours/month
- Web Service: 750 hours/month, spins down after inactivity
- **Total**: $0/month

**Paid Tier** (Recommended for production):

- PostgreSQL: $7/month (1GB storage, always on)
- Web Service: $7/month (512MB RAM, always on)
- **Total**: $14/month

---

## 📞 Support

If you encounter issues:

1. Check Render's status page: https://status.render.com/
2. Review Render's docs: https://render.com/docs
3. Check your application logs in Render dashboard
4. Review this deployment guide again

---

## 🎉 Success!

If everything is working:

- ✅ Your app is live at `https://your-app.onrender.com`
- ✅ Database is set up with all tables
- ✅ Admin user is created
- ✅ Sample games are available
- ✅ Auto-deployment is configured

**Next Steps**:

1. Update admin credentials
2. Configure SMS API for real OTP
3. Add your payment gateway
4. Customize games and settings
5. Test thoroughly before going live!

---

**Good luck with your deployment! 🚀**
