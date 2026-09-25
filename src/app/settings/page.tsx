"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Phone,
  Key,
  Link2,
  Bot,
  Sparkles,
  Moon,
  Sun,
  Monitor,
  Megaphone,
  Code2,
  Users,
  Save,
  Server,
  Palette,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Smartphone,
  RefreshCw
} from "lucide-react";

interface SystemSettings {
  phoneNumberId: string;
  businessAccountId: string;
  // Security fix (BaseKey audit): the real secret values are never sent to
  // the browser (see /api/config's GET). These four inputs are now
  // write-only — typing a new value and saving REPLACES the stored secret;
  // leaving a field blank on save leaves the existing one untouched. What
  // WAS previously saved is only ever shown as a masked preview below the
  // field (see the has*/*Preview fields), never the full value.
  accessToken: string;
  verifyToken: string;
  isAiBotActive: boolean;
  geminiSystemPrompt: string;
  aiProvider: "gemini" | "openai" | "claude";
  openaiApiKey: string | null;
  claudeApiKey: string | null;
  geminiApiKey: string | null;
  featureCampaigns: boolean;
  featureChatbotBuilder: boolean;
  featureDeveloperApi: boolean;
  featureTeamPresence: boolean;
  hasAccessToken?: boolean;
  accessTokenPreview?: string;
  hasOpenaiApiKey?: boolean;
  openaiApiKeyPreview?: string;
  hasClaudeApiKey?: boolean;
  claudeApiKeyPreview?: string;
  hasGeminiApiKey?: boolean;
  geminiApiKeyPreview?: string;
}

interface NotificationSettingsState {
  notificationsEnabled: boolean;
  notifyOnNewContact: boolean;
  notifyOnExistingContact: boolean;
  notifyOnCampaignEvents: boolean;
  soundEnabled: boolean;
  dndEnabled: boolean;
  dndStartTime: string;
  dndEndTime: string;
}

const DEFAULTS_SYSTEM: SystemSettings = {
  phoneNumberId: "",
  businessAccountId: "",
  accessToken: "",
  verifyToken: "",
  isAiBotActive: false,
  geminiSystemPrompt: "You are a helpful AI assistant for BaseKey CRM.",
  aiProvider: "gemini",
  openaiApiKey: "",
  claudeApiKey: "",
  geminiApiKey: "",
  featureCampaigns: true,
  featureChatbotBuilder: true,
  featureDeveloperApi: true,
  featureTeamPresence: true,
};

const DEFAULTS_NOTIFICATION: NotificationSettingsState = {
  notificationsEnabled: true,
  notifyOnNewContact: true,
  notifyOnExistingContact: true,
  notifyOnCampaignEvents: true,
  soundEnabled: true,
  dndEnabled: false,
  dndStartTime: "22:00",
  dndEndTime: "08:00",
};

// Base64 helper to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// AWS Style Field Input
function AwsField({
  label,
  icon: Icon,
  value,
  onChange,
  secret,
  placeholder,
  hint,
  savedPreview,
  readOnly,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  secret?: boolean;
  placeholder?: string;
  hint?: string;
  // Masked preview of a value already saved on the server (e.g. "bk••••1234") —
  // shown instead of ever sending the real secret to the browser. Typing a
  // new value here replaces it; leaving the input blank keeps it as-is.
  savedPreview?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] uppercase tracking-wide">
          {label}
        </label>
      </div>
      <div className="relative flex items-center border border-[#aab7b8] dark:border-[#414750] bg-white dark:bg-[#0f1114] rounded-xs px-2.5 py-1.5 focus-within:border-[#0073bb] focus-within:ring-1 focus-within:ring-[#0073bb] transition-all">
        <Icon className="w-4 h-4 text-[#545b64] dark:text-[#879596] shrink-0 mr-2" />
        <input
          type={secret ? "password" : "text"}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full text-[13px] outline-none bg-transparent text-[#16191f] dark:text-[#eaeded] placeholder-[#879596] font-mono"
        />
      </div>
      {savedPreview && (
        <p className="text-[11px] text-[#0073bb] dark:text-[#59a5f5] mt-1 font-mono">
          Currently saved: {savedPreview} — type a new value to replace it.
        </p>
      )}
      {hint && <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-1">{hint}</p>}
    </div>
  );
}

// AWS Style Compact Toggle Row
function AwsToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#eaeded] dark:border-[#232f3e] last:border-0">
      <div className="pr-4">
        <p className="text-[13px] font-bold text-[#16191f] dark:text-[#eaeded]">{label}</p>
        <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          disabled ? "opacity-40 cursor-not-allowed bg-zinc-400" : checked ? "bg-[#0073bb]" : "bg-zinc-300 dark:bg-[#414750]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS_SYSTEM);
  const [notifySettings, setNotifySettings] = useState<NotificationSettingsState>(DEFAULTS_NOTIFICATION);
  const [activeTab, setActiveTab] = useState("notifications");
  const [saving, setSaving] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [registeringDevice, setRegisteringDevice] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) setPushSubscribed(true);
      } catch {}
    }
  };

  const fetchData = async () => {
    try {
      const [notifRes, configRes] = await Promise.all([
        fetch("/api/settings/notifications"),
        fetch("/api/config"),
      ]);

      if (notifRes.ok) {
        const data = await notifRes.json();
        if (data.settings) {
          setNotifySettings({
            notificationsEnabled: data.settings.notificationsEnabled ?? true,
            notifyOnNewContact: data.settings.notifyOnNewContact ?? true,
            notifyOnExistingContact: data.settings.notifyOnExistingContact ?? true,
            notifyOnCampaignEvents: data.settings.notifyOnCampaignEvents ?? true,
            soundEnabled: data.settings.soundEnabled ?? true,
            dndEnabled: data.settings.dndEnabled ?? false,
            dndStartTime: data.settings.dndStartTime || "22:00",
            dndEndTime: data.settings.dndEndTime || "08:00",
          });
        }
      }

      // Bug fix (BaseKey audit — settings page showed only dummy defaults):
      // this page used to never call GET /api/config at all, so every
      // WhatsApp/AI/module field always rendered its hardcoded DEFAULTS_SYSTEM
      // value regardless of what was actually saved. The four secret fields
      // (accessToken/openaiApiKey/claudeApiKey/geminiApiKey) are intentionally
      // left blank here — the server never sends the real values back — and
      // are shown instead via the masked has*/*Preview fields.
      if (configRes.ok) {
        const cfg = await configRes.json();
        setSettings((s) => ({
          ...s,
          ...cfg,
          accessToken: "",
          openaiApiKey: "",
          claudeApiKey: "",
          geminiApiKey: "",
        }));
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const saveSection = async (sectionKey: string, successMsg: string) => {
    setSaving(sectionKey);
    try {
      if (sectionKey === "notifications") {
        const res = await fetch("/api/settings/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notifySettings),
        });
        if (!res.ok) throw new Error("Failed to save notification settings");
      } else if (sectionKey === "whatsapp" || sectionKey === "ai" || sectionKey === "modules") {
        // Bug fix (BaseKey audit): this used to just `await sleep(400)` and
        // show a success toast without saving anything at all. Now actually
        // POSTs to /api/config. Blank secret fields are omitted so the
        // server keeps whatever was already saved (see /api/config's POST).
        const payload: Record<string, unknown> = {
          phoneNumberId: settings.phoneNumberId,
          businessAccountId: settings.businessAccountId,
          isAiBotActive: settings.isAiBotActive,
          geminiSystemPrompt: settings.geminiSystemPrompt,
          aiProvider: settings.aiProvider,
          featureCampaigns: settings.featureCampaigns,
          featureChatbotBuilder: settings.featureChatbotBuilder,
          featureDeveloperApi: settings.featureDeveloperApi,
          featureTeamPresence: settings.featureTeamPresence,
        };
        if (settings.accessToken) payload.accessToken = settings.accessToken;
        if (settings.openaiApiKey) payload.openaiApiKey = settings.openaiApiKey;
        if (settings.claudeApiKey) payload.claudeApiKey = settings.claudeApiKey;
        if (settings.geminiApiKey) payload.geminiApiKey = settings.geminiApiKey;

        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to save configuration");

        // Refresh masked previews and clear the typed secret inputs — what
        // was just saved should never linger as visible plain text.
        setSettings((s) => ({
          ...s,
          ...data.settings,
          accessToken: "",
          openaiApiKey: "",
          claudeApiKey: "",
          geminiApiKey: "",
        }));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(null);
    }
  };

  const registerCurrentDevicePush = async () => {
    setRegisteringDevice(true);
    try {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        toast.error("Browser does not support Push Notifications");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied. Site settings me jakar allow karein.");
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const readyReg = await navigator.serviceWorker.ready;

      // 1. Purana mismatched token unsubscribe karein
      try {
        const existingSub = await readyReg.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
        }
      } catch (e) {
        console.warn("Unsubscribe skip:", e);
      }

      // 2. Server se live derived matching Public Key fetch karein
      const keyRes = await fetch("/api/push/subscribe");
      const keyData = await keyRes.json();
      if (!keyData.publicKey) {
        throw new Error(keyData.error || "Server se VAPID Public Key receive nahi hui");
      }

      // 3. Exact matching key se browser token generate karein
      const subscription = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      // 4. Token Neon DB me save karein
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (res.ok) {
        setPushSubscribed(true);
        toast.success("Device linked successfully! Fresh token saved.");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to save push subscription on database.");
      }
    } catch (e: any) {
      console.error("Device registration error:", e);
      toast.error(e.message || "Failed to register device push");
    } finally {
      setRegisteringDevice(false);
    }
  };

  if (!mounted) return null;

  // Bug fix (BaseKey audit): this used to require role === "ADMIN" exactly,
  // which locked the workspace OWNER out of their own Settings page (OWNER
  // is a different, higher role than ADMIN — see prisma/schema.prisma
  // UserRole enum). Only a restricted AGENT should ever see this screen.
  if (session?.user && (session.user as any).role === "AGENT") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#fff5f5] dark:bg-[#3f1919] border border-[#d62728] p-4 rounded-xs text-[#d62728] text-xs font-bold">
          Access Denied: Only workspace administrators have access to System Configuration.
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "appearance", label: "Appearance & Theme", icon: Palette },
    { id: "notifications", label: "Push Notifications", icon: Bell },
    { id: "whatsapp", label: "WhatsApp API", icon: Phone },
    { id: "ai", label: "AI & Bot Engine", icon: Bot },
    { id: "modules", label: "System Modules", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-[#f2f3f3] dark:bg-[#0f1114] text-[#16191f] dark:text-[#eaeded] font-sans pb-16">
      <div className="bg-[#232f3e] text-white px-4 sm:px-6 py-3 border-b border-[#16191f] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-[#ff9900]" />
          <span className="text-[#aab7b8]">BaseKey Console</span>
          <span className="text-[#879596]">/</span>
          <span className="font-bold text-white tracking-wide">System Configuration</span>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-xs">
          Cloud Status: Active
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#414750] rounded-xs shadow-xs overflow-hidden">
              <div className="p-3 bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750]">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#879596]">
                  Service Settings
                </h3>
              </div>
              <nav className="p-1 space-y-0.5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xs transition-colors text-left cursor-pointer ${
                        isActive
                          ? "bg-[#0073bb] text-white font-bold shadow-xs"
                          : "text-[#545b64] dark:text-[#aab7b8] hover:bg-[#eaeded] dark:hover:bg-[#232f3e] hover:text-[#16191f] dark:hover:text-white"
                      }`}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            <div className="bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#414750] rounded-xs shadow-xs">
              
              {/* --- 1. APPEARANCE TAB --- */}
              {activeTab === "appearance" && (
                <div>
                  <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128]">
                    <h2 className="text-sm font-bold text-[#16191f] dark:text-[#eaeded]">Display & Console Theme</h2>
                    <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">
                      Configure color preferences and interface styling across your browser sessions.
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] uppercase tracking-wide block mb-2">
                        Theme Mode Selection
                      </label>
                      <div className="grid grid-cols-3 gap-2 max-w-md p-1 bg-[#eaeded] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] rounded-xs">
                        <button
                          type="button"
                          onClick={() => setTheme("system")}
                          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xs transition-all cursor-pointer ${
                            theme === "system"
                              ? "bg-[#0073bb] text-white shadow-xs"
                              : "text-[#545b64] dark:text-[#879596] hover:text-[#16191f] dark:hover:text-white"
                          }`}
                        >
                          <Monitor className="w-3.5 h-3.5" /> System Default
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("light")}
                          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xs transition-all cursor-pointer ${
                            theme === "light"
                              ? "bg-[#0073bb] text-white shadow-xs"
                              : "text-[#545b64] dark:text-[#879596] hover:text-[#16191f] dark:hover:text-white"
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" /> Light Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme("dark")}
                          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xs transition-all cursor-pointer ${
                            theme === "dark"
                              ? "bg-[#0073bb] text-white shadow-xs"
                              : "text-[#545b64] dark:text-[#879596] hover:text-[#16191f] dark:hover:text-white"
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" /> Dark Mode
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-end">
                    <button
                      onClick={() => saveSection("appearance", "Appearance preferences saved.")}
                      className="bg-[#0073bb] hover:bg-[#005a93] text-white text-xs font-bold px-4 py-2 rounded-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* --- 2. NOTIFICATIONS & WEB PUSH CONTROL TAB --- */}
              {activeTab === "notifications" && (
                <div>
                  <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-[#16191f] dark:text-[#eaeded]">Web Push & Notification Center</h2>
                      <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">
                        Configure background lock-screen notifications, DND windows, and device pairing.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={registerCurrentDevicePush}
                        disabled={registeringDevice}
                        className="bg-[#ec7211] hover:bg-[#eb5f07] text-white text-xs font-bold px-3 py-1.5 rounded-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        {pushSubscribed ? <RefreshCw className={`w-3.5 h-3.5 ${registeringDevice ? "animate-spin" : ""}`} /> : <Smartphone className="w-3.5 h-3.5" />}
                        {registeringDevice ? "Syncing..." : pushSubscribed ? "Re-sync Fresh Token" : "Enable This Device"}
                      </button>
                      
                      {pushSubscribed && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paired
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="p-4 bg-[#f0f8ff] dark:bg-[#0073bb]/10 border border-[#0073bb]/30 rounded-xs">
                      <AwsToggleRow
                        label="Master Push Notification Engine"
                        hint="Global kill-switch for all incoming browser push notifications on all registered devices."
                        checked={notifySettings.notificationsEnabled}
                        onChange={(v) => setNotifySettings((s) => ({ ...s, notificationsEnabled: v }))}
                      />
                    </div>

                    <div className="border border-[#eaeded] dark:border-[#414750] rounded-xs p-4">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#879596] mb-2">
                        Event Rules & Filter Control
                      </h3>

                      <AwsToggleRow
                        label="New Customer Alerts (First Time Leads)"
                        hint="Send background push alert when an unknown number texts for the first time."
                        checked={notifySettings.notifyOnNewContact}
                        disabled={!notifySettings.notificationsEnabled}
                        onChange={(v) => setNotifySettings((s) => ({ ...s, notifyOnNewContact: v }))}
                      />

                      <AwsToggleRow
                        label="Existing Conversations (Active Chats)"
                        hint="Send background alert for messages from already saved contacts."
                        checked={notifySettings.notifyOnExistingContact}
                        disabled={!notifySettings.notificationsEnabled}
                        onChange={(v) => setNotifySettings((s) => ({ ...s, notifyOnExistingContact: v }))}
                      />

                      <AwsToggleRow
                        label="Broadcast & Campaign Events"
                        hint="Notify when an active WhatsApp broadcast completes or encounters batch failures."
                        checked={notifySettings.notifyOnCampaignEvents}
                        disabled={!notifySettings.notificationsEnabled}
                        onChange={(v) => setNotifySettings((s) => ({ ...s, notifyOnCampaignEvents: v }))}
                      />

                      <AwsToggleRow
                        label="Sound Alerts"
                        hint="Play system sound chime along with the visual push notification."
                        checked={notifySettings.soundEnabled}
                        disabled={!notifySettings.notificationsEnabled}
                        onChange={(v) => setNotifySettings((s) => ({ ...s, soundEnabled: v }))}
                      />
                    </div>

                    <div className="border border-[#eaeded] dark:border-[#414750] rounded-xs p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#545b64] dark:text-[#879596]">
                            Do Not Disturb (DND) Hours
                          </h3>
                          <p className="text-[11px] text-[#545b64] dark:text-[#879596]">
                            Mute alerts during off-business hours (VIP contacts will bypass this filter).
                          </p>
                        </div>
                        <AwsToggleRow
                          label=""
                          hint=""
                          checked={notifySettings.dndEnabled}
                          onChange={(v) => setNotifySettings((s) => ({ ...s, dndEnabled: v }))}
                        />
                      </div>

                      {notifySettings.dndEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#eaeded] dark:border-[#414750]">
                          <div>
                            <label className="text-[11px] font-bold text-[#545b64] dark:text-[#879596] block mb-1">
                              Start Quiet Hours
                            </label>
                            <input
                              type="time"
                              value={notifySettings.dndStartTime}
                              onChange={(e) => setNotifySettings((s) => ({ ...s, dndStartTime: e.target.value }))}
                              className="w-full text-xs font-mono border border-[#aab7b8] dark:border-[#414750] bg-white dark:bg-[#0f1114] p-1.5 rounded-xs outline-none focus:border-[#0073bb]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#545b64] dark:text-[#879596] block mb-1">
                              End Quiet Hours
                            </label>
                            <input
                              type="time"
                              value={notifySettings.dndEndTime}
                              onChange={(e) => setNotifySettings((s) => ({ ...s, dndEndTime: e.target.value }))}
                              className="w-full text-xs font-mono border border-[#aab7b8] dark:border-[#414750] bg-white dark:bg-[#0f1114] p-1.5 rounded-xs outline-none focus:border-[#0073bb]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-end">
                    <button
                      onClick={() => saveSection("notifications", "Notification configurations saved to cloud.")}
                      disabled={saving === "notifications"}
                      className="bg-[#0073bb] hover:bg-[#005a93] text-white text-xs font-bold px-4 py-2 rounded-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving === "notifications" ? "Saving..." : "Save Notification Rules"}
                    </button>
                  </div>
                </div>
              )}

              {/* --- 3. WHATSAPP API TAB --- */}
              {activeTab === "whatsapp" && (
                <div>
                  <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128]">
                    <h2 className="text-sm font-bold text-[#16191f] dark:text-[#eaeded]">Meta Cloud API Infrastructure</h2>
                    <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">
                      Enter credentials from your Meta WhatsApp Developer Console.
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AwsField label="Phone Number ID" icon={Phone} value={settings.phoneNumberId} onChange={(v) => setSettings((s) => ({ ...s, phoneNumberId: v }))} placeholder="e.g. 10482910..." />
                      <AwsField label="Business Account ID" icon={Link2} value={settings.businessAccountId} onChange={(v) => setSettings((s) => ({ ...s, businessAccountId: v }))} placeholder="e.g. 29104812..." />
                      <AwsField label="System Access Token" icon={Key} value={settings.accessToken} secret onChange={(v) => setSettings((s) => ({ ...s, accessToken: v }))} placeholder={settings.hasAccessToken ? "Leave blank to keep current token" : "EAAG..."} savedPreview={settings.accessTokenPreview} />
                      <AwsField label="Webhook Verify Token" icon={Key} value={settings.verifyToken} readOnly onChange={() => {}} hint="Auto-generated — paste this exact value into Meta's webhook 'Verify Token' field. It cannot be edited here." />
                    </div>
                  </div>

                  <div className="p-4 border-t border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-end">
                    <button
                      onClick={() => saveSection("whatsapp", "WhatsApp credentials updated.")}
                      className="bg-[#0073bb] hover:bg-[#005a93] text-white text-xs font-bold px-4 py-2 rounded-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save API Config
                    </button>
                  </div>
                </div>
              )}

              {/* --- 4. AI & BOT CONFIG TAB --- */}
              {activeTab === "ai" && (
                <div>
                  <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128]">
                    <h2 className="text-sm font-bold text-[#16191f] dark:text-[#eaeded]">AI Provider & Automated Routing</h2>
                    <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">
                      Configure multi-model AI routing to reply to incoming customer queries.
                    </p>
                  </div>

                  <div className="p-6 space-y-5">
                    <div className="p-3 border border-[#eaeded] dark:border-[#414750] rounded-xs">
                      <AwsToggleRow
                        label="Enable AI Auto-Responder"
                        hint="When active, AI generates smart responses for inbound WhatsApp chats."
                        checked={settings.isAiBotActive}
                        onChange={(v) => setSettings((s) => ({ ...s, isAiBotActive: v }))}
                      />
                    </div>

                    <div>
                      <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] uppercase tracking-wide block mb-2">
                        Select Active AI Engine
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["gemini", "openai", "claude"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSettings((s) => ({ ...s, aiProvider: p }))}
                            className={`py-2 text-xs font-bold rounded-xs border transition cursor-pointer capitalize ${
                              settings.aiProvider === p
                                ? "bg-[#0073bb] border-[#0073bb] text-white shadow-xs"
                                : "bg-white dark:bg-[#0f1114] border-[#d5dbdb] dark:border-[#414750] text-[#545b64] dark:text-[#aab7b8]"
                            }`}
                          >
                            {p === "openai" ? "OpenAI GPT" : p === "claude" ? "Claude 3.5" : "Google Gemini"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      {settings.aiProvider === "gemini" && (
                        <AwsField label="Google Gemini API Key" icon={Key} value={settings.geminiApiKey ?? ""} secret onChange={(v) => setSettings((s) => ({ ...s, geminiApiKey: v }))} placeholder={settings.hasGeminiApiKey ? "Leave blank to keep current key" : undefined} savedPreview={settings.geminiApiKeyPreview} />
                      )}
                      {settings.aiProvider === "openai" && (
                        <AwsField label="OpenAI API Key" icon={Key} value={settings.openaiApiKey ?? ""} secret onChange={(v) => setSettings((s) => ({ ...s, openaiApiKey: v }))} placeholder={settings.hasOpenaiApiKey ? "Leave blank to keep current key" : undefined} savedPreview={settings.openaiApiKeyPreview} />
                      )}
                      {settings.aiProvider === "claude" && (
                        <AwsField label="Anthropic Claude API Key" icon={Key} value={settings.claudeApiKey ?? ""} secret onChange={(v) => setSettings((s) => ({ ...s, claudeApiKey: v }))} placeholder={settings.hasClaudeApiKey ? "Leave blank to keep current key" : undefined} savedPreview={settings.claudeApiKeyPreview} />
                      )}

                      <div className="mt-3">
                        <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] uppercase tracking-wide block mb-1.5">
                          Base System Instructions
                        </label>
                        <textarea
                          rows={3}
                          value={settings.geminiSystemPrompt}
                          onChange={(e) => setSettings((s) => ({ ...s, geminiSystemPrompt: e.target.value }))}
                          className="w-full text-xs font-mono border border-[#aab7b8] dark:border-[#414750] bg-white dark:bg-[#0f1114] p-2.5 rounded-xs outline-none focus:border-[#0073bb] text-[#16191f] dark:text-[#eaeded]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-end">
                    <button
                      onClick={() => saveSection("ai", "AI engine routing saved.")}
                      className="bg-[#0073bb] hover:bg-[#005a93] text-white text-xs font-bold px-4 py-2 rounded-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save AI Configuration
                    </button>
                  </div>
                </div>
              )}

              {/* --- 5. SYSTEM MODULES TAB --- */}
              {activeTab === "modules" && (
                <div>
                  <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128]">
                    <h2 className="text-sm font-bold text-[#16191f] dark:text-[#eaeded]">System Feature Flags</h2>
                    <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">
                      Enable or disable features across your team dashboard.
                    </p>
                  </div>

                  <div className="p-6">
                    <AwsToggleRow
                      label="WhatsApp Broadcast Campaigns"
                      hint="Allow sending bulk template messages and tracking live delivery stats."
                      checked={settings.featureCampaigns}
                      onChange={(v) => setSettings((s) => ({ ...s, featureCampaigns: v }))}
                    />
                    <AwsToggleRow
                      label="Visual Flow Engine"
                      hint="Enable visual node-based interactive response builder."
                      checked={settings.featureChatbotBuilder}
                      onChange={(v) => setSettings((s) => ({ ...s, featureChatbotBuilder: v }))}
                    />
                    <AwsToggleRow
                      label="Developer External APIs"
                      hint="Expose inbound/outbound REST endpoints for third-party tools."
                      checked={settings.featureDeveloperApi}
                      onChange={(v) => setSettings((s) => ({ ...s, featureDeveloperApi: v }))}
                    />
                    <AwsToggleRow
                      label="Live Agent Presence"
                      hint="Track online/busy presence indicator for support operators."
                      checked={settings.featureTeamPresence}
                      onChange={(v) => setSettings((s) => ({ ...s, featureTeamPresence: v }))}
                    />
                  </div>

                  <div className="p-4 border-t border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-end">
                    <button
                      onClick={() => saveSection("modules", "System module configuration updated.")}
                      className="bg-[#0073bb] hover:bg-[#005a93] text-white text-xs font-bold px-4 py-2 rounded-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Apply Module Flags
                    </button>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
