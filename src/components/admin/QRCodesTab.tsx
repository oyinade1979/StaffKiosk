import { useState } from "react";
import { QrCode, Download, Users, Mail, Send, CheckCircle, Loader2, PackageCheck } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getStaff } from "@/lib/storage";
import type { StaffMember } from "@/types";

export default function QRCodesTab() {
  const [staff] = useState<StaffMember[]>(() => getStaff());
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Bulk send state
  const [bulkStatus, setBulkStatus] = useState<"idle" | "generating" | "done">("idle");
  const [bulkProgress, setBulkProgress] = useState(0);

  const staffWithEmail = staff.filter((s) => s.email);

  // ── Single download ──────────────────────────────────────────────────
  function handleDownload() {
    const canvas = document.getElementById("qr-preview") as HTMLCanvasElement | null;
    if (!canvas || !selected) return;
    const link = document.createElement("a");
    link.download = `qr-${selected.name.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleSendEmail() {
    if (!selected?.email) return;
    const subject = encodeURIComponent(`Your Staff Check-In QR Code — ${selected.name}`);
    const body = encodeURIComponent(
      `Hi ${selected.name},\n\nPlease find your personal check-in QR code attached to this email.\n\nPresent the QR code at the kiosk each time you arrive or leave to record your attendance.\n\nYour Staff ID: ${selected.qrCode}\nDepartment: ${selected.department}\n\nIf you have any issues, please contact your manager.\n\nThank you.`
    );
    window.open(`mailto:${selected.email}?subject=${subject}&body=${body}`, "_blank");
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  }

  // ── Bulk send all QR codes ───────────────────────────────────────────
  async function handleSendAll() {
    if (staffWithEmail.length === 0) return;
    setBulkStatus("generating");
    setBulkProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder("staff-qr-codes")!;

      // Render each QR code to a hidden canvas and extract PNG
      for (let i = 0; i < staffWithEmail.length; i++) {
        const member = staffWithEmail[i];
        const dataUrl = await renderQRToDataURL(member.id, member.name, member.department);
        const base64 = dataUrl.split(",")[1];
        const fileName = `${member.name.replace(/\s+/g, "-")}_${member.id}.png`;
        folder.file(fileName, base64, { base64: true });
        setBulkProgress(Math.round(((i + 1) / staffWithEmail.length) * 100));
        // Small delay to not block UI
        await new Promise((r) => setTimeout(r, 20));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `staff-qr-codes-${new Date().toISOString().slice(0, 10)}.zip`);

      // Open mailto with all emails in BCC
      const bcc = staffWithEmail.map((s) => s.email).join(",");
      const subject = encodeURIComponent("Your Staff Check-In QR Code");
      const body = encodeURIComponent(
        `Hi team,\n\nPlease find your personal check-in QR code in the attached ZIP file. Locate your file by name.\n\nPresent the QR code at the kiosk each time you arrive or leave to record your attendance.\n\nIf you have any issues, please contact your manager.\n\nThank you.`
      );
      window.open(`mailto:?bcc=${bcc}&subject=${subject}&body=${body}`, "_blank");

      setBulkStatus("done");
      setTimeout(() => setBulkStatus("idle"), 5000);
    } catch (err) {
      console.error("Bulk QR export failed:", err);
      setBulkStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white">QR Code Generator</h2>
        <p className="text-slate-400 text-sm mt-0.5">Select a staff member to view, download, or email their QR code</p>
      </div>

      {/* ── Bulk Send All ── */}
      <div className={`rounded-2xl border p-5 transition-all ${
        bulkStatus === "done"
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-slate-800/60 border-slate-700/60"
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              bulkStatus === "done"
                ? "bg-emerald-500/20 border-emerald-500/40"
                : "bg-violet-500/20 border-violet-500/30"
            }`}>
              {bulkStatus === "done"
                ? <PackageCheck size={18} className="text-emerald-400" />
                : <Send size={18} className="text-violet-400" />
              }
            </div>
            <div>
              <p className={`font-semibold text-sm ${bulkStatus === "done" ? "text-emerald-300" : "text-white"}`}>
                {bulkStatus === "done" ? "All QR Codes Sent!" : "Send All QR Codes"}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {bulkStatus === "done"
                  ? "ZIP downloaded · Email client opened with all staff in BCC"
                  : staffWithEmail.length === 0
                    ? "No staff with registered emails"
                    : `${staffWithEmail.length} staff member${staffWithEmail.length !== 1 ? "s" : ""} with registered emails`
                }
              </p>
            </div>
          </div>

          <button
            onClick={handleSendAll}
            disabled={bulkStatus !== "idle" || staffWithEmail.length === 0}
            className={`flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition min-w-[180px] justify-center ${
              bulkStatus === "done"
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default"
                : bulkStatus === "generating"
                  ? "bg-violet-500/20 border border-violet-500/40 text-violet-300 cursor-wait"
                  : staffWithEmail.length === 0
                    ? "bg-slate-700/40 border border-slate-700 text-slate-600 cursor-not-allowed"
                    : "bg-violet-500 hover:bg-violet-400 active:bg-violet-600 text-white"
            }`}
          >
            {bulkStatus === "generating" ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating… {bulkProgress}%
              </>
            ) : bulkStatus === "done" ? (
              <>
                <CheckCircle size={15} />
                Done
              </>
            ) : (
              <>
                <Send size={15} />
                Send All QR Codes
              </>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {bulkStatus === "generating" && (
          <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-400 rounded-full transition-all duration-100"
              style={{ width: `${bulkProgress}%` }}
            />
          </div>
        )}

        {bulkStatus === "done" && (
          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            A ZIP file was downloaded with all QR codes named by staff name. Your email client opened with all staff emails pre-filled in BCC — attach the ZIP before sending.
          </p>
        )}
      </div>

      {/* ── Individual ── */}
      <div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Individual QR Codes</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Staff list */}
          <div className="flex flex-col gap-2">
            {staff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <Users size={36} className="opacity-40" />
                <p className="font-medium">No staff registered</p>
                <p className="text-sm">Add staff members first</p>
              </div>
            ) : (
              staff.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setEmailSent(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border text-left transition ${
                    selected?.id === s.id
                      ? "bg-cyan-500/10 border-cyan-500/50"
                      : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold border ${
                      selected?.id === s.id
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                        : "bg-slate-700 border-slate-600 text-slate-300"
                    }`}
                  >
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${selected?.id === s.id ? "text-cyan-300" : "text-white"}`}>
                      {s.name}
                    </p>
                    <p className="text-slate-400 text-xs">{s.department}</p>
                    {s.email && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail size={10} className="text-slate-600" />
                        <p className="text-slate-600 text-xs font-mono truncate">{s.email}</p>
                      </div>
                    )}
                  </div>
                  <QrCode size={16} className={selected?.id === s.id ? "text-cyan-400" : "text-slate-600"} />
                </button>
              ))
            )}
          </div>

          {/* QR preview */}
          <div className="flex flex-col items-center justify-center bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8 gap-5 min-h-[320px]">
            {selected ? (
              <>
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  <QRCodeCanvas
                    id="qr-preview"
                    value={selected.qrCode}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="text-center">
                  <p className="text-white font-bold text-lg">{selected.name}</p>
                  <p className="text-slate-400 text-sm">{selected.department}</p>
                  {selected.email && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <Mail size={12} className="text-slate-500" />
                      <p className="text-slate-500 text-xs font-mono">{selected.email}</p>
                    </div>
                  )}
                  <p className="text-slate-600 font-mono text-xs mt-1">{selected.qrCode}</p>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-semibold text-sm px-5 py-2.5 rounded-xl transition w-full"
                  >
                    <Download size={15} />
                    Download PNG
                  </button>

                  {selected.email ? (
                    <button
                      onClick={handleSendEmail}
                      disabled={emailSent}
                      className={`flex items-center justify-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition w-full ${
                        emailSent
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default"
                          : "bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900"
                      }`}
                    >
                      {emailSent ? (
                        <><CheckCircle size={15} /> Email Client Opened</>
                      ) : (
                        <><Send size={15} /> Send QR to {selected.email}</>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 bg-slate-800/60 border border-slate-700/40 text-slate-500 text-sm px-5 py-2.5 rounded-xl w-full">
                      <Mail size={14} /> No email on file
                    </div>
                  )}
                </div>

                {emailSent && (
                  <p className="text-slate-500 text-xs text-center -mt-2 leading-relaxed">
                    Email client opened — download the QR PNG above and attach it before sending.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <QrCode size={48} className="opacity-30" />
                <p className="font-medium">Select a staff member</p>
                <p className="text-sm text-center">Their unique QR code will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas pool for bulk QR rendering — one per staff member */}
      <div className="hidden" aria-hidden="true">
        {staff.map((s) => (
          <QRCodeCanvas
            key={s.id}
            id={`qr-bulk-${s.id}`}
            value={s.qrCode}
            size={300}
            level="H"
            includeMargin={true}
          />
        ))}
      </div>
    </div>
  );
}

// ── Helper: render a QR code to a PNG data URL ───────────────────────
async function renderQRToDataURL(staffId: string, name: string, department: string): Promise<string> {
  const size = 300;
  const padding = 20;
  const labelHeight = 52;

  const offscreen = document.createElement("canvas");
  offscreen.width = size + padding * 2;
  offscreen.height = size + padding * 2 + labelHeight;
  const ctx = offscreen.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);

  // Find the pre-rendered hidden canvas by staff ID
  const qrCanvas = document.getElementById(`qr-bulk-${staffId}`) as HTMLCanvasElement | null;
  if (qrCanvas) {
    ctx.drawImage(qrCanvas, padding, padding, size, size);
  }

  // Name label
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name, offscreen.width / 2, size + padding + 24);

  // Department label
  ctx.fillStyle = "#64748b";
  ctx.font = "13px sans-serif";
  ctx.fillText(department, offscreen.width / 2, size + padding + 44);

  return offscreen.toDataURL("image/png");
}
