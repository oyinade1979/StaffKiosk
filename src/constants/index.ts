export const DEFAULT_ADMIN_PIN = "1234";
/** Emergency reset code shown only to IT admins inside the Settings tab */
export const MASTER_RESET_CODE = "RESET-9999";
export const INACTIVITY_TIMEOUT_MS = 60_000; // 60 seconds
export const APP_STORAGE_KEYS = {
  staff: "kiosk_staff",
  attendance: "kiosk_attendance",
  pin: "kiosk_admin_pin",
  companyName: "kiosk_company_name",
  welcomeMessage: "kiosk_welcome_message",
  companyId: "kiosk_company_id",
  announcement: "kiosk_announcement",
  announcementEnabled: "kiosk_announcement_enabled",
  announcementInterval: "kiosk_announcement_interval",
} as const;

export const DEFAULT_COMPANY_NAME = "AccessGrid";
export const DEFAULT_WELCOME_MESSAGE = "Scan your QR badge to check in/check out";
export const DEFAULT_ANNOUNCEMENT = "";
export const DEFAULT_ANNOUNCEMENT_INTERVAL = 2; // minutes
