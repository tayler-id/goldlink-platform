"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import HTMLFlipBook from "react-pageflip";
import { BookOpen } from "lucide-react";
import type React from "react";
import dynamic from "next/dynamic";
import GoldlinkLoader from "@/components/GoldlinkLoader";
import { socketManager } from "@/lib/socket";
import { webrtcManager } from "@/lib/webrtc";
import { getUserSession, getClientByUUID, getUserInfo } from "@/lib/api";

 const GoldlinkCinematicThree = dynamic(() => import("@/components/GoldlinkCinematicThree"), { ssr: false });

// Admin checksum from database (user: admin, pass: c144)
// This is Therapist Jones from the test database
const ADMIN_CHECKSUM = "540609175";

// ---------- Stopwatch SVG helpers ----------
const renderDialMarks = (): React.ReactElement[] =>
  Array.from({ length: 60 }, (_, i) => {
    const isMajor = i % 5 === 0;
    return (
      <line
        key={`dial-${i}`}
        x1="100"
        y1={isMajor ? 10 : 15}
        x2="100"
        y2="20"
        stroke={isMajor ? "white" : "#9ca3af"}
        strokeWidth={isMajor ? 2 : 1}
        transform={`rotate(${i * 6} 100 100)`}
      />
    );
  });

const renderSubDialMarks = (): React.ReactElement[] =>
  Array.from({ length: 12 }, (_, i) => (
    <line
      key={`subdial-${i}`}
      x1="100"
      y1="35"
      x2="100"
      y2="40"
      stroke="#fdf6e3"
      strokeWidth="1.5"
      transform={`rotate(${i * 30} 100 60)`}
    />
  ));

// ---------- Data for the CPT Code Book ----------
const CPT_CODES = [
  { code: "90791", description: "Psychiatric Diagnostic Evaluation", category: "Evaluation" },
  { code: "90792", description: "Psychiatric Diagnostic Evaluation with Medical Services", category: "Evaluation" },
  { code: "90834", description: "Psychotherapy, 45 minutes", category: "Individual Therapy" },
  { code: "90837", description: "Psychotherapy, 60 minutes", category: "Individual Therapy" },
  { code: "90834+90833", description: "Psychotherapy, 45 min + add-on", category: "Individual Therapy" },
  { code: "90837+90833", description: "Psychotherapy, 60 min + add-on", category: "Individual Therapy" },
  { code: "90847", description: "Family Psychotherapy (with patient present)", category: "Family Therapy" },
  { code: "90846", description: "Family Psychotherapy (without patient present)", category: "Family Therapy" },
  { code: "90853", description: "Group Psychotherapy (other than multifamily)", category: "Group Therapy" },
  { code: "90849", description: "Multiple-family group psychotherapy", category: "Group Therapy" },
  { code: "90834+99354", description: "Psychotherapy 45 min + prolonged service", category: "Extended Services" },
  { code: "90837+99354", description: "Psychotherapy 60 min + prolonged service", category: "Extended Services" },
  { code: "90839", description: "Psychotherapy for crisis; first 60 minutes", category: "Crisis Intervention" },
  { code: "90840", description: "Psychotherapy for crisis; each additional 30 minutes", category: "Crisis Intervention" },
  { code: "96116", description: "Neurobehavioral status exam", category: "Testing" },
  { code: "96121", description: "Neurobehavioral status exam with physician", category: "Testing" },
  { code: "99202", description: "Office/outpatient visit, new patient, 15-29 minutes", category: "Office Visits" },
  { code: "99203", description: "Office/outpatient visit, new patient, 30-44 minutes", category: "Office Visits" },
  { code: "99204", description: "Office/outpatient visit, new patient, 45-59 minutes", category: "Office Visits" },
  { code: "99205", description: "Office/outpatient visit, new patient, 60-74 minutes", category: "Office Visits" },
  { code: "99212", description: "Office/outpatient visit, established patient, 10-19 minutes", category: "Office Visits" },
  { code: "99213", description: "Office/outpatient visit, established patient, 20-29 minutes", category: "Office Visits" },
  { code: "99214", description: "Office/outpatient visit, established patient, 30-39 minutes", category: "Office Visits" },
  { code: "99215", description: "Office/outpatient visit, established patient, 40-54 minutes", category: "Office Visits" },
];
const CODES_PER_PAGE = 4; // Reduced for better page layout
const TOTAL_CPT_PAGES = Math.ceil(CPT_CODES.length / CODES_PER_PAGE);

// ---------- Timer CPT Billing Codes ----------
// These are time-based CPT codes for session billing
interface TimerCPTCode {
  code: string;
  name: string;
  minMinutes: number;
  maxMinutes: number | null;
  targetMinutes: number;
  color: string;
  description: string;
}

const TIMER_CPT_CODES: TimerCPTCode[] = [
  {
    code: '90832',
    name: '30-min Psychotherapy',
    minMinutes: 16,
    maxMinutes: 37,
    targetMinutes: 30,
    color: '#F59E0B', // Amber
    description: 'Billable range: 16-37 minutes'
  },
  {
    code: '90834',
    name: '45-min Psychotherapy',
    minMinutes: 38,
    maxMinutes: 52,
    targetMinutes: 45,
    color: '#10B981', // Green
    description: 'Billable range: 38-52 minutes'
  },
  {
    code: '90837',
    name: '60-min Psychotherapy',
    minMinutes: 53,
    maxMinutes: null,
    targetMinutes: 60,
    color: '#3B82F6', // Blue
    description: 'Billable range: 53+ minutes'
  },
];

// Helper: Detect current CPT code based on elapsed minutes
const detectCPTCode = (elapsedMinutes: number): TimerCPTCode | null => {
  return TIMER_CPT_CODES.find(cpt => {
    if (cpt.maxMinutes === null) {
      return elapsedMinutes >= cpt.minMinutes;
    }
    return elapsedMinutes >= cpt.minMinutes && elapsedMinutes <= cpt.maxMinutes;
  }) || null;
};

// Helper: Get next CPT threshold
const getNextCPT = (elapsedMinutes: number): TimerCPTCode | null => {
  return TIMER_CPT_CODES.find(cpt => cpt.minMinutes > elapsedMinutes) || null;
};

// Heights used to keep content above the absolute footer
const PANEL_OPEN_HEIGHT = 160;       // .h-40 ≈ 160px
const PANEL_CLOSED_OVERLAP = 30;     // only the handle peeks up when closed
const SAFE_GAP = 12;

// ---------- Main Component ----------
export default function Page({ params }: { params: { roomId: string } }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<Array<{id: number; text: string; sender: string}>>([]);
  const [chatInput, setChatInput] = useState("");

  // Details / AI
  const [notes, setNotes] = useState("");
  const [aiSummary, setAiSummary] = useState(
    "Click the button above to generate a session summary based on your notes."
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // WebRTC & Session State
  const [roomId, setRoomId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [therapistName, setTherapistName] = useState<string>("Loading...");
  const [clientName, setClientName] = useState<string>("Loading...");
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Flipbook
  const [cptCurrentPage, setCptCurrentPage] = useState(0);

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Share Link
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Timer
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerFastMode, setTimerFastMode] = useState(false); // 60x speed for testing
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  // Timer Settings
  const [showCPTIndicators, setShowCPTIndicators] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [timerVisibility, setTimerVisibility] = useState<'hidden' | 'therapist' | 'all'>('all');

  // Timer Reminders
  const [showReminder, setShowReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const dismissedRemindersRef = useRef<Set<string>>(new Set());

  // Timer CPT Detection - Calculate current and next CPT codes
  // Only recalculate when the minute value changes (not every millisecond)
  const currentMinute = useMemo(() => Math.floor(elapsedTime / 60000), [elapsedTime]);

  const currentCPT = useMemo(() => {
    return detectCPTCode(currentMinute);
  }, [currentMinute]);

  const nextCPT = useMemo(() => {
    return getNextCPT(currentMinute);
  }, [currentMinute]);

  // Refs
  const flipBookRef = useRef<any>(null);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);


  // ---------- Effects ----------
  useEffect(() => {
    // Fallback: if animation doesn't complete, skip it after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      console.log('⏰ Animation timeout - skipping to main UI');
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(fallbackTimeout);
  }, []);

  // Initialize session ONLY after loading completes
  useEffect(() => {
    if (!isLoading) {
      console.log('🚀 Loading complete, initializing session...');
      initializeSession();
    }
  }, [isLoading]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up...');
      webrtcManager.cleanup();
      socketManager.disconnect();
    };
  }, []);

  // Panels now overlay the video instead of pushing it
  // (removed padding adjustment effect)

  // Lift main content and PiP exactly above the footer height
  useEffect(() => {
    const mainEl = mainContentRef.current;
    const footerEl = footerRef.current;

    const HANDLE_EXPOSED = 30;
    const SAFE_GAP = 8;

    const updatePositions = () => {
      const footerHeight = footerEl
        ? Math.round(footerEl.getBoundingClientRect().height)
        : 160; // fallback to h-40

      const pad = isControlPanelOpen
        ? footerHeight + SAFE_GAP
        : HANDLE_EXPOSED + SAFE_GAP;

      if (mainEl) mainEl.style.paddingBottom = `${pad}px`;
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [isControlPanelOpen]);


  // timer logic with fast mode support (60x speed for testing)
  useEffect(() => {
    if (timerIsRunning) {
      startTimeRef.current = Date.now() - elapsedTime;
      const speedMultiplier = timerFastMode ? 60 : 1;

      timerIntervalRef.current = setInterval(() => {
        const realElapsed = Date.now() - startTimeRef.current;
        setElapsedTime(realElapsed * speedMultiplier);
      }, 100);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerIsRunning, timerFastMode]);

  // Log CPT changes for debugging
  useEffect(() => {
    if (currentMinute < 16) {
      console.log(`⏱️ CPT: Not billable (${currentMinute} min)`);
    } else if (currentCPT) {
      console.log(`✅ CPT: ${currentCPT.code} - ${currentCPT.name} (${currentMinute} min)`);
      if (nextCPT && currentCPT.maxMinutes) {
        const progress = ((currentMinute - currentCPT.minMinutes) / (currentCPT.maxMinutes - currentCPT.minMinutes)) * 100;
        console.log(`   ⏭️  Next: ${nextCPT.code} in ${currentCPT.maxMinutes - currentMinute + 1} min`);
        console.log(`   📊 Progress: ${Math.round(progress)}% through ${currentCPT.code} window`);
      } else {
        console.log(`   🏁 Final CPT code - no progress bar`);
      }
    }
  }, [currentCPT, currentMinute, nextCPT]);

  // Keyboard shortcut to toggle fast mode (F key)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only toggle if timer modal is open and F key is pressed
      if (e.key === 'f' || e.key === 'F') {
        if (activeModal === 'timer') {
          setTimerFastMode(prev => {
            const newMode = !prev;
            console.log(`⚡ Fast Mode ${newMode ? 'ENABLED' : 'DISABLED'} (${newMode ? '60x' : '1x'} speed)`);
            return newMode;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeModal]);

  // CPT Reminder System - Show reminders at 5 min and 2 min before next CPT threshold
  useEffect(() => {
    if (!remindersEnabled || !currentCPT || !nextCPT || !currentCPT.maxMinutes) return;

    const minutesToNext = currentCPT.maxMinutes - currentMinute + 1;
    const reminderKey = `${currentCPT.code}-${minutesToNext}`;

    // Show reminder at 5 min and 2 min before next CPT
    if ((minutesToNext === 5 || minutesToNext === 2) && !dismissedRemindersRef.current.has(reminderKey)) {
      setReminderMessage(`${minutesToNext} minutes until ${nextCPT.code} threshold`);
      setShowReminder(true);
      dismissedRemindersRef.current.add(reminderKey);

      console.log(`⏰ Reminder: ${minutesToNext} min until ${nextCPT.code}`);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setShowReminder(false);
      }, 10000);
    }
  }, [currentMinute, currentCPT, nextCPT, remindersEnabled]);

  // Reset dismissed reminders when timer resets
  useEffect(() => {
    if (elapsedTime === 0) {
      dismissedRemindersRef.current.clear();
      setShowReminder(false);
    }
  }, [elapsedTime]);

  // ---------- WebRTC Initialization ----------
  async function initializeSession() {
    try {
      // Get room ID from Next.js params
      const roomIdFromParams = params.roomId;

      // Validate room ID
      if (!roomIdFromParams || roomIdFromParams === '') {
        setSessionError('Invalid room ID. Please access the page with a valid room UUID.');
        console.error('Invalid room ID in params');
        return;
      }

      setRoomId(roomIdFromParams);
      console.log('🎯 Initializing session for room:', roomIdFromParams);

      // 1. Initialize local media (camera + microphone)
      console.log('🎥 Requesting camera/microphone access...');
      const stream = await webrtcManager.initLocalStream();
      console.log('✅ Got local stream:', stream.getTracks());
      setLocalStream(stream);

      // Set local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Local video ref set');
      }

      // 2. Connect Socket.io (synchronous - no await needed)
      // Note: Will use "Loading..." initially, but will be updated when session data loads
      socketManager.connect(therapistName);

      // 3. Subscribe to room (socket.id will be available after 'connect' event fires)
      socketManager.subscribeToRoom(roomIdFromParams, therapistName);

      // 4. Set up Socket.io event listeners
      setupSocketListeners();

      // 5. Request timer sync from backend
      console.log('⏱️ Requesting timer sync from backend...');
      socketManager.requestTimer();

      // 6. Set up WebRTC remote stream callback
      webrtcManager.onRemoteStream((peerId, stream) => {
        console.log('🎬 Remote stream added for peer:', peerId);
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });
      });

      // 7. Load session data from API
      console.log('📊 Loading session data from backend...');

      // Load therapist info
      const therapistResponse = await getUserInfo(ADMIN_CHECKSUM);
      if (therapistResponse.success && therapistResponse.data) {
        console.log('✅ Therapist data loaded:', therapistResponse.data);
        const therapist = therapistResponse.data;

        // Note: /GUD endpoint doesn't return displaynametitle
        // Database has: displaynamefirst="Therapist", displaynamelast="Jones", displaynametitle="Mr."
        // But the endpoint only returns first and last name
        const firstName = therapist.displaynamefirst || '';
        const lastName = therapist.displaynamelast || '';

        // Hardcode title for admin user (540609175) since backend doesn't return it
        const title = therapist.id === 1 ? 'Mr.' : '';

        const fullName = `${title} ${firstName} ${lastName}`.trim();
        setTherapistName(fullName || 'Therapist');
      } else {
        console.warn('⚠️ Therapist data not available');
        setTherapistName('Therapist');
      }

      // Load client info using room UUID
      const clientResponse = await getClientByUUID(ADMIN_CHECKSUM, roomIdFromParams);
      if (clientResponse.success && clientResponse.data && Array.isArray(clientResponse.data) && clientResponse.data.length > 0) {
        console.log('✅ Client data loaded:', clientResponse.data);
        const client = clientResponse.data[0];

        // Note: /GCID endpoint only returns {id, uuid}, not the name field!
        // Database has the name, but this endpoint doesn't select it
        // Workaround: Map known test room UUIDs to names
        let clientName = 'Client';
        if (roomIdFromParams === 'f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc') {
          clientName = 'John Test'; // From test database
        } else if (client.name) {
          clientName = client.name;
        } else {
          clientName = `Client ${client.id}`;
        }

        setClientName(clientName);
        setSessionData({ client, therapist: therapistResponse.data });
      } else {
        console.warn('⚠️ Client data not available');
        setClientName('Client');
      }

      setIsConnected(true);
      setSessionError(null); // Clear any previous errors
      console.log('✅ Session initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize session:', error);

      // User-friendly error messages based on error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          setSessionError('Camera/Microphone access denied. Please allow permissions in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          setSessionError('No camera or microphone found. Please connect a device and refresh.');
        } else if (error.name === 'NotReadableError') {
          setSessionError('Camera/Microphone is already in use by another application. Please close other apps and refresh.');
        } else {
          setSessionError(`Failed to start session: ${error.message}`);
        }
      } else {
        setSessionError('An unexpected error occurred. Please refresh the page and try again.');
      }
    }
  }

  function setupSocketListeners() {
    // Remove any existing listeners first (prevents duplicates in React Strict Mode)
    socketManager.removeAllListeners();

    // New user joined
    socketManager.onNewUser((data) => {
      console.log('New user joined:', data.socketId);
      webrtcManager.createOffer(data.socketId);
    });

    // User disconnected
    socketManager.onUserDisconnect((data) => {
      console.log('User disconnected:', data.socketId);
      webrtcManager.closePeerConnection(data.socketId);

      // Remove remote stream
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
    });

    // SDP offer/answer
    socketManager.onSDP(async (data) => {
      if (data.description.type === 'offer') {
        await webrtcManager.handleOffer(data.sender, data.description);
      } else if (data.description.type === 'answer') {
        await webrtcManager.handleAnswer(data.sender, data.description);
      }
    });

    // ICE candidates
    socketManager.onICECandidate(async (data) => {
      await webrtcManager.handleICECandidate(data.sender, data.candidate);
    });

    // Chat messages
    socketManager.onMessage((data) => {
      console.log('📨 Received message from:', data.userName, '- Message:', data.message);

      // Add message from other participants (sender: "them" for all received messages)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(), // Unique ID to prevent collisions
          text: data.message,
          sender: 'them', // All received messages are from "them" (the other participant)
        },
      ]);
    });

    // Timer sync
    socketManager.onTimer((data) => {
      console.log('⏱️ Timer update from backend:', data);
      // Calculate elapsed time from backend data
      const elapsed = (data.curTime - data.firstTime) * 1000; // Convert to milliseconds
      setElapsedTime(elapsed);
    });
  }

  // Sync local video ref with stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      // Only set srcObject if it's not already set to prevent video flashing
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  // ---------- Handlers ----------
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const messageText = chatInput.trim();
    console.log('💬 Sending message:', messageText);

    // Send via Socket.io with real therapist name
    socketManager.sendMessage(messageText, therapistName);

    // Add to local messages immediately (sender = "me" for current user)
    setMessages((m) => [...m, { id: Date.now() + Math.random(), text: messageText, sender: "me" }]);
    setChatInput("");
  };

  const handleToggleVideo = () => {
    const enabled = webrtcManager.toggleVideo();
    setIsVideoEnabled(enabled);
    console.log('🎥 Video toggled:', enabled ? 'ON' : 'OFF');
  };

  const handleToggleAudio = () => {
    const enabled = webrtcManager.toggleAudio();
    setIsAudioEnabled(enabled);
    console.log('🎤 Audio toggled:', enabled ? 'ON' : 'OFF');
  };

  const handleStartStopTimer = () => {
    // Toggle local state immediately for responsive UI
    setTimerIsRunning(!timerIsRunning);

    // Request current timer state from backend
    // This will trigger the onTimer listener which will sync all clients
    socketManager.requestTimer();

    console.log('⏱️ Timer toggled:', !timerIsRunning ? 'START' : 'STOP');
  };

  const handleResetTimer = () => {
    console.log('⏱️ Resetting timer to 0');

    // Reset via backend (this syncs all clients)
    socketManager.setTimer(0);

    // Update local state immediately
    setTimerIsRunning(false);
    setElapsedTime(0);
  };

  const handleCopySessionLink = async () => {
    // Production format: https://sessions.goldlink.live/{uuid}
    // Local format: http://localhost:3000/{uuid}
    const sessionLink = `${window.location.origin}/${roomId}`;

    try {
      await navigator.clipboard.writeText(sessionLink);
      console.log('📋 Session link copied to clipboard:', sessionLink);

      // Show success message
      setShowCopySuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowCopySuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback: show alert
      alert(`Session Link: ${sessionLink}`);
    }
  };

  const handleGenerateSummary = () => {
    if (!notes.trim()) {
      setAiSummary('<p class="text-yellow-400">Please write some notes first to generate a summary.</p>');
      return;
    }
    setIsGeneratingSummary(true);
    setTimeout(() => {
      const summary = `
        <p>Based on the session notes, the client, ${clientName}, discussed feelings of anxiety related to work deadlines and social situations. Progress was noted in applying breathing techniques discussed in the previous session.</p>
        <h4 class="font-bold text-gold mt-3 mb-1">Action Items:</h4>
        <ul>
          <li>- Continue practicing mindfulness exercises for 5 minutes daily.</li>
          <li>- Journal about one positive social interaction before the next session.</li>
          <li>- Consider exploring group therapy options for social anxiety.</li>
        </ul>
      `;
      setAiSummary(summary);
      setIsGeneratingSummary(false);
    }, 2500);
  };

  const handleNextCptPage = () => flipBookRef.current?.pageFlip().flipNext();
  const handlePrevCptPage = () => flipBookRef.current?.pageFlip().flipPrev();
  const handleFlip = (e: any) => setCptCurrentPage(e.data);

  const createBookPages = () => {
    const pages: React.ReactElement[] = [];

    // Front Cover - Thick hardcover with embossed styling
    pages.push(
      <div key="front-cover" className="book-page book-cover-front">
        <div className="cover-content">
          <div className="cover-spine"></div>
          <div className="cover-main">
            <div className="cover-inner">
              <h1 className="cover-title">CPT CODES</h1>
              <div className="cover-divider"></div>
              <p className="cover-subtitle">Reference Manual</p>
              <div className="cover-logo">
                <div className="logo-emboss">⚕</div>
              </div>
              <p className="cover-hint">Click to open</p>
            </div>
            <div className="cover-binding"></div>
          </div>
        </div>
      </div>
    );

    // Table of Contents page
    pages.push(
      <div key="toc" className="book-page book-page-right">
        <div className="page-content">
          <h2 className="page-title">Table of Contents</h2>
          <div className="toc-list">
            <div className="toc-item">
              <span className="toc-category">Evaluation Services</span>
              <span className="toc-dots"></span>
              <span className="toc-page">3</span>
            </div>
            <div className="toc-item">
              <span className="toc-category">Individual Therapy</span>
              <span className="toc-dots"></span>
              <span className="toc-page">4</span>
            </div>
            <div className="toc-item">
              <span className="toc-category">Family Therapy</span>
              <span className="toc-dots"></span>
              <span className="toc-page">5</span>
            </div>
            <div className="toc-item">
              <span className="toc-category">Group Therapy</span>
              <span className="toc-dots"></span>
              <span className="toc-page">6</span>
            </div>
            <div className="toc-item">
              <span className="toc-category">Crisis Intervention</span>
              <span className="toc-dots"></span>
              <span className="toc-page">7</span>
            </div>
            <div className="toc-item">
              <span className="toc-category">Office Visits</span>
              <span className="toc-dots"></span>
              <span className="toc-page">8</span>
            </div>
          </div>
        </div>
        <div className="page-number">2</div>
      </div>
    );

    // Content pages grouped by category
    const categorizedCodes = CPT_CODES.reduce((acc: any, code) => {
      if (!acc[code.category]) acc[code.category] = [];
      acc[code.category].push(code);
      return acc;
    }, {});

    let pageNum = 3;
    Object.entries(categorizedCodes).forEach(([category, codes]: [string, any]) => {
      pages.push(
        <div key={`category-${category}`} className="book-page book-page-left">
          <div className="page-content">
            <h2 className="page-title">{category}</h2>
            <div className="codes-grid">
              {(codes as any[]).map((item, index) => (
                <div key={index} className="code-entry">
                  <div className="code-number">{item.code}</div>
                  <div className="code-description">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="page-number">{pageNum}</div>
        </div>
      );
      pageNum++;
    });

    // Back Cover
    pages.push(
      <div key="back-cover" className="book-page book-cover-back">
        <div className="cover-content">
          <div className="cover-main back-cover-main">
            <div className="cover-inner">
              <h2 className="back-cover-title">Professional Reference</h2>
              <div className="back-cover-stats">
                <div className="stat-item">
                  <span className="stat-number">{CPT_CODES.length}</span>
                  <span className="stat-label">CPT Codes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{Object.keys(categorizedCodes).length}</span>
                  <span className="stat-label">Categories</span>
                </div>
              </div>
              <div className="back-cover-logo">⚕</div>
            </div>
          </div>
        </div>
      </div>
    );

    return pages;
  };

  // calendar helpers
  const renderCalendar = () => {
    const tempDate = new Date(calendarDate.getTime());
    tempDate.setDate(1);
    const firstDay = tempDate.getDay();
    const lastDate = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
    const today = new Date();

    const dates: React.ReactElement[] = [];
    for (let i = 0; i < firstDay; i++) dates.push(<div key={`empty-${i}`} />);
    for (let i = 1; i <= lastDate; i++) {
      const isToday =
        i === today.getDate() &&
        tempDate.getMonth() === today.getMonth() &&
        tempDate.getFullYear() === today.getFullYear();
      dates.push(
        <div key={i} className={`p-2 rounded-full cursor-pointer calendar-day ${isToday ? "today" : ""}`}>
          {i}
        </div>
      );
    }
    return dates;
  };
  const changeMonth = (offset: number) => {
    const newDate = new Date(calendarDate.getTime());
    newDate.setMonth(newDate.getMonth() + offset);
    setCalendarDate(newDate);
  };

  // time formatting
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const totalSeconds = Math.floor(elapsedTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6;

  if (isLoading) {
    return <GoldlinkLoader onLoadComplete={() => setIsLoading(false)} />;
  }

  return (
    <>
      <div className="relative w-full h-screen flex flex-col">
        {/* Main Video Area */}
        <main ref={mainContentRef} className="flex-1 min-h-0 flex p-4 md:p-8 transition-all duration-300">
          <div className="relative w-full h-full video-container-borderless rounded-lg overflow-hidden">
            {/* Error Display */}
            {sessionError ? (
              <div className="w-full h-full flex items-center justify-center bg-[#0A0F1E]">
                <div className="text-center px-8 max-w-2xl">
                  <div className="mb-4">
                    <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-400 mb-4 font-orbitron">Session Error</h2>
                  <p className="text-white/80 text-lg mb-6">{sessionError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gold text-panel-blue rounded-lg font-orbitron font-bold hover:opacity-90 transition-opacity"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            ) : remoteStreams.size > 0 ? (
              /* Remote Video (Client/Other Participant) */
              Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                <video
                  key={peerId}
                  autoPlay
                  playsInline
                  ref={(el) => {
                    // Only set srcObject if it's not already set to prevent video flashing
                    if (el && el.srcObject !== stream) {
                      el.srcObject = stream;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0A0F1E]">
                <div className="text-center text-white/60 font-orbitron">
                  <p className="text-xl mb-2">Waiting for other participants...</p>
                  {isConnected && <p className="text-sm">Connected to room: {roomId.substring(0, 8)}...</p>}
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur-sm text-white rounded-lg px-4 py-2 text-sm font-medium font-orbitron">
                {remoteStreams.size > 0 ? 'Participant Connected' : 'Waiting...'}
              </div>
              <div
                className={`bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-lg font-bold font-orbitron ${
                  elapsedTime > 0 ? "" : "hidden"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gold">{formatTime(elapsedTime)}</span>
                  {showCPTIndicators && currentCPT && (
                    <>
                      <span className="text-white/40">|</span>
                      <span
                        className="text-white text-base font-black px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: currentCPT.color
                        }}
                      >
                        {currentCPT.code}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Local Video (Self/Therapist) - Picture-in-Picture */}
            <div
              className={`absolute bottom-32 w-2/5 md:w-1/3 max-w-[200px] md:max-w-sm video-container-borderless rounded-lg overflow-hidden shadow-2xl z-40 right-4 md:right-6 ${
                isDetailsPanelOpen ? 'md:right-[400px]' : ''
              }`}
              style={{ transition: 'all 0.4s ease-in-out' }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-orbitron">
                You {!isVideoEnabled && '(Video Off)'}
              </div>
            </div>

          </div>
        </main>

        {/* Control Buttons - Glass with Stagger Animation */}
        <div className="control-buttons-container">
          {/* Video Toggle */}
          <button
            onClick={handleToggleVideo}
            className={`glass-control-button flex flex-col items-center justify-center gap-2 ${
              !isVideoEnabled ? 'bg-red-900/50' : ''
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isVideoEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              )}
            </svg>
            <span className="font-orbitron text-[10px] tracking-wider">{isVideoEnabled ? 'VIDEO' : 'OFF'}</span>
          </button>

          {/* Audio Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`glass-control-button flex flex-col items-center justify-center gap-2 ${
              !isAudioEnabled ? 'bg-red-900/50' : ''
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isAudioEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              )}
            </svg>
            <span className="font-orbitron text-[10px] tracking-wider">{isAudioEnabled ? 'MIC' : 'OFF'}</span>
          </button>

          {/* Chat */}
          <button
            onClick={() => setIsChatPanelOpen(prev => !prev)}
            className="glass-control-button flex flex-col items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="font-orbitron text-[10px] tracking-wider">CHAT</span>
          </button>

          {/* Timer */}
          <button
            onClick={() => setActiveModal("timer")}
            className="glass-control-button flex flex-col items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-orbitron text-[10px] tracking-wider">TIMER</span>
          </button>

          {/* Details */}
          <button
            onClick={() => setIsDetailsPanelOpen(prev => !prev)}
            className="glass-control-button flex flex-col items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-orbitron text-[10px] tracking-wider">DETAILS</span>
          </button>

          {/* End Call */}
          <button className="glass-control-button end-call flex flex-col items-center justify-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 8l2-2m0 0l2 2m-2-2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8" />
            </svg>
            <span className="font-orbitron text-[10px] tracking-wider">END</span>
          </button>
        </div>
      </div>

      {/* Side Panels */}
      <aside
        id="chat-panel"
        className={`side-panel frosted-glass p-4 text-white flex flex-col ${isChatPanelOpen ? "panel-open" : ""}`}
      >
        <div className="flex justify-between items-center mb-4 p-2">
          <h2 className="text-2xl font-bold font-orbitron text-gold">Secure Chat</h2>
          <button
            onClick={() => setIsChatPanelOpen(false)}
            className="w-8 h-8 bg-red-600/50 text-white rounded-full font-bold text-sm z-10 border-2 border-red-400 flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            X
          </button>
        </div>
        <div className="flex-grow space-y-4 overflow-y-auto p-2 flex flex-col">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.sender === "me" ? "message-outgoing" : "message-incoming"}`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="p-2 mt-2">
          <div className="flex items-center bg-gray-900 border border-gray-600 rounded-lg p-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none"
              placeholder="Type a message..."
            />
            <button onClick={handleSendMessage} className="ml-2 p-2 rounded-md bg-gold text-panel-blue hover:opacity-90">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <aside
        id="details-panel"
        className={`side-panel frosted-glass p-6 text-white flex flex-col overflow-y-auto ${isDetailsPanelOpen ? "panel-open" : ""}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-orbitron text-gold">Session Details</h2>
          <button
            onClick={() => setIsDetailsPanelOpen(false)}
            className="w-8 h-8 bg-red-600/50 text-white rounded-full font-bold text-sm z-10 border-2 border-red-400 flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            X
          </button>
        </div>
        <div>
          <div className="space-y-4 text-base">
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Patient</p>
              <p className="font-semibold text-white">{clientName}</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Therapist</p>
              <p className="font-semibold text-white">{therapistName}</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Room ID</p>
              <p className="font-semibold text-white font-mono text-sm">{roomId.substring(0, 8)}...</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Date</p>
              <p className="font-semibold text-white">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Status</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-800/50 text-green-300 border border-green-500">
                In Progress
              </span>
            </div>
          </div>
        </div>
        <div className="flex-grow flex flex-col mt-4">
          <h2 className="text-2xl font-bold font-orbitron text-gold mb-4">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-grow w-full rounded-lg border-gray-600 bg-gray-900 focus:border-gold focus:ring-gold text-base placeholder:text-gray-500 p-4 min-h-[150px]"
            placeholder="Begin typing session notes here..."
          />
          <button className="mt-4 w-full h-12 bg-gold text-panel-blue text-base font-bold rounded-lg hover:opacity-90 transition-opacity">
            Save Notes
          </button>
        </div>
        <div className="mt-6 border-t border-gray-700 pt-4">
          <h3 className="text-xl font-bold font-orbitron text-gold mb-4">AI Assistant</h3>
          <button
            onClick={handleGenerateSummary}
            className="w-full h-12 bg-light-blue text-panel-blue text-base font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.093c.488.082.95.228 1.38.423a.75.75 0 01.422 1.045l-.837 1.45a.75.75 0 01-1.045.422A4.92 4.92 0 0010.5 7.513V6A1.5 15 0 0110 3.5zM5.12 7.973a.75.75 0 011.045-.422c.43.195.892.34 1.38.423v.093a1.5 15 0 01-3 0v-.093a.75.75 0 01-.575-1.045z" />
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 100 16 8 8 0 000-16zM4.75 10a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.25 3.25a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75z"
                clipRule="evenodd"
              />
            </svg>
            Generate Summary & Action Items
          </button>
          <div className="mt-4 p-4 bg-gray-900 rounded-lg min-h-[100px] text-gray-300">
            {isGeneratingSummary ? (
              <div className="flex items-center justify-center space-x-2 h-full">
                <div className="loader-dot w-3 h-3 bg-light-blue rounded-full" />
                <div className="loader-dot w-3 h-3 bg-light-blue rounded-full" />
                <div className="loader-dot w-3 h-3 bg-light-blue rounded-full" />
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: aiSummary }} />
            )}
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-6 border-t border-gray-700 pt-6 pb-4">
          <h3 className="text-xl font-bold font-orbitron text-gold mb-6">Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* CPT Codes */}
            <button
              onClick={() => setActiveModal("book")}
              className="glass-control-button flex flex-col items-center justify-center gap-2"
            >
              <BookOpen className="w-6 h-6" />
              <span className="font-orbitron text-[10px] tracking-wider">CPT</span>
            </button>

            {/* Calendar */}
            <button
              onClick={() => setActiveModal("calendar")}
              className="glass-control-button flex flex-col items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-orbitron text-[10px] tracking-wider">CAL</span>
            </button>

            {/* Share */}
            <button
              onClick={() => setActiveModal("share")}
              className="glass-control-button flex flex-col items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="font-orbitron text-[10px] tracking-wider">SHARE</span>
            </button>

            {/* Reload */}
            <button
              onClick={() => window.location.reload()}
              className="glass-control-button flex flex-col items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
              </svg>
              <span className="font-orbitron text-[10px] tracking-wider">RELOAD</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Modals */}
      <div
        id="book-modal"
        className={`modal-container fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4 ${
          activeModal === "book" ? "" : "modal-hidden"
        }`}
        onClick={(e) => (e.target as HTMLElement).id === "book-modal" && setActiveModal(null)}
      >
        <div className="modal-content-box frosted-glass w-full max-w-4xl h-5/6 flex flex-col p-6 relative">
          <button onClick={() => setActiveModal(null)} className="modal-close-btn">
            X
          </button>
          <div className="flex-1 flex items-center justify-center">
            <div className="book-container">
              <HTMLFlipBook
                ref={flipBookRef}
                /* required core sizing */
                width={400}
                height={500}
                size="fixed"
                minWidth={315}
                maxWidth={1200}
                minHeight={300}
                maxHeight={1600}
                /* required behavior flags */
                clickEventForward
                useMouseEvents
                swipeDistance={30}
                showPageCorners
                disableFlipByClick={false}
                /* visuals/behavior */
                startPage={0}
                startZIndex={0}
                drawShadow
                flippingTime={800}
                usePortrait={false}
                autoSize
                maxShadowOpacity={0.3}
                showCover
                mobileScrollSupport={false}
                /* types say style is required */
                style={{}}
                /* events */
                onFlip={handleFlip}
                onInit={() => console.log("[v0] HTMLFlipBook initialized")}
                className="flip-book"
              >
                {createBookPages()}
              </HTMLFlipBook>
            </div>
          </div>
          <div className="flex justify-center items-center mt-4 space-x-8">
            <div className="flex items-center space-x-8">
              <button onClick={handlePrevCptPage} className="panel-button px-4 py-2 rounded-lg">
                &lt; Prev
              </button>
              <span className="font-orbitron text-lg text-gold">
                {cptCurrentPage === 0
                  ? "Cover"
                  : cptCurrentPage === TOTAL_CPT_PAGES + 1
                  ? "Back Cover"
                  : `Page ${cptCurrentPage} / ${TOTAL_CPT_PAGES + 1}`}
              </span>
              <button onClick={handleNextCptPage} className="panel-button px-4 py-2 rounded-lg">
                Next &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      <div
        id="calendar-modal"
        className={`modal-container fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4 ${
          activeModal === "calendar" ? "" : "modal-hidden"
        }`}
        onClick={(e) => (e.target as HTMLElement).id === "calendar-modal" && setActiveModal(null)}
      >
        <div className="modal-content-box frosted-glass w-full max-w-md p-6">
          <button onClick={() => setActiveModal(null)} className="modal-close-btn">
            X
          </button>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.1)]">
              &lt;
            </button>
            <h2 className="text-xl font-bold font-orbitron text-gold">
              {calendarDate.toLocaleString("default", { month: "long" })} {calendarDate.getFullYear()}
            </h2>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-[rgba(255,255,255,0.1)]">
              &gt;
            </button>
          </div>
          <div className="calendar-grid text-center font-bold text-gray-400 mb-2">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          <div className="calendar-grid text-center">{renderCalendar()}</div>
        </div>
      </div>

      {/* Stopwatch Timer Modal */}
      <div
        id="timer-modal"
        className={`modal-container fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4 ${
          activeModal === "timer" ? "" : "modal-hidden"
        }`}
        onClick={(e) => (e.target as HTMLElement).id === "timer-modal" && setActiveModal(null)}
      >
        <div className="stopwatch-container">
          <button onClick={() => setActiveModal(null)} className="modal-close-btn">
            X
          </button>

          {/* Fast Mode Indicator */}
          {timerFastMode && (
            <div className="timer-fast-mode-indicator">
              <span className="text-amber-400 font-orbitron font-bold text-xs">
                ⚡ FAST MODE (60x)
              </span>
              <span className="text-white/60 text-xs ml-2">Press F to disable</span>
            </div>
          )}

          <div className="stopwatch-body frosted-glass">
            <div className={`stopwatch-face ${timerIsRunning ? 'running' : ''}`}>
              <svg viewBox="0 0 200 200">
                {/* CPT colored ring around clock */}
                {showCPTIndicators && currentCPT && (
                  <circle
                    cx="100"
                    cy="100"
                    r="98"
                    fill="none"
                    stroke={currentCPT.color}
                    strokeWidth="4"
                    opacity="0.4"
                    className="cpt-ring"
                  />
                )}

                <g>{renderDialMarks()}</g>
                <circle cx="100" cy="60" r="25" fill="rgba(31, 41, 55, 0.5)" stroke="#9ca3af" strokeWidth="1" />
                <g>{renderSubDialMarks()}</g>
                <text id="hour-display" x="100" y="145" textAnchor="middle">
                  {String(seconds).padStart(2, "0")}
                </text>
                <g id="minute-hand">
                  <rect x="99" y="35" width="2" height="25" fill="white" rx="1" transform={`rotate(${minuteDeg} 100 60)`} />
                </g>
                <g id="second-hand" className="hand" style={{ transform: `rotate(${secondDeg}deg)` }}>
                  <polygon points="100,20 102,110 98,110" fill="#FBBF24" />
                  <circle cx="100" cy="100" r="4" fill="#FBBF24" />
                </g>
              </svg>
            </div>
          </div>
          <button
            id="start-stop-crown"
            className={timerIsRunning ? "running" : ""}
            onMouseDown={(e) => {
              console.log('Crown pressed');
              e.currentTarget.classList.add('pressed');
            }}
            onMouseUp={(e) => {
              console.log('Crown released');
              e.currentTarget.classList.remove('pressed');
            }}
            onMouseLeave={(e) => {
              console.log('Crown mouse leave');
              e.currentTarget.classList.remove('pressed');
            }}
            onClick={handleStartStopTimer}
          />
          <button
            id="reset-button"
            onMouseDown={(e) => {
              console.log('Side button pressed');
              e.currentTarget.classList.add('pressed');
            }}
            onMouseUp={(e) => {
              console.log('Side button released');
              e.currentTarget.classList.remove('pressed');
            }}
            onMouseLeave={(e) => {
              console.log('Side button mouse leave');
              e.currentTarget.classList.remove('pressed');
            }}
            onClick={handleResetTimer}
          />

          {/* CPT Indicator Badge */}
          {showCPTIndicators && (
            <div className="cpt-indicator-container">
              {currentMinute < 16 ? (
              <div className="cpt-not-billable">
                <span className="text-red-400 text-base font-orbitron font-semibold">
                  ⏱️ Not billable (under 16 min)
                </span>
              </div>
            ) : currentCPT ? (
              <div
                className="cpt-active-badge"
                style={{ borderColor: currentCPT.color }}
              >
                <div
                  className="cpt-code-large font-orbitron font-bold"
                  style={{ color: currentCPT.color }}
                >
                  {currentCPT.code}
                </div>
                <div className="text-white text-base mt-1 font-medium">
                  {currentCPT.name}
                </div>
                <div className="text-white/70 text-sm mt-0.5">
                  {currentCPT.description}
                </div>

                {/* Progress Bar to Next CPT */}
                {nextCPT && currentCPT.maxMinutes && (
                  <div className="cpt-progress-container">
                    <div className="cpt-progress-label">
                      <span className="text-sm text-white/70 font-medium">Progress to {nextCPT.code}</span>
                      <span className="text-sm text-amber-400 font-semibold">
                        {currentCPT.maxMinutes - currentMinute + 1} min remaining
                      </span>
                    </div>
                    <div className="cpt-progress-bar">
                      <div
                        className="cpt-progress-fill"
                        style={{
                          width: `${((currentMinute - currentCPT.minMinutes) / (currentCPT.maxMinutes - currentCPT.minMinutes)) * 100}%`,
                          background: `linear-gradient(90deg, ${currentCPT.color}, ${nextCPT.color})`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            </div>
          )}

          {/* Timer Settings Section */}
          <div className="timer-settings-container">
            <div className="frosted-glass rounded-lg p-4 border border-gold/20">
              <h3 className="font-orbitron text-gold text-sm mb-3 font-bold">Timer Settings</h3>

              {/* Show CPT Indicators */}
              <label className="flex items-center gap-3 mb-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showCPTIndicators}
                  onChange={(e) => setShowCPTIndicators(e.target.checked)}
                  className="w-4 h-4 accent-gold cursor-pointer"
                />
                <span className="text-white text-xs group-hover:text-gold transition-colors">
                  Show CPT Code Indicators
                </span>
              </label>

              {/* Enable Reminders */}
              <label className="flex items-center gap-3 mb-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  className="w-4 h-4 accent-gold cursor-pointer"
                />
                <span className="text-white text-xs group-hover:text-gold transition-colors">
                  Enable Time Reminders (5 & 2 min)
                </span>
              </label>

              {/* Timer Visibility */}
              <div>
                <label className="text-white text-xs mb-2 block font-orbitron">
                  Timer Visibility
                </label>
                <select
                  value={timerVisibility}
                  onChange={(e) => setTimerVisibility(e.target.value as 'hidden' | 'therapist' | 'all')}
                  className="bg-black/60 border border-gold/30 text-white text-xs rounded px-3 py-2 w-full font-orbitron cursor-pointer hover:border-gold/50 transition-colors"
                >
                  <option value="hidden">Hidden from All</option>
                  <option value="therapist">Therapist Only</option>
                  <option value="all">Visible to Everyone</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Session Link Modal */}
      <div
        id="share-modal"
        className={`modal-container fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4 ${
          activeModal === "share" ? "" : "modal-hidden"
        }`}
        onClick={(e) => (e.target as HTMLElement).id === "share-modal" && setActiveModal(null)}
      >
        <div className="modal-content-box frosted-glass w-full max-w-lg p-8">
          <button onClick={() => setActiveModal(null)} className="modal-close-btn">
            X
          </button>

          <h2 className="text-2xl font-bold font-orbitron text-gold mb-6 text-center">
            Share Session Link
          </h2>

          <p className="text-white/80 text-center mb-4 font-orbitron text-sm">
            Share this link with your client to invite them to the session
          </p>

          {/* Session Link Display */}
          <div className="bg-black/40 border border-gold/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-white/90 font-mono text-sm break-all flex-1">
                {window.location.origin}/{roomId}
              </p>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopySessionLink}
            className="w-full panel-button flex items-center justify-center gap-3 py-4 rounded-lg mb-4 hover:bg-gold/10 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-orbitron text-base">
              {showCopySuccess ? 'Link Copied!' : 'Copy Link to Clipboard'}
            </span>
          </button>

          {/* Success Message */}
          {showCopySuccess && (
            <div className="bg-gold/20 border border-gold/50 rounded-lg p-3 text-center">
              <p className="text-gold font-orbitron text-sm">
                ✓ Link copied successfully! Share it with your client.
              </p>
            </div>
          )}

          {/* Optional: Email Invitation (Placeholder for future) */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/60 text-center text-xs font-orbitron">
              Email invitations coming soon
            </p>
          </div>
        </div>
      </div>

      {/* CPT Reminder Toast */}
      {showReminder && (
        <div
          className="fixed top-20 right-4 z-50 cpt-reminder-toast"
          role="alert"
          aria-live="polite"
        >
          <div className="frosted-glass border-2 border-amber-400 rounded-lg px-6 py-4 flex items-center gap-3 shadow-2xl">
            <span className="text-3xl">⏰</span>
            <div>
              <div className="font-orbitron text-white text-sm font-bold">
                Session Reminder
              </div>
              <div className="text-white/90 text-xs mt-0.5">
                {reminderMessage}
              </div>
            </div>
            <button
              onClick={() => setShowReminder(false)}
              className="text-white/60 hover:text-white ml-2 text-xl font-bold transition-colors"
              aria-label="Dismiss reminder"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
