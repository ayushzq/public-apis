"use client";

import { ClipLoader } from "react-spinners";
import { ReactNode } from "react";

interface LoadingButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  type?: "button" | "submit";
  spinnerColor?: string;
  spinnerSize?: number;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: "bg-[#25D366] hover:bg-[#1DA851] text-white",
  secondary: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700",
  danger: "bg-red-500 hover:bg-red-600 text-white",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
};

// A single, consistent "button that shows a real loading spinner while
// its async action runs" component — used across Settings, Campaigns,
// Team, and the Flow Builder so every save/submit button behaves and
// looks the same instead of each page inventing its own loading state.
export default function LoadingButton({
  onClick,
  loading = false,
  disabled = false,
  children,
  className = "",
  type = "button",
  spinnerColor = "#ffffff",
  spinnerSize = 16,
  variant = "primary",
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
        transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {loading && <ClipLoader size={spinnerSize} color={spinnerColor} />}
      {children}
    </button>
  );
}
