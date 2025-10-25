# Railway Deployment Guide - Goldlink Platform

This guide will help you deploy both the frontend (Next.js) and backend (Express.js) to Railway for stakeholder demos.

## Prerequisites

1. **GitHub Account** - Your code must be pushed to GitHub
2. **Railway Account** - Sign up at [railway.app](https://railway.app) (free tier available)
3. **Merge backend branch** - The `railway-backend-config` branch has environment variable support

## Part 1: Push Code to GitHub

First, merge the backend configuration branch and push to GitHub:

```bash
# Commit backend changes on railway-backend-config branch
git add "API-localtest-9-23-25 (2)"
git commit -m "Add environment variable support for Railway deployment"

# Switch to main and merge
git checkout main
git merge railway-backend-config

# Push to GitHub
git push origin main
```

## Part 2: Deploy Backend to Railway

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if not already connected
5. Select the `goldlink-platform` repository

### Step 2: Add MySQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"MySQL"**
3. Railway will automatically create a MySQL database
4. Click on the MySQL service to see connection details

### Step 3: Configure Backend Service

1. Click **"+ New"** → **"GitHub Repo"** → Select your repo again
2. This creates a second service (one for database, one for backend)
3. **Configure Root Directory**:
   - Click on the backend service
   - Go to **Settings** → **Service Settings**
   - Set **Root Directory** to: `API-localtest-9-23-25 (2)`
   - Set **Start Command** to: `npm start`

4. **Set Environment Variables**:
   Click on **Variables** tab and add these:

   ```
   PORT=3005
   NODE_ENV=production
   TZ=America/New_York

   # Database - Railway auto-provides these, use the references:
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   DB_CONNECTION_LIMIT=10

   # SSL - Railway handles SSL, so we use HTTP
   USE_HTTPS=false

   # CORS - Update after deploying frontend
   CORS_ORIGIN=*

   # Socket.io
   SOCKET_PING_INTERVAL=11000
   SOCKET_PING_TIMEOUT=10000

   # Email (Optional - leave as defaults for now)
   SMTP_HOST=localhost
   SMTP_PORT=465
   SMTP_SECURE=true
   ```

   **Note**: Railway automatically creates variables like `MYSQLHOST` when you add a database. Use the variable reference syntax `${{MySQL.MYSQLHOST}}` to connect them.

### Step 4: Import Database

1. Install Railway CLI locally:
   ```bash
   npm install -g @railway/cli
   railway login
   railway link
   ```

2. Connect to Railway MySQL and import your database:
   ```bash
   # Get database connection string from Railway dashboard
   # Or use Railway's database connection tool

   # Option 1: Use Railway CLI
   railway connect MySQL
   # Then paste your SQL or use: source testbmvapi.sql

   # Option 2: Use MySQL client with Railway's connection details
   mysql -h [MYSQLHOST] -u [MYSQLUSER] -p[MYSQLPASSWORD] [MYSQLDATABASE] < "API-localtest-9-23-25 (2)/testbmvapi.sql"
   ```

### Step 5: Deploy Backend

1. Railway will automatically deploy when you push to GitHub
2. Wait for deployment to complete (~2-3 minutes)
3. Click on the backend service → **Settings** → **Networking**
4. Click **"Generate Domain"** to get a public URL like:
   ```
   https://goldlink-backend.up.railway.app
   ```
5. **Copy this URL** - you'll need it for the frontend

### Step 6: Update CORS

1. Go back to backend service **Variables**
2. Update `CORS_ORIGIN` to your frontend URL (we'll get this next)
3. Or keep as `*` for testing (not recommended for production)

## Part 3: Deploy Frontend to Railway

### Step 1: Create Frontend Service

1. In the same Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select your `goldlink-platform` repository again
3. Railway will detect it's a Next.js app automatically

### Step 2: Configure Frontend

1. **Root Directory**: Leave as root (`.`) - Next.js is at project root
2. **Build Command**: `npm run build` (Railway auto-detects this)
3. **Start Command**: `npm start`

### Step 3: Set Frontend Environment Variables

Click on **Variables** tab and add:

```
NEXT_PUBLIC_API_BASE_URL=https://goldlink-backend.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://goldlink-backend.up.railway.app
NEXT_PUBLIC_ENV=production
```

**Replace** `goldlink-backend.up.railway.app` with your actual backend URL from Part 2, Step 5.

### Step 4: Deploy Frontend

1. Railway will automatically deploy
2. Wait for deployment (~3-5 minutes for Next.js build)
3. Click on frontend service → **Settings** → **Networking**
4. Click **"Generate Domain"** to get URL like:
   ```
   https://goldlink-platform.up.railway.app
   ```

## Part 4: Final Configuration

### Update Backend CORS

1. Go to backend service → **Variables**
2. Update `CORS_ORIGIN` to your frontend URL:
   ```
   CORS_ORIGIN=https://goldlink-platform.up.railway.app
   ```
3. Railway will auto-redeploy the backend

### Test the Application

1. Open your frontend URL: `https://goldlink-platform.up.railway.app`
2. The app should load with the Three.js animation
3. Test video connection (you may need a room UUID from the database)

## Part 5: Share with Stakeholders

Send stakeholders the frontend URL:
```
https://goldlink-platform.up.railway.app
```

**For specific room sessions**, append the room UUID:
```
https://goldlink-platform.up.railway.app/[room-uuid]
```

## Automatic Updates

Railway automatically redeploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway will automatically:
# 1. Detect the push
# 2. Rebuild and redeploy affected services
# 3. Make changes live in 2-5 minutes
```

## Monitoring & Logs

- **View Logs**: Click on any service → **Deployments** → Click latest deployment → **View Logs**
- **Check Status**: Each service shows status (deploying/active/error)
- **Database**: Click MySQL service to see connection info and metrics

## Cost Estimate

- **Free Tier**: $5/month credit (good for initial testing)
- **Hobby Plan**: $5/month + usage
  - MySQL: ~$1-2/month
  - Backend: ~$1-2/month
  - Frontend: ~$1-2/month
  - **Total**: ~$3-6/month typical usage

## Troubleshooting

### Backend won't connect to database
- Check that database variables are properly linked: `${{MySQL.MYSQLHOST}}`
- Verify database was imported successfully
- Check logs for connection errors

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_BASE_URL` is set to backend Railway URL
- Check backend CORS_ORIGIN allows frontend domain
- Look for CORS errors in browser console

### WebRTC/Socket.io not working
- Ensure `NEXT_PUBLIC_SOCKET_URL` matches backend URL
- Check that backend is using HTTP (not HTTPS) - Railway handles SSL at edge
- Verify Socket.io CORS is configured correctly

### Build failures
- Check Railway logs for specific error
- Verify all environment variables are set
- Ensure dependencies are in package.json

## Alternative: Single Service Deployment

If you want to deploy both frontend and backend as one service:

1. You would need to modify the setup to serve Next.js from Express
2. This is more complex and not recommended for this architecture
3. The two-service approach (above) is cleaner and more scalable

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check Railway logs for detailed error messages
- Verify all environment variables are set correctly

---

## Quick Reference

### Backend Service
- **Root Directory**: `API-localtest-9-23-25 (2)`
- **Start Command**: `npm start`
- **Key Variables**: Database connection, USE_HTTPS=false, CORS_ORIGIN

### Frontend Service
- **Root Directory**: `.` (root)
- **Start Command**: `npm start`
- **Key Variables**: NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_SOCKET_URL

### After Every Change
```bash
git add .
git commit -m "Description"
git push origin main
# Railway auto-deploys in 2-5 minutes
```
