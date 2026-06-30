import { useState, useCallback, useEffect } from "react";
import KioskMode from "@/components/kiosk/KioskMode";
import PinPad from "@/components/admin/PinPad";
import AdminMode from "@/components/admin/AdminMode";
import LandingPage from "@/pages/LandingPage";
import { saveSettings } from "@/lib/settingsService";
import type { AppMode } from "@/types";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [mode, setMode] = useState<AppMode>("kiosk");

  if (showLanding) {
    return <LandingPage onEnterApp={() => setShowLanding(false)} />;
  }

  // On first load, push current local settings to Supabase so all tables get seeded
  useEffect(() => {
    saveSettings({}).catch((e) => console.warn("[App] initial settings sync failed:", e));
  }, []);

  const handleOpenPin = useCallback(() => setMode("pin"), []);
  const handlePinSuccess = useCallback(() => setMode("admin"), []);
  const handlePinCancel = useCallback(() => setMode("kiosk"), []);
  const handleExitAdmin = useCallback(() => setMode("kiosk"), []);
  const handleLockAdmin = useCallback(() => setMode("locked"), []);
  const handleUnlockAdmin = useCallback(() => setMode("admin"), []);
  const handleUnlockCancel = useCallback(() => setMode("kiosk"), []);

  return (
    <>
      {/* Kiosk is always mounted but hidden in admin/pin/locked mode */}
      <div className={mode === "kiosk" || mode === "pin" ? "block" : "hidden"}>
        <KioskMode onOpenPin={handleOpenPin} />
      </div>

      {/* PIN overlay — fresh login */}
      {mode === "pin" && (
        <PinPad onSuccess={handlePinSuccess} onCancel={handlePinCancel} />
      )}

      {/* Admin panel */}
      {mode === "admin" && <AdminMode onExit={handleExitAdmin} onLock={handleLockAdmin} />}

      {/* Locked screen — PIN required to resume admin */}
      {mode === "locked" && (
        <>
          {/* Blurred admin panel behind lock screen */}
          <div className="pointer-events-none select-none filter blur-sm opacity-40">
            <AdminMode onExit={handleExitAdmin} onLock={handleLockAdmin} />
          </div>
          <PinPad onSuccess={handleUnlockAdmin} onCancel={handleUnlockCancel} title="Session Locked" subtitle="Enter PIN to resume admin" />
        </>
      )}
    </>
  );
}
