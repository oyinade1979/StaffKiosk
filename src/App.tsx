import { useState, useCallback, useEffect } from "react";
import KioskMode from "@/components/kiosk/KioskMode";
import AdminMode from "@/components/admin/AdminMode";
import LandingPage from "@/pages/LandingPage";
import { onspaceClient } from "@/lib/onspaceClient";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { AppMode } from "@/types";

const PRICE_IDS = {
  monthly: "price_1To01MP9fDU1WUDlTcQMCYy8",
  yearly: "price_1To01bP9fDU1WUDl6qRAczWc",
};

// ─── Subscription Expired Paywall ────────────────────────────────────
function SubscriptionPaywall({ onGoHome, onSubscribe }: { onGoHome: () => void; onSubscribe: (plan: "monthly" | "yearly") => void }) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    const { data: { session } } = await onspaceClient.auth.getSession();
    const token = session?.access_token;
    const { data, error } = await onspaceClient.functions.invoke("create-checkout", {
      body: { priceId: PRICE_IDS[plan] },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (error || !data?.url) { setLoading(null); return; }
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Your trial has ended</h1>
        <p className="text-slate-400 text-base leading-relaxed mb-8">
          Subscribe to continue using AccessGrid and unlock full access to the admin panel, attendance tracking, and all features.
        </p>

        {/* Plan cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Monthly */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 text-left">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Monthly</div>
            <div className="text-2xl font-bold text-white mb-0.5">£25<span className="text-slate-500 text-sm font-normal">/mo</span></div>
            <div className="text-slate-500 text-xs mb-4">Per company</div>
            <button
              onClick={() => handleSubscribe("monthly")}
              disabled={loading !== null}
              className="w-full border border-cyan-500/50 hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {loading === "monthly" ? "Redirecting…" : "Subscribe"}
            </button>
          </div>

          {/* Yearly */}
          <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-5 text-left relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">SAVE £60</div>
            <div className="text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">Yearly</div>
            <div className="text-2xl font-bold text-white mb-0.5">£240<span className="text-slate-500 text-sm font-normal">/yr</span></div>
            <div className="text-slate-500 text-xs mb-4">Per company · £20/mo</div>
            <button
              onClick={() => handleSubscribe("yearly")}
              disabled={loading !== null}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
            >
              {loading === "yearly" ? "Redirecting…" : "Subscribe"}
            </button>
          </div>
        </div>

        <button
          onClick={onGoHome}
          className="text-slate-500 hover:text-slate-300 text-sm transition"
        >
          ← Back to home
        </button>
      </div>
    </div>
  );
}

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

  // Handle ?checkout=success redirect back from Stripe (re-entering after subscription)
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
    return <SubscriptionPaywall onGoHome={handleGoHome} onSubscribe={() => {}} />;
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
