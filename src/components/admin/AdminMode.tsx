import { useState, useEffect } from "react";
import { LogOut, Users, ClipboardList, QrCode, Settings, LayoutDashboard, Clock } from "lucide-react";
import { onspaceClient } from "@/lib/onspaceClient";
import { FunctionsHttpError } from "@supabase/supabase-js";
import DashboardTab from "./DashboardTab";
import AttendanceTab from "./AttendanceTab";
import StaffTab from "./StaffTab";
import QRCodesTab from "./QRCodesTab";
import SettingsTab from "./SettingsTab";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import type { AdminTab } from "@/types";
import { cn } from "@/lib/utils";

interface AdminModeProps {
  onExit: () => void;
  onLock: () => void;
}

type ActiveView = AdminTab | "settings";

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { id: "attendance", label: "Attendance", icon: <ClipboardList size={17} /> },
  { id: "staff", label: "Staff", icon: <Users size={17} /> },
  { id: "qrcodes", label: "QR Codes", icon: <QrCode size={17} /> },
];

interface SubStatus {
  trialing: boolean;
  daysLeft: number | null;
  plan: string | null;
}

export default function AdminMode({ onExit, onLock }: AdminModeProps) {
  const [view, setView] = useState<ActiveView>("dashboard");
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);

  useInactivityTimer(true, onLock);

  // Fetch subscription status once on mount to show trial badge
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await onspaceClient.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const { data, error } = await onspaceClient.functions.invoke("check-subscription", {
          body: {},
          headers: { Authorization: `Bearer ${token}` },
        });

        if (error) {
          if (error instanceof FunctionsHttpError) {
            try { await error.context?.text(); } catch { /* ignore */ }
          }
          return;
        }

        if (data?.trialing) {
          const endDate = data.trial_end ? new Date(data.trial_end) : null;
          const daysLeft = endDate
            ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;
          setSubStatus({ trialing: true, daysLeft, plan: "trial" });
        } else if (data?.subscribed) {
          setSubStatus({ trialing: false, daysLeft: null, plan: data.plan ?? null });
        }
      } catch {
        // Non-critical — silently ignore
      }
    })();
  }, []);

  const isSettings = view === "settings";

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1a2540 100%)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <span className="text-violet-400 text-lg">⚙️</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Admin Panel</h1>
            <p className="text-slate-500 text-xs">Staff Check-In System</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Trial / plan badge */}
          {subStatus?.trialing && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl px-3 py-1.5">
              <Clock size={12} className="text-amber-400 flex-shrink-0" />
              <span className="text-amber-300 text-xs font-semibold whitespace-nowrap">
                Trial
                {subStatus.daysLeft !== null && (
                  <> · {subStatus.daysLeft} day{subStatus.daysLeft !== 1 ? "s" : ""} left</>
                )}
              </span>
            </div>
          )}
          {subStatus && !subStatus.trialing && subStatus.plan && (
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-emerald-300 text-xs font-semibold capitalize whitespace-nowrap">
                {subStatus.plan} · Active
              </span>
            </div>
          )}

          {/* Settings gear button */}
          <button
            onClick={() => setView(isSettings ? "dashboard" : "settings")}
            title="Settings"
            className={cn(
              "w-10 h-10 rounded-xl border flex items-center justify-center transition",
              isSettings
                ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
            )}
          >
            <Settings size={17} />
          </button>

          <button
            onClick={onExit}
            className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 border border-slate-700 text-slate-400 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            <LogOut size={15} />
            Exit to Kiosk
          </button>
        </div>
      </div>

      {/* Tab nav — hidden while settings is active */}
      {!isSettings && (
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-semibold transition border-b-2 -mb-px",
                view === t.id
                  ? "text-cyan-400 border-cyan-400 bg-cyan-500/5"
                  : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Settings header band */}
      {isSettings && (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 bg-violet-500/5">
          <Settings size={15} className="text-violet-400" />
          <span className="text-violet-400 text-sm font-semibold">Settings</span>
          <button
            onClick={() => setView("dashboard")}
            className="ml-auto text-slate-500 hover:text-slate-300 text-xs transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
        {view === "dashboard" && <DashboardTab />}
        {view === "attendance" && <AttendanceTab />}
        {view === "staff" && <StaffTab />}
        {view === "qrcodes" && <QRCodesTab />}
        {view === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
