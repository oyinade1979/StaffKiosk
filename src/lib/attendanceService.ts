/**
 * Supabase attendance service — async CRUD for check-in/check-out records.
 *
 * Run this SQL once in your Supabase SQL Editor:
 * ─────────────────────────────────────────────────────────────────────
 * create table if not exists public.attendance (
 *   id            text primary key,
 *   staff_id      text not null,
 *   staff_name    text not null,
 *   department    text not null,
 *   check_in_time text not null,
 *   check_out_time text,
 *   shift_duration text,
 *   date          text not null,
 *   created_at    timestamptz not null default now()
 * );
 * alter table public.attendance enable row level security;
 * create policy "Allow all" on public.attendance for all using (true) with check (true);
 * ─────────────────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import type { AttendanceRecord } from "@/types";

const TABLE = "attendance";
const LOCAL_KEY = "kiosk_attendance";

// ── Row mapping ──────────────────────────────────────────────────────
function rowToRecord(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: row.id as string,
    staffId: row.staff_id as string,
    staffName: row.staff_name as string,
    department: row.department as string,
    checkInTime: row.check_in_time as string,
    checkOutTime: (row.check_out_time as string | null) ?? undefined,
    shiftDuration: (row.shift_duration as string | null) ?? undefined,
    date: row.date as string,
  };
}

function recordToRow(r: AttendanceRecord) {
  return {
    id: r.id,
    staff_id: r.staffId,
    staff_name: r.staffName,
    department: r.department,
    check_in_time: r.checkInTime,
    check_out_time: r.checkOutTime ?? null,
    shift_duration: r.shiftDuration ?? null,
    date: r.date,
  };
}

// ── Local cache helpers ──────────────────────────────────────────────
function getLocal(): AttendanceRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLocal(records: AttendanceRecord[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records));
}

// ── Public API ───────────────────────────────────────────────────────

/** Fetch all attendance records from Supabase, sync to localStorage */
export async function fetchAttendance(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.warn("[attendanceService] Supabase fetch error — falling back to localStorage:", error.message);
    return getLocal();
  }

  const records = (data ?? []).map(rowToRecord);
  saveLocal(records);
  return records;
}

/** Fetch attendance records for a specific date */
export async function fetchAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("date", date)
    .order("check_in_time", { ascending: true });

  if (error) {
    console.warn("[attendanceService] Supabase fetch by date error:", error.message);
    return getLocal().filter((r) => r.date === date);
  }

  return (data ?? []).map(rowToRecord);
}

/** Fetch today's attendance */
export async function fetchTodayAttendance(): Promise<AttendanceRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  return fetchAttendanceByDate(today);
}

/** Upsert (insert or update) a single attendance record */
export async function upsertAttendance(record: AttendanceRecord): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(recordToRow(record));
  if (error) {
    console.warn("[attendanceService] Supabase upsert error:", error.message);
  }
  // Always sync to localStorage
  const local = getLocal();
  const idx = local.findIndex((r) => r.id === record.id);
  if (idx === -1) {
    saveLocal([...local, record]);
  } else {
    local[idx] = record;
    saveLocal(local);
  }
}

/** Check in a staff member — creates attendance record in Supabase + localStorage */
export async function cloudCheckIn(
  staffId: string,
  staffName: string,
  department: string
): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().slice(0, 10);

  // Check if already checked in today (look in Supabase)
  const { data: existing, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("staff_id", staffId)
    .eq("date", today)
    .maybeSingle();

  if (fetchErr) {
    console.warn("[attendanceService] Check-in lookup error:", fetchErr.message);
  }

  if (existing) {
    // Already has a record today — return it
    return rowToRecord(existing as Record<string, unknown>);
  }

  const record: AttendanceRecord = {
    id: `ATT-${Date.now()}`,
    staffId,
    staffName,
    department,
    checkInTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: today,
  };

  await upsertAttendance(record);
  return record;
}

/** Check out a staff member — updates existing attendance record */
export async function cloudCheckOut(
  staffId: string
): Promise<{ record: AttendanceRecord; alreadyOut: boolean } | null> {
  const today = new Date().toISOString().slice(0, 10);

  // Find today's record
  const { data: existing, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("staff_id", staffId)
    .eq("date", today)
    .maybeSingle();

  if (error || !existing) {
    // Fall back to localStorage
    const local = getLocal();
    const localRecord = local.find((r) => r.staffId === staffId && r.date === today);
    if (!localRecord) return null;
    if (localRecord.checkOutTime) return { record: localRecord, alreadyOut: true };
    return null;
  }

  const rec = rowToRecord(existing as Record<string, unknown>);

  if (rec.checkOutTime) {
    return { record: rec, alreadyOut: true };
  }

  const checkOutTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const updated: AttendanceRecord = {
    ...rec,
    checkOutTime,
    shiftDuration: formatDuration(rec.checkInTime, checkOutTime),
  };

  await upsertAttendance(updated);
  return { record: updated, alreadyOut: false };
}

// ── Helper ───────────────────────────────────────────────────────────
function formatDuration(inTime: string, outTime: string): string {
  const parse = (t: string) => {
    const clean = t.replace(/\s*(AM|PM)\s*/i, "");
    const [h, m] = clean.split(":").map(Number);
    const isPM = /PM/i.test(t);
    const hours = h % 12 + (isPM ? 12 : 0);
    return hours * 60 + m;
  };
  const diff = Math.max(0, parse(outTime) - parse(inTime));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
