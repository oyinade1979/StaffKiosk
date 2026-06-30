/**
 * Supabase attendance service — syncs check-in/check-out records.
 *
 * Matches the existing Supabase attendance table schema:
 *   id            uuid  primary key
 *   company_id    uuid
 *   staff_id      uuid
 *   check_in      timestamptz
 *   check_out     timestamptz (nullable)
 *   created_at    timestamptz
 *   staff_name    text  (add via SQL below if missing)
 *   department    text  (add via SQL below if missing)
 *   date          text  (add via SQL below if missing)
 *   shift_duration text (add via SQL below if missing)
 *
 * Run once in Supabase SQL Editor to add missing columns:
 * ─────────────────────────────────────────────────────────
 * ALTER TABLE public.attendance
 *   ADD COLUMN IF NOT EXISTS staff_name text,
 *   ADD COLUMN IF NOT EXISTS department text,
 *   ADD COLUMN IF NOT EXISTS date text,
 *   ADD COLUMN IF NOT EXISTS shift_duration text;
 * ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
 * DO $$ BEGIN
 *   IF NOT EXISTS (
 *     SELECT 1 FROM pg_policies WHERE tablename='attendance' AND policyname='Allow all'
 *   ) THEN
 *     CREATE POLICY "Allow all" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
 *   END IF;
 * END $$;
 * ─────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import type { AttendanceRecord } from "@/types";

const TABLE = "attendance";
const LOCAL_KEY = "kiosk_attendance";

// ── Row → AttendanceRecord ───────────────────────────────────────────
function rowToRecord(row: Record<string, unknown>): AttendanceRecord {
  // check_in and check_out are ISO timestamp strings from Supabase
  const checkInISO = row.check_in as string | null;
  const checkOutISO = row.check_out as string | null;

  // Derive display time (HH:MM AM/PM) from ISO timestamp
  const toTimeStr = (iso: string | null) => {
    if (!iso) return undefined;
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Derive date string (YYYY-MM-DD) from check_in timestamp
  const toDateStr = (iso: string | null) => {
    if (!iso) return new Date().toISOString().slice(0, 10);
    return new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD
  };

  const checkInTime = (row.check_in_time as string | null) ?? toTimeStr(checkInISO) ?? "";
  const checkOutTime = (row.check_out_time as string | null) ?? toTimeStr(checkOutISO ?? null) ?? undefined;
  const date = (row.date as string | null) ?? toDateStr(checkInISO);

  return {
    id: row.id as string,
    staffId: row.staff_id as string,
    staffName: (row.staff_name as string | null) ?? "Unknown",
    department: (row.department as string | null) ?? "",
    checkInTime,
    checkOutTime,
    shiftDuration: (row.shift_duration as string | null) ?? undefined,
    date,
  };
}

// ── AttendanceRecord → DB row ────────────────────────────────────────
function recordToRow(r: AttendanceRecord) {
  // Convert HH:MM AM/PM back to ISO timestamp using the record date
  const toISO = (timeStr: string | undefined, dateStr: string): string | null => {
    if (!timeStr) return null;
    // Combine date + time string into a Date and get ISO
    const dt = new Date(`${dateStr} ${timeStr}`);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  return {
    id: r.id,
    staff_id: r.staffId,
    staff_name: r.staffName,
    department: r.department,
    date: r.date,
    check_in: toISO(r.checkInTime, r.date),
    check_out: r.checkOutTime ? toISO(r.checkOutTime, r.date) : null,
    shift_duration: r.shiftDuration ?? null,
    // Store display strings too for easy retrieval
    check_in_time: r.checkInTime,
    check_out_time: r.checkOutTime ?? null,
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
    .order("check_in", { ascending: false });

  if (error) {
    console.warn("[attendanceService] Supabase fetch error — falling back to localStorage:", error.message);
    return getLocal();
  }

  const records = (data ?? []).map(rowToRecord);
  saveLocal(records);
  return records;
}

/** Upsert (insert or update) a single attendance record */
export async function upsertAttendance(record: AttendanceRecord): Promise<void> {
  const row = recordToRow(record);
  console.log("[attendanceService] upsert row:", row);
  const { error } = await supabase.from(TABLE).upsert(row);
  if (error) {
    console.warn("[attendanceService] Supabase upsert error:", error.message);
  }
  // Always sync to localStorage
  const local = getLocal();
  const idx = local.findIndex((r) => r.id === record.id);
  if (idx === -1) {
    saveLocal([record, ...local]);
  } else {
    local[idx] = record;
    saveLocal(local);
  }
}

/** Check in a staff member — creates attendance record */
export async function cloudCheckIn(
  staffId: string,
  staffName: string,
  department: string
): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().slice(0, 10);

  // Check if already checked in today (Supabase)
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
    return rowToRecord(existing as Record<string, unknown>);
  }

  const now = new Date();
  const checkInTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const record: AttendanceRecord = {
    id: crypto.randomUUID(),
    staffId,
    staffName,
    department,
    checkInTime,
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

  // Find today's check-in record
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

// ── Duration helper ──────────────────────────────────────────────────
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
