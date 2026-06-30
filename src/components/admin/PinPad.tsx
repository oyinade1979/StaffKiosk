
import { useState, useEffect, useCallback } from "react";
import { X, Delete, ShieldOff, Clock, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, ShieldAlert, Info, KeyRound } from "lucide-react";
import { getPin, setPin } from "@/lib/storage";
import { fetchSettings, saveSettings } from "@/lib/settingsService";
import { MASTER_RESET_CODE } from "@/constants";
import { cn } from "@/lib/utils";

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

// Module-level so lockout persists across component unmount/remount
let _failedAttempts = 0;
let _lockedUntil: number | null = null;

interface PinPadProps {
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function PinPad({ onSuccess, onCancel, title = "Admin Access", subtitle = "Enter your 4-digit PIN" }: PinPadProps) {
  const [pin, setPinInput] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(_failedAttempts);
  const [countdown, setCountdown] = useState<number>(0);
  const [section, setSection] = useState<"normal" | "reset">("normal");

  // Reset flow state
  const [resetCode, setResetCode] = useState("");
  const [showResetCode, setShowResetCode] = useState(false);
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [showResetNew, setShowResetNew] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showMasterCode, setShowMasterCode] = useState(false);

  const isLocked = countdown > 0;

  // Load PIN from Supabase on mount so cross-device PIN changes are respected
  useEffect(() => {
    fetchSettings();
  }, []);

  // Sync module-level state into component on mount and update countdown
  useEffect(() => {
    function tick() {
      if (_lockedUntil !== null) {
        const remaining = Math.ceil((_lockedUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          _lockedUntil = null;
          _failedAttempts = 0;
          setFailedAttempts(0);
          setCountdown(0);
        }
      } else {
        setCountdown(0);
      }
    }
    tick(); // run immediately on mount
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const handleKey = useCallback((key: string) => {
    if (isLocked) return;
    if (key === "del") {
      setPinInput((p) => p.slice(0, -1));
    } else if (pin.length < 4) {
      setPinInput((p) => p + key);
    }
  }, [isLocked, pin]);

  useEffect(() => {
    if (pin.length !== 4) return;

    if (pin === getPin()) {
      _failedAttempts = 0;
      _lockedUntil = null;
      setFailedAttempts(0);
      onSuccess();
    } else {
      const next = _failedAttempts + 1;
      _failedAttempts = next;
      setFailedAttempts(next);

      if (next >= MAX_ATTEMPTS) {
        _lockedUntil = Date.now() + LOCKOUT_SECONDS * 1000;
        _failedAttempts = 0;
        setFailedAttempts(0);
        setCountdown(LOCKOUT_SECONDS);
      }

      setShake(true);
      setError(true);
      setTimeout(() => {
        setPinInput("");
        setShake(false);
        setError(false);
      }, 700);
    }
  }, [pin, onSuccess]);

  function validateNewPin(p: string): string {
    if (p.length !== 4) return "PIN must be exactly 4 digits.";
    if (!/^\d{4}$/.test(p)) return "PIN must contain digits only.";
    return "";
  }

  function handleResetPin() {
    setResetError("");
    if (resetCode.trim().toUpperCase() !== MASTER_RESET_CODE.toUpperCase()) {
      return setResetError("Invalid reset code. Contact your IT administrator.");
    }
    const pinErr = validateNewPin(resetNewPin);
    if (pinErr) return setResetError(pinErr);
    if (resetNewPin !== resetConfirmPin) return setResetError("PINs do not match.");
    setPin(resetNewPin);
    saveSettings({ pin: resetNewPin });
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setSection("normal");
      setResetCode(""); setResetNewPin(""); setResetConfirmPin("");
    }, 2000);
  }

  const pinStrength = (p: string) => {
    if (!p) return null;
    if (/^(.)\1+$/.test(p)) return { label: "Weak – all same digits", color: "text-red-400" };
    if (/^(0123|1234|2345|3456|4356|5678|6789|9876|8765|7654|6543|5432|4321|3210)$/.test(p)) // Corrected regex for sequential
      return { label: "Weak – sequential", color: "text-amber-400" };
    return { label: "Strong", color: "text-emerald-400" };
  };
  const strength = pinStrength(resetNewPin);

  const attemptsLeft = MAX_ATTEMPTS - failedAttempts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center gap-6">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-1 border transition",
            isLocked
              ? "bg-red-500/20 border-red-500/30"
              : "bg-cyan-500/20 border-cyan-500/30"
          )}>
            {isLocked ? (
              <ShieldOff size={24} className="text-red-400" />
            ) : (
              <span className="text-2xl">🔐</span>
            )}
          </div>
          <h2 className="text-white text-xl font-bold">{isLocked ? "Access Locked" : title}</h2>
          <p className="text-slate-400 text-sm text-center">
            {isLocked ? "Too many failed attempts" : subtitle}
          </p>
        </div>

        {/* Lockout state */}
        {isLocked ? (
          <div className="flex flex-col items-center gap-5 w-full">
            {/* Countdown ring */}
            <div className="relative flex items-center justify-center">
              <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle
                  cx="48" cy="48" r="40"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="6"
                />
                <circle
                  cx="48" cy="48" r="40"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - countdown / LOCKOUT_SECONDS)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <Clock size={14} className="text-red-400 mb-0.5" />
                <span className="text-red-300 font-bold text-2xl leading-none">{countdown}</span>
                <span className="text-red-500 text-xs">sec</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-slate-300 text-sm font-semibold">
                PIN entry blocked for {countdown}s
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {MAX_ATTEMPTS} consecutive incorrect attempts detected.
              </p>
            </div>

            {/* Disabled numpad hint */}
            <div className="grid grid-cols-3 gap-3 w-full opacity-25 pointer-events-none select-none">
              {KEYS.map((key, idx) =>
                key === "" ? <div key={idx} /> : (
                  <div key={idx} className="h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 text-2xl font-bold">
                    {key === "del" ? <Delete size={22} /> : key}
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            {/* PIN dots */}
            <div className={cn("flex gap-4", shake && "animate-[wiggle_0.6s_ease-in-out]")}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-150",
                    i < pin.length
                      ? error
                        ? "bg-red-500 border-red-500"
                        : "bg-cyan-400 border-cyan-400"
                      : "bg-transparent border-slate-600"
                  )}
                />
              ))}
            </div>

            {/* Attempt warnings */}
            {error && failedAttempts > 0 && !isLocked && (
              <div className={cn(
                "flex flex-col items-center gap-0.5 -mt-3",
              )}>
                <p className="text-red-400 text-sm font-medium animate-pulse">
                  Incorrect PIN. Try again.
                </p>
                <p className={cn(
                  "text-xs font-semibold",
                  attemptsLeft === 1 ? "text-red-400" : "text-amber-400"
                )}>
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout
                </p>
              </div>
            )}

            {!error && failedAttempts > 0 && (
              <p className={cn(
                "text-xs font-semibold -mt-3",
                attemptsLeft === 1 ? "text-red-400" : "text-amber-400"
              )}>
                {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout
              </p>
            )}

            {error && failedAttempts === 0 && (
              <p className="text-red-400 text-sm font-medium -mt-3 animate-pulse">
                Incorrect PIN. Try again.
              </p>
            )}

            {/* Reset flow */}
            {section === "reset" && (
              <div className="w-full flex flex-col gap-4">
                {resetSuccess ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <CheckCircle size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-emerald-300 font-bold">PIN Reset!</p>
                    <p className="text-slate-400 text-sm">Use your new PIN to log in.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                      <Info size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-amber-300 text-xs font-semibold">Emergency Reset</p>
                        <p className="text-slate-400 text-xs leading-relaxed">Enter the master reset code from your IT administrator.</p>
                        <button onClick={() => setShowMasterCode((v) => !v)} className="mt-1.5 flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs font-semibold transition">
                          {showMasterCode ? <EyeOff size={11} /> : <Eye size={11} />}
                          {showMasterCode ? "Hide" : "Show"} master code (IT only)
                        </button>
                        {showMasterCode && (
                          <div className="mt-1.5 px-2.5 py-1 bg-slate-900 border border-amber-500/30 rounded-lg inline-block">
                            <span className="font-mono text-amber-300 text-sm tracking-widest font-bold">{MASTER_RESET_CODE}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Master Reset Code</label>
                      <div className="relative">
                        <input type={showResetCode ? "text" : "password"} value={resetCode} onChange={(e) => { setResetCode(e.target.value); setResetError(""); }} placeholder="RESET-XXXX" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-amber-500 transition pr-9" />
                        <button type="button" onClick={() => setShowResetCode((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">{showResetCode ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">New PIN</label>
                      <div className="relative">
                        <input type={showResetNew ? "text" : "password"} inputMode="numeric" maxLength={4} value={resetNewPin} onChange={(e) => { setResetNewPin(e.target.value.replace(/\D/g, "")); setResetError(""); }} placeholder="••••" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm font-mono tracking-[0.5em] focus:outline-none focus:border-amber-500 transition pr-9" />
                        <button type="button" onClick={() => setShowResetNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">{showResetNew ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      </div>
                      {strength && resetNewPin.length === 4 && <p className={`text-xs font-medium flex items-center gap-1 ${strength.color}`}><ShieldAlert size={10} /> {strength.label}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Confirm New PIN</label>
                      <div className="relative">
                        <input type={showResetConfirm ? "text" : "password"} inputMode="numeric" maxLength={4} value={resetConfirmPin} onChange={(e) => { setResetConfirmPin(e.target.value.replace(/\D/g, "")); setResetError(""); }} onKeyDown={(e) => e.key === "Enter" && handleResetPin()} placeholder="••••" className={cn("w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm font-mono tracking-[0.5em] focus:outline-none transition pr-9", resetConfirmPin && resetNewPin && resetConfirmPin !== resetNewPin ? "border-red-500/60" : resetConfirmPin && resetConfirmPin === resetNewPin ? "border-emerald-500/60" : "border-slate-700 focus:border-amber-500")} />
                        <button type="button" onClick={() => setShowResetConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">{showResetConfirm ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      </div>
                      {resetConfirmPin.length === 4 && resetConfirmPin === resetNewPin && <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={10} /> PINs match</p>}
                    </div>

                    {resetError && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2"><AlertCircle size={13} className="flex-shrink-0" /> {resetError}</div>}

                    <div className="flex gap-2">
                      <button onClick={() => { setSection("normal"); setResetError(""); setResetCode(""); setResetNewPin(""); setResetConfirmPin(""); }} className="flex-1 flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium px-3 py-2.5 rounded-xl transition">Cancel</button>
                      <button onClick={handleResetPin} disabled={!resetCode || resetNewPin.length !== 4 || resetConfirmPin.length !== 4} className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold text-sm px-3 py-2.5 rounded-xl transition"><KeyRound size={13} /> Reset PIN</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Numpad */}
            {section === "normal" && <div className="grid grid-cols-3 gap-3 w-full">
              {KEYS.map((key, idx) =>
                key === "" ? (
                  <div key={idx} />
                ) : key === "del" ? (
                  <button
                    key={idx}
                    onClick={() => handleKey("del")}
                    className="h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-slate-400 transition-all duration-100"
                  >
                    <Delete size={22} />
                  </button>
                ) : (
                  <button
                    key={idx}
                    onClick={() => handleKey(key)}
                    className="h-16 rounded-2xl bg-slate-800 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-slate-700 active:scale-95 text-white text-2xl font-bold transition-all duration-100"
                  >
                    {key}
                  </button>
                )
              )}
            </div>}

            {/* Forgot PIN link */}
            {section === "normal" && (
              <button
                onClick={() => { setSection("reset"); setResetError(""); }}
                className="text-slate-500 hover:text-amber-400 text-xs font-medium transition flex items-center gap-1.5 -mt-2"
              >
                <RefreshCw size={11} />
                Forgot PIN?
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
