# Styling System

## Design Philosophy

Goldlink Platform uses a **premium, futuristic** design language with gold accents on dark backgrounds to convey luxury and technology.

## Color System

### Primary Palette
```css
/* Gold Variants */
--gold: #FBBF24;           /* Primary gold */
--gold-light: #FCD34D;     /* Light gold highlights */
--gold-dark: #F59E0B;      /* Medium gold */
--gold-darker: #D97706;    /* Dark gold shadows */
--gold-glow: rgba(251,191,36,0.8); /* Glow effects */

/* Background System */
--black: #000000;          /* Pure black backgrounds */
--dark-blue: #0A0F1E;      /* Panel backgrounds */
--gray-dark: #374151;      /* Secondary elements */
```

### Usage Guidelines
- **Gold**: Primary actions, highlights, embossed text
- **Black**: Main backgrounds, covers, premium elements  
- **Dark Blue**: Interface panels, modals
- **White**: Body text on dark backgrounds

## Typography

### Font Stack
```css
/* Primary Font */
font-family: 'Orbitron', monospace;

/* Fallback Stack */
font-family: 'Orbitron', 'Inter', monospace, sans-serif;
```

### Font Weights & Usage
- **300** - Subtle text, hints
- **400** - Body text  
- **600** - Medium emphasis
- **700** - Strong emphasis
- **900** - Titles, embossed text

### Letter Spacing
- **Body text**: `0.1em`
- **Buttons**: `0.2em` 
- **Titles**: `0.3em`
- **Large titles**: `0.2em-0.3em`

## Component Styling Patterns

### Embossed Gold Text (Book Cover Style)
```css
.embossed-gold {
  color: #FBBF24;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-shadow: 
    0 0 10px rgba(251,191,36,0.8),
    0 2px 0 #B45309,
    0 4px 0 #92400E,
    0 6px 10px rgba(0,0,0,0.8),
    inset 0 1px 0 rgba(255,255,255,0.3);
  filter: drop-shadow(0 0 15px rgba(251,191,36,0.6));
}
```

### Frosted Glass Panels
```css
.frosted-glass {
  background: rgba(16, 24, 39, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(251, 191, 36, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Premium Buttons
```css
.panel-button {
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  border: 1px solid #4b5563;
  color: #d1d5db;
  transition: all 0.3s ease;
}
.panel-button:hover {
  border-color: var(--gold);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
}
```

## Animation System

### Micro-Interactions
- **Hover transitions**: 0.3s ease
- **Button presses**: 0.08-0.1s ease-out
- **Modal appearances**: 0.5s cubic-bezier curves
- **Page flips**: 0.8s with elastic easing

### Three.js Integration
- **Loading animation**: 5-second sequence
- **Ring formation**: Variable thickness with sine waves
- **Text morphing**: Buffer geometry transitions
- **Particle movement**: Fibonacci sphere distribution

## Responsive Design

### Breakpoints
- **Mobile**: < 768px (simplified layouts)
- **Tablet**: 768px - 1024px (adjusted spacing)
- **Desktop**: > 1024px (full feature set)

### Mobile Adaptations
- Reduced font sizes
- Simplified animations
- Touch-friendly button sizing
- Stacked layouts for panels

## CSS Architecture

### File Organization
```css
/* globals.css structure */
1. Tailwind imports
2. Book styling (hardcover effects)
3. Stopwatch animations
4. Modal systems
5. Panel layouts
6. Chat bubbles
7. Utility classes
```

### Naming Convention
- **Component-based**: `.stopwatch-container`, `.book-page`
- **State-based**: `.pressed`, `.running`, `.modal-hidden`
- **Utility-based**: `.frosted-glass`, `.embossed-gold`

## Performance Notes

### CSS Optimization
- Critical styles inlined
- Non-critical styles loaded async
- Hardware acceleration for animations (`transform3d`)
- Efficient selectors (avoid deep nesting)

### Animation Performance
- Use `transform` and `opacity` for smooth animations
- Avoid animating `width`, `height`, `top`, `left`
- Enable GPU acceleration with `will-change` sparingly
- Clean up animations on component unmount