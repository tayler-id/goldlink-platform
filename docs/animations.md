# Animation System Documentation

## Three.js Loading Animation

### Core Animation (`GoldlinkLoader.tsx`)

**Technology Stack**:
- Three.js r75 (legacy for BAS compatibility)
- BAS (Buffer Animation System) - efficient particle management
- GSAP TweenMax 1.18.0 - timeline animation control
- Custom typeface.js font loading

**Animation Flow**:
```javascript
// Timeline sequence (5 seconds total)
var tl = new TimelineMax({});

// 1. Rings → Word (2s)
tl.fromTo(textAnimation, 2, {
  animationProgress: 0.6  // Ring formation
}, {
  animationProgress: 0.0  // Text formation
});

// 2. Pause at word (1.5s)
tl.to(textAnimation, 1.5, {}, 2);

// 3. Word → Rings with early callback (1.5s)
tl.to(textAnimation, 1.5, {
  animationProgress: 0.6,
  onUpdate: function() {
    if (this.progress() > 0.75) {
      // Trigger UI load at 75% completion
      window.goldlinkLoadComplete();
    }
  }
}, 3.5);
```

### Particle System Architecture

**Ring Formation**:
```javascript
// Variable thickness rings with organic shape
variableRings: function(i, n, maxRadius) {
  var ringIndex = Math.floor(i / (n / 2)); // 2 rings total
  var angle = (particleInRing / particlesPerRing) * Math.PI * 2;
  
  // Rotation offset between rings
  var rotationOffset = ringIndex * Math.PI * 0.6;
  angle += rotationOffset;
  
  // Variable thickness using sine waves
  var thickness1 = Math.sin(angle * 3) * 0.4;      // 3 main bumps
  var thickness2 = Math.sin(angle * 7) * 0.2;      // 7 smaller variations
  var thickness3 = Math.sin(angle * 11) * 0.1;     // 11 micro details
  var thicknessVariation = thickness1 + thickness2 + thickness3;
  
  // Apply thickness and create gaps
  var actualRadius = baseRadius * (1 + thicknessVariation) * gapMultiplier;
}
```

**Text Morphing**:
- Uses Buffer Geometry for efficient rendering
- Each text face becomes a particle
- Smooth interpolation between ring positions and text positions
- Shader-based morphing with `mix()` function

### Font System Integration

**Legacy Typeface.js Format**:
```javascript
// Font loading compatibility layer
window._typeface_js = {
  faces: {},
  loadFace: function(data) {
    var familyName = (data.familyName || 'Droid Sans').toLowerCase();
    THREE.FontUtils.faces[familyName + '_bold_normal'] = data;
  }
};

// Font override for proper face detection
THREE.FontUtils.getFace = function(font, weight, style) {
  var fontData = THREE.FontUtils.faces['droid sans'];
  return fontData && fontData.bold && fontData.bold.normal || fontData;
};
```

## CSS Animation System

### Modal Entry Animations

**Stopwatch Bounce-In**:
```css
@keyframes stopwatchBounceIn {
  0% { 
    opacity: 0;
    transform: scale(0.3) translateY(20px);
  }
  50% { 
    opacity: 0.8;
    transform: scale(1.05) translateY(-5px);  /* Overshoot */
  }
  70% { 
    opacity: 0.95;
    transform: scale(0.98) translateY(0px);   /* Settle */
  }
  100% { 
    opacity: 1;
    transform: scale(1) translateY(0px);      /* Rest */
  }
}

/* Applied with elastic curve */
.stopwatch-container {
  animation: stopwatchBounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

### Button Micro-Interactions

**Philosophy**: Simulate physical button mechanics

**Crown Button (Top)**:
```css
#start-stop-crown {
  /* Base position */
  transform: translateX(-50%) translateY(0px);
  transition: transform 0.08s ease-out;
}

#start-stop-crown.pressed { 
  /* Push down effect */
  transform: translateX(-50%) translateY(5px) !important;
}
```

**Side Button (Reset)**:
```css
#reset-button {
  /* Base position */
  transform: translateY(-50%) translateX(0px);
  transition: transform 0.08s ease-out;
}

#reset-button.pressed { 
  /* Slide right effect */
  transform: translateY(-50%) translateX(3px) !important;
}
```

### Page Flip Animations

**Book Integration**:
- Uses HTMLFlipBook library
- Custom CSS for hardcover appearance
- 3D transform effects on page turns
- Physics-based page bending

**Page Structure**:
```css
.book-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 3px;
}

/* React-pageflip compatibility */
.flip-book {
  /* Library handles 3D transforms */
  /* Custom styling for premium feel */
}
```

## Performance Optimization

### Hardware Acceleration
```css
/* Enable GPU acceleration */
.stopwatch-container, .book-page {
  transform: translateZ(0);
  will-change: transform;
}

/* Disable when not animating */
.animation-complete {
  will-change: auto;
}
```

### Animation Cleanup
```javascript
// Three.js cleanup
return () => {
  // Remove script tags
  const existingScript = document.head.querySelector('script[data-goldlink="true"]');
  if (existingScript) {
    document.head.removeChild(existingScript);
  }
  // Clear global callbacks
  delete window.goldlinkLoadComplete;
};
```

### Efficient Transitions
```css
/* Prefer transform and opacity */
.efficient-animation {
  transform: translateX(0px);
  opacity: 1;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Avoid expensive properties */
.avoid {
  /* width, height, top, left, margin, padding */
  /* These trigger layout recalculation */
}
```

## Animation States

### Loading States
1. **Initial**: Black screen
2. **Script Loading**: Progress indicators
3. **Animation Running**: Ring formation → Text → Ring return
4. **Transition**: Fade to main UI
5. **Complete**: Main interface visible

### Interactive States
1. **Idle**: Subtle pulses and glows
2. **Hover**: Brightness and shadow changes
3. **Active/Pressed**: Physical depression effects
4. **Running**: Continuous animations (timer, etc.)
5. **Completion**: Success animations and transitions

## Debugging Animation Issues

### Common Problems
1. **CSS Conflicts**: Use `!important` sparingly for critical animations
2. **Transform Order**: Maintain consistent transform chains
3. **Animation Overrides**: Check for competing animations
4. **Performance**: Monitor for jank with dev tools

### Debug Helpers
```css
/* Visual debugging */
.debug-transform {
  outline: 2px solid red;
  background: rgba(255,0,0,0.1) !important;
}
```

```javascript
// JavaScript debugging
console.log('Animation state:', element.classList);
console.log('Computed style:', getComputedStyle(element).transform);
```