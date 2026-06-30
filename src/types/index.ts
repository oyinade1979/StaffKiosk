// Types for the kiosk application
export interface StaffMember {
  id: string;
  name: string;
  department: string;
  email: string;   // Work email for QR delivery
  qrCode: string; // Unique staff ID used as QR content
  createdAt: string;
  companyId: string; // Scopes staff to the company they were added under
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  checkInTime: string;
  checkOutTime?: string;   // set on second scan
  shiftDuration?: string;  // e.g. "3h 25m"
  date: string; // YYYY-MM-DD
}

export type AppMode = "kiosk" | "pin" | "admin" | "locked";
export type AdminTab = "dashboard" | "attendance" | "staff" | "qrcodes" | "settings";
