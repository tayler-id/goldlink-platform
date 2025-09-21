# Goldlink Platform Documentation

## Project Overview

**Goldlink Platform** is a sophisticated therapy video chat application with premium design elements and interactive components.

### Key Features
- Three.js animated loading screen with particle ring formation
- Professional therapy video interface with PiP (Picture-in-Picture)
- Realistic hardcover CPT codes reference book with page-flip animations
- Interactive stopwatch with physical button micro-interactions
- Secure chat system with therapist/patient messaging
- Session management with notes and AI-powered summaries

### Tech Stack
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: TailwindCSS + Custom CSS
- **Animations**: Three.js r75, GSAP, BAS (Buffer Animation System)
- **UI Library**: React PageFlip for book interactions
- **Font**: Orbitron (Google Fonts) for futuristic feel

## Project Structure

```
goldlink-platform/
├── app/
│   ├── globals.css           # Main styling + animations
│   ├── layout.tsx           # App layout
│   ├── page.tsx            # Main therapy interface
│   └── index.html          # Standalone Three.js demo
├── components/
│   ├── GoldlinkLoader.tsx  # Three.js loading animation
│   └── ui/                 # Reusable UI components
├── public/
│   └── droid_sans_bold.typeface.js  # Three.js font file
└── docs/                   # Project documentation
```

## Design System

### Colors
- **Primary Gold**: `#FBBF24` (--gold)
- **Dark Gold**: `#F59E0B`, `#D97706` 
- **Background**: Black `#000000`
- **Panel Blue**: Dark blue panels `#0A0F1E`
- **Text**: White/Gold on dark backgrounds

### Typography
- **Primary Font**: Orbitron (monospace, futuristic)
- **Weight**: 300-900 range
- **Letter Spacing**: Wide tracking (0.2em-0.3em)

## Development Notes

Created with Claude Code AI assistant. All major features documented in individual files for maintenance and future development.

## File Organization

- `project-architecture.md` - Technical structure and dependencies
- `styling-system.md` - CSS architecture and design tokens  
- `components.md` - Component documentation
- `animations.md` - Three.js and CSS animation details
- `interactions.md` - User interface behaviors
- `setup-guide.md` - Development environment setup