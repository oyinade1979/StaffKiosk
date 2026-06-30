/**
 * Supabase attendance service — syncs check-in/check-out records.
 *
 * Works with the ORIGINAL Supabase attendance table schema (no migration needed):
 *   id            uuid  primary key
 *   company_id    uuid  (unused — we pass null)
 *   staff_id      uuid
 *   check_in      timestamptz
 *   check_out     timestamptz (nullable)
 *   created_at    timestamptz
 *
 * Staff name / department are resolved by joining against the local staff cache.
 */

import { supabase } from "@/lib/supabase";
import { fetchStaff } from "@/lib/staffService";
import type { AttendanceRecord } from "@/types";

const TABLE = "attendance";
const LOCAL_KEY = "kiosk_attendance";

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

// ── Row → AttendanceRecord ───────────────────────────────────────────
// Resolves staff name/department from the provided staff lookup map.
function rowToRecord(
  row: Record<string, unknown>,
  staffMap: Map<string, { name: string; department: string }>
): AttendanceRecord {
  const checkInISO = row.check_in as string | null;
  const checkOutISO = row.check_out as string | null;

  const toTimeStr = (iso: string | null): string | undefined => {
    if (!iso) return undefined;
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Use local date (not UTC) to match the date used in check-in
  const toDateStr = (iso: string | null): string => {
    if (!iso) return new Date().toLocaleDateString("en-CA");
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const staffId = row.staff_id as string;
  const staffInfo = staffMap.get(staffId);
  const checkInTime = toTimeStr(checkInISO) ?? "";
  const checkOutTime = toTimeStr(checkOutISO ?? null);
  const date = toDateStr(checkInISO);

  // Compute shift duration if both times exist
  let shiftDuration: string | undefined;
  if (checkInTime && checkOutTime) {
    shiftDuration = formatDuration(checkInTime, checkOutTime);
  }

  return {
    id: row.id as string,
    staffId,
    staffName: staffInfo?.name ?? (row.staff_name as string | null) ?? "Unknown",
    department: staffInfo?.department ?? (row.department as string | null) ?? "",
    checkInTime,
    checkOutTime,
    shiftDuration,
    date,
  };
}

// Stable company UUID — used to satisfy the NOT NULL company_id column
const COMPANY_UUID = "00000000-0000-0000-0000-000000000001";

// ── AttendanceRecord → DB row (only original columns) ───────────────
function recordToRow(r: AttendanceRecord) {
  const toISO = (timeStr: string | undefined, dateStr: string): string | null => {
    if (!timeStr) return null;
    // Build a local-time date string to avoid UTC offset issues
    const dt = new Date(`${dateStr}T${to24h(timeStr)}`);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  };

  return {
    id: r.id,
    company_id: COMPANY_UUID,
    staff_id: r.staffId,
    check_in: toISO(r.checkInTime, r.date),
    check_out: r.checkOutTime ? toISO(r.checkOutTime, r.date) : null,
  };
}

/** Convert "HH:MM AM/PM" or "HH:MM" to 24-hour "HH:MM:00" */
function to24h(timeStr: string): string {
  const isPM = /PM/i.test(timeStr);
  const isAM = /AM/i.test(timeStr);
  const clean = timeStr.replace(/\s*(AM|PM)\s*/i, "");
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

// ── Public API ───────────────────────────────────────────────────────

/** Fetch all attendance records from Supabase, sync to localStorage */
export async function fetchAttendance(): Promise<AttendanceRecord[]> {
  // Load staff for name/department resolution
  const staffList = await fetchStaff();
  const staffMap = new Map(staffList.map((s) => [s.id, { name: s.name, department: s.department }]));

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("check_in", { ascending: false });

  if (error) {
    console.warn("[attendanceService] Supabase fetch error — falling back to localStorage:", error.message);
    return getLocal();
  }

  const remoteRecords = (data ?? []).map((row) => rowToRecord(row as Record<string, unknown>, staffMap));

  // If Supabase returned rows, use them. Otherwise keep localStorage (prevents overwrite on failed upserts).
  if (remoteRecords.length > 0) {
    saveLocal(remoteRecords);
    return remoteRecords;
  }

  // Supabase returned 0 rows — could be legitimately empty OR upsert failures.
  // Merge: prefer local records so check-ins aren't lost.
  const local = getLocal();
  console.log("[attendanceService] Supabase returned 0 rows, using localStorage fallback (", local.length, "records)");
  return local;
}

/** Upsert (insert or update) a single attendance record to Supabase + localStorage */
async function upsertAttendance(record: AttendanceRecord): Promise<void> {
  const row = recordToRow(record);
  console.log("[attendanceService] upsert row:", row);
  const { error } = await supabase.from(TABLE).upsert(row);
  if (error) {
    console.warn("[attendanceService] Supabase upsert error:", error.message);
  } else {
    console.log("[attendanceService] upsert OK for", record.staffName);
  }

  // Always update localStorage regardless of Supabase outcome
  const local = getLocal();
  const idx = local.findIndex((r) => r.id === record.id);
  if (idx === -1) {
    saveLocal([record, ...local]);
  } else {
    local[idx] = record;
    saveLocal(local);
  }
}

/** Get today's date string in local time (YYYY-MM-DD) */
function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Check in a staff member — creates attendance record */
export async function cloudCheckIn(
  staffId: string,
  staffName: string,
  department: string
): Promise<AttendanceRecord | null> {
  const today = getLocalToday();
  // Use UTC midnight boundaries to cover the full local day regardless of timezone
  const todayStart = new Date(today + "T00:00:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59").toISOString();

  // Check if already checked in today via Supabase
  const { data: existing, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("staff_id", staffId)
    .gte("check_in", todayStart)
    .lte("check_in", todayEnd)
    .maybeSingle();

  if (fetchErr) {
    console.warn("[attendanceService] Check-in lookup error:", fetchErr.message);
  }

  if (existing) {
    console.log("[attendanceService] already checked in today");
    const staffMap = new Map([[staffId, { name: staffName, department }]]);
    return rowToRecord(existing as Record<string, unknown>, staffMap);
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
  const today = getLocalToday();
  const todayStart = new Date(today + "T00:00:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59").toISOString();

  // Find today's check-in from Supabase
  const { data: existing, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("staff_id", staffId)
    .gte("check_in", todayStart)
    .lte("check_in", todayEnd)
    .maybeSingle();

  if (error || !existing) {
    // Fall back to localStorage
    const local = getLocal();
    const localRecord = local.find((r) => r.staffId === staffId && r.date === today);
    if (!localRecord) return null;
    if (localRecord.checkOutTime) return { record: localRecord, alreadyOut: true };
    return null;
  }

  const staffMap = new Map([[staffId, { name: "", department: "" }]]);
  const rec = rowToRecord(existing as Record<string, unknown>, staffMap);

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
