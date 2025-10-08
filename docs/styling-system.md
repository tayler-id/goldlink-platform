# Styling System

## Design Philosophy

Goldlink Platform uses a **premium, futuristic** design language with gold accents on dark backgrounds to convey luxury and technology.

## Color System

### Color Layering for Depth

**The Foundation Principle**: Create 3-4 shades of your base color by increasing lightness by 0.1 increments to establish visual hierarchy without borders.

**Core Concepts**:
1. **The Hierarchy Principle**: Darker = deeper/background, Lighter = elevated/important
2. **The Layering Effect**: Stack lighter shades on top of darker ones to create visual elevation
3. **Borderless Design**: Color contrast alone separates elements once you have proper layering
4. **No Hard Borders Needed**: Use color gradations instead of 1px borders for softer, more premium feel

### Primary Palette

```css
/* Gold Variants - Layered System */
--gold-darkest: #B45309;    /* L1: Deepest background layer */
--gold-darker: #D97706;     /* L2: Dark gold shadows */
--gold-dark: #F59E0B;       /* L3: Medium gold */
--gold: #FBBF24;            /* L4: Primary gold (base) */
--gold-light: #FCD34D;      /* L5: Light gold highlights */
--gold-lightest: #FEF3C7;   /* L6: Brightest accents */
--gold-glow: rgba(251,191,36,0.8); /* Glow effects */

/* Black/Gray Variants - Layered System */
--black-pure: #000000;      /* L1: Deepest backgrounds */
--black-soft: #0A0A0A;      /* L2: Elevated black surfaces */
--dark-blue-deep: #050A14;  /* L3: Deep blue-black */
--dark-blue: #0A0F1E;       /* L4: Panel backgrounds (base) */
--dark-blue-light: #0F1525; /* L5: Elevated panels */
--gray-darkest: #1F2937;    /* L6: Dark gray elements */
--gray-dark: #374151;       /* L7: Secondary elements */
--gray-medium: #4B5563;     /* L8: Borders, dividers */
--gray-light: #6B7280;      /* L9: Subtle text */

/* Semantic Colors - Layered */
--success-dark: #065F46;
--success: #10B981;
--success-light: #34D399;

--error-dark: #991B1B;
--error: #EF4444;
--error-light: #F87171;

--warning-dark: #92400E;
--warning: #F59E0B;
--warning-light: #FBBF24;
```

### Usage Guidelines
- **Gold Layers**:
  - L1-L2 (darkest, darker): Deep backgrounds, shadows
  - L3-L4 (dark, base): Primary elements, main actions
  - L5-L6 (light, lightest): Highlights, elevated states, focus

- **Black/Gray Layers**:
  - L1-L3: App background, deepest surfaces
  - L4-L5: Panels, cards, modals
  - L6-L9: Interactive elements, borders, text hierarchy

- **Elevation Through Color**: Stack lighter on darker (no borders)
  - Background: L1-L3
  - Cards/Panels: L4-L5
  - Buttons/Interactive: L6-L7
  - Hover/Focus: L8-L9 or Gold layers

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

---

## Shadows & Depth System

### Two-Layer Shadow Philosophy

**Realism Through Dual Shadows**: Combine light (top) + dark (bottom) shadows instead of one generic shadow to create depth that feels natural and premium.

**Core Principles**:
1. **Light from Above Concept**: Simulate natural lighting - lighter on top, darker on bottom
2. **Gradient Enhancement**: Linear gradients + light inner shadow on top = shiny, elevated effect
3. **Inset vs Outset**: Inset shadows push in (sunken), outset shadows lift up (raised)
4. **Three Depth Levels**: Small (subtle), Medium (standard), Large (prominent hover/focus)

### Shadow Scale System

```css
/* Small Shadow - Subtle Elevation (4px) */
.shadow-sm {
  box-shadow:
    0 1px 2px 0 rgba(251, 191, 36, 0.05),  /* Light gold top */
    0 2px 4px 0 rgba(0, 0, 0, 0.4);         /* Dark bottom */
}

/* Medium Shadow - Standard Elevation (8px) */
.shadow-md {
  box-shadow:
    0 2px 4px -1px rgba(251, 191, 36, 0.08),  /* Light gold top */
    0 4px 8px 0 rgba(0, 0, 0, 0.5);           /* Dark bottom */
}

/* Large Shadow - Prominent Elevation (16px) */
.shadow-lg {
  box-shadow:
    0 4px 8px -2px rgba(251, 191, 36, 0.12),  /* Light gold top */
    0 8px 16px 0 rgba(0, 0, 0, 0.6);          /* Dark bottom */
}

/* Extra Large Shadow - Maximum Elevation (24px) */
.shadow-xl {
  box-shadow:
    0 8px 16px -4px rgba(251, 191, 36, 0.15),  /* Light gold top */
    0 12px 24px 0 rgba(0, 0, 0, 0.7);          /* Dark bottom */
}

/* Gold Glow Shadow - Premium Interactive States */
.shadow-gold-glow {
  box-shadow:
    0 0 20px rgba(251, 191, 36, 0.3),          /* Gold glow */
    0 4px 8px 0 rgba(0, 0, 0, 0.5);            /* Dark bottom */
}

/* Inner Shadow - Sunken Effect */
.shadow-inset {
  box-shadow:
    inset 0 2px 4px 0 rgba(0, 0, 0, 0.6),      /* Top depression */
    inset 0 -1px 2px 0 rgba(251, 191, 36, 0.05); /* Bottom light */
}

/* Elevated Surface - Top Light + Bottom Shadow */
.shadow-elevated {
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),  /* Top highlight */
    0 2px 4px -1px rgba(251, 191, 36, 0.08),   /* Light top */
    0 4px 8px 0 rgba(0, 0, 0, 0.5);            /* Dark bottom */
}
```

### Gradient + Shadow Combinations

**Shiny Elevated Surfaces**:
```css
/* Premium Card with Gradient + Dual Shadow */
.premium-card {
  background: linear-gradient(
    180deg,
    rgba(15, 21, 37, 1) 0%,      /* Lighter top */
    rgba(10, 15, 30, 1) 100%     /* Darker bottom */
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),    /* Inner top highlight */
    0 2px 4px -1px rgba(251, 191, 36, 0.08),   /* Light top shadow */
    0 4px 8px 0 rgba(0, 0, 0, 0.5);            /* Dark bottom shadow */
}

/* Gold Button - Shiny Effect */
.gold-button {
  background: linear-gradient(
    180deg,
    #FCD34D 0%,     /* Light gold top */
    #FBBF24 50%,    /* Base gold middle */
    #F59E0B 100%    /* Dark gold bottom */
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),    /* Shiny top */
    inset 0 -1px 0 rgba(0, 0, 0, 0.2),         /* Depth at bottom */
    0 2px 4px rgba(251, 191, 36, 0.2),         /* Gold glow */
    0 4px 8px rgba(0, 0, 0, 0.6);              /* Bottom shadow */
}

/* Pressed State - Inverted Shadows */
.gold-button:active {
  background: linear-gradient(
    180deg,
    #F59E0B 0%,     /* Dark gold top (inverted) */
    #FBBF24 50%,
    #FCD34D 100%    /* Light gold bottom */
  );
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.4),        /* Top depression */
    inset 0 -1px 0 rgba(255, 255, 255, 0.1);   /* Bottom light */
}
```

### Interactive State Shadows

```css
/* Hover - Increase Elevation */
.interactive:hover {
  box-shadow:
    0 4px 8px -2px rgba(251, 191, 36, 0.15),  /* More gold glow */
    0 8px 16px 0 rgba(0, 0, 0, 0.6);          /* Deeper shadow */
  transform: translateY(-2px);                /* Lift up */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus - Gold Ring Glow */
.interactive:focus {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(251, 191, 36, 0.3),        /* Gold focus ring */
    0 2px 4px -1px rgba(251, 191, 36, 0.08),
    0 4px 8px 0 rgba(0, 0, 0, 0.5);
}

/* Active/Pressed - Push In */
.interactive:active {
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.6),       /* Sunken */
    inset 0 -1px 0 rgba(251, 191, 36, 0.05);
  transform: translateY(1px);                 /* Push down */
}

/* Disabled - Flatten */
.interactive:disabled {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.2);             /* Minimal shadow */
  opacity: 0.5;
}
```

### Depth Hierarchy Examples

```css
/* Z-Index Layer 1: Background (-1 to 0) */
.app-background {
  background: var(--black-pure);
  box-shadow: none;
}

/* Z-Index Layer 2: Base Surface (1-10) */
.base-panel {
  background: var(--dark-blue);
  box-shadow:
    0 1px 2px 0 rgba(251, 191, 36, 0.05),
    0 2px 4px 0 rgba(0, 0, 0, 0.4);
}

/* Z-Index Layer 3: Elevated Cards (11-20) */
.card {
  background: var(--dark-blue-light);
  box-shadow:
    0 2px 4px -1px rgba(251, 191, 36, 0.08),
    0 4px 8px 0 rgba(0, 0, 0, 0.5);
}

/* Z-Index Layer 4: Modals/Dialogs (21-30) */
.modal {
  background: var(--dark-blue-light);
  box-shadow:
    0 8px 16px -4px rgba(251, 191, 36, 0.15),
    0 12px 24px 0 rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
}

/* Z-Index Layer 5: Tooltips/Popovers (31-40) */
.tooltip {
  background: var(--gray-darkest);
  box-shadow:
    0 4px 8px -2px rgba(251, 191, 36, 0.12),
    0 8px 16px 0 rgba(0, 0, 0, 0.6);
}
```

### Usage Guidelines

**When to Use Each Shadow Level**:

1. **Small (sm)**: Subtle UI elements, list items, input fields
2. **Medium (md)**: Cards, buttons, panels - most common use case
3. **Large (lg)**: Important buttons, featured cards, hover states
4. **Extra Large (xl)**: Modals, dialogs, dropdown menus

**Shadow Color Strategy**:
- **Gold shadows** (top): Use sparingly for premium interactive elements
- **Black shadows** (bottom): Use everywhere for depth and realism
- **Combine both**: Most realistic and premium effect

**Performance Notes**:
- Multiple box-shadows are performant (GPU accelerated)
- Avoid animating shadows directly - use opacity instead
- Use `will-change: box-shadow` for frequently animated elements
- Consider `filter: drop-shadow()` for complex shapes

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

### Responsive Philosophy

**Principle 1: Design as a System of Boxes**

Every design starts as a system of boxes. The goal is to build a layout where everything has a clear relationship and natural balance, so the structure itself feels flexible before it ever responds.

**Core Concepts**:
- Think in containers, not pixels
- Establish relationships between elements (parent-child, sibling hierarchies)
- Use proportional spacing (not fixed) whenever possible
- Create natural flow that adapts without breaking

**Principle 2: Rearrange with Purpose**

A responsive layout isn't about shrinking - it's about rearranging with purpose. As the space changes, elements should shift, flow, or reprioritize, maintaining clarity and rhythm.

**Core Concepts**:
- Elements should transform, not just scale down
- Maintain visual hierarchy at all breakpoints
- Prioritize content importance (hide less critical elements on mobile)
- Preserve rhythm and spacing relationships

### Breakpoint Strategy

```css
/* Mobile First Approach */

/* Base: Mobile (320px - 767px) */
/* Default styles - stacked, simplified */

/* Tablet: Small (768px - 1023px) */
@media (min-width: 768px) {
  /* 2-column layouts, larger touch targets */
}

/* Desktop: Medium (1024px - 1439px) */
@media (min-width: 1024px) {
  /* Multi-column layouts, hover states */
}

/* Desktop: Large (1440px+) */
@media (min-width: 1440px) {
  /* Maximum content width, optimal spacing */
}

/* Ultra-wide: Extra Large (1920px+) */
@media (min-width: 1920px) {
  /* Prevent over-stretching, maintain readability */
}
```

### Responsive Patterns

**Pattern 1: Container Box System**

```css
/* Fluid Container with Max Width */
.container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 1rem;  /* Mobile */
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;  /* Tablet */
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 3rem;  /* Desktop */
  }
}
```

**Pattern 2: Flexible Grid System**

```css
/* Mobile: Stacked (1 column) */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

/* Desktop: 3-4 columns */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
}

/* Adaptive Grid (auto-fit) */
.grid-adaptive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

**Pattern 3: Rearrangement (Not Just Scaling)**

```css
/* Mobile: Vertical Stack */
.video-session {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.video-main { order: 1; }       /* Video first */
.control-panel { order: 2; }    /* Controls second */
.chat-panel { order: 3; }       /* Chat third */

/* Desktop: Strategic Layout */
@media (min-width: 1024px) {
  .video-session {
    display: grid;
    grid-template-columns: 300px 1fr 300px;  /* Chat | Video | Details */
    grid-template-rows: 1fr auto;
    gap: 1.5rem;
  }

  .video-main {
    grid-column: 2;
    grid-row: 1;
  }
  .chat-panel {
    grid-column: 1;
    grid-row: 1 / -1;  /* Full height */
  }
  .control-panel {
    grid-column: 2;
    grid-row: 2;
  }
}
```

### Responsive Typography

```css
/* Fluid Typography with Clamp */
.heading-1 {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.2;
  letter-spacing: 0.3em;
}

.heading-2 {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  line-height: 1.3;
  letter-spacing: 0.2em;
}

.body {
  font-size: clamp(0.875rem, 2vw, 1rem);
  line-height: 1.6;
  letter-spacing: 0.1em;
}

/* Responsive Line Length */
.text-block {
  max-width: 65ch;  /* Optimal reading width */
  margin: 0 auto;
}
```

### Responsive Spacing Scale

```css
/* Base Spacing (Mobile) */
:root {
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
}

/* Tablet Spacing */
@media (min-width: 768px) {
  :root {
    --space-md: 1.25rem;   /* 20px */
    --space-lg: 2rem;      /* 32px */
    --space-xl: 3rem;      /* 48px */
    --space-2xl: 4rem;     /* 64px */
  }
}

/* Desktop Spacing */
@media (min-width: 1024px) {
  :root {
    --space-md: 1.5rem;    /* 24px */
    --space-lg: 2.5rem;    /* 40px */
    --space-xl: 4rem;      /* 64px */
    --space-2xl: 6rem;     /* 96px */
  }
}
```

### Mobile-Specific Adaptations

**Touch Targets**:
```css
/* Minimum 44px x 44px for touch */
.button-mobile {
  min-width: 44px;
  min-height: 44px;
  padding: 0.75rem 1.5rem;
}

/* Tablet/Desktop: Can be smaller */
@media (min-width: 1024px) {
  .button-desktop {
    min-width: auto;
    min-height: auto;
    padding: 0.5rem 1rem;
  }
}
```

**Simplified Animations**:
```css
/* Reduce motion on mobile for performance */
@media (max-width: 767px) {
  * {
    animation-duration: 0.3s !important;
    transition-duration: 0.2s !important;
  }

  /* Disable parallax/complex effects */
  .parallax,
  .complex-animation {
    animation: none !important;
    transform: none !important;
  }
}

/* Honor user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Content Prioritization**:
```css
/* Hide secondary content on mobile */
.secondary-info,
.decorative-element {
  display: none;
}

@media (min-width: 768px) {
  .secondary-info,
  .decorative-element {
    display: block;
  }
}

/* Show mobile-only helpers */
.mobile-only {
  display: block;
}

@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }
}
```

### Responsive States Example

```css
/* Mobile: Simple Stack */
.video-interface {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.video-main {
  flex: 1;
  min-height: 60vh;
}

.control-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--dark-blue);
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

/* Tablet: Side Panels Appear */
@media (min-width: 768px) {
  .video-interface {
    display: grid;
    grid-template-columns: 1fr 250px;
    grid-template-rows: 1fr auto;
  }

  .video-main {
    grid-column: 1;
    grid-row: 1;
  }

  .chat-panel {
    grid-column: 2;
    grid-row: 1 / -1;
    display: block;  /* Hidden on mobile */
  }

  .control-panel {
    position: static;
    grid-column: 1;
    grid-row: 2;
    grid-template-columns: repeat(8, 1fr);
  }
}

/* Desktop: Full Layout */
@media (min-width: 1024px) {
  .video-interface {
    grid-template-columns: 300px 1fr 300px;
  }

  .details-panel {
    grid-column: 3;
    grid-row: 1 / -1;
    display: block;  /* Hidden on mobile/tablet */
  }
}
```

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