# Component Documentation

## Core Components

### 1. Main Page (`app/page.tsx`)

**Purpose**: Primary therapy video chat interface with all interactive elements.

**Key Features**:
- Video chat with PiP therapist view
- Control panel with 8 action buttons
- Side panels (chat, session details)
- Modal system (timer, book, calendar)

**State Management**:
```typescript
// Core states
const [isLoading, setIsLoading] = useState(true);
const [activeModal, setActiveModal] = useState<string | null>(null);
const [timerIsRunning, setTimerIsRunning] = useState(false);
const [elapsedTime, setElapsedTime] = useState(0);

// Panel states
const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

// Data states
const [messages, setMessages] = useState([...]);
const [notes, setNotes] = useState("");
const [cptCurrentPage, setCptCurrentPage] = useState(0);
```

### 2. GoldlinkLoader (`components/GoldlinkLoader.tsx`)

**Purpose**: Three.js animated loading screen with particle ring formation.

**Key Features**:
- Script injection for Three.js dependencies
- Variable-thickness ring particles
- Text morphing animation
- Completion callback system

**Animation Sequence**:
1. Particles start in variable-thickness rings (0.6 progress)
2. Morph into "GOLDLINK" text (0.0 progress) over 2 seconds
3. Pause at text for 1.5 seconds
4. Begin reverse animation to rings
5. Trigger callback at 75% completion (~4.6s total)

**Props Interface**:
```typescript
interface GoldlinkLoaderProps {
  onLoadComplete?: () => void;
}
```

### 3. CPT Code Book System

**Implementation**: Integrated into main page component using `react-pageflip`.

**Structure**:
- **Front Cover**: Embossed hardcover with gold lettering
- **Table of Contents**: Category navigation  
- **Content Pages**: CPT codes organized by category
- **Back Cover**: Statistics and branding

**Data Structure**:
```typescript
const CPT_CODES = [
  { code: "90791", description: "Psychiatric Diagnostic Evaluation", category: "Evaluation" },
  // ... 24 real CPT codes total
];
```

**Page Generation**: Dynamic page creation with categorized content and proper react-pageflip structure.

## Modal Components

### 1. Stopwatch Modal

**Features**:
- Realistic watch face with SVG graphics
- Physical button interactions
- Crown button (start/stop) with downward press
- Side button (reset) with rightward slide
- Time display and hand animations

**Button Interactions**:
```css
/* Crown pushes down */
#start-stop-crown.pressed { 
  transform: translateX(-50%) translateY(5px);
}

/* Side slides right */  
#reset-button.pressed { 
  transform: translateY(-50%) translateX(3px);
}
```

### 2. Book Modal

**Features**:
- HTMLFlipBook integration
- Page navigation controls
- Realistic page-turning animations
- Hardcover styling with depth effects

### 3. Calendar Modal

**Features**:
- Month navigation
- Current date highlighting
- Grid-based date layout
- Touch-friendly interactions

## Panel System

### 1. Control Panel (Bottom)

**Layout**: 8-button grid with expandable functionality
- Chat, Timer, CPT Codes, Details
- Calendar, Refresh, Waiting, End Call
- Handle-based expand/collapse
- Responsive grid (4 cols mobile, 8 cols desktop)

### 2. Chat Panel (Left Side)

**Features**:
- Message threading
- Therapist/patient message differentiation
- Gold-embossed therapist messages
- Real-time message input
- Secure messaging indicators

### 3. Details Panel (Right Side)

**Features**:
- Session information display
- Note-taking interface
- AI summary generation
- Save functionality

## Animation Components

### 1. Loading Animations

**Stopwatch Bounce-In**:
```css
@keyframes stopwatchBounceIn {
  0% { opacity: 0; transform: scale(0.3) translateY(20px); }
  50% { opacity: 0.8; transform: scale(1.05) translateY(-5px); }
  70% { opacity: 0.95; transform: scale(0.98) translateY(0px); }
  100% { opacity: 1; transform: scale(1) translateY(0px); }
}
```

### 2. Button Micro-Interactions

**Philosophy**: Physical button feel with subtle movements
- Crown button: 3px downward press
- Side button: 3px rightward slide  
- Hover effects: Brightness and glow changes
- Smooth transitions: 0.08s for immediate feedback

## Component Communication

### Parent-Child Data Flow
- Main page manages all state
- Modals receive props and callbacks
- Panels use direct state manipulation
- No external state management (Redux/Zustand)

### Event Handling Patterns
```typescript
// Modal control
const setActiveModal = (modal: string | null) => { ... };

// Panel toggles
const setIsChatPanelOpen = (open: boolean) => { ... };

// Data updates
const handleSendMessage = () => { ... };
const handleGenerateSummary = () => { ... };
```

## Styling Integration

### Component-Specific Classes
- `.stopwatch-container` - Modal positioning
- `.book-page` - Page flip compatibility
- `.message-outgoing` - Gold therapist messages
- `.panel-button` - Control button styling

### State-Based Styling
- `.pressed` - Button active states
- `.running` - Timer active states  
- `.modal-hidden` - Modal visibility
- `.panel-open` - Panel expansion states