"use client";

import { useState, useEffect, useRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { BookOpen } from "lucide-react";
import type React from "react";
import dynamic from "next/dynamic";
import GoldlinkLoader from "@/components/GoldlinkLoader";

 const GoldlinkCinematicThree = dynamic(() => import("@/components/GoldlinkCinematicThree"), { ssr: false });


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

// Heights used to keep content above the absolute footer
const PANEL_OPEN_HEIGHT = 160;       // .h-40 ≈ 160px
const PANEL_CLOSED_OVERLAP = 30;     // only the handle peeks up when closed
const SAFE_GAP = 12;

// ---------- Main Component ----------
export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Chat
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi Dr. Sharma, just wanted to confirm our next session.", sender: "client" },
    {
      id: 2,
      text: "Hi Emily! Yes, we are confirmed for next Tuesday at 2 PM. Looking forward to it.",
      sender: "therapist",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Details / AI
  const [notes, setNotes] = useState("");
  const [aiSummary, setAiSummary] = useState(
    "Click the button above to generate a session summary based on your notes."
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Flipbook
  const [cptCurrentPage, setCptCurrentPage] = useState(0);

  // Calendar
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Timer
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);

  // Refs
  const flipBookRef = useRef<any>(null);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null)


  // ---------- Effects ----------
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 7000); // Fallback timeout for Three.js animation (5s + buffer)
    return () => clearTimeout(t);
  }, []);

  // left/right padding when side panels open
  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;
    const panelWidth = 380;
    const mainPadding = 32;
    mainEl.style.paddingLeft = isChatPanelOpen ? `${panelWidth + mainPadding}px` : `${mainPadding}px`;
    mainEl.style.paddingRight = isDetailsPanelOpen ? `${panelWidth + mainPadding}px` : `${mainPadding}px`;
  }, [isChatPanelOpen, isDetailsPanelOpen]);

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


  // timer logic
  useEffect(() => {
    if (timerIsRunning) {
      startTimeRef.current = Date.now() - elapsedTime;
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTimeRef.current);
      }, 100);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerIsRunning]);

  // ---------- Handlers ----------
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), text: chatInput.trim(), sender: "therapist" }]);
    setChatInput("");
  };

  const handleGenerateSummary = () => {
    if (!notes.trim()) {
      setAiSummary('<p class="text-yellow-400">Please write some notes first to generate a summary.</p>');
      return;
    }
    setIsGeneratingSummary(true);
    setTimeout(() => {
      const summary = `
        <p>Based on the session notes, the client, Emily, discussed feelings of anxiety related to work deadlines and social situations. Progress was noted in applying breathing techniques discussed in the previous session.</p>
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
          <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border-2 border-[rgba(251,191,36,0.2)]">
            <img
              src="https://placehold.co/1600x900/0A0F1E/FBBF24?text=Client+Video+Feed"
              className="w-full h-full object-cover"
              alt="Client Video"
            />

            <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
              <div className="bg-black/60 backdrop-blur-sm text-white rounded-lg px-4 py-2 text-sm font-medium font-orbitron">
                Client: Emily Carter
              </div>
              <div
                className={`bg-black/60 backdrop-blur-sm text-gold rounded-lg px-4 py-2 text-lg font-bold font-orbitron ${
                  elapsedTime > 0 ? "" : "hidden"
                }`}
              >
                {formatTime(elapsedTime)}
              </div>
            </div>

            {/* Therapist PiP (now lifted via ref instead of fixed class) */}
         <div
          className="absolute bottom-5 right-4 w-1/4 max-w-xs border-2 border-gold rounded-lg overflow-hidden"
        >
          <img
            src="https://placehold.co/400x300/0A0F1E/FBBF24?text=Therapist"
            className="w-full h-full object-cover"
            alt="Therapist Video"
          />
      </div>

          </div>
        </main>

        {/* Control Panel */}
        <footer 
         ref={footerRef}
          className={`control-panel h-40 shrink-0 ${isControlPanelOpen ? "panel-open" : ""}`}>
          <div
            onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
            className="panel-handle-tab"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
          </div>

          <div className="control-panel-body h-full">
            <div className="max-w-7xl mx-auto h-full grid grid-cols-4 md:grid-cols-8 gap-2 items-center justify-items-center px-4 pt-4">
              <button
                onClick={() => setIsChatPanelOpen(true)}
                className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg"
              >
                <svg className="w-8 h-8 mb-1 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">CHAT</span>
              </button>

              <button
                onClick={() => setActiveModal("timer")}
                className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg"
              >
                <svg className="w-8 h-8 mb-1 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">TIMER</span>
              </button>

              <button
                onClick={() => setActiveModal("book")}
                className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg"
              >
                <BookOpen className="w-8 h-8 mb-1 text-light-blue" />
                <span className="font-orbitron text-xs md:text-sm">CPT CODES</span>
              </button>

              <button
                onClick={() => setIsDetailsPanelOpen(true)}
                className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg"
              >
                <svg className="w-8 h-8 mb-1 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">DETAILS</span>
              </button>

              <button
                onClick={() => setActiveModal("calendar")}
                className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg"
              >
                <svg className="w-8 h-8 mb-1 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">CALENDAR</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg"
              >
                <svg className="w-8 h-8 mb-1 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">REFRESH</span>
              </button>

              <button className="panel-button flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg">
                <svg className="w-8 h-8 mb-1 text-light-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-5M3 4h5v5M17 4h5v5M3 20h5v-5" />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">WAITING</span>
              </button>

              <button className="panel-button end-call flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-lg">
                <svg className="w-8 h-8 mb-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M16 8l2-2m0 0l2 2m-2-2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8" />
                </svg>
                <span className="font-orbitron text-xs md:text-sm">END</span>
              </button>
            </div>
          </div>
        </footer>
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
              className={`message-bubble ${msg.sender === "therapist" ? "message-outgoing" : "message-incoming"}`}
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
              <p className="font-semibold text-white">Emily Carter</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Date</p>
              <p className="font-semibold text-white">September 18, 2025</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Time</p>
              <p className="font-semibold text-white">5:30 PM</p>
            </div>
            <div className="detail-item flex justify-between items-center py-3">
              <p className="text-gray-400 font-medium">Duration</p>
              <p className="font-semibold text-white">60 minutes</p>
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
          <div className="stopwatch-body frosted-glass">
            <div className="stopwatch-face">
              <svg viewBox="0 0 200 200">
                <g>{renderDialMarks()}</g>
                <circle cx="100" cy="60" r="25" fill="rgba(31, 41, 55, 0.5)" stroke="#9ca3af" strokeWidth="1" />
                <g>{renderSubDialMarks()}</g>
                <text id="hour-display" x="100" y="145" textAnchor="middle">
                  {String(seconds).padStart(2, "0")}
                </text>
                <g id="minute-hand" className="hand" style={{ transform: `rotate(${minuteDeg}deg)` }}>
                  <rect x="99" y="35" width="2" height="25" fill="white" rx="1" />
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
            onClick={() => setTimerIsRunning(!timerIsRunning)}
          />
          <button
            id="reset-button"
            onClick={() => {
              setTimerIsRunning(false);
              setElapsedTime(0);
            }}
          />
        </div>
      </div>
    </>
  );
}
