"use client";

import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw, Smartphone, Menu, Link2, ArrowLeft } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { waApi } from "@/lib/api";
import { getSocket } from "@/lib/socket";

/**
 * Mirrors the real WhatsApp Web "Link a device" screen, with BOTH real
 * options WhatsApp itself offers: scan a live QR code, or "Link with
 * phone number instead" (Baileys' requestPairingCode). Whichever you
 * pick, scanning/entering it on your phone pairs your REAL account —
 * every chat and message that follows is real, nothing here is mocked.
 */
export default function WhatsAppLinkScreen() {
  const { waStatus, qrDataUrl, linkError, startWhatsAppLink } = useChatStore();
  const [mode, setMode] = useState<"qr" | "phone">("qr");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "qr" && waStatus === "disconnected") startWhatsAppLink();
  }, [mode, waStatus, startWhatsAppLink]);

  useEffect(() => {
    const socket = getSocket();
    const onPairingCode = ({ code }: { code: string }) => setPairingCode(code);
    socket.on("wa:pairing-code", onPairingCode);
    return () => {
      socket.off("wa:pairing-code", onPairingCode);
    };
  }, []);

  const handleRequestPairingCode = async () => {
    if (!phoneNumber.trim()) return;
    setSubmitting(true);
    setPairingCode(null);
    try {
      await waApi.connect(phoneNumber.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-wa-bg px-4">
      <div className="w-full max-w-3xl bg-wa-panelBg rounded-2xl shadow-panel overflow-hidden flex flex-col md:flex-row">
        <div className="flex-1 p-8 md:p-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-full bg-wa-accent flex items-center justify-center">
              <MessageCircle size={18} className="text-white" fill="white" />
            </div>
            <span className="text-[19px] text-wa-textPrimary font-medium">WhatsApp Web</span>
          </div>

          <h1 className="text-[22px] text-wa-textPrimary font-normal mb-6">
            Use WhatsApp on your computer
          </h1>

          {mode === "qr" ? (
            <>
              <ol className="space-y-4 text-[14.5px] text-wa-textPrimary">
                <li className="flex gap-3">
                  <span className="text-wa-textSecondary shrink-0">1.</span>
                  Open WhatsApp on your phone
                </li>
                <li className="flex gap-3">
                  <Menu size={18} className="text-wa-textSecondary shrink-0 mt-0.5" />
                  <span>
                    <span className="text-wa-textSecondary">2.</span> On Android tap Menu{" "}
                    <span className="text-wa-textSecondary">⋮</span> · On iPhone tap Settings{" "}
                    <span className="text-wa-textSecondary">⚙</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <Link2 size={18} className="text-wa-textSecondary shrink-0 mt-0.5" />
                  Tap <span className="font-medium">Linked devices</span>, then{" "}
                  <span className="font-medium">Link a device</span>
                </li>
                <li className="flex gap-3">
                  <Smartphone size={18} className="text-wa-textSecondary shrink-0 mt-0.5" />
                  Point your phone at this screen to scan the QR code
                </li>
              </ol>

              <button
                onClick={() => setMode("phone")}
                className="mt-8 text-wa-accentBright text-[14px] font-medium"
              >
                Link with phone number instead
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode("qr")}
                className="flex items-center gap-2 text-wa-textSecondary text-[13.5px] mb-5"
              >
                <ArrowLeft size={16} /> Back to QR code
              </button>

              {pairingCode ? (
                <div>
                  <p className="text-[14.5px] text-wa-textPrimary mb-3">
                    On your phone: Linked devices → Link a device → Link with phone number,
                    then enter this code:
                  </p>
                  <div className="flex gap-2 mb-2">
                    {pairingCode.split("").map((ch, i) => (
                      <span
                        key={i}
                        className="w-9 h-11 flex items-center justify-center rounded-md bg-wa-header text-wa-textPrimary text-[19px] font-mono tracking-wider"
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <p className="text-[12.5px] text-wa-textSecondary">This code expires after a short while.</p>
                </div>
              ) : (
                <div>
                  <label className="block text-[13px] text-wa-textSecondary mb-1.5">
                    Enter your phone number (with country code)
                  </label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full bg-wa-header text-wa-textPrimary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-wa-accent mb-3"
                  />
                  <button
                    onClick={handleRequestPairingCode}
                    disabled={submitting}
                    className="bg-wa-accent hover:bg-wa-accent/90 disabled:opacity-60 text-white rounded-full px-5 py-2 text-[14px] font-medium"
                  >
                    {submitting ? "Requesting code…" : "Next"}
                  </button>
                </div>
              )}
            </>
          )}

          {linkError && <p className="text-wa-danger text-[13px] mt-6">{linkError}</p>}
        </div>

        {mode === "qr" && (
          <div className="w-full md:w-[320px] flex items-center justify-center bg-wa-header p-8">
            <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center relative overflow-hidden">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="WhatsApp QR code" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-wa-textSecondary">
                  <RefreshCw size={28} className="animate-spin" />
                  <span className="text-[12.5px]">
                    {waStatus === "connecting" ? "Generating QR code…" : "Starting session…"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
