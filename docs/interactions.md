# User Interaction Documentation

## Interaction Philosophy

Goldlink Platform emphasizes **tactile, realistic interactions** that mimic physical objects and premium interfaces. Every interaction should feel weighted, responsive, and satisfying.

## Loading Experience

### Three.js Animation Sequence
**User Journey**:
1. **Page Load**: Black screen with script loading
2. **Animation Start**: Particles form variable-thickness rings
3. **Text Formation**: Rings collapse into "GOLDLINK" text (2s)
4. **Text Display**: Pause at formed text (1.5s)
5. **Transition**: Text begins returning to rings, UI loads at 75%
6. **Complete**: Main interface appears with smooth transition

**User Expectations**:
- Total wait time: ~4.6 seconds
- Visual progress indicator via animation
- Smooth transition to main app
- Professional, premium feel

## Primary Interface Interactions

### Video Controls
**Main Video Area**:
- Click video area for focus
- Hover shows subtle overlay controls
- Picture-in-picture therapist view (non-interactive)
- Real-time session timer display

**Expected Behavior**:
- Immediate response to clicks
- Clear visual feedback for active states
- Professional video calling experience

### Control Panel System

**Panel Toggle**:
```
Handle Click → Panel slides up → Buttons become accessible
```

**Button Grid** (8 buttons):
1. **CHAT** - Opens left chat panel
2. **TIMER** - Opens stopwatch modal
3. **CPT CODES** - Opens book modal  
4. **DETAILS** - Opens right session panel
5. **CALENDAR** - Opens calendar modal
6. **REFRESH** - Page reload
7. **WAITING** - Status indicator
8. **END** - End session (red button)

**Interaction Patterns**:
- Hover: Gold glow effect
- Click: Immediate modal/panel opening
- Visual hierarchy: Red end button stands out
- Touch-friendly sizing on mobile

## Modal Interactions

### 1. Stopwatch Modal

**Entry Animation**: Bouncy scale-in (0.5s) with elastic easing

**Button Interactions**:
```javascript
// Crown Button (Top)
onMouseDown → Push down 3px
onMouseUp → Spring back to position
Action: Start/Stop timer

// Side Button (Reset)  
onMouseDown → Slide right 3px
onMouseUp → Snap back to position
Action: Reset timer to 00:00:00
```

**Visual Feedback**:
- Hover: Brightness increase + colored glow
- Active: Physical movement + brightness boost
- Running state: Gold crown, pulsing face

**Expected Feel**: Like pressing real watch buttons with physical resistance and spring-back.

### 2. Book Modal (CPT Codes)

**Page Navigation**:
- Click page edges to turn pages
- Use Prev/Next buttons at bottom
- Pages bend and flip realistically
- Page numbers update dynamically

**Cover Interaction**:
- Embossed gold "CPT CODES" title
- Visible book spine and binding
- Click anywhere to start page flip
- Premium hardcover appearance

**Content Structure**:
- Front Cover → Table of Contents → Category Pages → Back Cover
- Real CPT codes organized by medical category
- Professional medical reference feel

### 3. Calendar Modal

**Month Navigation**:
- Arrow buttons for previous/next month
- Current date highlighted in gold
- Grid-based date selection
- Month/year display

**Date Selection**:
- Hover effects on available dates
- Click to select (functionality placeholder)
- Visual feedback for current date
- Clean, professional calendar interface

## Panel Interactions

### Chat Panel (Left Side)

**Opening**: Slides in from left, pushes main content right
**Closing**: X button in top-right corner

**Message System**:
- **Incoming messages** (patient): Gray bubbles, left-aligned
- **Outgoing messages** (therapist): Gold embossed bubbles, right-aligned
- **Input field**: Bottom-anchored with send button
- **Send methods**: Enter key or send button click

**Gold Message Styling**:
```css
/* Therapist messages match book cover gold */
background: linear-gradient(145deg, #FBBF24, #F59E0B, #D97706);
box-shadow: 0 0 15px rgba(251,191,36,0.4);
text-shadow: 0 1px 0 rgba(255,255,255,0.3);
```

### Details Panel (Right Side)

**Session Information**:
- Patient details (read-only)
- Session metadata (date, time, duration)
- Status indicators

**Note-Taking**:
- Large text area for session notes
- Save button (visual feedback only)
- Character count or word count (optional)

**AI Assistant**:
- "Generate Summary" button
- Loading animation during processing (2.5s simulation)
- Generated summary with action items
- Professional medical note format

## Responsive Behavior

### Mobile Adaptations
- **Control Panel**: 4-column grid instead of 8
- **Modals**: Full-screen on small devices
- **Panels**: Overlay instead of push-content
- **Touch**: Larger hit areas for buttons

### Tablet Behavior
- **Hybrid**: Some desktop features with touch optimization
- **Panel Sizing**: Adjusted widths for screen real estate
- **Button Spacing**: Optimized for finger navigation

## Accessibility Considerations

### Keyboard Navigation
- Tab order through interactive elements
- Enter/Space for button activation
- Escape to close modals
- Arrow keys for calendar navigation

### Visual Accessibility
- High contrast gold on black
- Clear focus indicators
- Large click targets (44px minimum)
- Readable font sizes (16px+)

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for complex interactions
- Status announcements for state changes
- Descriptive button labels

## Performance Expectations

### Response Times
- **Button clicks**: Immediate (<50ms)
- **Modal opening**: Smooth animation (500ms)
- **Panel slides**: Fast animation (300ms)
- **Page turns**: Realistic timing (800ms)

### Animation Quality
- **60 FPS** for all animations
- **Hardware acceleration** for transforms
- **Smooth curves** (cubic-bezier timing)
- **Appropriate easing** for each interaction type

## Error States & Edge Cases

### Loading Failures
- Three.js load error: Fallback to simple loading screen
- Font load failure: Graceful degradation to system fonts
- Modal failures: Basic dialog fallbacks

### Network Issues
- Chat send failures: Retry mechanism
- AI summary errors: Error message display
- Video connection issues: Status indicators

### User Input Validation
- Empty chat messages: Prevent sending
- Invalid form inputs: Clear error messaging
- Rate limiting: Prevent spam interactions

## Future Interaction Enhancements

### Planned Improvements
- **Haptic feedback** on supported devices
- **Sound effects** for button interactions
- **Voice commands** for accessibility
- **Gesture support** for tablet users
- **Keyboard shortcuts** for power users