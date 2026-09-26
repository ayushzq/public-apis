"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  X,
  Key,
  Phone,
  Link2,
  CheckCircle2,
  Copy,
  ShieldAlert,
  Check,
  Facebook,
  Building2,
} from "lucide-react";
import { useBackButtonClose } from "@/lib/useBackButtonClose";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConfigModal({ isOpen, onClose, onSuccess }: ConfigModalProps) {
  const { data: session } = useSession();

  useBackButtonClose(isOpen, onClose);

  const [setupMode, setSetupMode] = useState<"manual" | "auto">("manual");
  const [accessToken, setAccessToken] = useState("");
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [accessTokenPreview, setAccessTokenPreview] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const res = await fetch("/api/config");
          if (res.ok) {
            const data = await res.json();
            const conf = data?.settings || data?.config || data;
            
            // Backend boolean flag ya existing preview check karein
            setHasAccessToken(!!(conf?.hasAccessToken || (conf?.accessToken && conf?.accessToken?.length > 10)));
            setAccessTokenPreview(conf?.accessTokenPreview || "");
            setPhoneId(conf?.phoneNumberId || "");
            setWabaId(conf?.businessAccountId || "");
            if (conf?.verifyToken) {
              setVerifyToken(conf.verifyToken);
            }
          }
        } catch (error) {
          console.error("Failed to load existing config:", error);
        }
      })();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      setWebhookUrl(`${baseUrl}/api/webhook`);

      const user = session?.user as any;
      if (!verifyToken) {
        if (user?.id) {
          setVerifyToken("BASEKEY_" + String(user.id).substring(0, 12).toUpperCase());
        } else {
          setVerifyToken("BASEKEY_SECRET_TOKEN");
        }
      }
    }
  }, [isOpen, session]);

  if (!isOpen) return null;

  const handleManualSave = async () => {
    // Agar pehle se token saved nahi hai aur field bhi empty hai, tabhi block karein
    if (!hasAccessToken && !accessToken.trim()) {
      toast.error("Please enter your Permanent Access Token!");
      return;
    }

    if (!phoneId.trim() || !wabaId.trim()) {
      toast.error("Please fill Phone Number ID and WABA ID!");
      return;
    }

    setLoading(true);
    try {
      if (!session?.user) {
        toast.error("Authentication error: Please log in again.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim(), // khali bhejne par backend purana token barkarar rakhta hai
          phoneNumberId: phoneId.trim(),
          businessAccountId: wabaId.trim(),
          verifyToken: verifyToken.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Meta API linked to your workspace successfully!");
        onSuccess();
        onClose();
        window.location.reload();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save configuration in Database.");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-all">
      <div className="bg-white dark:bg-[#111720] border border-gray-200 dark:border-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111720]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-950/40 rounded-2xl flex items-center justify-center text-[#25D366] border border-green-100 dark:border-green-800/40 shadow-sm">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Link Meta API</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Connect WhatsApp for this Workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex px-6 pt-3 gap-4 bg-gray-50/70 dark:bg-[#0B0F15] border-b border-gray-100 dark:border-gray-800/60">
          <button
            onClick={() => setSetupMode("manual")}
            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-all ${
              setupMode === "manual"
                ? "border-[#25D366] text-[#25D366]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Manual Setup
          </button>
          <button
            onClick={() => setSetupMode("auto")}
            className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-all ${
              setupMode === "auto"
                ? "border-[#25D366] text-[#25D366]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            Quick Connect <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full ml-1 font-semibold">Soon</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] bg-gray-50/50 dark:bg-[#0E141D]">
          {setupMode === "manual" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Access Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Permanent Access Token
                  </label>
                  {hasAccessToken && (
                    <span className="text-[11px] text-[#25D366] font-semibold flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-md">
                      <Check className="w-3 h-3 text-[#25D366]" /> Token Active
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={hasAccessToken ? (accessTokenPreview ? `${accessTokenPreview} (Saved)` : "•••••••••••••••• (Encrypted & Active)") : "EAAGm0P..."}
                  className="w-full bg-white dark:bg-[#161D27] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-[#25D366] text-sm font-medium transition-all shadow-sm"
                />
                {hasAccessToken && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-1">
                    Token is already saved securely. Leave blank unless you want to replace it.
                  </p>
                )}
              </div>

              {/* Phone ID & WABA ID */}
              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" /> Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={phoneId}
                    onChange={(e) => setPhoneId(e.target.value)}
                    placeholder="103456789..."
                    className="w-full bg-white dark:bg-[#161D27] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-[#25D366] text-sm font-medium transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" /> WABA ID
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="105678901..."
                    className="w-full bg-white dark:bg-[#161D27] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-green-500/10 focus:border-[#25D366] text-sm font-medium transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Webhook & Warning Info */}
              <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800 space-y-4">
                <div className="flex items-start gap-3 bg-red-50/80 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed font-medium">
                    <strong>IMPORTANT:</strong> Click the green <strong>"Save & Link"</strong> button below <strong>BEFORE</strong> clicking verify on Meta Dashboard.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Webhook URL</label>
                  <div className="flex bg-white dark:bg-[#161D27] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 bg-transparent px-4 py-3 text-xs md:text-sm outline-none text-gray-600 dark:text-gray-300 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(webhookUrl, "url")}
                      className="px-5 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {copiedField === "url" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Verify Token</label>
                  <div className="flex bg-white dark:bg-[#161D27] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                    <input
                      type="text"
                      readOnly
                      value={verifyToken}
                      className="flex-1 bg-transparent px-4 py-3 text-sm outline-none text-[#25D366] font-bold font-mono tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(verifyToken, "token")}
                      className="px-5 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {copiedField === "token" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {setupMode === "auto" && (
            <div className="flex flex-col items-center justify-center py-10 space-y-5 text-center opacity-70">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-full">
                <Facebook className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">1-Click WhatsApp Setup</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                  Automated Meta OAuth login is in progress. Please use Manual Setup for now.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {setupMode === "manual" && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111720] flex justify-end gap-3 rounded-b-3xl">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleManualSave}
              disabled={loading}
              className="flex items-center gap-2 bg-[#25D366] text-white px-7 py-3 rounded-xl font-bold hover:bg-[#20b858] hover:shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all text-sm disabled:opacity-50"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Save & Link
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
