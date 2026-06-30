import { APP_STORAGE_KEYS, DEFAULT_ADMIN_PIN, DEFAULT_COMPANY_NAME, DEFAULT_WELCOME_MESSAGE, DEFAULT_ANNOUNCEMENT, DEFAULT_ANNOUNCEMENT_INTERVAL } from "@/constants";

// ── Company ID ─────────────────────────────────────────────────────────
/** Returns a stable unique ID for this company/installation. Auto-generated on first use. */
export function getCompanyId(): string {
  let id = localStorage.getItem(APP_STORAGE_KEYS.companyId);
  if (!id) {
    id = `co_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(APP_STORAGE_KEYS.companyId, id);
  }
  return id;
}
import type { StaffMember, AttendanceRecord } from "@/types";

// ── PIN ────────────────────────────────────────────────────────────────
export function getPin(): string {
  return localStorage.getItem(APP_STORAGE_KEYS.pin) ?? DEFAULT_ADMIN_PIN;
}

export function setPin(newPin: string): void {
  localStorage.setItem(APP_STORAGE_KEYS.pin, newPin);
}

// ── Staff ──────────────────────────────────────────────────────────────
/** Returns ALL staff records across all companies (for backup/restore) */
export function getAllStaff(): StaffMember[] {
  try {
    return JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.staff) ?? "[]");
  } catch {
    return [];
  }
}

/** Returns staff scoped to the current company */
export function getStaff(): StaffMember[] {
  const companyId = getCompanyId();
  return getAllStaff().filter((s) => !s.companyId || s.companyId === companyId);
}

/** Saves a full staff array (replaces entire store — used internally & for restore) */
export function saveStaff(staff: StaffMember[]): void {
  localStorage.setItem(APP_STORAGE_KEYS.staff, JSON.stringify(staff));
}

export function addStaffMember(member: Omit<StaffMember, "id" | "qrCode" | "createdAt">): StaffMember {  // member includes email
  const staff = getStaff();
  const id = `STAFF-${Date.now()}`;
  const newMember: StaffMember = {
    ...member,
    id,
    qrCode: id,
    createdAt: new Date().toISOString(),
    companyId: getCompanyId(),
  };
  saveStaff([...staff, newMember]);
  return newMember;
}

export function removeStaffMember(id: string): void {
  // Remove from the full store (not just filtered view)
  saveStaff(getAllStaff().filter((s) => s.id !== id));
}

export function updateStaffMember(
  id: string,
  updates: Partial<Pick<StaffMember, "name" | "department" | "email">>
): StaffMember | null {
  const staff = getAllStaff();
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const updated = { ...staff[idx], ...updates };
  staff[idx] = updated;
  saveStaff(staff);
  return updated;
}

// ── Attendance ─────────────────────────────────────────────────────────
export function getAttendance(): AttendanceRecord[] {
  try {
    return JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.attendance) ?? "[]");
  } catch {
    return [];
  }
}

export function getTodayAttendance(): AttendanceRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return getAttendance().filter((r) => r.date === today);
}

export function getAttendanceByDate(date: string): AttendanceRecord[] {
  return getAttendance().filter((r) => r.date === date);
}

function formatDuration(inTime: string, outTime: string): string {
  // Both are HH:MM strings (locale)
  const parse = (t: string) => {
    const [h, m] = t.replace(/ (AM|PM)/i, "").split(":").map(Number);
    const isPM = /PM/i.test(t);
    let hours = h % 12 + (isPM ? 12 : 0);
    return hours * 60 + m;
  };
  const diff = Math.max(0, parse(outTime) - parse(inTime));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export type ScanAction = "checkin" | "checkout" | "already_out" | "unknown";

// ── Company / Kiosk Settings ──────────────────────────────────────────
export function getCompanyName(): string {
  return localStorage.getItem(APP_STORAGE_KEYS.companyName) ?? DEFAULT_COMPANY_NAME;
}
export function setCompanyName(name: string): void {
  localStorage.setItem(APP_STORAGE_KEYS.companyName, name);
}
export function getWelcomeMessage(): string {
  return localStorage.getItem(APP_STORAGE_KEYS.welcomeMessage) ?? DEFAULT_WELCOME_MESSAGE;
}
export function setWelcomeMessage(msg: string): void {
  localStorage.setItem(APP_STORAGE_KEYS.welcomeMessage, msg);
}

// ── Announcement ──────────────────────────────────────────────────────
export function getAnnouncement(): string {
  return localStorage.getItem(APP_STORAGE_KEYS.announcement) ?? DEFAULT_ANNOUNCEMENT;
}
export function setAnnouncement(msg: string): void {
  localStorage.setItem(APP_STORAGE_KEYS.announcement, msg);
}
export function getAnnouncementEnabled(): boolean {
  const v = localStorage.getItem(APP_STORAGE_KEYS.announcementEnabled);
  return v === null ? false : v === "true";
}
export function setAnnouncementEnabled(enabled: boolean): void {
  localStorage.setItem(APP_STORAGE_KEYS.announcementEnabled, String(enabled));
}
export function getAnnouncementInterval(): number {
  const v = localStorage.getItem(APP_STORAGE_KEYS.announcementInterval);
  return v ? parseInt(v, 10) : DEFAULT_ANNOUNCEMENT_INTERVAL;
}
export function setAnnouncementInterval(minutes: number): void {
  localStorage.setItem(APP_STORAGE_KEYS.announcementInterval, String(minutes));
}

// ── Backup / Restore ──────────────────────────────────────────────────
export function exportAllData(): string {
  const data = {
    staff: getAllStaff(),
    companyId: getCompanyId(),
    attendance: getAttendance(),
    pin: getPin(),
    companyName: getCompanyName(),
    welcomeMessage: getWelcomeMessage(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export type RestoreResult = { ok: true } | { ok: false; error: string };
export function importAllData(jsonStr: string): RestoreResult {
  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data.staff) || !Array.isArray(data.attendance)) {
      return { ok: false, error: "Invalid backup file: missing staff or attendance arrays." };
    }
    // Restore company ID so staff scoping remains consistent
    if (data.companyId) localStorage.setItem(APP_STORAGE_KEYS.companyId, data.companyId);
    saveStaff(data.staff);
    localStorage.setItem(APP_STORAGE_KEYS.attendance, JSON.stringify(data.attendance));
    if (data.pin && /^\d{4}$/.test(data.pin)) setPin(data.pin);
    if (data.companyName) setCompanyName(data.companyName);
    if (data.welcomeMessage) setWelcomeMessage(data.welcomeMessage);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not parse backup file. Make sure it is a valid .json file." };
  }
}

export function recordCheckIn(
  staffId: string
): { record: AttendanceRecord; action: ScanAction } | null {
  const staff = getStaff().find((s) => s.id === staffId || s.qrCode === staffId);
  if (!staff) return null;

  const today = new Date().toISOString().slice(0, 10);
  const all = getAttendance();
  const existingIdx = all.findIndex((r) => r.staffId === staff.id && r.date === today);

  if (existingIdx === -1) {
    // First scan — check in
    const record: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      staffId: staff.id,
      staffName: staff.name,
      department: staff.department,
      checkInTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: today,
    };
    localStorage.setItem(APP_STORAGE_KEYS.attendance, JSON.stringify([...all, record]));
    return { record, action: "checkin" };
  }

  const existing = all[existingIdx];

  if (existing.checkOutTime) {
    // Already fully checked out
    return { record: existing, action: "already_out" };
  }

  // Second scan — check out
  const checkOutTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const updated: AttendanceRecord = {
    ...existing,
    checkOutTime,
    shiftDuration: formatDuration(existing.checkInTime, checkOutTime),
  };
  const updatedAll = [...all];
  updatedAll[existingIdx] = updated;
  localStorage.setItem(APP_STORAGE_KEYS.attendance, JSON.stringify(updatedAll));
  return { record: updated, action: "checkout" };
}
