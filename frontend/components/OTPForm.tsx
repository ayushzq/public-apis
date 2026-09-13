"use client";

import { useEffect, useRef, useState } from "react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { User } from "@/types";

const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

export default function OTPForm({ email, onBack }: { email: string; onBack: () => void }) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const { setSession } = useAuthStore();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError(null);
    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Enter the complete 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Backend verifies the OTP hash saved against this email and
      // returns a signed JWT + the user record.
      const res = await authApi.verifyOtp(email, code);
      const { token, user } = res.data as { token: string; user: User };
      setSession(user, token);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Incorrect code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await authApi.resendOtp(email);
      setCooldown(COOLDOWN_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend code. Try again shortly.");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <button onClick={onBack} className="text-wa-textSecondary text-[13px] mb-4">
        &larr; Change email
      </button>
      <h2 className="text-[20px] text-wa-textPrimary font-medium mb-1">Enter the code</h2>
      <p className="text-[13.5px] text-wa-textSecondary mb-6">
        We sent a 6-digit code to <span className="text-wa-textPrimary">{email}</span>
      </p>

      <div className="flex gap-2 mb-4">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            className="w-11 h-12 text-center text-lg rounded-lg bg-wa-header text-wa-textPrimary outline-none focus:ring-2 focus:ring-wa-accent"
          />
        ))}
      </div>

      {error && <p className="text-wa-danger text-[13px] mb-3">{error}</p>}

      <button
        onClick={handleVerify}
        disabled={loading}
        className="w-full bg-wa-accent hover:bg-wa-accent/90 disabled:opacity-60 text-white rounded-full py-2.5 text-[15px] font-medium mb-4"
      >
        {loading ? "Verifying..." : "Verify & continue"}
      </button>

      <button
        onClick={handleResend}
        disabled={cooldown > 0}
        className="w-full text-center text-[13.5px] text-wa-accentBright disabled:text-wa-textSecondary"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend OTP"}
      </button>
    </div>
  );
}
