# Goldlink Backend API - Startup Guide

## Quick Start

```bash
# 1. Start MySQL
brew services start mysql@8.4

# 2. Start the API server
cd "/Users/taylerramsay/Desktop/_ORGANIZED/01_Development/goldlink-platform/API-localtest-9-23-25 (2)"
node app.js
```

**Expected output**: `Connected!`

**Access test room**: https://localhost:3005/f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc

---

## Prerequisites

### MySQL 8.4

**Check if installed:**
```bash
brew services list | grep mysql
```

**If not installed:**
```bash
brew install mysql@8.4
brew services start mysql@8.4
```

**Add to PATH** (add to `~/.zshrc`):
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
```

### Node.js Dependencies

**Install (if not done):**
```bash
cd "/Users/taylerramsay/Desktop/_ORGANIZED/01_Development/goldlink-platform/API-localtest-9-23-25 (2)"
npm install
```

---

## Startup Steps (Detailed)

### 1. Start MySQL Service

```bash
brew services start mysql@8.4
```

**Verify it's running:**
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
mysql -u root -e "SELECT VERSION();"
```

Should output: `8.4.6`

### 2. Verify Database

**Check database exists:**
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
mysql -u bmapi -plocal54321 bmvapi -e "SHOW TABLES; SELECT COUNT(*) FROM clients;"
```

**Should show:**
- 7 tables (clientinvolved, clients, companies, scheduling, settings, userinvolved, users)
- 5 clients

**If database missing**, reimport:
```bash
mysql -u bmapi -plocal54321 bmvapi < testbmvapi.sql
```

### 3. Start Backend API

```bash
cd "/Users/taylerramsay/Desktop/_ORGANIZED/01_Development/goldlink-platform/API-localtest-9-23-25 (2)"
node app.js
```

**Expected output:**
```
Connected!
```

Server runs on: **https://localhost:3005**

### 4. Test in Browser

**Open URL:**
```
https://localhost:3005/f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc
```

**Note**: You'll see SSL certificate warning (self-signed cert). Click:
- Chrome: "Advanced" → "Proceed to localhost (unsafe)"
- Safari: "Show Details" → "visit this website"
- Firefox: "Advanced" → "Accept the Risk and Continue"

**Expected result**: Legacy EJS video interface loads with Goldlink branding.

---

## Stop Services

### Stop Backend API

Press `Ctrl+C` in the terminal where `node app.js` is running.

**Or kill process:**
```bash
lsof -ti:3005 | xargs kill
```

### Stop MySQL

```bash
brew services stop mysql@8.4
```

---

## Configuration

### Database Connection

**File**: `mysql/mysql8.js`

```javascript
{
  host: 'localhost',
  user: 'bmapi',
  password: 'local54321',
  database: 'bmvapi'
}
```

### SSL Certificates

**Files**:
- `localhost+2.pem` (certificate)
- `localhost+2-key.pem` (private key)

These are self-signed certificates for local HTTPS development.

### Server Port

**Configured in**: `app.js` line 12

```javascript
const server = require('https').createServer({ ... }, app).listen(3005);
```

---

## Test Room UUIDs

From database `clients` table:

| UUID | Name |
|------|------|
| `f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc` | John Test |
| `15c9e55f-0d56-4c96-a213-13fe872bfd0c` | testcerefsefesfs |
| `7e8ffbdc-fa04-4a8f-89a5-50ae888cad3c` | testgerge |
| `53bcb30f-86a9-4d71-b64c-4ede280a4111` | testpiriuv |
| `b6b77192-f0c2-4789-be4c-7e3c0cf6772e` | test435345 |

**Access format**: `https://localhost:3005/{uuid}`

---

## Common Operations

### Reset Ended Session

If you see the "ocean" end session screen instead of the video interface, the session status needs to be reset in the database.

**Reset specific room:**
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
mysql -u bmapi -plocal54321 bmvapi -e "UPDATE clients SET status = 0 WHERE uuid='f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc';"
```

**Reset ALL rooms:**
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
mysql -u bmapi -plocal54321 bmvapi -e "UPDATE clients SET status = 0;"
```

**Then refresh** the browser page.

**Status codes:**
- `0` = Normal/Active
- `32` = Session Ended (shows ocean screen)
- Other values = Various button orientations and waiting room states

---

## Troubleshooting

### "Connected!" not showing

**Check MySQL is running:**
```bash
brew services list | grep mysql
```

**Should show**: `mysql@8.4 started`

**Test MySQL connection:**
```bash
export PATH="/opt/homebrew/opt/mysql@8.4/bin:$PATH"
mysql -u bmapi -plocal54321 -e "SELECT 1;"
```

### Port 3005 already in use

**Find and kill process:**
```bash
lsof -ti:3005
kill -9 <pid>
```

### SSL Certificate Error (can't bypass)

Browser may block self-signed certs. Try:
1. Type `thisisunsafe` anywhere on the Chrome warning page
2. Or temporarily disable SSL in `app.js` (use HTTP instead of HTTPS)

### Module not found errors

**Reinstall dependencies:**
```bash
cd "/Users/taylerramsay/Desktop/_ORGANIZED/01_Development/goldlink-platform/API-localtest-9-23-25 (2)"
rm -rf node_modules package-lock.json
npm install
```

---

## Development Notes

### Modified Files

**Changed from original:**
1. `package.json` - Updated `mysql` → `mysql2` for compatibility with MySQL 8.4
2. `mysql/mysql8.js` - Updated `require('mysql')` → `require('mysql2')`
3. `testbmvapi.sql` - Fixed date defaults (backup at `testbmvapi.sql.backup`)

### Database Schema

**Key tables:**
- `users` - Therapists and admins (checksum-based auth)
- `clients` - Patient records with UUIDs
- `companies` - Organizations
- `userinvolved` / `clientinvolved` - Relationships
- `scheduling` - Appointment data
- `settings` - System configuration

### API Endpoints

50+ endpoints under `/bmapi/*` - see `app.js` for complete list.

**Examples:**
- `POST /bmapi/AC` - Auth check
- `POST /bmapi/GGS` - Get group session
- `POST /bmapi/GUS` - Get user session
- `GET /:room` - Render video session (EJS template)

### Socket.io Events

**Defined in**: `ws/stream.js`

**Key events:**
- `subscribe` - Join video room
- `sdp` - WebRTC signaling
- `ice candidates` - WebRTC ICE
- `message` - Chat messages
- `timer` - Session timer sync

---

## Next Steps

Once backend is verified working:
1. Start Next.js frontend: `npm run dev` (in root directory)
2. Integrate frontend with this backend API
3. Follow `docs/INTEGRATION_PLAN.md` for complete integration guide

---

**Last Updated**: October 7, 2025
