import { useState, useMemo, useRef } from "react";
import {
  RefreshCw, Users, Clock, Building2, Download, ChevronDown,
  ChevronLeft, ChevronRight, CalendarDays, CalendarRange,
} from "lucide-react";
import { getAttendance, getAttendanceByDate } from "@/lib/storage";
import type { AttendanceRecord } from "@/types";
import { cn } from "@/lib/utils";

function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

type ViewMode = "single" | "range";

export default function AttendanceTab() {
  const todayStr = toLocalDateStr(new Date());

  // ── View mode ──────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("single");

  // ── Single-date state ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // ── Range state ────────────────────────────────────────────────────
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toLocalDateStr(d);
  });
  const [rangeTo, setRangeTo] = useState(todayStr);
  const rangeFromRef = useRef<HTMLInputElement>(null);
  const rangeToRef = useRef<HTMLInputElement>(null);

  const [deptFilter, setDeptFilter] = useState<string>("All");

  // ── Derived records ────────────────────────────────────────────────
  const records = useMemo<AttendanceRecord[]>(() => {
    if (viewMode === "single") {
      return getAttendanceByDate(selectedDate);
    }
    return getAttendance().filter((r) => r.date >= rangeFrom && r.date <= rangeTo);
  }, [viewMode, selectedDate, rangeFrom, rangeTo]);

  // Force re-compute when user clicks refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshedRecords = useMemo<AttendanceRecord[]>(() => {
    void refreshKey;
    if (viewMode === "single") return getAttendanceByDate(selectedDate);
    return getAttendance().filter((r) => r.date >= rangeFrom && r.date <= rangeTo);
  }, [viewMode, selectedDate, rangeFrom, rangeTo, refreshKey]);

  const activeRecords = refreshedRecords;

  // ── Helpers ────────────────────────────────────────────────────────
  function loadDate(dateStr: string) {
    setSelectedDate(dateStr);
    setDeptFilter("All");
  }

  function goToPrev() {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    loadDate(toLocalDateStr(d));
  }

  function goToNext() {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const next = toLocalDateStr(d);
    if (next <= todayStr) loadDate(next);
  }

  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate >= todayStr;

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString([], {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const rangeLabel = useMemo(() => {
    if (rangeFrom === rangeTo) return new Date(rangeFrom + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    const f = new Date(rangeFrom + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
    const t = new Date(rangeTo + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    return `${f} – ${t}`;
  }, [rangeFrom, rangeTo]);

  // ── Departments ────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const seen = new Set<string>();
    activeRecords.forEach((r) => seen.add(r.department));
    return ["All", ...Array.from(seen).sort()];
  }, [activeRecords]);

  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeRecords.forEach((r) => { map[r.department] = (map[r.department] ?? 0) + 1; });
    return map;
  }, [activeRecords]);

  const filtered = useMemo(
    () => (deptFilter === "All" ? activeRecords : activeRecords.filter((r) => r.department === deptFilter)),
    [activeRecords, deptFilter]
  );

  // ── Export CSV ─────────────────────────────────────────────────────
  function exportCSV() {
    const header = "Name,Department,Date,Check-In Time,Check-Out Time,Shift Duration";
    const rows = activeRecords.map((r) =>
      `"${r.staffName}","${r.department}","${r.date}","${r.checkInTime}","${r.checkOutTime ?? "Not checked out"}","${r.shiftDuration ?? "In progress"}"`
    );
    // BOM + CSV for correct Excel encoding
    const csv = "\uFEFF" + [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = viewMode === "single"
      ? `attendance-${selectedDate}.csv`
      : `attendance-${rangeFrom}-to-${rangeTo}.csv`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-white">Attendance Records</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {viewMode === "single"
                ? <>{displayDate}{isToday && <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full px-2 py-0.5 font-semibold">Today</span>}</>
                : <span className="text-cyan-400 font-medium">{rangeLabel}</span>
              }
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View mode toggle */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              <button
                onClick={() => { setViewMode("single"); setDeptFilter("All"); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                  viewMode === "single"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <CalendarDays size={13} /> Single Day
              </button>
              <button
                onClick={() => { setViewMode("range"); setDeptFilter("All"); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition",
                  viewMode === "range"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <CalendarRange size={13} /> Date Range
              </button>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2">
              <Users size={16} className="text-emerald-400" />
              <span className="text-emerald-400 font-bold text-lg">{activeRecords.length}</span>
              <span className="text-emerald-400/70 text-sm">records</span>
            </div>

            {/* Department filter */}
            <div className="relative">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 text-sm font-medium pl-4 pr-9 py-2 rounded-xl transition cursor-pointer focus:outline-none focus:border-cyan-500/50"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            <button
              onClick={exportCSV}
              disabled={activeRecords.length === 0}
              className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400 px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              <Download size={15} />
              Export CSV
            </button>

            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ── Date navigation (single mode) ── */}
        {viewMode === "single" && (
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrev}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition"
              aria-label="Previous day"
            >
              <ChevronLeft size={17} />
            </button>

            <div className="relative">
              <button
                onClick={() => dateInputRef.current?.showPicker?.()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2 text-slate-300 text-sm font-medium transition"
              >
                <CalendarDays size={15} className="text-cyan-400" />
                {selectedDate}
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => { if (e.target.value && e.target.value <= todayStr) loadDate(e.target.value); }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                aria-label="Pick a date"
              />
            </div>

            <button
              onClick={goToNext}
              disabled={isFuture}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Next day"
            >
              <ChevronRight size={17} />
            </button>

            {!isToday && (
              <button
                onClick={() => loadDate(todayStr)}
                className="ml-1 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 px-3 py-1.5 rounded-lg transition font-semibold"
              >
                Jump to Today
              </button>
            )}
          </div>
        )}

        {/* ── Date range picker ── */}
        {viewMode === "range" && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">From</span>
              <div className="relative">
                <button
                  onClick={() => rangeFromRef.current?.showPicker?.()}
                  className="flex items-center gap-2 text-slate-300 text-sm font-mono hover:text-white transition"
                >
                  <CalendarDays size={13} className="text-cyan-400" />
                  {rangeFrom}
                </button>
                <input
                  ref={rangeFromRef}
                  type="date"
                  value={rangeFrom}
                  max={rangeTo}
                  onChange={(e) => { if (e.target.value) { setRangeFrom(e.target.value); setDeptFilter("All"); } }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>

            <ChevronRight size={16} className="text-slate-600" />

            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">To</span>
              <div className="relative">
                <button
                  onClick={() => rangeToRef.current?.showPicker?.()}
                  className="flex items-center gap-2 text-slate-300 text-sm font-mono hover:text-white transition"
                >
                  <CalendarDays size={13} className="text-cyan-400" />
                  {rangeTo}
                </button>
                <input
                  ref={rangeToRef}
                  type="date"
                  value={rangeTo}
                  min={rangeFrom}
                  max={todayStr}
                  onChange={(e) => { if (e.target.value) { setRangeTo(e.target.value); setDeptFilter("All"); } }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>

            {/* Quick range presets */}
            <div className="flex items-center gap-1.5">
              {[
                { label: "7 days", days: 6 },
                { label: "14 days", days: 13 },
                { label: "30 days", days: 29 },
              ].map(({ label, days }) => {
                const from = toLocalDateStr(new Date(new Date().setDate(new Date().getDate() - days)));
                const active = rangeFrom === from && rangeTo === todayStr;
                return (
                  <button
                    key={label}
                    onClick={() => { setRangeFrom(from); setRangeTo(todayStr); setDeptFilter("All"); }}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition",
                      active
                        ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Department summary chips ── */}
      {activeRecords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(deptCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([dept, count]) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(deptFilter === dept ? "All" : dept)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition",
                  deptFilter === dept
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                )}
              >
                <Building2 size={12} />
                {dept}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-bold",
                  deptFilter === dept ? "bg-cyan-500/30 text-cyan-300" : "bg-slate-700 text-slate-400"
                )}>{count}</span>
              </button>
            ))}
        </div>
      )}

      {/* ── Records list ── */}
      {activeRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Clock size={40} className="opacity-40" />
          <p className="text-lg font-medium">
            {viewMode === "single"
              ? `No check-ins ${isToday ? "yet today" : "on this date"}`
              : "No records in this date range"}
          </p>
          <p className="text-sm">
            {viewMode === "single" ? (isToday ? "Records appear here as staff scan in" : "Try a different date") : "Try expanding the date range"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <Building2 size={36} className="opacity-40" />
          <p className="text-lg font-medium">No records for this department</p>
          <button onClick={() => setDeptFilter("All")} className="text-sm text-cyan-400 hover:text-cyan-300 transition">
            Clear filter
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-4 hover:bg-slate-800 transition"
            >
              <span className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">
                {i + 1}
              </span>

              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">
                  {r.staffName.slice(0, 2).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{r.staffName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Building2 size={12} className="text-slate-500" />
                    <p className="text-slate-400 text-sm truncate">{r.department}</p>
                  </div>
                  {viewMode === "range" && (
                    <span className="text-slate-600 text-xs font-mono">{r.date}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  <Clock size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 font-mono font-semibold text-sm">{r.checkInTime}</span>
                </div>
                {r.checkOutTime ? (
                  <>
                    <span className="text-slate-600 text-xs">→</span>
                    <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5">
                      <Clock size={13} className="text-violet-400" />
                      <span className="text-violet-400 font-mono font-semibold text-sm">{r.checkOutTime}</span>
                    </div>
                    <div className="bg-slate-700/60 border border-slate-600/40 rounded-lg px-2.5 py-1.5">
                      <span className="text-slate-300 font-semibold text-xs">{r.shiftDuration}</span>
                    </div>
                  </>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-amber-400 text-xs font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
