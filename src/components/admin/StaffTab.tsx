import { useState, useEffect, useCallback } from "react";
import { UserPlus, Trash2, Users, Building2, AlertCircle, Mail, Pencil, Check, X, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { addStaffMember, getStaff } from "@/lib/storage";
import { fetchStaff, upsertStaff, deleteStaff } from "@/lib/staffService";
import type { StaffMember } from "@/types";

type SyncStatus = "idle" | "loading" | "ok" | "error";

export default function StaffTab() {
  const [staff, setStaff] = useState<StaffMember[]>(() => getStaff());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");

  // Add form
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailWarning, setEmailWarning] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState("");
  const [editEmailWarning, setEditEmailWarning] = useState("");

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Load from Supabase on mount ──────────────────────────────────────
  const loadFromSupabase = useCallback(async () => {
    setSyncStatus("loading");
    const remote = await fetchStaff();
    setStaff(remote);
    setSyncStatus(remote.length >= 0 ? "ok" : "error");
  }, []);

  useEffect(() => {
    loadFromSupabase();
  }, [loadFromSupabase]);

  // ── Add helpers ──────────────────────────────────────────────────────
  function checkDuplicateEmail(val: string, excludeId?: string) {
    const normalized = val.trim().toLowerCase();
    if (!normalized) return "";
    const dupe = staff.find(
      (s) => s.email.toLowerCase() === normalized && s.id !== excludeId
    );
    return dupe ? `Already registered to ${dupe.name} (${dupe.department})` : "";
  }

  async function handleAdd() {
    if (!name.trim()) return setError("Name is required.");
    if (!department.trim()) return setError("Department is required.");
    if (!email.trim()) return setError("Work email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address.");
    if (emailWarning) return setError("Please use a unique email address.");
    setError("");

    // Create via local storage first (instant), then sync to Supabase
    const newMember = addStaffMember({
      name: name.trim(),
      department: department.trim(),
      email: email.trim().toLowerCase(),
    });

    // Optimistic UI update
    setStaff((prev) => [...prev, newMember]);
    setName(""); setDepartment(""); setEmail(""); setEmailWarning("");

    // Persist to Supabase in background
    await upsertStaff(newMember);
    setSyncStatus("ok");
  }

  // ── Edit helpers ─────────────────────────────────────────────────────
  function startEdit(s: StaffMember) {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDepartment(s.department);
    setEditEmail(s.email);
    setEditError("");
    setEditEmailWarning("");
    setConfirmDelete(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
    setEditEmailWarning("");
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return setEditError("Name is required.");
    if (!editDepartment.trim()) return setEditError("Department is required.");
    if (!editEmail.trim()) return setEditError("Work email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim()))
      return setEditError("Please enter a valid email address.");
    if (editEmailWarning) return setEditError("Please use a unique email address.");

    const updated = staff.find((s) => s.id === id);
    if (!updated) return;

    const updatedMember: StaffMember = {
      ...updated,
      name: editName.trim(),
      department: editDepartment.trim(),
      email: editEmail.trim().toLowerCase(),
    };

    // Optimistic update
    setStaff((prev) => prev.map((s) => (s.id === id ? updatedMember : s)));
    setEditingId(null);
    setEditError("");

    // Persist to Supabase
    await upsertStaff(updatedMember);
    setSyncStatus("ok");
  }

  async function handleDelete(id: string) {
    // Optimistic remove
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setConfirmDelete(null);
    if (editingId === id) setEditingId(null);

    // Delete from Supabase
    await deleteStaff(id);
    setSyncStatus("ok");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Manage Staff</h2>
          <p className="text-slate-400 text-sm mt-0.5">{staff.length} registered staff members</p>
        </div>

        {/* Sync status indicator */}
        <div className="flex items-center gap-2">
          {syncStatus === "loading" && (
            <div className="flex items-center gap-1.5 text-slate-500 text-xs">
              <RefreshCw size={12} className="animate-spin" /> Syncing…
            </div>
          )}
          {syncStatus === "ok" && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <Cloud size={12} /> Saved to cloud
            </div>
          )}
          {syncStatus === "error" && (
            <button
              onClick={loadFromSupabase}
              className="flex items-center gap-1.5 text-amber-400 text-xs hover:text-amber-300 transition"
            >
              <CloudOff size={12} /> Offline — Retry
            </button>
          )}
        </div>
      </div>

      {/* ── Add form ── */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <UserPlus size={16} />
          Add New Staff Member
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Mail size={12} /> Work Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailWarning(checkDuplicateEmail(e.target.value));
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. jane.smith@company.com"
            className={`bg-slate-900 border rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none transition ${emailWarning ? "border-amber-500/70 focus:border-amber-500" : "border-slate-700 focus:border-cyan-500"}`}
          />
        </div>

        {emailWarning && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span><span className="font-semibold">Duplicate email:</span> {emailWarning}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <button
          onClick={handleAdd}
          className="self-end flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition"
        >
          <UserPlus size={15} /> Add Staff
        </button>
      </div>

      {/* ── Staff list ── */}
      {syncStatus === "loading" && staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <RefreshCw size={36} className="opacity-40 animate-spin" />
          <p className="text-lg font-medium">Loading staff from cloud…</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <Users size={40} className="opacity-40" />
          <p className="text-lg font-medium">No staff registered yet</p>
          <p className="text-sm">Add your first staff member above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {staff.map((s) => (
            <div
              key={s.id}
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden transition hover:bg-slate-800"
            >
              {/* Row */}
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-violet-400 font-bold text-sm">
                    {s.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Building2 size={12} className="text-slate-500" />
                      <p className="text-slate-400 text-sm">{s.department}</p>
                    </div>
                    {s.email && (
                      <div className="flex items-center gap-1">
                        <Mail size={12} className="text-slate-500" />
                        <p className="text-slate-500 text-xs font-mono">{s.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-slate-600 font-mono text-xs hidden sm:block">{s.id}</span>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                  {editingId === s.id ? (
                    <button
                      onClick={cancelEdit}
                      className="w-9 h-9 rounded-xl bg-slate-700/60 hover:bg-slate-600 flex items-center justify-center text-slate-400 transition"
                      title="Cancel edit"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(s)}
                      className="w-9 h-9 rounded-xl bg-slate-700/60 hover:bg-cyan-500/20 hover:text-cyan-400 flex items-center justify-center text-slate-500 transition"
                      title="Edit staff member"
                    >
                      <Pencil size={15} />
                    </button>
                  )}

                  {confirmDelete === s.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-xs">Remove?</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg font-semibold transition"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg font-semibold transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(s.id)}
                      className="w-9 h-9 rounded-xl bg-slate-700/60 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-slate-500 transition"
                      title="Delete staff member"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === s.id && (
                <div className="border-t border-slate-700/60 bg-slate-900/60 px-5 py-4 flex flex-col gap-3">
                  <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Pencil size={11} /> Editing {s.name}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-500 text-xs font-medium uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-500 text-xs font-medium uppercase tracking-wider">Department</label>
                      <input
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-500 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                      <Mail size={11} /> Work Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                        setEditEmailWarning(checkDuplicateEmail(e.target.value, s.id));
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(s.id); if (e.key === "Escape") cancelEdit(); }}
                      className={`bg-slate-800 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition ${editEmailWarning ? "border-amber-500/70 focus:border-amber-500" : "border-slate-700 focus:border-cyan-500"}`}
                    />
                  </div>

                  {editEmailWarning && (
                    <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                      <AlertCircle size={13} className="flex-shrink-0" />
                      <span><span className="font-semibold">Duplicate email:</span> {editEmailWarning}</span>
                    </div>
                  )}

                  {editError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                      <AlertCircle size={13} /> {editError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(s.id)}
                      className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold text-sm px-4 py-2 rounded-xl transition"
                    >
                      <Check size={14} /> Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
