import { useState, useRef } from "react";
import {
  CheckCircle, AlertCircle, Info, Building2, MessageSquare, Download, Upload, Database,
  Pencil, Save, X, Bell, BellOff, Timer, PlayCircle, RotateCcw, CreditCard, ExternalLink, Loader2,
} from "lucide-react";
import { getCompanyName, setCompanyName, getWelcomeMessage, setWelcomeMessage, exportAllData, importAllData, getAnnouncement, setAnnouncement, getAnnouncementEnabled, setAnnouncementEnabled, getAnnouncementInterval, setAnnouncementInterval } from "@/lib/storage";
import { saveSettings } from "@/lib/settingsService";
import { DEFAULT_WELCOME_MESSAGE } from "@/constants";
import { cn } from "@/lib/utils";
import { onspaceClient } from "@/lib/onspaceClient";
import { FunctionsHttpError } from "@supabase/supabase-js";

export default function SettingsTab() {
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

  // ── Manage Subscription ─────────────────────────────────────────────
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [noCustomer, setNoCustomer] = useState(false);

  async function handleManageSubscription() {
    setPortalLoading(true);
    setPortalError("");
    setNoCustomer(false);

    const { data: { session } } = await onspaceClient.auth.getSession();
    const token = session?.access_token;

    const { data, error } = await onspaceClient.functions.invoke("customer-portal", {
      body: {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const txt = await error.context?.text();
          if (txt) {
            try { const parsed = JSON.parse(txt); msg = parsed.error || parsed.message || txt; }
            catch { msg = txt; }
          }
        } catch { /* ignore */ }
      }
      if (msg.toLowerCase().includes("no stripe customer")) {
        setNoCustomer(true);
      } else {
        setPortalError(msg || "Unable to open billing portal. Please try again.");
      }
      setPortalLoading(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    } else {
      setPortalError("No portal URL returned. Please try again.");
      setPortalLoading(false);
    }
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

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm mt-0.5">Manage kiosk identity, announcements, and data backup</p>
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
                  placeholder="e.g. All staff: canteen closes at 3pm today."
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs flex-1">{announcementMsg.length}/200</span>
                  <button
                    onClick={() => previewAnnouncement(announcementMsg)}
                    disabled={!announcementMsg.trim()}
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

      {/* ══ Subscription ════════════════════════════════════════════════ */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <CreditCard size={16} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Subscription</p>
            <p className="text-slate-500 text-xs">Manage your plan, payment method, and invoices via the Stripe portal</p>
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
            <Info size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="text-violet-200 text-xs leading-relaxed">
              You'll be redirected to the Stripe billing portal where you can update your payment method, download invoices, switch plans, or cancel your subscription.
            </p>
          </div>

          {noCustomer && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 text-xs font-semibold mb-0.5">No active subscription found</p>
                <p className="text-amber-300/70 text-xs leading-relaxed">
                  Your account isn't linked to a Stripe subscription yet. Please go back to the home page and complete the sign-up payment flow.
                </p>
              </div>
            </div>
          )}

          {portalError && (
            <div className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border bg-red-500/10 border-red-500/20 text-red-300">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              {portalError}
            </div>
          )}

          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className={cn(
              "flex items-center gap-2 border text-sm font-semibold px-5 py-3 rounded-xl transition w-fit",
              portalLoading
                ? "bg-slate-700/60 border-slate-600/60 text-slate-500 cursor-not-allowed"
                : "bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/30 hover:border-violet-500/50 text-violet-300 hover:text-violet-200"
            )}
          >
            {portalLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CreditCard size={15} />
            )}
            {portalLoading ? "Opening portal…" : "Manage Subscription"}
            {!portalLoading && <ExternalLink size={12} className="opacity-60" />}
          </button>
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
    </div>
  );
}
