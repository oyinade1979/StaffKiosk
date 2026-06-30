import { useState, useCallback, useEffect } from "react";
import KioskMode from "@/components/kiosk/KioskMode";
import AdminMode from "@/components/admin/AdminMode";
import LandingPage from "@/pages/LandingPage";
import type { AppMode } from "@/types";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [skipAutoLogin, setSkipAutoLogin] = useState(false);
  const [mode, setMode] = useState<AppMode>("kiosk");

  // Session check is handled by LandingPage's useEffect (auto-enters if session found)

  // ALL hooks must be declared before any conditional returns
  const enterApp = useCallback(() => { setShowLanding(false); setSkipAutoLogin(false); }, []);

  // Go straight to admin — auth is handled by Supabase session
  const handleOpenAdmin = useCallback(() => setMode("admin"), []);
  const handleGoHome = useCallback(() => { setSkipAutoLogin(true); setShowLanding(true); }, []);
  const handleExitAdmin = useCallback(() => setMode("kiosk"), []);
  const handleLockAdmin = useCallback(() => setMode("kiosk"), []);

  if (showLanding) {
    return <LandingPage onEnterApp={enterApp} skipAutoLogin={skipAutoLogin} />;
  }

  return (
    <>
      {/* Kiosk — hidden while admin is open */}
      <div className={mode === "kiosk" ? "block" : "hidden"}>
        <KioskMode onOpenPin={handleOpenAdmin} onGoHome={handleGoHome} />
      </div>

      {/* Admin panel */}
      {mode === "admin" && <AdminMode onExit={handleExitAdmin} onLock={handleLockAdmin} />}
    </>
  );
}
