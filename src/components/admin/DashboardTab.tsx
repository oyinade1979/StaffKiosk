import { useState, useEffect, useCallback } from "react";
import { Users, UserCheck, UserMinus, LogIn, LogOut, Activity, TrendingUp, Clock } from "lucide-react";
import { getStaff, getTodayAttendance, getAttendance } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Event {
  type: "checkin" | "checkout";
  staffName: string;
  department: string;
  time: string;
  date: string;
}

function getTodayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function DashboardTab() {
  const [staff, setStaff] = useState(() => getStaff());
  const [todayRecords, setTodayRecords] = useState(() => getTodayAttendance());
  const [allRecords, setAllRecords] = useState(() => getAttendance());
  const [todayLabel, setTodayLabel] = useState(() => getTodayLabel());
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const refresh = useCallback(() => {
    setStaff(getStaff());
    setTodayRecords(getTodayAttendance());
    setAllRecords(getAttendance());
    setTodayLabel(getTodayLabel());
    setLastRefreshed(new Date());
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const totalStaff = staff.length;
  const todayCheckIns = todayRecords.length;
  const currentlyIn = todayRecords.filter((r) => !r.checkOutTime).length;
  const currentlyOut = todayRecords.filter((r) => !!r.checkOutTime).length;
  const attendanceRate = totalStaff > 0 ? Math.round((todayCheckIns / totalStaff) * 100) : 0;

  // Build a unified event list from all records
  const events: Event[] = [];
  for (const record of allRecords) {
    events.push({
      type: "checkin",
      staffName: record.staffName,
      department: record.department,
      time: record.checkInTime,
      date: record.date,
    });
    if (record.checkOutTime) {
      events.push({
        type: "checkout",
        staffName: record.staffName,
        department: record.department,
        time: record.checkOutTime,
        date: record.date,
      });
    }
  }

  // Sort: most recent date first, then by time string desc
  events.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
  const recentEvents = events.slice(0, 5);

  const isToday = (date: string) => date === new Date().toISOString().slice(0, 10);

  const stats = [
    {
      label: "Total Staff",
      value: totalStaff,
      sub: "registered members",
      icon: <Users size={20} />,
      color: "text-violet-400",
      bg: "bg-violet-500/15 border-violet-500/30",
    },
    {
      label: "Today's Check-Ins",
      value: todayCheckIns,
      sub: `${attendanceRate}% attendance rate`,
      icon: <TrendingUp size={20} />,
      color: "text-cyan-400",
      bg: "bg-cyan-500/15 border-cyan-500/30",
    },
    {
      label: "Currently In",
      value: currentlyIn,
      sub: "on premises now",
      icon: <UserCheck size={20} />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/15 border-emerald-500/30",
    },
    {
      label: "Checked Out",
      value: currentlyOut,
      sub: "left today",
      icon: <UserMinus size={20} />,
      color: "text-amber-400",
      bg: "bg-amber-500/15 border-amber-500/30",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-medium transition"
            title="Refresh now"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </button>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-semibold">Auto-refresh 30s</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border p-4 bg-slate-800/50 transition",
              s.bg
            )}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", s.bg, s.color)}>
              {s.icon}
            </div>
            <div>
              <p className={cn("text-3xl font-extrabold leading-none", s.color)}>{s.value}</p>
              <p className="text-white font-semibold text-sm mt-1">{s.label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance bar */}
      {totalStaff > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-cyan-400" />
              <p className="text-white font-semibold text-sm">Today's Attendance</p>
            </div>
            <span className="text-cyan-300 font-bold text-sm">{attendanceRate}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${attendanceRate}%`,
                background: "linear-gradient(90deg, #06b6d4, #8b5cf6)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-slate-500 text-xs">{todayCheckIns} checked in</span>
            <span className="text-slate-500 text-xs">{totalStaff - todayCheckIns} not yet arrived</span>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/60">
          <div className="w-8 h-8 rounded-xl bg-slate-700/60 border border-slate-600/60 flex items-center justify-center">
            <Clock size={15} className="text-slate-400" />
          </div>
          <p className="text-white font-semibold text-sm">Recent Activity</p>
          <span className="ml-auto text-slate-600 text-xs">Last 5 events</span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-600">
            <Activity size={32} className="opacity-40" />
            <p className="font-medium text-sm">No check-in events yet</p>
            <p className="text-xs">Scan a staff QR code at the kiosk to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {recentEvents.map((ev, idx) => {
              const isCheckin = ev.type === "checkin";
              const initials = ev.staffName.slice(0, 2).toUpperCase();
              const todayTag = isToday(ev.date);

              return (
                <div key={idx} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/40 transition">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-slate-700/60 border border-slate-600/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-slate-300 font-bold text-xs">{initials}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm truncate">{ev.staffName}</p>
                      <span className="text-slate-600 text-xs">·</span>
                      <p className="text-slate-500 text-xs">{ev.department}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isCheckin ? (
                        <LogIn size={11} className="text-emerald-400 flex-shrink-0" />
                      ) : (
                        <LogOut size={11} className="text-amber-400 flex-shrink-0" />
                      )}
                      <p className={cn("text-xs font-medium", isCheckin ? "text-emerald-400" : "text-amber-400")}>
                        {isCheckin ? "Checked in" : "Checked out"}
                      </p>
                    </div>
                  </div>

                  {/* Time + date badge */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-white font-mono text-sm font-semibold">{ev.time}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      todayTag
                        ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                        : "bg-slate-700/60 border border-slate-600/40 text-slate-500"
                    )}>
                      {todayTag ? "Today" : ev.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
