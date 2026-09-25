"use client";
import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar"; 
import { useTheme } from "next-themes";
import { 
  Code2, Key, Copy, Check, Terminal, Eye, EyeOff, Plus, 
  FileText, Database, Send, Trash2, Loader2, Zap, Clock, 
  ChevronRight, Lock, Activity, CheckCircle2, XCircle, Globe
} from "lucide-react";

interface SavedAPI {
  id: string;
  name: string;
  // Security fix (BaseKey audit): the server now stores only a SHA-256 hash
  // of the key, so `token` is only ever present in the API response for the
  // one request that just created it — every other GET only returns
  // `tokenPrefix` (e.g. "bk_live_a1b2") so the UI can still identify a key
  // without being able to display or resend the real secret.
  token?: string;
  tokenPrefix: string;
  expiresAt: string | null;
  createdAt: string;
}

// 🔥 NAYA: API Logs ka interface
interface ApiLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  status: string;
  errorMsg: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  apiKey?: { name: string } | null;
}

export default function DevelopersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: boolean }>({});
  
  const [wabaId, setWabaId] = useState<string>("");
  const [phoneId, setPhoneId] = useState<string>("");
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(30); 

  const [savedApis, setSavedApis] = useState<SavedAPI[]>([]);
  
  // 🔥 NAYA: Logs Store karne ke liye state
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [testPhones, setTestPhones] = useState<{ [key: string]: string }>({});
  const [sendingStatus, setSendingStatus] = useState<{ [key: string]: boolean }>({});

  const apiUrl = "https://basekey.in/api/v1/trigger";

  // Initial Data Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const configRes = await fetch("/api/config");
        if (configRes.ok) {
          const configData = await configRes.json();
          const settings = configData.settings || configData; 
          
          if (settings.businessAccountId) {
            setWabaId(settings.businessAccountId);
            setPhoneId(settings.phoneNumberId);
            fetchAvailableTemplates();
          }
        }

        const keysRes = await fetch("/api/keys");
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          setSavedApis(keysData);
        }
        
        // Fetch Logs immediately on load
        fetchLogs();

      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // 🔥 NAYA: API Logs fetch karne ka function
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setApiLogs(data);
      }
    } catch (e) {
      console.error("Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAvailableTemplates = async () => {
    try {
      const response = await fetch("/api/whatsapp/templates");
      const result = await response.json();
      if (result.templates) {
        const approved = result.templates.filter((t: any) => t.status === "APPROVED");
        const uniqueTemplatesMap = new Map();
        approved.forEach((t: any) => {
           if(!uniqueTemplatesMap.has(t.name)) uniqueTemplatesMap.set(t.name, t);
        });
        const uniqueTemplates = Array.from(uniqueTemplatesMap.values());
        setAvailableTemplates(uniqueTemplates);
        if (uniqueTemplates.length > 0) {
          setSelectedTemplate(uniqueTemplates[0].name);
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateNewApi = async () => {
    if (!selectedTemplate) return;
    
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: selectedTemplate,
          expiryDays: expiryDays,
        }),
      });

      if (res.ok) {
        const newApi = await res.json();
        setSavedApis([newApi, ...savedApis]); 
        toast.success("New API Key Generated Successfully!");
      } else {
        toast.error("Failed to generate API Key.");
      }
    } catch (error: any) {
      console.error("Database Write Error:", error);
      toast.error("Error saving to database.");
    }
  };

  const deleteApi = async (id: string) => {
    if(confirm("Are you sure you want to revoke and delete this API Key? Any app using it will stop working immediately.")){
      try {
        const res = await fetch("/api/keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (res.ok) {
          setSavedApis(savedApis.filter((api) => api.id !== id));
        } else {
          toast.error("Failed to delete API Key.");
        }
      } catch (error: any) {
        console.error("Database Delete Error:", error);
        toast.error("Failed to revoke API Key");
      }
    }
  };

  const getDummyVariables = (tplName: string) => {
    const tplDef = availableTemplates.find(t => t.name === tplName);
    if (!tplDef || !tplDef.components) return [];
    
    const bodyComp = tplDef.components.find((c: any) => c.type === "BODY");
    if (!bodyComp || !bodyComp.text) return [];
    
    const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.map((_: any, i: number) => `TestVal_${i+1}`) : [];
  };

  const handleTestSend = async (api: SavedAPI) => {
    const phone = testPhones[api.id];
    if (!phone) {
      toast.error("Please enter a phone number to test.");
      return;
    }

    if (api.expiresAt && new Date(api.expiresAt) < new Date()) {
      toast.error("This API Key has expired!");
      return;
    }

    // Security fix (BaseKey audit): the server only ever sends the real
    // token back once, in the response right after it's generated — it's
    // never stored or refetched after that. If this key was loaded from a
    // page refresh, `api.token` won't be here, so there's nothing valid to
    // send as a Bearer token.
    if (!api.token) {
      toast.error("This key's secret isn't available anymore in this session. Generate a new key to test-send, and copy it somewhere safe first.");
      return;
    }

    setSendingStatus({ ...sendingStatus, [api.id]: true });

    const tplDef = availableTemplates.find(t => t.name === api.name);
    const dummyVars = getDummyVariables(api.name);

    try {
      const response = await fetch("/api/v1/trigger", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${api.token}` // 🔥 Real token sending
        },
        body: JSON.stringify({
          phone,
          template: api.name, // Updated payload to match backend
          language: tplDef ? tplDef.language : "en_US",
          variables: dummyVars,
        }),
      });

      const data = await response.json();
      
      // Auto-refresh logs after testing
      fetchLogs();

      if (data.error) {
        toast.error("Error: " + data.error);
      } else {
        toast.success("Success! Check your WhatsApp.");
      }
    } catch (error) {
      toast.error("Failed to send test message.");
    } finally {
      setSendingStatus({ ...sendingStatus, [api.id]: false });
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f2f3f3] dark:bg-[#0f1114] overflow-hidden pb-[70px] md:pb-0 font-sans text-[#16191f] dark:text-[#eaeded] relative">
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">
        
        {/* --- Top Bar --- */}
        <div className="bg-[#232f3e] dark:bg-[#16191f] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 shadow-sm border-b border-[#232f3e] dark:border-[#414750]">
          <div>
            <h1 className="text-[18px] font-bold text-white flex items-center gap-2 tracking-tight">
              Developers & API <span className="text-[#aab7b8] text-[14px] font-normal">| BaseKey CRM</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://docs.basekey.in" target="_blank" rel="noreferrer" className="text-[13px] text-[#aab7b8] hover:text-white transition-colors border border-[#545b64] px-3 py-1.5 rounded-sm flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> API Documentation
            </a>
          </div>
        </div>

        <div className="p-4 md:p-6 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-5">
          
          {/* Base URL Section */}
          <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-sm border border-[#eaeded] dark:border-[#414750] p-5">
            <h2 className="text-[15px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> BaseKey Trigger API Endpoint
            </h2>
            <p className="text-[13px] text-[#545b64] dark:text-[#aab7b8] mb-4">Use this base URL to trigger template messages securely from your external applications.</p>
            <div className="flex items-center gap-3 bg-[#fafafa] dark:bg-[#0f1114] p-2.5 rounded-sm border border-[#d5dbdb] dark:border-[#545b64]">
              <input type="text" readOnly value={apiUrl} className="bg-transparent font-mono text-[13px] flex-1 text-[#16191f] dark:text-[#eaeded] outline-none" />
              <button onClick={() => handleCopy(apiUrl, "apiUrl")} className="bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#545b64] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] text-[#16191f] dark:text-[#eaeded] px-3 py-1.5 rounded-sm text-[12px] font-bold flex items-center gap-1.5 transition">
                {copiedStates["apiUrl"] ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedStates["apiUrl"] ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </div>

          {/* Generator Section */}
          <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-sm border border-[#eaeded] dark:border-[#414750] p-5 flex flex-col md:flex-row gap-4 items-end">
            
            <div className="flex-1 w-full">
              <label className="text-[13px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-1.5 mb-2">
                Target Template
              </label>
              {availableTemplates.length === 0 ? (
                <div className="bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] text-[#545b64] dark:text-[#aab7b8] text-[13px] rounded-sm px-3 py-2.5">
                  {loading ? "Loading templates from Meta..." : "No approved templates found."}
                </div>
              ) : (
                <select 
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-white dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] text-[#16191f] dark:text-[#eaeded] text-[13px] rounded-sm px-3 py-2.5 outline-none focus:border-[#0073bb] dark:focus:border-[#3b99fc] shadow-sm"
                >
                  {availableTemplates.map((tpl: any) => (
                    <option key={tpl.name} value={tpl.name}>{tpl.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="w-full md:w-48 shrink-0">
              <label className="text-[13px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-1.5 mb-2">
                Token Expiry
              </label>
              <select 
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full bg-white dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] text-[#16191f] dark:text-[#eaeded] text-[13px] rounded-sm px-3 py-2.5 outline-none focus:border-[#0073bb] dark:focus:border-[#3b99fc] shadow-sm"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={0}>Never Expire</option>
              </select>
            </div>

            <button 
              onClick={generateNewApi}
              disabled={availableTemplates.length === 0}
              className="w-full md:w-auto bg-[#0073bb] hover:bg-[#005a93] text-white px-5 py-2.5 rounded-sm text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Generate Token
            </button>
          </div>

          {/* List of Active Keys */}
          <div className="space-y-4 mt-2">
            <h2 className="text-[16px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Active API Tokens
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center p-10 bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-[#0073bb] dark:text-[#3b99fc]" />
              </div>
            ) : savedApis.length === 0 ? (
              <div className="bg-[#fafafa] dark:bg-[#16191f] border border-dashed border-[#d5dbdb] dark:border-[#545b64] rounded-lg p-10 text-center text-[#545b64] dark:text-[#aab7b8] text-[13px]">
                Generate an API key above to see it here.
              </div>
            ) : (
              savedApis.map((api) => {
                const currentPhone = testPhones[api.id] || "919876543210";
                const requiredVars = getDummyVariables(api.name);
                const isExpired = api.expiresAt ? new Date(api.expiresAt) < new Date() : false;
                
                return (
                <div key={api.id} className={`bg-white dark:bg-[#16191f] rounded-lg shadow-sm border overflow-hidden ${isExpired ? "border-[#d62728]/50 dark:border-[#d62728]/30 opacity-80" : "border-[#eaeded] dark:border-[#414750]"}`}>
                  
                  <div className={`px-5 py-3 border-b flex justify-between items-center ${isExpired ? "bg-[#fff5f5] dark:bg-[#3f1919] border-[#d62728]/20 dark:border-[#d62728]/20" : "bg-[#fafafa] dark:bg-[#1c2128] border-[#eaeded] dark:border-[#414750]"}`}>
                    <div>
                      <p className="text-[11px] text-[#545b64] dark:text-[#aab7b8] font-bold uppercase tracking-wider mb-0.5">Template Binding</p>
                      <p className="font-bold text-[14px] text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
                        {api.name} 
                        {isExpired && <span className="bg-[#d62728]/10 text-[#d62728] dark:text-[#ff6b6b] text-[10px] px-2 py-0.5 rounded-sm border border-[#d62728]/20">EXPIRED</span>}
                        {!isExpired && api.expiresAt && <span className="bg-[#ff9900]/10 text-[#e88a00] dark:text-[#ffb347] text-[10px] px-2 py-0.5 rounded-sm border border-[#ff9900]/20">Valid till: {new Date(api.expiresAt).toLocaleDateString()}</span>}
                      </p>
                    </div>
                    <button onClick={() => deleteApi(api.id)} className="text-[12px] text-[#d62728] hover:bg-[#fff5f5] dark:hover:bg-[#3f1919] border border-transparent hover:border-[#d62728]/20 px-3 py-1.5 rounded-sm font-bold flex items-center gap-1.5 transition">
                      <Trash2 className="w-3.5 h-3.5" /> Revoke
                    </button>
                  </div>

                  <div className="p-5 space-y-5">
                    
                    {/* API Key Box */}
                    <div>
                      <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                         Authentication Token <Lock className="w-3 h-3"/>
                      </label>
                      {api.token ? (
                        <>
                          <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-[#0f1114] p-2 rounded-sm border border-[#d5dbdb] dark:border-[#545b64]">
                            <Key className="w-4 h-4 text-[#aab7b8] ml-1" />
                            <input 
                              type={visibleKeys[api.id] ? "text" : "password"} 
                              readOnly 
                              value={api.token} 
                              className="bg-transparent font-mono text-[13px] flex-1 text-[#16191f] dark:text-[#eaeded] outline-none select-all"
                            />
                            <button onClick={() => toggleKeyVisibility(api.id)} className="p-1.5 text-[#545b64] dark:text-[#aab7b8] hover:text-[#16191f] dark:hover:text-white transition">
                              {visibleKeys[api.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleCopy(api.token!, `key-${api.id}`)} disabled={isExpired} className="bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#545b64] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] text-[#16191f] dark:text-[#eaeded] px-3 py-1.5 rounded-sm text-[12px] font-bold flex items-center gap-1.5 transition disabled:opacity-50">
                              {copiedStates[`key-${api.id}`] ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedStates[`key-${api.id}`] ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <p className="text-[11px] text-[#e88a00] dark:text-[#ffb347] mt-1.5">Copy this now — it won't be shown again after you leave this page.</p>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-[#0f1114] p-2.5 rounded-sm border border-[#d5dbdb] dark:border-[#545b64]">
                          <Key className="w-4 h-4 text-[#aab7b8] ml-1" />
                          <span className="font-mono text-[13px] flex-1 text-[#545b64] dark:text-[#879596]">{api.tokenPrefix}••••••••••••••••••••</span>
                          <span className="text-[11px] text-[#545b64] dark:text-[#879596]">secret hidden — only shown once, at creation</span>
                        </div>
                      )}
                    </div>

                    {/* Test Connection Box */}
                    <div className="bg-[#f0f8ff] dark:bg-[#0073bb]/5 border border-[#0073bb]/20 rounded-sm p-4">
                      <h3 className="text-[13px] font-bold text-[#0073bb] dark:text-[#3b99fc] mb-2 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" /> Test Connection
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text"
                          placeholder="Phone No. with Country Code"
                          value={testPhones[api.id] || ""}
                          onChange={(e) => setTestPhones({...testPhones, [api.id]: e.target.value})}
                          disabled={isExpired}
                          className="flex-1 bg-white dark:bg-[#0f1114] border border-[#0073bb]/30 text-[#16191f] dark:text-[#eaeded] text-[13px] rounded-sm px-3 py-2 outline-none focus:border-[#0073bb] dark:focus:border-[#3b99fc] disabled:opacity-50"
                        />
                        <button 
                          onClick={() => handleTestSend(api)}
                          disabled={sendingStatus[api.id] || isExpired}
                          className="bg-[#0073bb] hover:bg-[#005a93] text-white px-4 py-2 rounded-sm text-[13px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        >
                          {sendingStatus[api.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send Payload"}
                        </button>
                      </div>
                    </div>

                    {/* cURL Request Terminal */}
                    <div>
                      <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" /> cURL Request Example
                      </label>
                      <div className="relative group">
                        <pre className="bg-[#16191f] dark:bg-[#0f1114] text-[#10B981] border border-[#414750] p-4 rounded-sm text-[12px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
{`curl -X POST https://basekey.in/api/v1/trigger \\
  -H "Authorization: Bearer ${api.token ? (visibleKeys[api.id] ? api.token : "bk_live_************************") : `${api.tokenPrefix}************`}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template": "${api.name}",
    "phone": "${currentPhone}",
    "variables": ${JSON.stringify(requiredVars)}
  }'`}
                        </pre>
                        <button 
                          onClick={() => api.token && handleCopy(`curl -X POST https://basekey.in/api/v1/trigger -H "Authorization: Bearer ${api.token}" -H "Content-Type: application/json" -d '{"template": "${api.name}", "phone": "${currentPhone}", "variables": ${JSON.stringify(requiredVars)}}'`, `curl-${api.id}`)}
                          disabled={!api.token}
                          className="absolute top-2 right-2 bg-[#2a3039] hover:bg-[#414750] text-white px-3 py-1.5 rounded-sm text-[11px] font-bold transition disabled:opacity-50"
                        >
                          {copiedStates[`curl-${api.id}`] ? "Copied!" : "Copy Code"}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )})
            )}
          </div>
          
          {/* 🔥 NAYA: Live API Request Logs Table */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Live Webhook Logs
              </h2>
              <button onClick={fetchLogs} className="text-[12px] text-[#545b64] hover:text-[#0073bb] dark:text-[#aab7b8] dark:hover:text-[#3b99fc] font-bold transition flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-lg shadow-sm overflow-hidden">
              {logsLoading ? (
                 <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0073bb] dark:text-[#3b99fc]" /></div>
              ) : apiLogs.length === 0 ? (
                 <div className="p-10 text-center text-[13px] text-[#545b64] dark:text-[#aab7b8]">No API requests logged yet. Trigger a template to see logs here.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750]">
                        <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Endpoint</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Client / IP</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Error Info</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaeded] dark:divide-[#414750]">
                      {apiLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#fafafa] dark:hover:bg-[#2a3039] transition-colors">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] font-bold tracking-wider uppercase border ${
                              log.status === "SUCCESS" 
                                ? "bg-[#ecfdf5] dark:bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30" 
                                : "bg-[#fff5f5] dark:bg-[#d62728]/10 text-[#d62728] border-[#d62728]/30"
                            }`}>
                              {log.status === "SUCCESS" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {log.statusCode}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">{log.method} {log.endpoint}</p>
                            {log.apiKey && <p className="text-[10px] text-[#545b64] dark:text-[#879596] mt-0.5">via key: {log.apiKey.name}</p>}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <p className="text-[12px] text-[#16191f] dark:text-[#eaeded] flex items-center gap-1.5"><Globe className="w-3 h-3 text-[#545b64]" /> {log.ipAddress}</p>
                            <p className="text-[10px] text-[#545b64] dark:text-[#879596] mt-0.5 truncate max-w-[150px]" title={log.userAgent || ""}>{log.userAgent}</p>
                          </td>
                          <td className="px-5 py-3 text-[12px] text-[#16191f] dark:text-[#eaeded]">
                            {log.errorMsg ? (
                              <span className="text-[#d62728]">{log.errorMsg}</span>
                            ) : (
                              <span className="text-[#545b64] dark:text-[#879596]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-right text-[12px] text-[#545b64] dark:text-[#aab7b8]">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
