/**
 * Supabase settings service — syncs kiosk configuration across devices.
 *
 * Maps to the existing Supabase `settings` table:
 *   id                    uuid  primary key
 *   company_id            uuid
 *   kiosk_admin_pin       text
 *   welcome_message       text
 *   announcement          text
 *   announcement_enabled  bool
 *   announcement_interval int4
 *   created_at            timestamp
 *   company_name          text  ← add via SQL if missing
 *
 * Run once in Supabase SQL Editor:
 * ─────────────────────────────────────────────────────────
 * ALTER TABLE public.settings
 *   ADD COLUMN IF NOT EXISTS company_name text;
 * ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
 * DO $$ BEGIN
 *   IF NOT EXISTS (
 *     SELECT 1 FROM pg_policies WHERE tablename='settings' AND policyname='Allow all'
 *   ) THEN
 *     CREATE POLICY "Allow all" ON public.settings FOR ALL USING (true) WITH CHECK (true);
 *   END IF;
 * END $$;
 * ─────────────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import {
  getPin, setPin,
  getCompanyName, setCompanyName,
  getWelcomeMessage, setWelcomeMessage,
  getAnnouncement, setAnnouncement,
  getAnnouncementEnabled, setAnnouncementEnabled,
  getAnnouncementInterval, setAnnouncementInterval,
} from "@/lib/storage";

const TABLE = "settings";

// Use a stable, fixed row ID so all devices share the same settings record.
// Derived from the Supabase URL to be unique per project.
const SETTINGS_ROW_ID = "00000000-0000-0000-0000-000000000001";

export interface AppSettings {
  companyName: string;
  welcomeMessage: string;
  pin: string;
  announcement: string;
  announcementEnabled: boolean;
  announcementInterval: number;
}

// ── Row → AppSettings ────────────────────────────────────────────────
function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    companyName: (row.company_name as string | null) ?? "AccessGrid",
    welcomeMessage: (row.welcome_message as string | null) ?? "Scan your QR badge to check in/check out",
    pin: (row.kiosk_admin_pin as string | null) ?? "1234",
    announcement: (row.announcement as string | null) ?? "",
    announcementEnabled: (row.announcement_enabled as boolean | null) ?? false,
    announcementInterval: (row.announcement_interval as number | null) ?? 2,
  };
}

// ── AppSettings → DB row ─────────────────────────────────────────────
// Stable company UUID — same value used in attendanceService and companies table
const COMPANY_UUID = "00000000-0000-0000-0000-000000000001";

function settingsToRow(s: AppSettings) {
  return {
    id: SETTINGS_ROW_ID,
    company_id: COMPANY_UUID,        // required NOT NULL column
    company_name: s.companyName,
    welcome_message: s.welcomeMessage,
    kiosk_admin_pin: s.pin,
    announcement: s.announcement,
    announcement_enabled: s.announcementEnabled,
    announcement_interval: s.announcementInterval,
  };
}

/** Read current settings from localStorage (synchronous snapshot) */
function getLocalSettings(): AppSettings {
  return {
    companyName: getCompanyName(),
    welcomeMessage: getWelcomeMessage(),
    pin: getPin(),
    announcement: getAnnouncement(),
    announcementEnabled: getAnnouncementEnabled(),
    announcementInterval: getAnnouncementInterval(),
  };
}

/** Apply an AppSettings object to localStorage */
function applyToLocal(s: AppSettings): void {
  setCompanyName(s.companyName);
  setWelcomeMessage(s.welcomeMessage);
  setPin(s.pin);
  setAnnouncement(s.announcement);
  setAnnouncementEnabled(s.announcementEnabled);
  setAnnouncementInterval(s.announcementInterval);
}

/**
 * Fetch settings from Supabase and merge into localStorage.
 * Returns the authoritative settings from cloud (falls back to localStorage on error).
 */
export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", SETTINGS_ROW_ID)
    .maybeSingle();

  if (error || !data) {
    console.warn("[settingsService] Supabase fetch error or no row — using localStorage:", error?.message ?? "no row");
    return getLocalSettings();
  }

  const remote = rowToSettings(data as Record<string, unknown>);
  applyToLocal(remote);
  console.log("[settingsService] settings loaded from cloud:", remote);
  return remote;
}

/**
 * Upsert current (merged) settings to Supabase and sync to localStorage.
 * Pass only the fields you want to update — the rest are read from localStorage.
 */
export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = getLocalSettings();
  const merged: AppSettings = { ...current, ...partial };

  // Persist to localStorage immediately for instant UI feedback
  applyToLocal(merged);

  // Sync settings row to Supabase
  const { error: settingsErr } = await supabase.from(TABLE).upsert(settingsToRow(merged));
  if (settingsErr) {
    console.warn("[settingsService] Supabase settings upsert error:", settingsErr.message);
  } else {
    console.log("[settingsService] settings saved to cloud");
  }

  // Also sync company name to the companies table
  const { error: companyErr } = await supabase.from("companies").upsert({
    id: COMPANY_UUID,
    company_name: merged.companyName,
  });
  if (companyErr) {
    console.warn("[settingsService] Supabase companies upsert error:", companyErr.message);
  }

  // Upsert a default admin profile entry into the profiles table
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: SETTINGS_ROW_ID,
    company_id: COMPANY_UUID,
    full_name: merged.companyName + " Admin",
    role: "admin",
  });
  if (profileErr) {
    console.warn("[settingsService] Supabase profiles upsert error:", profileErr.message);
  } else {
    console.log("[settingsService] profiles record synced");
  }
}
