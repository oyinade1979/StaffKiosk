/**
 * Supabase staff service — async CRUD operations.
 * Falls back to localStorage (via storage.ts) if Supabase is unavailable.
 *
 * Supabase table required (run once in SQL editor):
 * ────────────────────────────────────────────────
 * create table if not exists public.staff (
 *   id          text primary key,
 *   name        text not null,
 *   department  text not null,
 *   email       text not null,
 *   qr_code     text not null,
 *   created_at  timestamptz not null,
 *   company_id  text not null
 * );
 * alter table public.staff enable row level security;
 * create policy "Allow all" on public.staff for all using (true) with check (true);
 * ────────────────────────────────────────────────
 */

import { supabase } from "@/lib/supabase";
import {
  getStaff as getLocalStaff,
  saveStaff as saveLocalStaff,
  getCompanyId,
} from "@/lib/storage";
import type { StaffMember } from "@/types";

// Map DB row → StaffMember
function rowToMember(row: Record<string, unknown>): StaffMember {
  const id = row.id as string;
  // If qr_code is null/empty in DB (e.g. old records), fall back to id so scanner still works
  const qrCode = (row.qr_code as string | null) || id;
  return {
    id,
    name: row.name as string,
    department: row.department as string,
    email: row.email as string,
    qrCode,
    createdAt: row.created_at as string,
    companyId: row.company_id as string,
  };
}

// Map StaffMember → DB row
function memberToRow(m: StaffMember) {
  return {
    id: m.id,
    name: m.name,
    department: m.department,
    email: m.email,
    qr_code: m.qrCode,
    created_at: m.createdAt,
    company_id: m.companyId ?? getCompanyId(),
  };
}

/** Fetch all staff from Supabase (no company filter — single-tenant), sync to localStorage */
export async function fetchStaff(): Promise<StaffMember[]> {
  const companyId = getCompanyId();
  console.log("[staffService] fetchStaff companyId:", companyId);

  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[staffService] Supabase fetch error — falling back to localStorage:", error.message);
    return getLocalStaff();
  }

  const members = (data ?? []).map(rowToMember);
  // Sync remote data into localStorage so existing code still works
  syncRemoteToLocal(members);
  return members;
}

/** Upsert a staff member into Supabase and localStorage */
export async function upsertStaff(member: StaffMember): Promise<void> {
  console.log("[staffService] upsertStaff:", member.id);
  const { error } = await supabase.from("staff").upsert(memberToRow(member));
  if (error) {
    console.warn("[staffService] Supabase upsert error:", error.message);
  }
  // Always sync to localStorage regardless
  const local = getLocalStaff();
  const idx = local.findIndex((s) => s.id === member.id);
  if (idx === -1) {
    saveLocalStaff([...local, member]);
  } else {
    local[idx] = member;
    saveLocalStaff(local);
  }
}

/** Delete a staff member from Supabase and localStorage */
export async function deleteStaff(id: string): Promise<void> {
  console.log("[staffService] deleteStaff:", id);
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) {
    console.warn("[staffService] Supabase delete error:", error.message);
  }
  // Always remove from localStorage
  const local = getLocalStaff();
  saveLocalStaff(local.filter((s) => s.id !== id));
}

/** Sync remote staff list into localStorage (replaces all — single tenant) */
function syncRemoteToLocal(remoteStaff: StaffMember[]) {
  // Normalise companyId on every remote record to the local companyId so
  // storage.getStaff()'s companyId filter never hides cloud-sourced records.
  const localCompanyId = getCompanyId();
  const normalised = remoteStaff.map((s) => ({ ...s, companyId: localCompanyId }));
  saveLocalStaff(normalised);
}
