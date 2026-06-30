import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { fetchStaff } from "@/lib/staffService";
import { cloudCheckIn, cloudCheckOut, cloudReCheckIn } from "@/lib/attendanceService";
import { playCheckInSound, playCheckOutSound, playErrorSound } from "@/lib/audio";
import type { AttendanceRecord, StaffMember } from "@/types";

type ScanState = "idle" | "checkin" | "recheckin" | "checkout" | "unknown" | "error" | "already_out";

interface CheckInResult {
  state: ScanState;
  record?: AttendanceRecord;
}

export default function QRScanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<CheckInResult>({ state: "idle" });
  const cooldownRef = useRef(false);
  // Keep a fresh staff list loaded from Supabase
  const staffCacheRef = useRef<StaffMember[]>([]);

  // Load staff from Supabase on mount so scanner has up-to-date data
  useEffect(() => {
    fetchStaff().then((list) => {
      staffCacheRef.current = list;
      console.log("[QRScanner] staff loaded on mount:", list.length, list.map(s => ({ id: s.id, qrCode: s.qrCode, name: s.name })));
    });
  }, []);

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

          const trimmed = decodedText.trim();
          console.log("[QRScanner] scanned:", JSON.stringify(trimmed));

          // Use cached staff list — only re-fetch from Supabase if cache is empty
          if (staffCacheRef.current.length === 0) {
            console.log("[QRScanner] cache empty, fetching from Supabase...");
            staffCacheRef.current = await fetchStaff();
          }

          // Look up staff by id or qrCode — trim whitespace from scanned value
          const allStaff = staffCacheRef.current;
          console.log("[QRScanner] looking in", allStaff.length, "staff records");
          allStaff.forEach(s => console.log("  staff:", { id: s.id, qrCode: s.qrCode, name: s.name }));
          const staff = allStaff.find(
            (s) =>
              s.id === trimmed ||
              s.qrCode === trimmed ||
              s.id.trim() === trimmed ||
              (s.qrCode && s.qrCode.trim() === trimmed)
          );
          console.log("[QRScanner] matched:", staff?.name ?? "NONE", "id:", staff?.id);

          if (!staff) {
            setResult({ state: "unknown" });
            playErrorSound();
            setTimeout(() => { setResult({ state: "idle" }); cooldownRef.current = false; }, 3000);
            return;
          }

          // Use local date (not UTC) to match how attendance records store their date
          const _d = new Date();
          const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

          // Check if staff already has a record today in local cache
          // Match against BOTH staff.id AND staff.qrCode to handle ID mismatches between devices
          let localRecord: AttendanceRecord | undefined;
          try {
            const localAll: AttendanceRecord[] = JSON.parse(localStorage.getItem("kiosk_attendance") ?? "[]");
            localRecord = localAll.find(
              (r) => (r.staffId === staff.id || r.staffId === staff.qrCode || r.staffId === trimmed) && r.date === today
            );
            console.log("[QRScanner] localRecord for today:", localRecord ? `found (id=${localRecord.id}, checkOut=${localRecord.checkOutTime})` : "none");
          } catch { /* ignore */ }

          if (!localRecord) {
            // First scan today — check in
            const record = await cloudCheckIn(staff.id, staff.name, staff.department, trimmed);
            if (record) {
              setResult({ state: "checkin", record });
              playCheckInSound();
            } else {
              setResult({ state: "unknown" });
              playErrorSound();
            }
          } else if (!localRecord.checkOutTime) {
            // Already checked in but not out — check out
            const outcome = await cloudCheckOut(staff.id, trimmed);
            if (outcome) {
              if (outcome.alreadyOut) {
                // Already out — treat as re-check-in
                const reRecord = await cloudReCheckIn(outcome.record, staff.id, staff.name, staff.department);
                if (reRecord) {
                  setResult({ state: "recheckin", record: reRecord });
                  playCheckInSound();
                } else {
                  setResult({ state: "unknown" });
                  playErrorSound();
                }
              } else {
                setResult({ state: "checkout", record: outcome.record });
                playCheckOutSound();
              }
            } else {
              setResult({ state: "unknown" });
              playErrorSound();
            }
          } else {
            // Already checked out — allow re-check-in on the same record
            const record = await cloudReCheckIn(localRecord, staff.id, staff.name, staff.department);
            if (record) {
              setResult({ state: "recheckin", record });
              playCheckInSound();
            } else {
              setResult({ state: "unknown" });
              playErrorSound();
            }
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
    recheckin: {
      bg: "bg-emerald-500/90",
      text: "text-white",
      message: `✓ Welcome back, ${result.record?.staffName ?? ""}! Checked in again at ${result.record?.checkInTime ?? ""}`,
    },
    checkout: {
      bg: "bg-violet-500/90",
      text: "text-white",
      message: `👋 Goodbye, ${result.record?.staffName ?? ""}! Checked out · Shift: ${result.record?.shiftDuration ?? ""}`,
    },
    already_out: {
      bg: "bg-emerald-500/90",
      text: "text-white",
      message: `✓ Welcome back, ${result.record?.staffName ?? ""}! Checked in again at ${result.record?.checkInTime ?? ""}`,
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
