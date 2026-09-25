"use client";
import { toast } from "sonner";
import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar"; 
import { useTheme } from "next-themes";
import { 
  Users, Search, Filter, Plus, 
  UploadCloud, Chrome, FileSpreadsheet, 
  MoreVertical, CheckSquare, Phone, Loader2, Mail, Trash2,
  Download
} from "lucide-react";

// API se aane wale Contact ka type
interface ContactData {
  id: string;
  name: string | null;
  phoneNumber: string;
  email: string | null;
  source: string;
  createdAt: string;
}

export default function ContactsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<"all" | "google" | "csv" | "manual">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // Real Data States (Prisma API via Fetch)
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── 1. Load Google Sign-In Script ───
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // ─── 2. Fetch Contacts from Prisma API ───
  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // ─── 3. SAVE TO DB (API Call) ───
  const saveContactsToDB = async (newContacts: any[]) => {
    setIsImporting(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: newContacts }),
      });
      
      if (res.ok) {
        toast.success(`${newContacts.length} contacts imported successfully!`);
        setIsImportModalOpen(false);
        fetchContacts(); // Refresh list
      } else {
        toast.error("Failed to import contacts.");
      }
    } catch (error) {
      console.error("Error saving contacts:", error);
      toast.error("Failed to save contacts.");
    } finally {
      setIsImporting(false);
    }
  };

  // ─── 4. GOOGLE CONTACTS IMPORT (Env variable correctly used) ───
  const handleGoogleImport = () => {
    const win = window as any;

    if (!win.google) return toast.error("Google script loading, please wait...");
    
    // Yahan correctly env variable uthaya gaya hai
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return toast.error("Google Client ID is missing in your .env file!");
    }

    const client = win.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/contacts.readonly",
      callback: async (response: any) => {
        if (response.error) {
          toast.error("Google login failed.");
          return;
        }
        
        setIsImporting(true);
        try {
          const res = await fetch("https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses&pageSize=1000", {
            headers: { Authorization: `Bearer ${response.access_token}` }
          });
          const data = await res.json();
          
          if (!data.connections) {
            setIsImporting(false);
            return toast.error("No contacts found in your Google account.");
          }

          const formattedContacts = data.connections.map((c: any) => {
            const name = c.names?.[0]?.displayName || "Unknown";
            const phone = c.phoneNumbers?.[0]?.value?.replace(/\D/g, '') || "";
            const email = c.emailAddresses?.[0]?.value || null;
            
            if (phone) {
              return { name, phoneNumber: phone, email, source: "google" };
            }
            return null;
          }).filter(Boolean);

          if (formattedContacts.length > 0) {
            await saveContactsToDB(formattedContacts);
          } else {
            toast.error("No valid phone numbers found.");
            setIsImporting(false);
          }
        } catch (error) {
          toast.error("Error fetching Google contacts.");
          setIsImporting(false);
        }
      },
    });
    client.requestAccessToken();
  };

  // ─── 5. CSV IMPORT ───
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const formattedContacts = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",");
        if (row.length >= 2) {
          const name = row[0].trim();
          const phone = row[1].trim().replace(/\D/g, ''); 
          const email = row[2] ? row[2].trim() : null;

          if (phone) {
            formattedContacts.push({
              name: name || "Unknown",
              phoneNumber: phone,
              email: email || null,
              source: "csv"
            });
          }
        }
      }

      if (formattedContacts.length > 0) {
        await saveContactsToDB(formattedContacts);
      } else {
        toast.error("No valid data found in CSV. Format: Name, Phone, Email");
        setIsImporting(false);
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // ─── 6. DELETE LOGIC ───
  const deleteContacts = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} contact(s)?`)) return;
    
    try {
      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        setSelectedContacts([]);
        setActiveDropdown(null);
        fetchContacts(); 
      } else {
        toast.error("Failed to delete contacts");
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // ─── 7. FILTERING & SELECTION ───
  const filteredContacts = contacts.filter((contact) => {
    const matchesTab = activeTab === "all" || contact.source === activeTab;
    const matchesSearch = 
      (contact.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
      contact.phoneNumber.includes(searchQuery) ||
      (contact.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) setSelectedContacts([]);
    else setSelectedContacts(filteredContacts.map(c => c.id));
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#f2f3f3] dark:bg-[#0f1114] overflow-hidden pb-[70px] md:pb-0 font-sans text-[#16191f] dark:text-[#eaeded] relative">
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">
        
        {/* --- AWS Style Top Bar --- */}
        <div className="bg-[#232f3e] dark:bg-[#16191f] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 shadow-sm border-b border-[#232f3e] dark:border-[#414750]">
          <div>
            <h1 className="text-[18px] font-bold text-white flex items-center gap-2 tracking-tight">
              Audience & Contacts <span className="text-[#aab7b8] text-[14px] font-normal">| BaseKey CRM</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#ff9900] hover:bg-[#e88a00] text-[#16191f] rounded-sm font-bold text-[13px] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Import Contacts
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
          
          {/* Main Card (AWS Style) */}
          <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-sm border border-[#eaeded] dark:border-[#414750] flex flex-col overflow-hidden">
            
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128]">
              {[
                { id: "all", label: "All Contacts" },
                { id: "google", label: "Google", icon: Chrome },
                { id: "csv", label: "CSV / Excel", icon: FileSpreadsheet },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`px-4 py-2 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                      isActive 
                        ? "border-[#0073bb] text-[#0073bb] dark:text-[#3b99fc] dark:border-[#3b99fc]" 
                        : "border-transparent text-[#545b64] dark:text-[#aab7b8] hover:text-[#16191f] dark:hover:text-white"
                    }`}
                  >
                    {tab.icon && <tab.icon className="w-3.5 h-3.5" />} {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Table Controls (Search & Bulk Delete) */}
            <div className="p-4 border-b border-[#eaeded] dark:border-[#414750] flex items-center justify-between bg-white dark:bg-[#16191f]">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#545b64] dark:text-[#aab7b8]" />
                <input 
                  type="text" 
                  placeholder="Search name, phone, or email..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full pl-9 pr-4 py-1.5 text-[13px] border border-[#d5dbdb] dark:border-[#545b64] rounded-sm focus:outline-none focus:border-[#0073bb] dark:focus:border-[#3b99fc] bg-white dark:bg-[#0f1114] text-[#16191f] dark:text-[#eaeded] placeholder-[#545b64] dark:placeholder-[#879596]"
                />
              </div>
              
              {/* Dynamic Action Button based on Selection */}
              {selectedContacts.length > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold text-[#0073bb] dark:text-[#3b99fc]">
                    {selectedContacts.length} Selected
                  </span>
                  <button 
                    onClick={() => deleteContacts(selectedContacts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-white bg-[#d62728] hover:bg-[#c92526] rounded-sm transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              ) : (
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-[#545b64] dark:text-[#eaeded] bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#545b64] rounded-sm hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] transition">
                  <Filter className="w-3.5 h-3.5" /> Filter
                </button>
              )}
            </div>

            {/* Actual Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750]">
                    <th className="px-5 py-3 w-10">
                      <button onClick={toggleSelectAll} className="text-[#545b64] dark:text-[#aab7b8] hover:text-[#0073bb] dark:hover:text-[#3b99fc] transition">
                        <CheckSquare className={`w-4 h-4 ${selectedContacts.length === filteredContacts.length && filteredContacts.length > 0 ? "text-[#0073bb] dark:text-[#3b99fc]" : ""}`} />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Contact Name</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Phone & Email</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Source</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Date Added</th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaeded] dark:divide-[#414750]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#545b64] dark:text-[#aab7b8]">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-[#0073bb] dark:text-[#3b99fc]" />
                        <p className="text-[13px] font-medium">Loading contacts from database...</p>
                      </td>
                    </tr>
                  ) : filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-[#545b64] dark:text-[#aab7b8]">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128]">
                          <Users className="w-5 h-5 text-[#aab7b8] dark:text-[#545b64]" />
                        </div>
                        <p className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded] mb-1">No contacts found</p>
                        <p className="text-[13px]">Import via Google or CSV to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => (
                      <tr key={contact.id} className={`transition-colors group ${selectedContacts.includes(contact.id) ? 'bg-[#f0f8ff] dark:bg-[#0073bb]/10' : 'hover:bg-[#fafafa] dark:hover:bg-[#2a3039]'}`}>
                        <td className="px-5 py-3">
                          <button onClick={() => toggleSelect(contact.id)} className="text-[#aab7b8] dark:text-[#545b64] hover:text-[#0073bb] dark:hover:text-[#3b99fc] transition">
                            <CheckSquare className={`w-4 h-4 ${selectedContacts.includes(contact.id) ? "text-[#0073bb] dark:text-[#3b99fc]" : ""}`} />
                          </button>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-sm bg-[#0073bb] flex items-center justify-center text-white font-bold text-[13px] uppercase shadow-sm">
                              {(contact.name && contact.name !== "Unknown") ? contact.name.charAt(0) : <Users className="w-3.5 h-3.5"/>}
                            </div>
                            <p className="text-[13px] font-bold text-[#16191f] dark:text-[#eaeded]">{contact.name || "Unknown"}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[13px] text-[#16191f] dark:text-[#eaeded] font-medium flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-[#545b64] dark:text-[#aab7b8]" /> +{contact.phoneNumber}
                            </p>
                            {contact.email ? (
                              <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8] flex items-center gap-1.5">
                                <Mail className="w-3 h-3" /> {contact.email}
                              </p>
                            ) : (
                              <p className="text-[11px] text-[#aab7b8] dark:text-[#545b64] italic">No email provided</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {contact.source === "google" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#f0f8ff] dark:bg-[#0073bb]/20 text-[#0073bb] dark:text-[#3b99fc] border border-[#0073bb]/30 text-[11px] font-bold uppercase"><Chrome className="w-3 h-3" /> Google</span>
                          ) : contact.source === "csv" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#ecfdf5] dark:bg-[#10B981]/20 text-[#10B981] dark:text-[#34d399] border border-[#10B981]/30 text-[11px] font-bold uppercase"><FileSpreadsheet className="w-3 h-3" /> CSV</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#f2f3f3] dark:bg-[#2a3039] text-[#545b64] dark:text-[#aab7b8] border border-[#d5dbdb] dark:border-[#545b64] text-[11px] font-bold uppercase">Manual</span>
                          )}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-[13px] text-[#545b64] dark:text-[#aab7b8]">
                          {new Date(contact.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right relative">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === contact.id ? null : contact.id)}
                            className="p-1.5 text-[#545b64] dark:text-[#aab7b8] hover:text-[#0073bb] dark:hover:text-white transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {/* Individual Delete Dropdown */}
                          {activeDropdown === contact.id && (
                            <div className="absolute right-8 top-8 bg-white dark:bg-[#232f3e] border border-[#eaeded] dark:border-[#414750] shadow-md rounded-sm py-1 z-50 min-w-[120px]">
                              <button 
                                onClick={() => deleteContacts([contact.id])}
                                className="w-full text-left px-4 py-2 text-[13px] text-[#d62728] hover:bg-[#fafafa] dark:hover:bg-[#16191f] font-bold flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── AWS STYLE IMPORT MODAL ─── */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#16191f]/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#16191f] rounded-lg w-full max-w-md shadow-2xl overflow-hidden border border-[#eaeded] dark:border-[#414750]">
              
              {/* Modal Header */}
              <div className="px-5 py-3 border-b border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-between items-center">
                 <h2 className="text-[15px] font-bold text-[#16191f] dark:text-[#eaeded]">Import Contacts</h2>
                 <button onClick={() => setIsImportModalOpen(false)} className="text-[#545b64] hover:text-[#16191f] dark:text-[#aab7b8] dark:hover:text-white">
                   <Plus className="w-5 h-5 rotate-45" />
                 </button>
              </div>

              <div className="p-5">
                <p className="text-[13px] text-[#545b64] dark:text-[#aab7b8] mb-5">Choose how you want to add contacts to BaseKey CRM.</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleGoogleImport}
                    disabled={isImporting}
                    className="w-full flex items-center p-3 border border-[#eaeded] dark:border-[#414750] rounded-sm hover:border-[#0073bb] dark:hover:border-[#3b99fc] transition-all group disabled:opacity-50"
                  >
                    <div className="w-8 h-8 bg-[#f0f8ff] dark:bg-[#0073bb]/20 text-[#0073bb] dark:text-[#3b99fc] rounded-sm flex items-center justify-center mr-3">
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-[#16191f] dark:text-[#eaeded] text-[13px]">Sync Google Contacts</h3>
                      <p className="text-[11px] text-[#545b64] dark:text-[#aab7b8] mt-0.5">Fetch Name, Phone & Email automatically</p>
                    </div>
                  </button>

                  <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full flex items-center p-3 border border-[#eaeded] dark:border-[#414750] rounded-sm hover:border-[#10B981] dark:hover:border-[#34d399] transition-all group disabled:opacity-50"
                  >
                    <div className="w-8 h-8 bg-[#ecfdf5] dark:bg-[#10B981]/20 text-[#10B981] dark:text-[#34d399] rounded-sm flex items-center justify-center mr-3">
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-[#16191f] dark:text-[#eaeded] text-[13px]">Upload CSV List</h3>
                      <p className="text-[11px] text-[#545b64] dark:text-[#aab7b8] mt-0.5">Format: Name, Phone, Email (Optional)</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-[#eaeded] dark:border-[#414750] bg-[#fafafa] dark:bg-[#1c2128] flex justify-end">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="px-4 py-1.5 text-[13px] font-bold text-[#16191f] dark:text-[#eaeded] bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#545b64] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] rounded-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
