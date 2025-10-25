# 🚀 Deploy to Railway in 10 Steps (15 minutes)

Your code is ready and pushed to GitHub! Follow these steps to get your stakeholder demo live.

## ✅ Prerequisites Complete
- [x] Code pushed to GitHub (main branch)
- [x] Backend configured for Railway
- [x] Railway CLI installed locally

---

## Step-by-Step Deployment

### 1. Create Railway Account (2 min)
1. Go to **[railway.app](https://railway.app)**
2. Click **"Login with GitHub"**
3. Authorize Railway to access your repos

### 2. Create New Project (1 min)
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose **`tayler-id/goldlink-platform`**
4. Railway will start deploying (we'll configure it next)

### 3. Add MySQL Database (2 min)
1. In your project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway automatically creates database with credentials
4. ✅ Database is ready!

### 4. Configure Backend Service (3 min)

Click on the service that's deploying (should be named "goldlink-platform"):

1. **Go to Settings → Service**
   - Change **Service Name** to: `backend`
   - Set **Root Directory** to: `API-localtest-9-23-25 (2)`
   - Click **Save Changes**

2. **Go to Settings → Deploy**
   - Set **Start Command** to: `npm start`
   - Click **Save Changes**

3. **Go to Variables tab**

   Click **"+ New Variable"** and add these one by one:

   ```bash
   PORT=3005
   NODE_ENV=production
   TZ=America/New_York
   USE_HTTPS=false
   CORS_ORIGIN=*

   # Database - Use Railway's references
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   DB_CONNECTION_LIMIT=10

   # Socket.io
   SOCKET_PING_INTERVAL=11000
   SOCKET_PING_TIMEOUT=10000

   # Email (optional - can leave defaults)
   SMTP_HOST=localhost
   SMTP_PORT=465
   SMTP_SECURE=true
   ```

   **Important**: For database variables, use the `${{}}` syntax to reference Railway's auto-created MySQL variables.

4. **Generate Domain**
   - Go to **Settings → Networking**
   - Click **"Generate Domain"**
   - Copy the URL (looks like: `backend-production-abc123.up.railway.app`)
   - **Save this URL!** You need it for frontend setup

### 5. Import Database (3 min)

**Option A: Using Railway CLI (Recommended)**
```bash
# From your project root
railway link

# Connect to MySQL
railway run mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < "API-localtest-9-23-25 (2)/testbmvapi.sql"
```

**Option B: Using Railway Dashboard**
1. Click on **MySQL** service
2. Click **"Connect"** tab
3. Copy the connection command
4. Run in your terminal to import the SQL file

### 6. Deploy Frontend Service (3 min)

1. In Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select **`goldlink-platform`** again (yes, same repo)
3. This creates a second service (frontend)

Configure the frontend service:

1. **Go to Settings → Service**
   - Change **Service Name** to: `frontend`
   - **Root Directory**: Leave as `.` (root)
   - Click **Save Changes**

2. **Go to Variables tab**

   Add these variables (replace `YOUR-BACKEND-URL` with the URL from Step 4):

   ```bash
   NEXT_PUBLIC_API_BASE_URL=https://backend-production-abc123.up.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://backend-production-abc123.up.railway.app
   NEXT_PUBLIC_ENV=production
   ```

3. **Generate Domain**
   - Go to **Settings → Networking**
   - Click **"Generate Domain"**
   - Copy the frontend URL (this is your stakeholder demo link!)

### 7. Update Backend CORS (1 min)

Go back to **backend service** → **Variables**:
1. Find `CORS_ORIGIN`
2. Change from `*` to your frontend URL:
   ```
   https://frontend-production-xyz789.up.railway.app
   ```
3. Railway will auto-redeploy

### 8. Wait for Deployment (2-5 min)

Watch the deployments:
- Backend: ~2 minutes
- Frontend: ~3-5 minutes (Next.js build takes longer)

You'll see "Active" when ready.

### 9. Test Your App! 🎉

Open your frontend URL:
```
https://frontend-production-xyz789.up.railway.app
```

You should see:
- ✅ Three.js particle ring animation
- ✅ Video session interface
- ✅ All UI components working

### 10. Share with Stakeholders 📤

Send them the frontend URL:
```
https://your-frontend-url.up.railway.app
```

For specific video sessions:
```
https://your-frontend-url.up.railway.app/[room-uuid]
```

---

## 🔄 Making Updates

After this initial setup, updates are automatic:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically:
# 1. Detects the push
# 2. Rebuilds affected services
# 3. Deploys in 2-5 minutes
```

---

## 💰 Cost

Railway Pricing:
- **Free Tier**: $5 credit/month (enough for testing)
- **Hobby Plan**: $5/month + usage
  - MySQL: ~$1-2/month
  - Backend: ~$1-2/month
  - Frontend: ~$1-2/month
  - **Total: ~$8-11/month** for production

---

## 🐛 Troubleshooting

### Backend won't start
**Check logs**: Backend service → **Deployments** → Click latest → **View Logs**

Common issues:
- Missing environment variables
- Database connection failed (check MySQL variables)
- Port conflicts (should use PORT env var)

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_BASE_URL` matches backend URL exactly
- Check backend CORS_ORIGIN includes frontend URL
- Look for CORS errors in browser console (F12)

### Database import failed
- Ensure MySQL service is running (green status)
- Check connection string has correct credentials
- Try importing via Railway CLI instead of dashboard

### Services keep crashing
- Check memory limits in Settings
- Review logs for specific error messages
- Ensure all environment variables are set

---

## 📋 Quick Checklist

Before sharing with stakeholders, verify:

- [ ] Backend service shows "Active" status
- [ ] Frontend service shows "Active" status
- [ ] Database imported successfully
- [ ] Frontend URL loads without errors
- [ ] Three.js animation plays
- [ ] Browser console has no critical errors
- [ ] Video session can be created (test with room UUID)

---

## 🆘 Need Help?

If you get stuck:

1. Check Railway logs (most issues show there)
2. Verify all environment variables are set correctly
3. Review `RAILWAY_DEPLOYMENT.md` for detailed explanations
4. Railway docs: https://docs.railway.app
5. Railway Discord: https://discord.gg/railway

---

## ⚡ Speed Run (if you know what you're doing)

```bash
# 1. Create Railway project → Deploy from GitHub → goldlink-platform
# 2. Add MySQL database
# 3. Backend: Root dir = "API-localtest-9-23-25 (2)", add env vars, generate domain
# 4. railway link && railway run mysql ... < import.sql
# 5. Frontend: Same repo, root dir = ".", add env vars with backend URL, generate domain
# 6. Update backend CORS_ORIGIN to frontend URL
# 7. Share frontend URL with stakeholders! 🚀
```

---

**Your app is configured and ready to deploy!** Just follow the steps above in Railway's dashboard. The whole process takes about 15 minutes. Good luck! 🎉
