# Railway Deployment Checklist

Quick checklist to deploy Goldlink Platform to Railway for stakeholder demos.

## Pre-Deployment

- [ ] **Merge backend branch to main**
  ```bash
  git checkout main
  git merge railway-backend-config
  git push origin main
  ```

- [ ] **Create Railway account** at [railway.app](https://railway.app)
- [ ] **Connect GitHub** to Railway

## Railway Setup (15-30 minutes)

### 1. Create Project & Database (5 min)
- [ ] Create new Railway project
- [ ] Add MySQL database service
- [ ] Note: Railway auto-creates database variables

### 2. Deploy Backend (10 min)
- [ ] Add GitHub repo service (select `goldlink-platform`)
- [ ] Set **Root Directory**: `API-localtest-9-23-25 (2)`
- [ ] Set **Start Command**: `npm start`
- [ ] Add environment variables:
  ```
  PORT=3005
  NODE_ENV=production
  TZ=America/New_York
  USE_HTTPS=false

  DB_HOST=${{MySQL.MYSQLHOST}}
  DB_USER=${{MySQL.MYSQLUSER}}
  DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
  DB_NAME=${{MySQL.MYSQLDATABASE}}
  DB_CONNECTION_LIMIT=10

  CORS_ORIGIN=*
  SOCKET_PING_INTERVAL=11000
  SOCKET_PING_TIMEOUT=10000
  ```
- [ ] Generate public domain (e.g., `goldlink-backend.up.railway.app`)
- [ ] **Copy backend URL** - you'll need it for frontend

### 3. Import Database (5 min)
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login: `railway login`
- [ ] Link project: `railway link`
- [ ] Import database:
  ```bash
  railway connect MySQL
  # Then: source API-localtest-9-23-25\ \(2\)/testbmvapi.sql
  ```

### 4. Deploy Frontend (10 min)
- [ ] Add another GitHub repo service (same repo)
- [ ] Leave **Root Directory** as `.` (root)
- [ ] Add environment variables:
  ```
  NEXT_PUBLIC_API_BASE_URL=https://[YOUR-BACKEND-URL].up.railway.app
  NEXT_PUBLIC_SOCKET_URL=https://[YOUR-BACKEND-URL].up.railway.app
  NEXT_PUBLIC_ENV=production
  ```
- [ ] Generate public domain (e.g., `goldlink-platform.up.railway.app`)

### 5. Final Configuration (2 min)
- [ ] Update backend `CORS_ORIGIN` to your frontend URL
- [ ] Wait for automatic redeploy

## Testing

- [ ] Open frontend URL in browser
- [ ] Verify Three.js animation loads
- [ ] Test video session with room UUID
- [ ] Check browser console for errors

## Share with Stakeholders

**Your live demo URL:**
```
https://goldlink-platform.up.railway.app
```

**For specific sessions:**
```
https://goldlink-platform.up.railway.app/[room-uuid]
```

## Auto-Updates

After initial setup, push to GitHub auto-deploys:
```bash
git add .
git commit -m "Update"
git push origin main
# Railway deploys in 2-5 minutes
```

## Cost
- **Free tier**: $5/month credit
- **Typical usage**: ~$3-6/month
  - MySQL: $1-2
  - Backend: $1-2
  - Frontend: $1-2

## Troubleshooting

**Backend won't start**
- Check Railway logs
- Verify environment variables are set
- Ensure database variables use `${{MySQL.MYSQLHOST}}` syntax

**Frontend can't reach backend**
- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Check CORS_ORIGIN in backend variables
- Look for CORS errors in browser console

**Database connection fails**
- Verify database was imported successfully
- Check database credentials in Railway dashboard
- Test connection in Railway's database tab

## Need More Help?

See `RAILWAY_DEPLOYMENT.md` for detailed instructions with explanations.

---

## Quick Command Reference

```bash
# Merge backend changes
git checkout main
git merge railway-backend-config
git push origin main

# Railway CLI
npm install -g @railway/cli
railway login
railway link
railway connect MySQL

# Make updates after deployment
git add .
git commit -m "Update feature"
git push origin main
```
