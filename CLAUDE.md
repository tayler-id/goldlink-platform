# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **frontend replacement project** for the Goldlink therapy video platform. The repository contains:

1. **NEW Next.js Frontend** (root directory) - Modern React UI replacing the legacy EJS video session interface
2. **LEGACY Backend API** (`API-localtest-9-23-25 (2)/`) - Node.js/Express server with WebRTC (from developer John Cherskov)
3. **LEGACY Angular Portal** (`GoldLink-ManagementPortal 2/`) - Admin interface using CoreUI

**Goal**: Build a modern Next.js theater/video session UI that connects to the existing backend API while preserving all backend functionality.

## Backend API (DO NOT MODIFY)

The backend was provided by another developer and should remain unchanged. It handles all business logic, auth, database operations, and WebRTC signaling.

### Running the Backend

```bash
cd "API-localtest-9-23-25 (2)"
npm install
node app.js  # Runs on https://localhost:3005
```

**Requirements**:
- MySQL 8.x running locally
- Import database: `mysql -u root -p < testbmvapi.sql`
- Configure credentials in `./mysql/mysql8.js`:
  ```javascript
  host: 'localhost',
  user: 'bmapi',
  password: 'local54321',
  database: 'bmvapi'
  ```
- SSL certificates already included: `localhost+2.pem` and `localhost+2-key.pem`

**Success indicator**: Console shows "Connected!" when MySQL connects successfully.

### Backend Architecture

**Server**: Express.js on https://localhost:3005
- **View Engine**: EJS templates (what we're replacing)
- **WebRTC**: Socket.io (port 3005) + PeerJS for peer connections
- **Auth**: Checksum-based authentication stored in users table
- **Real-time**: Socket.io with CORS enabled (origin: '*')
- **Database**: MySQL with connection pooling

**Key Routes**:
- `GET /:room` - Renders `views/room.ejs` (THIS IS WHAT WE'RE REPLACING)
- `POST /bmapi/*` - 50+ API endpoints for data operations
- WebSocket events handled via Socket.io

**Important API Endpoints** (sample):
- `/bmapi/AC` - Auth check
- `/bmapi/CLP` - Client login
- `/bmapi/GGS` - Get group session data
- `/bmapi/SGS` - Save group session
- `/bmapi/GCID` - Get client info details
- `/bmapi/GUS` - Get user session
- See `app.js:310-3790` for complete list

**Socket.io Events** (defined in `ws/stream.js`):
- Used for WebRTC signaling
- Room joining/leaving
- Video stream negotiation
- Chat messages (if applicable)

### Database Schema

Database: `bmvapi`
Key tables (imported from `testbmvapi.sql`):
- `users` - Therapists and clients with checksum auth
- `companies` - Organizations
- `userinvolved` - User-company relationships
- `clientinvolved` - Client relationships
- Additional tables for sessions, notes, scheduling

## New Next.js Frontend (OUR WORK)

### Current Development Commands

```bash
# Root directory (Next.js app)
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
npm run lint
```

### Architecture

**Framework**: Next.js 14 with App Router + TypeScript
- **UI Components**: Radix UI primitives + shadcn/ui (50+ components)
- **Styling**: TailwindCSS + custom CSS in `app/globals.css`
- **Animations**: Three.js r75 (legacy for BAS compatibility), react-three/fiber
- **3D Effects**: Loading screen with particle ring formation
- **Book Component**: react-pageflip for CPT codes reference

**Path Aliases** (`tsconfig.json`):
```typescript
"@/*" => "./*"  // Root-relative imports
```

**Build Configuration** (`next.config.mjs`):
- TypeScript/ESLint errors ignored during builds (needs cleanup)
- Images unoptimized
- No backend proxy configured yet (TODO: connect to localhost:3005)

### Component Structure

```
app/
├── page.tsx              # Main video session interface (~1,000 lines)
│                         # Contains all UI state and logic
├── layout.tsx            # Root layout with Orbitron font
├── globals.css           # Complete styling system (800+ lines)
└── droid_sans_bold.typeface.js  # Three.js font (331KB)

components/
├── GoldlinkLoader.tsx            # Three.js particle ring loader
├── GoldlinkCinematicThree.tsx   # Advanced 3D scenes
├── theme-provider.tsx           # Dark mode provider
└── ui/                          # shadcn/ui components (50+)
    ├── button.tsx
    ├── dialog.tsx
    ├── card.tsx
    └── ... (many more)
```

### Key Features in Current UI

1. **Three.js Loading Animation** - 5-second particle ring formation
2. **Video Interface** - Placeholder for WebRTC video integration
3. **CPT Codes Book** - Interactive hardcover book with page flips
4. **Stopwatch** - Physical button micro-interactions
5. **Chat System** - Messaging UI (needs API integration)
6. **Session Management** - Notes and AI summaries (needs API integration)

### Design System

**Colors**:
```css
--gold: #FBBF24          /* Primary brand color */
--gold-dark: #F59E0B     /* Medium gold */
--gold-darker: #D97706   /* Dark gold shadows */
--black: #000000         /* Main background */
--dark-blue: #0A0F1E     /* Panel backgrounds */
```

**Typography**:
- Primary: Orbitron (monospace, futuristic, 300-900 weights)
- Letter spacing: 0.1em (body), 0.2em (buttons), 0.3em (titles)

**Key CSS Classes**:
- `.embossed-gold` - 3D embossed text effect
- `.frosted-glass` - Backdrop blur panels
- `.stopwatch-*` - Button interaction states
- `.book-*` - Hardcover book styling

## Integration TODO

### Critical Integration Points

1. **WebRTC Video Connection**
   - Connect to Socket.io at `wss://localhost:3005`
   - Implement PeerJS client (see `views/room.ejs` for reference)
   - Handle WebRTC streams and peer connections
   - Implement waiting room logic

2. **Authentication Flow**
   - Use checksum-based auth from backend
   - Store session data (localStorage or cookies)
   - Pass checksum to API endpoints
   - Handle test admin user (currently hardcoded for local dev)

3. **API Integration**
   - Proxy API calls to `https://localhost:3005/bmapi/*`
   - Implement fetch/axios wrapper with auth headers
   - Handle CORS (already enabled on backend)
   - Wire up chat, notes, session management

4. **Socket.io Client**
   - Install: `npm install socket.io-client`
   - Connect to existing Socket.io server
   - Handle room events (join, leave, user-connected, etc.)
   - Implement WebRTC signaling logic

5. **PeerJS Integration**
   - Install: `npm install peerjs`
   - Connect to PeerJS server (if separate) or use backend
   - Handle video stream sending/receiving
   - Implement video grid layout

### Development Workflow

**Working on UI Components**:
- Main work happens in `app/page.tsx`
- New shadcn components: Add to `components/ui/`
- Custom CSS: Add to `app/globals.css`
- Three.js changes: Edit `components/GoldlinkLoader.tsx`

**Testing the Integration**:
1. Start MySQL: `mysql.server start`
2. Start backend: `cd "API-localtest-9-23-25 (2)" && node app.js`
3. Start frontend: `npm run dev` (in root)
4. Access: http://localhost:3000
5. Test room: Use UUID from backend (e.g., `f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc`)

**Important**: The legacy EJS template at `views/room.ejs` is the reference implementation. Check it for:
- WebRTC connection logic
- Socket.io event handlers
- API call patterns
- Room state management

## Angular Management Portal (OPTIONAL)

This is a separate admin interface. Only work on this if explicitly requested.

```bash
cd "GoldLink-ManagementPortal 2"
npm install -g @angular/cli
npm install
ng serve --port 8080  # May need: $env:NODE_OPTIONS="--openssl-legacy-provider"
npm run build
```

**Framework**: Angular 12.2.x with CoreUI 2.11.x
**Purpose**: Admin dashboard, not part of theater UI replacement

## Important Constraints

### Backend Restrictions
- **DO NOT modify** anything in `API-localtest-9-23-25 (2)/` unless absolutely critical
- **DO NOT change** database schema or API contracts
- **DO NOT modify** Socket.io event names or structure
- Backend is from another developer - treat as third-party API

### Frontend Constraints
- **Must use** Three.js r75 (legacy version for BAS compatibility)
- **Must preserve** existing design language (gold on black, Orbitron font)
- **Must work** with existing backend without backend changes
- **Must support** same browser requirements as legacy EJS template

### Version Locks
- Three.js: r75 (do not upgrade)
- React: 18.3.x (not 19)
- Next.js: 14.2.x
- Node.js: v19.2+ recommended

## Documentation

Comprehensive docs in `docs/`:
- `README.md` - Project overview
- `project-architecture.md` - Technical structure
- `styling-system.md` - Design system reference
- `components.md` - Component documentation
- `animations.md` - Three.js details
- `interactions.md` - UI behavior patterns
- `setup-guide.md` - Environment setup

## Repository Information

- **Main Branch**: main
- **Git Remote**: https://github.com/tayler-id/goldlink-platform.git
- **Platform**: macOS (Darwin 25.0.0)
- **Created With**: Claude Code AI assistant

## Next Steps for Integration

1. Install Socket.io client and PeerJS: `npm install socket.io-client peerjs`
2. Create API service layer in `lib/api.ts` for backend calls
3. Implement WebRTC connection wrapper in `lib/webrtc.ts`
4. Replace placeholder video UI with real WebRTC streams
5. Wire up chat, notes, and session management to API endpoints
6. Test end-to-end with backend running on localhost:3005
7. Handle auth flow and room joining
8. Implement waiting room and end session screens
- you need to test things before you say they are fixed there are still the same issue first