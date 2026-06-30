import { useState, useRef } from "react";
import {
  Lock, KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, ShieldAlert,
  RefreshCw, Info, Building2, MessageSquare, Download, Upload, Database,
  Pencil, Save, X, Bell, BellOff, Timer, PlayCircle, RotateCcw,
} from "lucide-react";
import { getPin, setPin, getCompanyName, setCompanyName, getWelcomeMessage, setWelcomeMessage, exportAllData, importAllData, getAnnouncement, setAnnouncement, getAnnouncementEnabled, setAnnouncementEnabled, getAnnouncementInterval, setAnnouncementInterval } from "@/lib/storage";
import { saveSettings } from "@/lib/settingsService";
import { MASTER_RESET_CODE, DEFAULT_ADMIN_PIN, DEFAULT_WELCOME_MESSAGE } from "@/constants";
import { cn } from "@/lib/utils";

type PinSection = "idle" | "change" | "reset";

export default function SettingsTab() {
  const [pinSection, setPinSection] = useState<PinSection>("idle");

  // ── Kiosk customisation ──────────────────────────────────────────────
  const [companyName, setCompanyNameState] = useState(getCompanyName);
  const [welcomeMsg, setWelcomeMsgState] = useState(getWelcomeMessage);
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  const [welcomeSaved, setWelcomeSaved] = useState(false);

  function saveCompany() {
    const trimmed = companyName.trim();
    if (!trimmed) return;
    setCompanyName(trimmed);
    setCompanyNameState(trimmed);
    setEditingCompany(false);
    setCompanySaved(true);
    window.dispatchEvent(new CustomEvent("kiosk-identity-changed"));
    saveSettings({ companyName: trimmed });
    setTimeout(() => setCompanySaved(false), 2000);
  }

  function resetWelcome() {
    setWelcomeMessage(DEFAULT_WELCOME_MESSAGE);
    setWelcomeMsgState(DEFAULT_WELCOME_MESSAGE);
    setEditingWelcome(false);
    setWelcomeSaved(true);
    window.dispatchEvent(new CustomEvent("kiosk-identity-changed"));
    saveSettings({ welcomeMessage: DEFAULT_WELCOME_MESSAGE });
    setTimeout(() => setWelcomeSaved(false), 2000);
  }

  function saveWelcome() {
    const trimmed = welcomeMsg.trim();
    if (!trimmed) return;
    setWelcomeMessage(trimmed);
    setWelcomeMsgState(trimmed);
    setEditingWelcome(false);
    setWelcomeSaved(true);
    window.dispatchEvent(new CustomEvent("kiosk-identity-changed"));
    saveSettings({ welcomeMessage: trimmed });
    setTimeout(() => setWelcomeSaved(false), 2000);
  }

  // ── View current PIN ─────────────────────────────────────────────────
  const [showCurrentPin, setShowCurrentPin] = useState(false);

  // ── Change PIN ───────────────────────────────────────────────────────
  const [currentInput, setCurrentInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);

  // ── Reset PIN ────────────────────────────────────────────────────────
  const [resetCode, setResetCode] = useState("");
  const [showResetCode, setShowResetCode] = useState(false);
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [showResetNew, setShowResetNew] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showMasterCode, setShowMasterCode] = useState(false);

  // ── Announcements ────────────────────────────────────────────────────────
  const [announcementEnabled, setAnnouncementEnabledState] = useState(getAnnouncementEnabled);
  const [announcementMsg, setAnnouncementMsgState] = useState(getAnnouncement);
  const [announcementInterval, setAnnouncementIntervalState] = useState(getAnnouncementInterval);
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementSaved, setAnnouncementSaved] = useState(false);

  function toggleAnnouncement() {
    const next = !announcementEnabled;
    setAnnouncementEnabled(next);
    setAnnouncementEnabledState(next);
    window.dispatchEvent(new CustomEvent("kiosk-identity-changed"));
    saveSettings({ announcementEnabled: next });
  }

  function saveAnnouncement() {
    const trimmed = announcementMsg.trim();
    setAnnouncement(trimmed);
    setAnnouncementMsgState(trimmed);
    setAnnouncementInterval(announcementInterval);
    setEditingAnnouncement(false);
    setAnnouncementSaved(true);
    window.dispatchEvent(new CustomEvent("kiosk-identity-changed"));
    saveSettings({ announcement: trimmed, announcementInterval });
    setTimeout(() => setAnnouncementSaved(false), 2000);
  }

  function previewAnnouncement(msg: string) {
    const trimmed = msg.trim();
    if (!trimmed) return;
    window.dispatchEvent(new CustomEvent("kiosk-announcement-preview", { detail: { message: trimmed } }));
  }

  // ── Backup / Restore ─────────────────────────────────────────────────
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kiosk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 2500);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = importAllData(text);
      if (result.ok) {
        setRestoreStatus({ ok: true, msg: "Data restored successfully! Refresh the page to see all changes." });
        // Refresh local state
        setCompanyNameState(getCompanyName());
        setWelcomeMsgState(getWelcomeMessage());
      } else {
        setRestoreStatus({ ok: false, msg: result.error });
      }
      setTimeout(() => setRestoreStatus(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function validateNewPin(pin: string): string {
    if (pin.length !== 4) return "PIN must be exactly 4 digits.";
    if (!/^\d{4}$/.test(pin)) return "PIN must contain digits only (0–9).";
    return "";
  }

  function openPinSection(s: PinSection) {
    setPinSection(s);
    setChangeError(""); setChangeSuccess(false);
    setCurrentInput(""); setNewPin(""); setConfirmPin("");
    setResetCode(""); setResetNewPin(""); setResetConfirmPin("");
    setResetError(""); setResetSuccess(false);
    setShowMasterCode(false);
  }

  function handleChangePin() {
    setChangeError("");
    if (currentInput !== getPin()) return setChangeError("Current PIN is incorrect.");
    const pinError = validateNewPin(newPin);
    if (pinError) return setChangeError(pinError);
    if (newPin === currentInput) return setChangeError("New PIN must be different from the current PIN.");
    if (newPin !== confirmPin) return setChangeError("New PIN and confirmation do not match.");
    setPin(newPin);
    saveSettings({ pin: newPin });
    setChangeSuccess(true);
    setCurrentInput(""); setNewPin(""); setConfirmPin("");
    setTimeout(() => { setChangeSuccess(false); setPinSection("idle"); }, 2500);
  }

  function handleResetPin() {
    setResetError("");
    if (resetCode.trim().toUpperCase() !== MASTER_RESET_CODE.toUpperCase())
      return setResetError("Invalid reset code. Contact your IT administrator.");
    const pinError = validateNewPin(resetNewPin);
    if (pinError) return setResetError(pinError);
    if (resetNewPin !== resetConfirmPin) return setResetError("PIN and confirmation do not match.");
    setPin(resetNewPin);
    saveSettings({ pin: resetNewPin });
    setResetSuccess(true);
    setResetCode(""); setResetNewPin(""); setResetConfirmPin("");
    setTimeout(() => { setResetSuccess(false); setPinSection("idle"); }, 2500);
  }

  const pinStrength = (pin: string) => {
    if (!pin) return null;
    if (/^(.)\1+$/.test(pin)) return { label: "Weak – all same digits", color: "text-red-400" };
    if (/^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)$/.test(pin))
      return { label: "Weak – sequential digits", color: "text-amber-400" };
    return { label: "Strong", color: "text-emerald-400" };
  };

  const strength = pinStrength(pinSection === "change" ? newPin : resetNewPin);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm mt-0.5">Manage kiosk identity, admin PIN, and data backup</p>
      </div>

      {/* ══ Kiosk Identity ══════════════════════════════════════════════ */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Building2 size={16} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Kiosk Identity</p>
            <p className="text-slate-500 text-xs">Company name and welcome message shown on the kiosk screen</p>
          </div>
        </div>

        <div className="divide-y divide-slate-700/40">
          {/* Company name */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={11} /> Company Name
              </label>
              {!editingCompany && (
                <button onClick={() => setEditingCompany(true)} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs transition">
                  <Pencil size={11} /> Edit
                </button>
              )}
            </div>
            {editingCompany ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={companyName}
                  maxLength={60}
                  onChange={(e) => setCompanyNameState(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveCompany()}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                  placeholder="e.g. Acme Corporation"
                  autoFocus
                />
                <button onClick={saveCompany} disabled={!companyName.trim()} className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 flex items-center justify-center transition">
                  <Save size={15} className="text-slate-900" />
                </button>
                <button onClick={() => { setEditingCompany(false); setCompanyNameState(getCompanyName()); }} className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition">
                  <X size={15} className="text-slate-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold text-base">{companyName}</p>
                {companySaved && <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={11} /> Saved</span>}
              </div>
            )}
          </div>

          {/* Welcome message */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={11} /> Welcome Message
              </label>
              {!editingWelcome && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetWelcome}
                    title="Reset to default message"
                    className="flex items-center gap-1 text-slate-600 hover:text-amber-400 text-xs transition"
                  >
                    <RotateCcw size={10} /> Reset
                  </button>
                  <button onClick={() => setEditingWelcome(true)} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs transition">
                    <Pencil size={11} /> Edit
                  </button>
                </div>
              )}
            </div>
            {editingWelcome ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={welcomeMsg}
                  maxLength={100}
                  onChange={(e) => setWelcomeMsgState(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveWelcome()}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                  placeholder="e.g. Scan your QR badge to check in"
                  autoFocus
                />
                <button onClick={saveWelcome} disabled={!welcomeMsg.trim()} className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 flex items-center justify-center transition">
                  <Save size={15} className="text-slate-900" />
                </button>
                <button onClick={() => { setEditingWelcome(false); setWelcomeMsgState(getWelcomeMessage()); }} className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition">
                  <X size={15} className="text-slate-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-slate-300 text-sm">{welcomeMsg}</p>
                {welcomeSaved && <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={11} /> Saved</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Data Backup & Restore ═══════════════════════════════════════ */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Database size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Data Backup & Restore</p>
            <p className="text-slate-500 text-xs">Export all staff, attendance, and settings to a file — import to restore</p>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-300 text-xs leading-relaxed">
              Your data is stored in this browser. <strong>Export a backup regularly</strong> — clearing browser data or switching devices will erase all records without a backup file.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleExport}
              className={cn(
                "flex items-center gap-2 border text-sm font-semibold px-4 py-2.5 rounded-xl transition",
                backupSuccess
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400"
              )}
            >
              {backupSuccess ? <CheckCircle size={15} /> : <Download size={15} />}
              {backupSuccess ? "Backup Downloaded!" : "Export Backup"}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <Upload size={15} />
              Restore from Backup
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>

          {restoreStatus && (
            <div className={cn(
              "flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border",
              restoreStatus.ok
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            )}>
              {restoreStatus.ok ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />}
              {restoreStatus.msg}
            </div>
          )}
        </div>
      </div>

      {/* ══ Kiosk Announcements ══════════════════════════════════════════ */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Bell size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Kiosk Announcements</p>
            <p className="text-slate-500 text-xs">Display a scrolling notice on the kiosk screen at set intervals</p>
          </div>
          <button
            onClick={toggleAnnouncement}
            className={cn(
              "flex items-center gap-2 border text-xs font-bold px-3 py-2 rounded-xl transition",
              announcementEnabled
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                : "bg-slate-700/60 border-slate-600/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            )}
          >
            {announcementEnabled ? <Bell size={13} /> : <BellOff size={13} />}
            {announcementEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="divide-y divide-slate-700/40">
          {/* Message */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={11} /> Announcement Message
              </label>
              {!editingAnnouncement && (
                <button onClick={() => setEditingAnnouncement(true)} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs transition">
                  <Pencil size={11} /> Edit
                </button>
              )}
            </div>
            {editingAnnouncement ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={announcementMsg}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => setAnnouncementMsgState(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 transition resize-none"
                  placeholder="e.g. All staff: canteen closes at 3pm today. Please collect your access cards from reception."
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs flex-1">{announcementMsg.length}/200</span>
                  <button
                    onClick={() => previewAnnouncement(announcementMsg)}
                    disabled={!announcementMsg.trim()}
                    title="Preview on kiosk screen"
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                  >
                    <PlayCircle size={13} /> Preview
                  </button>
                  <button onClick={saveAnnouncement} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-xl transition">
                    <Save size={13} /> Save
                  </button>
                  <button onClick={() => { setEditingAnnouncement(false); setAnnouncementMsgState(getAnnouncement()); }} className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {announcementMsg ? (
                  <p className="text-slate-300 text-sm leading-relaxed flex-1">{announcementMsg}</p>
                ) : (
                  <p className="text-slate-600 text-sm italic flex-1">No message set — click Edit to add one</p>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {announcementSaved && <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={11} /> Saved</span>}
                  {announcementMsg && (
                    <button
                      onClick={() => previewAnnouncement(announcementMsg)}
                      title="Preview on kiosk screen"
                      className="flex items-center gap-1 text-slate-500 hover:text-amber-400 text-xs transition"
                    >
                      <PlayCircle size={12} /> Preview
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interval */}
          <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1">
              <Timer size={14} className="text-slate-500" />
              <span className="text-slate-400 text-sm">Repeat every</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 5, 10, 15].map((min) => (
                <button
                  key={min}
                  onClick={() => {
                    setAnnouncementIntervalState(min);
                    setAnnouncementInterval(min);
                    window.dispatchEvent(new CustomEvent("kiosk-identity-changed"));
                    saveSettings({ announcementInterval: min });
                  }}
                  className={cn(
                    "text-xs font-bold px-3 py-1.5 rounded-lg border transition",
                    announcementInterval === min
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                      : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                  )}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ View Current PIN ═════════════════════════════════════════════ */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Eye size={16} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Current PIN</p>
            <p className="text-slate-500 text-xs">Reveal the active admin PIN — keep this confidential</p>
          </div>
        </div>
        <div className="flex items-center gap-4 px-5 py-4">
          <span className="font-mono text-2xl font-bold tracking-[0.5em] text-white flex-1">
            {showCurrentPin ? getPin() : "••••"}
          </span>
          <button
            onClick={() => setShowCurrentPin((v) => !v)}
            className={cn(
              "flex items-center gap-2 border text-sm font-semibold px-4 py-2.5 rounded-xl transition",
              showCurrentPin
                ? "bg-violet-500/20 border-violet-500/40 text-violet-400 hover:bg-violet-500/30"
                : "bg-slate-700/60 border-slate-600/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            )}
          >
            {showCurrentPin ? <EyeOff size={15} /> : <Eye size={15} />}
            {showCurrentPin ? "Hide PIN" : "Reveal PIN"}
          </button>
        </div>
        {showCurrentPin && (
          <div className="flex items-center gap-2 mx-5 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />
            <p className="text-amber-400 text-xs">Do not share this PIN. Hide it when finished.</p>
          </div>
        )}
      </div>

      {/* ══ Admin PIN Security ═══════════════════════════════════════════ */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Lock size={16} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Admin PIN Security</p>
            <p className="text-slate-500 text-xs">4-digit PIN used to access this admin panel</p>
          </div>
        </div>

        {pinSection === "idle" && (
          <div className="flex flex-col divide-y divide-slate-700/40">
            <button onClick={() => openPinSection("change")} className="flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/60 transition group">
              <div className="w-9 h-9 rounded-xl bg-slate-700/60 group-hover:bg-violet-500/20 border border-slate-600/60 group-hover:border-violet-500/30 flex items-center justify-center transition">
                <KeyRound size={16} className="text-slate-400 group-hover:text-violet-400 transition" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Change PIN</p>
                <p className="text-slate-500 text-xs mt-0.5">Update the admin access PIN — requires current PIN</p>
              </div>
              <span className="text-slate-600 text-xs">→</span>
            </button>
            <button onClick={() => openPinSection("reset")} className="flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/60 transition group">
              <div className="w-9 h-9 rounded-xl bg-slate-700/60 group-hover:bg-amber-500/20 border border-slate-600/60 group-hover:border-amber-500/30 flex items-center justify-center transition">
                <RefreshCw size={16} className="text-slate-400 group-hover:text-amber-400 transition" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Reset Forgotten PIN</p>
                <p className="text-slate-500 text-xs mt-0.5">Recover access using the emergency reset code</p>
              </div>
              <span className="text-slate-600 text-xs">→</span>
            </button>
          </div>
        )}

        {/* Change PIN form */}
        {pinSection === "change" && (
          <div className="px-5 py-5 flex flex-col gap-4">
            <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><KeyRound size={11} /> Change Admin PIN</p>
            {changeSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><CheckCircle size={28} className="text-emerald-400" /></div>
                <p className="text-emerald-300 font-bold text-lg">PIN Updated!</p>
                <p className="text-slate-400 text-sm">Your new PIN is active immediately.</p>
              </div>
            ) : (
              <>
                {[
                  { label: "Current PIN", value: currentInput, setValue: (v: string) => { setCurrentInput(v); setChangeError(""); }, show: showCurrent, setShow: setShowCurrent, placeholder: "••••", numeric: true },
                  { label: "New PIN", value: newPin, setValue: (v: string) => { setNewPin(v); setChangeError(""); }, show: showNew, setShow: setShowNew, placeholder: "••••", numeric: true, strength: newPin.length === 4 },
                  { label: "Confirm New PIN", value: confirmPin, setValue: (v: string) => { setConfirmPin(v); setChangeError(""); }, show: showConfirm, setShow: setShowConfirm, placeholder: "••••", numeric: true, matchCheck: true },
                ].map(({ label, value, setValue, show, setShow, placeholder, numeric, matchCheck }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</label>
                    <div className="relative">
                      <input
                        type={show ? "text" : "password"}
                        inputMode={numeric ? "numeric" : "text"}
                        maxLength={4}
                        value={value}
                        onChange={(e) => setValue(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && label.startsWith("Confirm") && handleChangePin()}
                        placeholder={placeholder}
                        className={cn(
                          "w-full bg-slate-900 border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-mono tracking-[0.5em] focus:outline-none transition pr-11",
                          matchCheck && value && newPin && value !== newPin ? "border-red-500/60" : matchCheck && value && value === newPin ? "border-emerald-500/60" : "border-slate-700 focus:border-cyan-500"
                        )}
                      />
                      <button type="button" onClick={() => setShow((v: boolean) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {label === "New PIN" && strength && newPin.length === 4 && (
                      <p className={`text-xs font-medium flex items-center gap-1 ${strength!.color}`}><ShieldAlert size={11} /> {strength!.label}</p>
                    )}
                    {matchCheck && value.length === 4 && value === newPin && (
                      <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={11} /> PINs match</p>
                    )}
                  </div>
                ))}
                {changeError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <AlertCircle size={14} className="flex-shrink-0" /> {changeError}
                  </div>
                )}
                <div className="flex gap-2 pt-1 justify-end">
                  <button onClick={() => openPinSection("idle")} className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition">Cancel</button>
                  <button onClick={handleChangePin} disabled={!currentInput || newPin.length !== 4 || confirmPin.length !== 4} className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-2.5 rounded-xl transition">
                    <KeyRound size={14} /> Update PIN
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Reset PIN form */}
        {pinSection === "reset" && (
          <div className="px-5 py-5 flex flex-col gap-4">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"><RefreshCw size={11} /> Reset Forgotten PIN</p>
            {resetSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><CheckCircle size={28} className="text-emerald-400" /></div>
                <p className="text-emerald-300 font-bold text-lg">PIN Reset!</p>
                <p className="text-slate-400 text-sm">Your new PIN is active. Use it at next login.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-amber-300 text-xs font-semibold mb-1">Emergency Reset Code Required</p>
                    <p className="text-slate-400 text-xs leading-relaxed">This bypasses the current PIN using a master reset code. Only IT administrators should know this code.</p>
                    <button onClick={() => setShowMasterCode((v) => !v)} className="mt-2 flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-semibold transition">
                      {showMasterCode ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showMasterCode ? "Hide" : "Show"} master code (IT only)
                    </button>
                    {showMasterCode && (
                      <div className="mt-2 px-3 py-1.5 bg-slate-900 border border-amber-500/30 rounded-lg inline-block">
                        <span className="font-mono text-amber-300 text-sm tracking-widest font-bold">{MASTER_RESET_CODE}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Master Reset Code</label>
                  <div className="relative">
                    <input type={showResetCode ? "text" : "password"} value={resetCode} onChange={(e) => { setResetCode(e.target.value); setResetError(""); }} placeholder="RESET-XXXX" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-mono focus:outline-none focus:border-amber-500 transition pr-11" />
                    <button type="button" onClick={() => setShowResetCode((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">{showResetCode ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>

                {[
                  { label: "New PIN", value: resetNewPin, setValue: (v: string) => { setResetNewPin(v); setResetError(""); }, show: showResetNew, setShow: setShowResetNew },
                  { label: "Confirm New PIN", value: resetConfirmPin, setValue: (v: string) => { setResetConfirmPin(v); setResetError(""); }, show: showResetConfirm, setShow: setShowResetConfirm },
                ].map(({ label, value, setValue, show, setShow }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</label>
                    <div className="relative">
                      <input
                        type={show ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={4}
                        value={value}
                        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && label.startsWith("Confirm") && handleResetPin()}
                        placeholder="••••"
                        className={cn(
                          "w-full bg-slate-900 border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-mono tracking-[0.5em] focus:outline-none transition pr-11",
                          label.startsWith("Confirm") && value && resetNewPin && value !== resetNewPin ? "border-red-500/60" : label.startsWith("Confirm") && value && value === resetNewPin ? "border-emerald-500/60" : "border-slate-700 focus:border-amber-500"
                        )}
                      />
                      <button type="button" onClick={() => setShow((v: boolean) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                    {label === "New PIN" && strength && value.length === 4 && <p className={`text-xs font-medium flex items-center gap-1 ${strength!.color}`}><ShieldAlert size={11} /> {strength!.label}</p>}
                    {label.startsWith("Confirm") && value.length === 4 && value === resetNewPin && <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={11} /> PINs match</p>}
                  </div>
                ))}

                {resetError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                    <AlertCircle size={14} className="flex-shrink-0" /> {resetError}
                  </div>
                )}
                <div className="flex gap-2 pt-1 justify-end">
                  <button onClick={() => openPinSection("idle")} className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition">Cancel</button>
                  <button onClick={handleResetPin} disabled={!resetCode || resetNewPin.length !== 4 || resetConfirmPin.length !== 4} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition">
                    <RefreshCw size={14} /> Reset PIN
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Default PIN reminder */}
      <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4">
        <Info size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-slate-400 text-sm font-semibold">Default PIN</p>
          <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
            The factory default PIN is <span className="font-mono text-slate-400">{DEFAULT_ADMIN_PIN}</span>. Change it before deploying to production.
          </p>
        </div>
      </div>
    </div>
  );
}
