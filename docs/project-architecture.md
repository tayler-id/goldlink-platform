# Project Architecture

## Technical Overview

**Goldlink Platform** is built on Next.js 14 with TypeScript, using a hybrid approach of server-side rendering and client-side interactivity.

## Core Dependencies

### Production Dependencies
```json
{
  "next": "14.2.32",
  "react": "19+",
  "react-dom": "19+", 
  "react-pageflip": "^2.x",
  "lucide-react": "latest"
}
```

### Animation Stack
- **Three.js r75** - Legacy version for BAS compatibility
- **BAS (Buffer Animation System)** - Efficient particle animations
- **GSAP/TweenMax 1.18.0** - Timeline animations
- **Custom CSS** - UI micro-interactions

## File Structure Details

### `/app` Directory (Next.js App Router)
- `layout.tsx` - Root layout with font loading
- `page.tsx` - Main therapy interface (2,800+ lines)
- `globals.css` - Complete styling system (800+ lines)
- `index.html` - Standalone Three.js demo

### `/components` Directory
- `GoldlinkLoader.tsx` - Three.js wrapper component
- `ui/` - Shadcn/ui component library (auto-generated)

### `/public` Directory
- `droid_sans_bold.typeface.js` - Three.js font (331KB)
- Placeholder images for UI demos

## Key Architecture Decisions

### 1. Monolithic Page Component
- Single `page.tsx` handles entire therapy interface
- State management via React hooks (no external state library)
- All modals and panels in one component for simplicity

### 2. CSS Architecture
- Single `globals.css` file (800+ lines)
- Tailwind for utilities, custom CSS for complex animations
- Component-scoped classes with BEM-like naming

### 3. Animation Integration
- Three.js isolated in separate component
- Script injection pattern for legacy library compatibility
- Callback system for animation completion

### 4. Font Loading Strategy
- Google Fonts (Orbitron) via Next.js font optimization
- Three.js typeface.js for 3D text rendering
- Fallback fonts for loading states

## Performance Considerations

### Optimization Patterns
1. **Dynamic imports** for Three.js component (SSR safety)
2. **Font preloading** via Next.js font system
3. **CSS animations** over JavaScript where possible
4. **Minimal re-renders** with careful state management

### Bundle Size
- Main bundle: ~200KB (gzipped)
- Three.js chunk: ~500KB (loaded on demand)
- Font file: 331KB (cached after first load)

## Development Workflow

### Local Development
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Production server
```

### Git Workflow
- Main branch for stable releases
- Feature commits with detailed messages
- GitHub repository: `https://github.com/tayler-id/goldlink-platform.git`