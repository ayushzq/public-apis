"use client";
import { toast } from "sonner";
import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { 
  UserPlus, Trash2, Loader2, Mail, User, ShieldCheck, Activity, 
  Layout, Edit2, Lock, Camera, UploadCloud
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

const AVAILABLE_PAGES = [
  { id: "/dashboard", name: "Main Dashboard" },
  { id: "/chat", name: "Live Chat" },
  { id: "/contacts", name: "Contacts CRM" },
  { id: "/campaigns", name: "Bulk Campaigns" },
  { id: "/chatbot-builder", name: "Flow Builder" },
  { id: "/template", name: "Templates" },
  { id: "/settings", name: "Settings" }
];

export default function TeamPage() {
  const { theme } = useTheme();
  
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = { 
    id: "",
    name: "", 
    email: "", 
    password: "",
    role: "AGENT", 
    allowedPages: ["/chat", "/contacts"], 
    primaryPage: "/chat",
    image: ""
  };

  const [formData, setFormData] = useState(initialFormState);

  // Real data fetching
  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch (error) {
      console.error("Error fetching team", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    const interval = setInterval(fetchTeam, 10000); 
    return () => clearInterval(interval);
  }, []);

  const handleCheckboxChange = (pageId: string) => {
    setFormData(prev => {
      const newAllowed = prev.allowedPages.includes(pageId)
        ? prev.allowedPages.filter(p => p !== pageId) 
        : [...prev.allowedPages, pageId]; 
      
      const newPrimary = newAllowed.includes(prev.primaryPage) ? prev.primaryPage : (newAllowed[0] || "");
      
      return { ...prev, allowedPages: newAllowed, primaryPage: newPrimary };
    });
  };

  // 🔥 BACKEND API ROUTE IMAGE UPLOAD (Standard & Secure)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error("Image size must be less than 2MB");
    }

    setUploadingImage(true);
    try {
      const formDataForUpload = new FormData();
      formDataForUpload.append("file", file);

      // Call internal Next.js backend API
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataForUpload,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Image upload failed");
        return;
      }

      if (data.secure_url) {
        setFormData(prev => ({ ...prev, image: data.secure_url }));
        toast.success("Profile picture uploaded!");
      } else {
        toast.error("Failed to retrieve image URL");
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      toast.error(error.message || "Network error during upload");
    } finally {
      setUploadingImage(false);
    }
  };

  // ADD YA UPDATE MEMBER LOGIC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.allowedPages.length === 0) return toast.error("Please select at least one page access!");
    
    setIsSubmitting(true);
    try {
      const method = isEditMode ? "PUT" : "POST";
      
      const payload = isEditMode 
        ? { 
            id: formData.id, 
            name: formData.name, 
            role: formData.role, 
            allowedPages: formData.allowedPages, 
            primaryPage: formData.primaryPage, 
            image: formData.image 
          }
        : formData;

      const res = await fetch("/api/team", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setFormData(initialFormState);
        setIsModalOpen(false);
        setIsEditMode(false);
        fetchTeam(); 
        toast.success(isEditMode ? "Member updated successfully!" : "Verification email sent to new member!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // OPEN EDIT MODAL
  const openEditModal = (member: any) => {
    setFormData({
      id: member.id,
      name: member.name,
      email: member.email,
      password: "",
      role: member.role,
      allowedPages: member.allowedPages || [],
      primaryPage: member.primaryPage || "/chat",
      image: member.image || ""
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // DELETE LOGIC
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently remove ${name}?`)) {
      try {
        const res = await fetch("/api/team", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
           toast.success("User removed");
           fetchTeam();
        } else {
           const data = await res.json();
           toast.error(data.error || "Failed to delete user");
        }
      } catch (error) {
        console.error("Delete error", error);
        toast.error("Error deleting user");
      }
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
              Access & Team Management <span className="text-[#aab7b8] text-[14px] font-normal">| BaseKey CRM</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => {
                  setFormData(initialFormState);
                  setIsEditMode(false);
                  setIsModalOpen(true);
                }}
                className="bg-[#0073bb] hover:bg-[#005a93] text-white px-4 py-1.5 rounded-sm text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" /> Create Access
              </button>
          </div>
        </div>

        {/* --- Main Table Area --- */}
        <div className="p-4 md:p-6 max-w-6xl mx-auto w-full flex-1 flex flex-col gap-5">
            <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-sm border border-[#eaeded] dark:border-[#414750] overflow-hidden">
                {loading ? (
                  <div className="flex justify-center items-center p-10">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0073bb]" />
                  </div>
                ) : team.length === 0 ? (
                  <div className="bg-[#fafafa] dark:bg-[#16191f] p-10 text-center text-[#545b64] text-[13px]">
                     No team members found. Click "Create Access" to add an Administrator or Agent.
                  </div>
                ) : (
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750]">
                            <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">User Profile</th>
                            <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Role & Permissions</th>
                            <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide">Live Activity</th>
                            <th className="px-5 py-3 text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wide text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eaeded] dark:divide-[#414750]">
                           {team.map((member) => (
                               <tr key={member.id} className="hover:bg-[#fafafa] dark:hover:bg-[#2a3039] transition-colors">
                                  
                                  {/* User Profile Column */}
                                  <td className="px-5 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-[#f2f3f3] dark:bg-[#0f1114] border border-[#eaeded] dark:border-[#414750] flex items-center justify-center overflow-hidden shrink-0">
                                        {member.image ? (
                                          <img src={member.image} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                          <User className="w-5 h-5 text-[#aab7b8]" />
                                        )}
                                      </div>
                                      
                                      <div>
                                        <div className="font-bold text-[#16191f] dark:text-[#eaeded] text-[13px] flex items-center gap-2">
                                          {member.name}
                                          {!member.emailVerified && (
                                            <span title="Verification Pending" className="w-1.5 h-1.5 bg-[#e88a00] rounded-full animate-pulse"></span>
                                          )}
                                        </div>
                                        <div className="text-[12px] text-[#545b64] dark:text-[#aab7b8] flex items-center gap-1 mt-0.5">
                                          <Mail className="w-3 h-3" /> {member.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  
                                  {/* Role & Access Column */}
                                  <td className="px-5 py-4">
                                      <span className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider border ${member.role === 'ADMIN' ? 'bg-[#f0f8ff] dark:bg-[#0073bb]/10 text-[#0073bb] dark:text-[#3b99fc] border-[#0073bb]/30' : 'bg-[#ecfdf5] dark:bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'}`}>
                                          {member.role === 'ADMIN' ? 'Administrator' : 'Agent'}
                                      </span>
                                      <div className="text-[11px] mt-2 flex gap-1.5 flex-wrap">
                                          {member.allowedPages?.slice(0, 2).map((page: string) => (
                                              <span key={page} className="bg-[#f2f3f3] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] px-1.5 py-0.5 rounded-sm text-[#545b64] dark:text-[#aab7b8] text-[10px]">
                                                {AVAILABLE_PAGES.find(p => p.id === page)?.name || page}
                                              </span>
                                          ))}
                                          {member.allowedPages?.length > 2 && (
                                            <span className="bg-[#f2f3f3] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] px-1.5 py-0.5 rounded-sm text-[#545b64] dark:text-[#aab7b8] text-[10px] font-bold">
                                              +{member.allowedPages.length - 2}
                                            </span>
                                          )}
                                      </div>
                                  </td>
                                  
                                  {/* Activity Column */}
                                  <td className="px-5 py-4 whitespace-nowrap">
                                      <div className="flex flex-col gap-1.5">
                                          <span className={`text-[12px] font-bold flex items-center gap-1.5 w-max ${member.status === 'ONLINE' ? 'text-[#10B981]' : member.status === 'BUSY' ? 'text-[#e88a00] dark:text-[#ffb347]' : 'text-[#545b64] dark:text-[#879596]'}`}>
                                              <div className={`w-1.5 h-1.5 rounded-full ${member.status === 'ONLINE' ? 'bg-[#10B981] animate-pulse' : member.status === 'BUSY' ? 'bg-[#e88a00]' : 'bg-[#545b64]'}`}></div>
                                              {member.status || "OFFLINE"}
                                          </span>
                                          <span className="text-[10px] text-[#545b64] dark:text-[#aab7b8] flex items-center gap-1 font-medium bg-[#fafafa] dark:bg-[#0f1114] px-2 py-0.5 rounded-sm border border-[#eaeded] dark:border-[#545b64] w-max">
                                              <Activity className="w-3 h-3" /> {member.currentActivity || "Idle / Offline"}
                                          </span>
                                      </div>
                                  </td>

                                  {/* Actions Column (EDIT & DELETE) */}
                                  <td className="px-5 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => openEditModal(member)} className="text-[#0073bb] dark:text-[#3b99fc] hover:bg-[#f0f8ff] dark:hover:bg-[#0073bb]/10 p-2 rounded-sm border border-transparent hover:border-[#0073bb]/20 transition" title="Edit User">
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(member.id, member.name)} className="text-[#d62728] hover:bg-[#fff5f5] dark:hover:bg-[#3f1919] p-2 rounded-sm border border-transparent hover:border-[#d62728]/20 transition" title="Delete User">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
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

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#16191f]/60 dark:bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#16191f] rounded-lg shadow-xl w-full max-w-2xl border border-[#eaeded] dark:border-[#414750] flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#eaeded] dark:border-[#414750] flex justify-between items-center bg-[#fafafa] dark:bg-[#1c2128]">
              <h3 className="font-bold text-[15px] text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> 
                {isEditMode ? "Edit Access Rights" : "Configure Access Rights"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#545b64] hover:text-[#16191f] dark:text-[#aab7b8] dark:hover:text-white transition">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              
              {/* Profile Image Uploader */}
              <div className="flex items-center gap-5 bg-[#fafafa] dark:bg-[#0f1114] p-4 rounded-sm border border-[#eaeded] dark:border-[#414750]">
                 <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-[#d5dbdb] dark:border-[#545b64] flex items-center justify-center bg-white dark:bg-[#1c2128] overflow-hidden group">
                    {uploadingImage ? (
                       <Loader2 className="w-6 h-6 animate-spin text-[#0073bb]" />
                    ) : formData.image ? (
                       <>
                         <img src={formData.image} alt="Upload preview" className="w-full h-full object-cover" />
                         <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition">
                            <Camera className="w-5 h-5 text-white" />
                         </div>
                       </>
                    ) : (
                       <UploadCloud className="w-6 h-6 text-[#aab7b8]" />
                    )}
                 </div>
                 <div className="flex-1">
                    <h4 className="text-[13px] font-bold text-[#16191f] dark:text-[#eaeded]">Profile Picture</h4>
                    <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-1 mb-2">Upload a professional photo (Max 2MB).</p>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="bg-white dark:bg-[#1c2128] border border-[#d5dbdb] dark:border-[#545b64] text-[#545b64] dark:text-[#eaeded] px-3 py-1 rounded-sm text-[11px] font-bold hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] transition">
                       Choose Image
                    </button>
                 </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider block mb-1.5">Full Name</label>
                  <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-[#0f1114] p-2 rounded-sm border border-[#d5dbdb] dark:border-[#545b64] focus-within:border-[#0073bb]">
                    <User className="w-4 h-4 text-[#aab7b8] ml-1" />
                    <input type="text" required placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-transparent flex-1 outline-none text-[13px] text-[#16191f] dark:text-[#eaeded]" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider block mb-1.5">Login Email</label>
                  <div className="flex items-center gap-2 bg-[#eaeded] dark:bg-[#1c2128] p-2 rounded-sm border border-[#d5dbdb] dark:border-[#545b64]">
                    <Mail className="w-4 h-4 text-[#aab7b8] ml-1" />
                    <input type="email" required placeholder="user@company.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={isEditMode} className="bg-transparent flex-1 outline-none text-[13px] text-[#545b64] dark:text-[#879596] cursor-not-allowed" />
                  </div>
                  {isEditMode && <p className="text-[10px] text-[#0073bb] mt-1">Email cannot be changed.</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider block mb-1.5">Role Assignment</label>
                  <select 
                    value={formData.role} 
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({...formData, role: newRole, allowedPages: newRole === 'ADMIN' ? AVAILABLE_PAGES.map(p => p.id) : ["/chat", "/contacts"]});
                    }}
                    className="w-full bg-[#fafafa] dark:bg-[#0f1114] p-2 rounded-sm border border-[#d5dbdb] dark:border-[#545b64] outline-none text-[13px] text-[#16191f] dark:text-[#eaeded] focus:border-[#0073bb]"
                  >
                    <option value="AGENT">Support Agent</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                
                {!isEditMode && (
                  <div>
                    <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider block mb-1.5">Initial Password</label>
                    <div className="flex items-center gap-2 bg-[#fafafa] dark:bg-[#0f1114] p-2 rounded-sm border border-[#d5dbdb] dark:border-[#545b64] focus-within:border-[#0073bb]">
                      <Lock className="w-4 h-4 text-[#aab7b8] ml-1" />
                      <input type="text" required placeholder="Set password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-transparent flex-1 outline-none text-[13px] text-[#16191f] dark:text-[#eaeded]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions Checkboxes */}
              <div className="border-t border-[#eaeded] dark:border-[#414750] pt-5">
                <label className="text-[12px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider block mb-3">Module Permissions</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_PAGES.map((page) => (
                    <label key={page.id} className={`flex items-center gap-2 p-2.5 rounded-sm border cursor-pointer transition-all ${formData.allowedPages.includes(page.id) ? 'bg-[#f0f8ff] dark:bg-[#0073bb]/10 border-[#0073bb] text-[#0073bb] dark:text-[#3b99fc]' : 'bg-[#fafafa] dark:bg-[#0f1114] border-[#d5dbdb] dark:border-[#545b64] text-[#545b64] dark:text-[#aab7b8] hover:bg-[#f2f3f3]'}`}>
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 cursor-pointer accent-[#0073bb]" 
                        checked={formData.allowedPages.includes(page.id)}
                        onChange={() => handleCheckboxChange(page.id)}
                      />
                      <span className="text-[12px] font-bold">{page.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Routing */}
              <div className="border-t border-[#eaeded] dark:border-[#414750] pt-4 pb-1">
                <label className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2 mb-2">
                  <Layout className="w-4 h-4 text-[#545b64]" /> Primary Routing Destination
                </label>
                <select 
                  value={formData.primaryPage} 
                  onChange={(e) => setFormData({...formData, primaryPage: e.target.value})}
                  className="w-full bg-[#fafafa] dark:bg-[#0f1114] p-2 rounded-sm border border-[#d5dbdb] dark:border-[#545b64] outline-none text-[13px] text-[#16191f] dark:text-[#eaeded] focus:border-[#0073bb]"
                  disabled={formData.allowedPages.length === 0}
                >
                  {formData.allowedPages.map(pageId => (
                    <option key={pageId} value={pageId}>
                      {AVAILABLE_PAGES.find(p => p.id === pageId)?.name || pageId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t border-[#eaeded] dark:border-[#414750]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#545b64] hover:bg-[#f2f3f3] text-[#16191f] dark:text-[#eaeded] py-2 rounded-sm text-[13px] font-bold transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-[#0073bb] hover:bg-[#005a93] text-white py-2 rounded-sm text-[13px] font-bold transition flex justify-center items-center gap-2 disabled:opacity-50 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditMode ? "Save Changes" : "Save Policy & Grant Access")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
