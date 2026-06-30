import { useState, useRef, useCallback, useEffect } from "react";
import { Settings } from "lucide-react";
import QRScanner from "./QRScanner";
import { getCompanyName, getWelcomeMessage, getAnnouncement, getAnnouncementEnabled, getAnnouncementInterval } from "@/lib/storage";

// Screensaver drift: returns a safe inset position (% from each edge)
function randomDriftTarget() {
  return {
    x: 15 + Math.random() * 50, // 15–65% from left
    y: 15 + Math.random() * 55, // 15–70% from top
  };
}

const ACCENT_COLORS = [
  { text: "#22d3ee", glow: "rgba(34,211,238,0.18)", border: "rgba(34,211,238,0.25)" }, // cyan
  { text: "#818cf8", glow: "rgba(129,140,248,0.18)", border: "rgba(129,140,248,0.25)" }, // indigo
  { text: "#34d399", glow: "rgba(52,211,153,0.18)", border: "rgba(52,211,153,0.25)" }, // emerald
  { text: "#fb7185", glow: "rgba(251,113,133,0.18)", border: "rgba(251,113,133,0.25)" }, // rose
];

interface KioskModeProps {
  onOpenPin: () => void;
}

export default function KioskMode({ onOpenPin }: KioskModeProps) {
  const [showHint, setShowHint] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sleeping, setSleeping] = useState(false);

  // Screensaver state
  const [driftPos, setDriftPos] = useState({ x: 35, y: 30 });
  const [accentIdx, setAccentIdx] = useState(0);
  const driftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accentIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load company identity from storage (re-read on each mount so Settings changes are picked up)
  const [companyName, setCompanyNameState] = useState(getCompanyName);
  const [welcomeMessage, setWelcomeMessageState] = useState(getWelcomeMessage);

  // Announcement state
  const [announcement, setAnnouncementState] = useState(getAnnouncement);
  const [announcementEnabled, setAnnouncementEnabledState] = useState(getAnnouncementEnabled);
  const [announcementInterval, setAnnouncementIntervalState] = useState(getAnnouncementInterval);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementKey, setAnnouncementKey] = useState(0); // force re-animation
  const announcementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const announcementHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh kiosk text whenever settings are saved or focus returns
  useEffect(() => {
    function refresh() {
      setCompanyNameState(getCompanyName());
      setWelcomeMessageState(getWelcomeMessage());
      setAnnouncementState(getAnnouncement());
      setAnnouncementEnabledState(getAnnouncementEnabled());
      setAnnouncementIntervalState(getAnnouncementInterval());
    }
    function triggerPreview(e: Event) {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      if (!msg) return;
      const scrollDuration = Math.min(30, Math.max(10, Math.ceil(msg.length * 0.12)));
      setAnnouncementState(msg);
      setAnnouncementKey((k) => k + 1);
      setShowAnnouncement(true);
      if (announcementHideRef.current) clearTimeout(announcementHideRef.current);
      announcementHideRef.current = setTimeout(() => setShowAnnouncement(false), (scrollDuration + 2) * 1000);
    }
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("kiosk-identity-changed", refresh);
    window.addEventListener("kiosk-announcement-preview", triggerPreview);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("kiosk-identity-changed", refresh);
      window.removeEventListener("kiosk-announcement-preview", triggerPreview);
    };
  }, []);

  // Announcement interval — fires every N minutes when not sleeping
  useEffect(() => {
    if (announcementTimerRef.current) clearInterval(announcementTimerRef.current);
    if (!announcementEnabled || !announcement.trim()) return;

    const intervalMs = announcementInterval * 60 * 1000;
    announcementTimerRef.current = setInterval(() => {
      if (sleeping) return; // skip if kiosk is sleeping
      // Calculate scroll duration based on text length (min 10s, max 30s)
      const scrollDuration = Math.min(30, Math.max(10, Math.ceil(announcement.length * 0.12)));
      setAnnouncementKey((k) => k + 1);
      setShowAnnouncement(true);
      if (announcementHideRef.current) clearTimeout(announcementHideRef.current);
      announcementHideRef.current = setTimeout(() => setShowAnnouncement(false), (scrollDuration + 2) * 1000);
    }, intervalMs);

    return () => {
      if (announcementTimerRef.current) clearInterval(announcementTimerRef.current);
      if (announcementHideRef.current) clearTimeout(announcementHideRef.current);
    };
  }, [announcementEnabled, announcement, announcementInterval, sleeping]);

  const HOLD_MS = 1500;
  const SLEEP_MS = 60_000;

  const resetInactivity = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => setSleeping(true), SLEEP_MS);
  }, []);

  const wakeUp = useCallback(() => {
    setSleeping(false);
    resetInactivity();
    // Stop screensaver intervals
    if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
    if (accentIntervalRef.current) clearInterval(accentIntervalRef.current);
  }, [resetInactivity]);

  // Start screensaver animations when sleeping
  useEffect(() => {
    if (!sleeping) return;
    // Drift every 8s
    setDriftPos(randomDriftTarget());
    driftIntervalRef.current = setInterval(() => setDriftPos(randomDriftTarget()), 8000);
    // Accent color cycle every 12s
    accentIntervalRef.current = setInterval(() => setAccentIdx((i) => (i + 1) % ACCENT_COLORS.length), 12000);
    return () => {
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
      if (accentIntervalRef.current) clearInterval(accentIntervalRef.current);
    };
  }, [sleeping]);

  const accent = ACCENT_COLORS[accentIdx];

  useEffect(() => {
    resetInactivity();
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current); };
  }, [resetInactivity]);

  const startHold = useCallback(() => {
    setHoldProgress(0);
    const startTime = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setHoldProgress(Math.min(100, (elapsed / HOLD_MS) * 100));
    }, 16);
    holdTimerRef.current = setTimeout(() => {
      clearInterval(holdIntervalRef.current!);
      setHoldProgress(0);
      onOpenPin();
    }, HOLD_MS);
  }, [onOpenPin]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setHoldProgress(0);
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  // Greeting based on hour
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a2e 100%)" }}
      onMouseMove={resetInactivity}
      onKeyDown={resetInactivity}
      onTouchStart={sleeping ? wakeUp : resetInactivity}
      onClick={sleeping ? wakeUp : undefined}
      tabIndex={-1}
    >
      {/* Screensaver overlay */}
      {sleeping && (
        <div
          className="absolute inset-0 z-50 cursor-pointer overflow-hidden"
          style={{ background: "#020817" }}
          onClick={wakeUp}
        >
          {/* Slow ambient pulse in background */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)`,
              animation: "ssAmbientPulse 6s ease-in-out infinite",
              transition: "background 3s ease",
            }}
          />

          {/* Drifting content block — positioned absolutely to prevent burn-in */}
          <div
            className="absolute select-none"
            style={{
              left: `${driftPos.x}%`,
              top: `${driftPos.y}%`,
              transform: "translate(-50%, -50%)",
              transition: "left 7s cubic-bezier(0.45,0,0.55,1), top 7s cubic-bezier(0.45,0,0.55,1)",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              {/* Pulsing logo */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: accent.glow,
                  border: `1px solid ${accent.border}`,
                  animation: "ssLogoPulse 3s ease-in-out infinite",
                  transition: "background 3s ease, border-color 3s ease",
                }}
              >
                <span className="text-4xl" style={{ animation: "ssLogoRotate 12s linear infinite" }}>🏢</span>
              </div>

              {/* Company name — shimmer */}
              <p
                className="text-sm font-semibold tracking-widest uppercase"
                style={{
                  color: accent.text,
                  opacity: 0.7,
                  animation: "ssFadeBreath 5s ease-in-out infinite",
                  transition: "color 3s ease",
                  textShadow: `0 0 20px ${accent.glow}`,
                }}
              >
                {companyName}
              </p>

              {/* Big clock */}
              <p
                className="font-mono font-bold tracking-widest"
                style={{
                  color: accent.text,
                  fontSize: "clamp(2.5rem, 6vw, 4rem)",
                  textShadow: `0 0 40px ${accent.glow}, 0 0 80px ${accent.glow}`,
                  transition: "color 3s ease, text-shadow 3s ease",
                  animation: "ssClockPulse 2s ease-in-out infinite",
                }}
              >
                {timeStr}
              </p>

              {/* Date */}
              <p
                className="text-slate-500 text-sm font-medium"
                style={{ animation: "ssFadeBreath 5s ease-in-out infinite 1s" }}
              >
                {dateStr}
              </p>

              {/* Tap to wake */}
              <div
                className="mt-3 flex items-center gap-2 text-xs font-medium"
                style={{
                  color: "#475569",
                  animation: "ssTapBreath 3s ease-in-out infinite",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#475569", animation: "ssDotPulse 1.5s ease-in-out infinite" }}
                />
                Tap anywhere to wake
              </div>
            </div>
          </div>

          {/* Corner accent dots — decorative */}
          {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos) => (
            <div
              key={pos}
              className={`absolute ${pos} w-1.5 h-1.5 rounded-full`}
              style={{
                background: accent.text,
                opacity: 0.2,
                animation: "ssDotPulse 3s ease-in-out infinite",
                transition: "background 3s ease",
              }}
            />
          ))}

          {/* Keyframes */}
          <style>{`
            @keyframes ssAmbientPulse {
              0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
              50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.15); }
            }
            @keyframes ssLogoPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
              50% { transform: scale(1.08); box-shadow: 0 0 24px 4px ${accent.glow}; }
            }
            @keyframes ssLogoRotate {
              0% { transform: rotate(0deg); }
              25% { transform: rotate(-3deg); }
              75% { transform: rotate(3deg); }
              100% { transform: rotate(0deg); }
            }
            @keyframes ssFadeBreath {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 0.9; }
            }
            @keyframes ssClockPulse {
              0%, 100% { opacity: 0.85; }
              50% { opacity: 1; }
            }
            @keyframes ssTapBreath {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.7; }
            }
            @keyframes ssDotPulse {
              0%, 100% { opacity: 0.2; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.4); }
            }
          `}</style>
        </div>
      )}

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col items-center gap-2 mb-10 z-10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <span className="text-cyan-400 text-xl">🏢</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{companyName}</h1>
        </div>
        <p className="text-slate-400 text-sm font-medium">{dateStr}</p>
        <p className="text-cyan-400 text-4xl font-mono font-bold tracking-widest">{timeStr}</p>
        {/* Time-based greeting */}
        <p className="text-slate-400 text-sm mt-1">
          {greeting}! <span className="text-slate-500">Ready to check you in.</span>
        </p>
      </div>

      {/* Scanner area */}
      <div className="z-10 flex flex-col items-center gap-4">
        <QRScanner />
        <p className="text-slate-400 text-base mt-2 tracking-wide">{welcomeMessage}</p>
      </div>

      {/* Announcement marquee banner */}
      {showAnnouncement && !sleeping && announcement.trim() && (
        <div
          className="absolute bottom-0 left-0 right-0 z-40 overflow-hidden"
          style={{
            background: "linear-gradient(90deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 50%, rgba(15,23,42,0.97) 100%)",
            borderTop: "1px solid rgba(251,191,36,0.25)",
            animation: "announceBannerSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <div className="flex items-center h-12">
            {/* Label badge */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-amber-500/20 h-full bg-amber-500/10">
              <span className="text-amber-400 text-lg">📢</span>
              <span className="text-amber-400 text-xs font-bold uppercase tracking-widest whitespace-nowrap">Notice</span>
            </div>
            {/* Scrolling text container */}
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
              <p
                key={announcementKey}
                className="whitespace-nowrap text-amber-100 text-sm font-medium absolute"
                style={{
                  animation: `announceScroll ${Math.min(30, Math.max(10, Math.ceil(announcement.length * 0.12)))}s linear both`,
                  paddingLeft: "100%",
                }}
              >
                {announcement}
              </p>
            </div>
            {/* Dismiss button */}
            <button
              onClick={() => { setShowAnnouncement(false); if (announcementHideRef.current) clearTimeout(announcementHideRef.current); }}
              className="flex-shrink-0 w-10 h-full flex items-center justify-center text-slate-600 hover:text-slate-400 transition border-l border-amber-500/10"
              aria-label="Dismiss announcement"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <style>{`
            @keyframes announceBannerSlideIn {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes announceScroll {
              from { transform: translateX(0); }
              to { transform: translateX(-200%); }
            }
          `}</style>
        </div>
      )}

      {/* Hidden admin trigger */}
      <button
        onClick={onOpenPin}
        onMouseEnter={() => setShowHint(true)}
        onMouseLeave={() => { setShowHint(false); cancelHold(); }}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onTouchStart={(e) => { e.preventDefault(); setShowHint(true); startHold(); }}
        onTouchEnd={() => { setShowHint(false); cancelHold(); }}
        onTouchCancel={() => { setShowHint(false); cancelHold(); }}
        className="absolute bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 opacity-20 hover:opacity-60 focus:opacity-80 focus:outline-none select-none"
        style={holdProgress > 0 ? { opacity: 0.6 } : undefined}
        aria-label="Admin access"
      >
        {holdProgress > 0 && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="21" fill="none" stroke="#22d3ee" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 21}`}
              strokeDashoffset={`${2 * Math.PI * 21 * (1 - holdProgress / 100)}`}
              strokeLinecap="round" className="transition-none"
            />
          </svg>
        )}
        <Settings size={20} className="text-slate-400 relative z-10" />
      </button>
      {showHint && (
        <div className="absolute bottom-20 right-6 text-xs text-slate-500 bg-slate-800/80 px-2 py-1 rounded whitespace-nowrap">
          {holdProgress > 0 ? "Hold to unlock…" : "Admin (tap or hold)"}
        </div>
      )}

      {/* Decorative dots */}
      <div className="absolute bottom-8 left-8 flex gap-2 opacity-20">
        {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-cyan-400" />)}
      </div>
    </div>
  );
}
