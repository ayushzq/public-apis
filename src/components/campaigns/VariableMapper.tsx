"use client";

import React from "react";
import { Tag, UserCheck, AlertCircle, ArrowRight, User, Phone, Mail, Building, Bookmark } from "lucide-react";

export const CRM_CONTACT_FIELDS = [
  { key: "{{name}}", label: "Contact Full Name", icon: User },
  { key: "{{phone}}", label: "Phone Number", icon: Phone },
  { key: "{{email}}", label: "Email Address", icon: Mail },
  { key: "{{company}}", label: "Company Name", icon: Building },
  { key: "{{custom_tag}}", label: "Primary Lead Tag", icon: Bookmark },
];

interface VariableMapperProps {
  detectedVariables: string[];
  variableValues: Record<string, string>;
  onVariableChange: (variableKey: string, mappedValue: string) => void;
}

export default function VariableMapper({
  detectedVariables,
  variableValues,
  onVariableChange,
}: VariableMapperProps) {
  if (!detectedVariables || detectedVariables.length === 0) {
    return (
      <div className="bg-[#fafafa] dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-md p-4 text-center text-[#545b64] dark:text-[#aab7b8] text-[12px] flex items-center justify-center gap-2">
        <UserCheck className="w-4 h-4 text-[#10B981]" />
        This template does not require dynamic variables. It is static and ready to broadcast.
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-white dark:bg-[#16191f] p-4 rounded-md border border-[#eaeded] dark:border-[#414750] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#eaeded] dark:border-[#414750] pb-2">
        <h4 className="text-[13px] font-bold text-[#16191f] dark:text-[#eaeded] flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#0073bb] dark:text-[#3b99fc]" />
          Personalization & Variable Mapping
        </h4>
        <span className="text-[11px] font-mono text-[#0073bb] dark:text-[#3b99fc] bg-[#0073bb]/10 px-2 py-0.5 rounded font-bold">
          {detectedVariables.length} Required
        </span>
      </div>

      <p className="text-[11px] text-[#545b64] dark:text-[#879596]">
        Map each parameter to a dynamic CRM field or type a custom static value.
      </p>

      <div className="space-y-3 pt-1">
        {detectedVariables.map((variable, idx) => {
          const currentValue = variableValues[variable] ?? "";
          const isCrmField = CRM_CONTACT_FIELDS.some((f) => f.key === currentValue);
          const mode = isCrmField ? currentValue : "CUSTOM";

          return (
            <div
              key={variable}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded border border-[#eaeded] dark:border-[#2a3039] bg-[#fafafa] dark:bg-[#0f1114]"
            >
              {/* Parameter Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded bg-[#0073bb]/10 text-[#0073bb] dark:text-[#3b99fc] font-mono text-[11px] font-bold border border-[#0073bb]/20">
                  {variable}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#aab7b8]" />
                <span className="text-[12px] font-bold text-[#16191f] dark:text-[#eaeded]">
                  Parameter {idx + 1}
                </span>
              </div>

              {/* Selector & Dynamic Input */}
              <div className="flex-1 max-w-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={mode}
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (selected === "CUSTOM") {
                      onVariableChange(variable, "");
                    } else {
                      onVariableChange(variable, selected);
                    }
                  }}
                  className="bg-white dark:bg-[#16191f] border border-[#d5dbdb] dark:border-[#414750] text-[#16191f] dark:text-[#eaeded] text-[12px] rounded p-2 outline-none focus:border-[#0073bb] min-w-[170px]"
                >
                  <optgroup label="CRM Contact Fields">
                    {CRM_CONTACT_FIELDS.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Input">
                    <option value="CUSTOM">Type Custom Text...</option>
                  </optgroup>
                </select>

                {/* Custom Text Input Box */}
                {!isCrmField ? (
                  <input
                    type="text"
                    placeholder={`Enter value for ${variable}...`}
                    value={currentValue}
                    onChange={(e) => onVariableChange(variable, e.target.value)}
                    className="flex-1 bg-white dark:bg-[#16191f] border border-[#0073bb] text-[#16191f] dark:text-[#eaeded] text-[12px] rounded p-2 outline-none focus:ring-1 focus:ring-[#0073bb]"
                    autoFocus
                  />
                ) : (
                  <div className="flex-1 px-3 py-1.5 bg-[#f0f8ff] dark:bg-[#0073bb]/10 border border-[#0073bb]/20 rounded text-[11px] text-[#0073bb] dark:text-[#3b99fc] font-medium truncate">
                    Auto-mapped to each contact's {CRM_CONTACT_FIELDS.find((f) => f.key === currentValue)?.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-1.5 text-[10px] text-[#545b64] dark:text-[#879596] pt-1">
        <AlertCircle className="w-3 h-3 text-[#e88a00] shrink-0 mt-0.5" />
        <span>Parameters will be delivered in real-time according to Meta Cloud API guidelines.</span>
      </div>
    </div>
  );
}
