import { useState, useCallback, useEffect } from "react";
import KioskMode from "@/components/kiosk/KioskMode";
import AdminMode from "@/components/admin/AdminMode";
import LandingPage, { SubscriptionPaywallPage } from "@/pages/LandingPage";
import { onspaceClient } from "@/lib/onspaceClient";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { AppMode } from "@/types";

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [skipAutoLogin, setSkipAutoLogin] = useState(false);
  const [mode, setMode] = useState<AppMode>("kiosk");
  const [subChecking, setSubChecking] = useState(false);
  const [subBlocked, setSubBlocked] = useState(false);

  // ALL hooks must be declared before any conditional returns
  const enterApp = useCallback(() => { setShowLanding(false); setSkipAutoLogin(false); }, []);
  const handleGoHome = useCallback(() => { setSkipAutoLogin(true); setShowLanding(true); setSubBlocked(false); }, []);
  const handleExitAdmin = useCallback(() => setMode("kiosk"), []);
  const handleLockAdmin = useCallback(() => setMode("kiosk"), []);

  // Check subscription before opening admin
  const handleOpenAdmin = useCallback(async () => {
    setSubChecking(true);
    try {
      const { data: { session } } = await onspaceClient.auth.getSession();
      const token = session?.access_token;
      if (!token) { setSubChecking(false); return; }

      const { data, error } = await onspaceClient.functions.invoke("check-subscription", {
        body: {},
        headers: { Authorization: `Bearer ${token}` },
      });

      let subscribed = false;
      if (!error && data) {
        subscribed = data.subscribed === true;
      } else if (error instanceof FunctionsHttpError) {
        try {
          const txt = await error.context?.text();
          const parsed = txt ? JSON.parse(txt) : {};
          // If we can't determine status, allow access (fail open for network issues)
          subscribed = parsed.subscribed === true;
        } catch { subscribed = true; }
      } else if (error) {
        // Network error — fail open to avoid locking out users
        subscribed = true;
      }

      if (subscribed) {
        setSubBlocked(false);
        setMode("admin");
      } else {
        setSubBlocked(true);
      }
    } catch {
      // Fail open on unexpected errors
      setMode("admin");
    } finally {
      setSubChecking(false);
    }
  }, []);

  // Handle ?checkout=success redirect back from Stripe (post-trial payment)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      setSubBlocked(false);
      setShowLanding(false);
    }
  }, []);

  if (showLanding) {
    return <LandingPage onEnterApp={enterApp} skipAutoLogin={skipAutoLogin} />;
  }

  // Subscription expired/inactive — show paywall
  if (subBlocked) {
    return <SubscriptionPaywallPage onGoHome={handleGoHome} />;
  }

  // Subscription check in progress
  if (subChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Checking subscription…</p>
        </div>
      </div>
    );
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
