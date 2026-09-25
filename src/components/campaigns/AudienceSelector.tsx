"use client";

import React, { useState, useMemo } from "react";
import { 
  Users, Filter, CheckSquare, Square, Search, 
  Tag, AlertCircle, CheckCircle2, UserCheck, RefreshCw 
} from "lucide-react";

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  status?: string;
}

interface AudienceSelectorProps {
  contacts: ContactItem[];
  selectedContactIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  isLoading?: boolean;
}

type AudienceMode = "ALL" | "TAGS" | "MANUAL";

export default function AudienceSelector({
  contacts = [],
  selectedContactIds = [],
  onSelectionChange,
  isLoading = false,
}: AudienceSelectorProps) {
  const [mode, setMode] = useState<AudienceMode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 1️⃣ Unique tags extract karo CRM contacts se
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((c) => {
      c.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [contacts]);

  // 2️⃣ Filter logic based on Search and Selected Tags
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (mode === "TAGS" && selectedTags.length > 0) {
        return contact.tags?.some((t) => selectedTags.includes(t));
      }

      return true;
    });
  }, [contacts, searchQuery, mode, selectedTags]);

  // 3️⃣ Mode switch handler
  const handleModeChange = (newMode: AudienceMode) => {
    setMode(newMode);
    if (newMode === "ALL") {
      onSelectionChange(contacts.map((c) => c.id));
    } else if (newMode === "TAGS") {
      // Jo contacts selected tags me aate hain unhe select karo
      const matched = contacts
        .filter((c) => c.tags?.some((t) => selectedTags.includes(t)))
        .map((c) => c.id);
      onSelectionChange(matched);
    }
  };

  // 4️⃣ Tag click handler
  const handleTagToggle = (tag: string) => {
    const updated = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];

    setSelectedTags(updated);

    if (updated.length === 0) {
      onSelectionChange([]);
    } else {
      const matched = contacts
        .filter((c) => c.tags?.some((t) => updated.includes(t)))
        .map((c) => c.id);
      onSelectionChange(matched);
    }
  };

  // 5️⃣ Manual Individual Selection Toggle
  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      onSelectionChange(selectedContactIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedContactIds, id]);
    }
  };

  // 6️⃣ Select / Deselect Visible All
  const toggleSelectAllVisible = () => {
    const visibleIds = filteredContacts.map((c) => c.id);
    const allVisibleSelected = visibleIds.every((id) => selectedContactIds.includes(id));

    if (allVisibleSelected) {
      onSelectionChange(selectedContactIds.filter((id) => !visibleIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedContactIds, ...visibleIds]));
      onSelectionChange(merged);
    }
  };

  return (
    <div className="space-y-4 bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-sm p-4 font-sans text-[#16191f] dark:text-[#eaeded]">
      
      {/* Header with Stats Chip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eaeded] dark:border-[#414750] pb-3">
        <div>
          <h3 className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2 tracking-tight">
            <Users className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" /> Target Broadcast Audience
          </h3>
          <p className="text-[11px] text-[#545b64] dark:text-[#879596] mt-0.5">
            Select the recipient group or filter contacts dynamically for this broadcast.
          </p>
        </div>

        {/* Selected Count Indicator Badge */}
        <div className="bg-[#f0f8ff] dark:bg-[#0073bb]/10 border border-[#0073bb]/30 px-3 py-1 rounded-sm flex items-center gap-2 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0073bb] dark:text-[#3b99fc]" />
          <span className="text-[12px] font-bold text-[#0073bb] dark:text-[#3b99fc]">
            {selectedContactIds.length} <span className="font-normal text-[11px] text-[#545b64] dark:text-[#aab7b8]">of {contacts.length} Selected</span>
          </span>
        </div>
      </div>

      {/* Mode Switcher Tabs (AWS Style Radio Tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        
        {/* Option 1: All Contacts */}
        <button
          type="button"
          onClick={() => handleModeChange("ALL")}
          className={`p-3 rounded-sm border text-left transition-all flex flex-col justify-between ${
            mode === "ALL"
              ? "bg-[#f0f8ff] dark:bg-[#0073bb]/10 border-[#0073bb] dark:border-[#3b99fc]"
              : "bg-[#fafafa] dark:bg-[#0f1114] border-[#d5dbdb] dark:border-[#414750] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">All Contacts</span>
            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${mode === "ALL" ? "border-[#0073bb] bg-[#0073bb]" : "border-[#879596]"}`}>
              {mode === "ALL" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
          </div>
          <span className="text-[11px] text-[#545b64] dark:text-[#879596] mt-1">Broadcast to all {contacts.length} active leads</span>
        </button>

        {/* Option 2: Segment by Tags */}
        <button
          type="button"
          onClick={() => handleModeChange("TAGS")}
          className={`p-3 rounded-sm border text-left transition-all flex flex-col justify-between ${
            mode === "TAGS"
              ? "bg-[#f0f8ff] dark:bg-[#0073bb]/10 border-[#0073bb] dark:border-[#3b99fc]"
              : "bg-[#fafafa] dark:bg-[#0f1114] border-[#d5dbdb] dark:border-[#414750] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">Filter by Tags</span>
            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${mode === "TAGS" ? "border-[#0073bb] bg-[#0073bb]" : "border-[#879596]"}`}>
              {mode === "TAGS" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
          </div>
          <span className="text-[11px] text-[#545b64] dark:text-[#879596] mt-1">Target specific lead groups or labels</span>
        </button>

        {/* Option 3: Custom Manual Selection */}
        <button
          type="button"
          onClick={() => handleModeChange("MANUAL")}
          className={`p-3 rounded-sm border text-left transition-all flex flex-col justify-between ${
            mode === "MANUAL"
              ? "bg-[#f0f8ff] dark:bg-[#0073bb]/10 border-[#0073bb] dark:border-[#3b99fc]"
              : "bg-[#fafafa] dark:bg-[#0f1114] border-[#d5dbdb] dark:border-[#414750] hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039]"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">Custom Pick</span>
            <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${mode === "MANUAL" ? "border-[#0073bb] bg-[#0073bb]" : "border-[#879596]"}`}>
              {mode === "MANUAL" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
          </div>
          <span className="text-[11px] text-[#545b64] dark:text-[#879596] mt-1">Choose individual recipients manually</span>
        </button>
      </div>

      {/* Tags Filter Area (Only if Mode === 'TAGS') */}
      {mode === "TAGS" && (
        <div className="bg-[#fafafa] dark:bg-[#0f1114] p-3 rounded-sm border border-[#eaeded] dark:border-[#414750] space-y-2">
          <label className="text-[11px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#0073bb]" /> Available CRM Segments
          </label>
          
          {availableTags.length === 0 ? (
            <p className="text-[11px] text-[#879596] italic">No tags found on existing contacts. Use 'All' or 'Custom Pick'.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#0073bb] text-white border-[#0073bb]"
                        : "bg-white dark:bg-[#16191f] text-[#545b64] dark:text-[#aab7b8] border-[#d5dbdb] dark:border-[#414750] hover:border-[#0073bb]"
                    }`}
                  >
                    <span>{tag}</span>
                    {isSelected && <span className="text-[10px]">&times;</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Search Bar & Table Controls */}
      <div className="flex items-center gap-2 pt-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#879596] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#fafafa] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#414750] pl-8 pr-3 py-1.5 text-[12px] text-[#16191f] dark:text-[#eaeded] rounded-sm outline-none focus:border-[#0073bb]"
          />
        </div>

        {mode !== "ALL" && (
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="bg-white dark:bg-[#1c2128] border border-[#d5dbdb] dark:border-[#414750] text-[#545b64] dark:text-[#eaeded] px-3 py-1.5 rounded-sm text-[11px] font-bold hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039] transition whitespace-nowrap"
          >
            Toggle Select Page
          </button>
        )}
      </div>

      {/* AWS Style Contacts Mini-Table */}
      <div className="border border-[#eaeded] dark:border-[#414750] rounded-sm overflow-hidden bg-white dark:bg-[#16191f] max-h-60 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-[#545b64] dark:text-[#aab7b8] text-[12px] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#0073bb]" /> Loading CRM Audience...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-[#545b64] dark:text-[#aab7b8] text-[12px]">
            No contacts match the current search or segment criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafafa] dark:bg-[#1c2128] border-b border-[#eaeded] dark:border-[#414750] text-[10px] font-bold text-[#545b64] dark:text-[#aab7b8] uppercase tracking-wider sticky top-0 z-10">
                <th className="p-2.5 w-10 text-center">
                  #
                </th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">WhatsApp Number</th>
                <th className="p-2.5">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaeded] dark:divide-[#414750] text-[12px]">
              {filteredContacts.map((c) => {
                const isChecked = selectedContactIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => mode !== "ALL" && toggleContact(c.id)}
                    className={`transition-colors ${
                      mode !== "ALL" ? "cursor-pointer hover:bg-[#f2f3f3] dark:hover:bg-[#2a3039]" : ""
                    } ${isChecked ? "bg-[#f0f8ff]/50 dark:bg-[#0073bb]/5" : ""}`}
                  >
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={mode === "ALL"}
                        onChange={() => toggleContact(c.id)}
                        className="w-3.5 h-3.5 rounded-sm accent-[#0073bb] cursor-pointer"
                      />
                    </td>
                    <td className="p-2.5 font-bold text-[#16191f] dark:text-[#eaeded]">
                      {c.name}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-[#545b64] dark:text-[#aab7b8]">
                      {c.phone}
                    </td>
                    <td className="p-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {c.tags && c.tags.length > 0 ? (
                          c.tags.map((t) => (
                            <span
                              key={t}
                              className="bg-[#f2f3f3] dark:bg-[#0f1114] border border-[#d5dbdb] dark:border-[#545b64] text-[#545b64] dark:text-[#aab7b8] px-1.5 py-0.2 rounded-sm text-[10px]"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[#879596]">No Tag</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Information Note */}
      {selectedContactIds.length === 0 && (
        <div className="flex items-center gap-2 p-2 rounded-sm bg-[#fff5f5] dark:bg-[#3f1919] border border-[#d62728]/30 text-[#d62728] text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Please select at least 1 contact to proceed with the broadcast dispatch.</span>
        </div>
      )}
    </div>
  );
}
