import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { getStaff } from "@/lib/storage";
import { cloudCheckIn, cloudCheckOut } from "@/lib/attendanceService";
import { playCheckInSound, playCheckOutSound, playErrorSound, playWarningSound } from "@/lib/audio";
import type { AttendanceRecord } from "@/types";

type ScanState = "idle" | "checkin" | "checkout" | "already_out" | "unknown" | "error";

interface CheckInResult {
  state: ScanState;
  record?: AttendanceRecord;
}

export default function QRScanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<CheckInResult>({ state: "idle" });
  const cooldownRef = useRef(false);

  useEffect(() => {
    const scannerId = "qr-reader";
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (cooldownRef.current) return;
          cooldownRef.current = true;

          // Look up staff by id or qrCode
          const allStaff = getStaff();
          const staff = allStaff.find((s) => s.id === decodedText || s.qrCode === decodedText);

          if (!staff) {
            setResult({ state: "unknown" });
            playErrorSound();
            setTimeout(() => { setResult({ state: "idle" }); cooldownRef.current = false; }, 3000);
            return;
          }

          const today = new Date().toISOString().slice(0, 10);

          // Check if staff already has a record today in local cache
          let localRecord: AttendanceRecord | undefined;
          try {
            const localAll: AttendanceRecord[] = JSON.parse(localStorage.getItem("kiosk_attendance") ?? "[]");
            localRecord = localAll.find((r) => r.staffId === staff.id && r.date === today);
          } catch { /* ignore */ }

          if (!localRecord) {
            // First scan today — check in
            const record = await cloudCheckIn(staff.id, staff.name, staff.department);
            if (record) {
              setResult({ state: "checkin", record });
              playCheckInSound();
            } else {
              setResult({ state: "unknown" });
              playErrorSound();
            }
          } else if (!localRecord.checkOutTime) {
            // Already checked in but not out — check out
            const outcome = await cloudCheckOut(staff.id);
            if (outcome) {
              if (outcome.alreadyOut) {
                setResult({ state: "already_out", record: outcome.record });
                playWarningSound();
              } else {
                setResult({ state: "checkout", record: outcome.record });
                playCheckOutSound();
              }
            } else {
              setResult({ state: "unknown" });
              playErrorSound();
            }
          } else {
            // Already checked out
            setResult({ state: "already_out", record: localRecord });
            playWarningSound();
          }

          setTimeout(() => {
            setResult({ state: "idle" });
            cooldownRef.current = false;
          }, 3000);
        },
        () => {}
      )
      .catch(() => setResult({ state: "error" }));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, []);

  const feedbackConfig: Record<ScanState, { bg: string; text: string; message: string }> = {
    idle: { bg: "bg-transparent", text: "text-transparent", message: "" },
    checkin: {
      bg: "bg-emerald-500/90",
      text: "text-white",
      message: `✓ Welcome, ${result.record?.staffName ?? ""}! Checked in at ${result.record?.checkInTime ?? ""}`,
    },
    checkout: {
      bg: "bg-violet-500/90",
      text: "text-white",
      message: `👋 Goodbye, ${result.record?.staffName ?? ""}! Checked out · Shift: ${result.record?.shiftDuration ?? ""}`,
    },
    already_out: {
      bg: "bg-amber-500/90",
      text: "text-white",
      message: `Already checked out today — ${result.record?.staffName ?? ""}`,
    },
    unknown: {
      bg: "bg-red-500/90",
      text: "text-white",
      message: "⚠ QR code not recognised. Please see reception.",
    },
    error: {
      bg: "bg-red-700/90",
      text: "text-white",
      message: "Camera unavailable. Please check permissions.",
    },
  };

  const fb = feedbackConfig[result.state];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Scanner frame */}
      <div className="relative">
        <div
          id="qr-reader"
          ref={containerRef}
          className="rounded-2xl overflow-hidden"
          style={{ width: 320, height: 320 }}
        />
        {/* Corner brackets overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
          <span className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
          <span className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
          <span className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />
        </div>
      </div>

      {/* Feedback banner */}
      <div
        className={`w-full max-w-sm rounded-xl px-6 py-4 text-center font-semibold text-lg transition-all duration-300 ${fb.bg} ${fb.text} ${
          result.state === "idle" ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
        style={{ minHeight: 64 }}
      >
        {fb.message}
      </div>
    </div>
  );
}
