# Development Setup Guide

## Prerequisites

### Required Software
- **Node.js**: 18.0+ (LTS recommended)
- **npm**: 9.0+ (comes with Node.js)
- **Git**: Latest version
- **VS Code**: Recommended editor

### Recommended VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

## Project Setup

### 1. Clone Repository
```bash
git clone https://github.com/tayler-id/goldlink-platform.git
cd goldlink-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create `.env.local` (if needed for future API keys):
```bash
# Future environment variables
# NEXT_PUBLIC_API_URL=
# OPENAI_API_KEY=
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
```

### Development Workflow
```bash
# Daily development
npm run dev          # Start coding
npm run lint         # Check code quality
npm run build        # Test production build

# Before committing
git add .
git commit -m "descriptive message"
git push
```

## Project Structure Understanding

### Key Files to Know
```
goldlink-platform/
├── app/
│   ├── page.tsx           # Main therapy interface (primary file)
│   ├── globals.css        # All styling (secondary file)
│   └── layout.tsx         # App layout
├── components/
│   └── GoldlinkLoader.tsx # Three.js loading animation
├── public/
│   └── droid_sans_bold.typeface.js  # Three.js font
└── docs/                  # This documentation
```

### Development Focus Areas

**Primary Development File**: `app/page.tsx`
- Contains entire therapy interface
- All component logic and state management
- 2,800+ lines of React/TypeScript code

**Primary Styling File**: `app/globals.css`
- Contains all animations and styling
- 800+ lines of CSS with custom animations
- Tailwind utilities + custom components

**Animation Component**: `components/GoldlinkLoader.tsx`
- Three.js loading screen wrapper
- Complex script injection pattern
- Legacy library compatibility layer

## Common Development Tasks

### 1. Modifying UI Components
**Location**: `app/page.tsx`
```typescript
// Find component sections like:
// - Control Panel (buttons)
// - Chat Panel (messaging)
// - Details Panel (notes, AI)
// - Modal components (timer, book, calendar)
```

### 2. Updating Styling
**Location**: `app/globals.css`
```css
/* Key sections: */
/* Book styling */
/* Stopwatch animations */
/* Modal systems */
/* Chat bubbles */
```

### 3. Animation Adjustments
**Three.js**: `components/GoldlinkLoader.tsx`
```javascript
// Animation timing adjustments
// Particle system modifications
// Ring formation parameters
```

**CSS Animations**: `app/globals.css`
```css
/* Micro-interactions */
/* Modal transitions */
/* Button feedback */
```

## Debugging Guide

### Common Issues

**1. Three.js Loading Problems**
```bash
# Check browser console for:
# - Script loading errors
# - Font loading failures
# - WebGL compatibility issues
```

**2. Styling Not Applying**
```bash
# Check for:
# - CSS specificity conflicts
# - Tailwind purging issues
# - Class name typos
```

**3. Animation Performance**
```bash
# Monitor:
# - Chrome DevTools Performance tab
# - 60fps animation smoothness
# - Memory usage during animations
```

### Debug Tools

**Browser Console**:
```javascript
// Check Three.js loading
console.log('THREE loaded:', typeof THREE);
console.log('Animation progress:', textAnimation.animationProgress);

// Check React state
console.log('Component state:', {isLoading, activeModal});
```

**CSS Debugging**:
```css
/* Temporary visual debugging */
.debug {
  outline: 2px solid red !important;
  background: rgba(255,0,0,0.1) !important;
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Loading animation completes
- [ ] All modals open/close properly
- [ ] Stopwatch buttons respond correctly
- [ ] Book pages turn smoothly
- [ ] Chat messages send
- [ ] Panels slide in/out
- [ ] Responsive design works
- [ ] Performance is smooth (60fps)

### Browser Compatibility
**Recommended Testing Browsers**:
- Chrome 90+ (primary development)
- Firefox 88+ (secondary)
- Safari 14+ (WebKit testing)
- Edge 90+ (Chromium-based)

**Mobile Testing**:
- iOS Safari (iPhone/iPad)
- Chrome Mobile (Android)
- Various viewport sizes

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

### Image Optimization
```bash
# Optimize images in /public
# Use next/image for responsive images
# Consider WebP format for better compression
```

### CSS Optimization
```bash
# Remove unused CSS
# Minimize animations on slower devices
# Use hardware acceleration sparingly
```

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Manual Deployment
```bash
# Build application
npm run build

# Deploy /out folder to static host
# Ensure proper routing for SPA behavior
```

## Troubleshooting

### Package Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Git Issues
```bash
# Reset to last working state
git status
git stash  # Save current changes
git pull origin main
git stash pop  # Restore changes
```

### TypeScript Errors
```bash
# Check types
npm run type-check

# Common fixes
# - Update @types packages
# - Check import/export statements
# - Verify component prop types
```

## Contributing Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing component patterns
- Maintain consistent naming conventions
- Add comments for complex logic

### Commit Messages
```bash
# Use descriptive commit messages
git commit -m "Add stopwatch button micro-interactions

- Crown button pushes down 3px when pressed
- Side button slides right 3px when pressed  
- Added hover effects with gold/red glows"
```

### Documentation
- Update relevant docs/ files when adding features
- Comment complex algorithms
- Maintain README.md accuracy