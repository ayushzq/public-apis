"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { authApi } from "@/lib/api";
import OTPForm from "./OTPForm";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.sendOtp(email);
      setStage("otp");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not send the code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-wa-bg px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-wa-accent flex items-center justify-center mb-6">
          <MessageCircle size={32} className="text-white" fill="white" />
        </div>

        {stage === "email" ? (
          <div className="w-full max-w-sm">
            <h1 className="text-[22px] text-wa-textPrimary font-medium mb-1 text-center">
              Log in to WhatsApp
            </h1>
            <p className="text-[13.5px] text-wa-textSecondary mb-8 text-center">
              Enter your email to receive a one-time login code.
            </p>

            <label className="block text-[13px] text-wa-textSecondary mb-1.5">Email address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-wa-header text-wa-textPrimary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-wa-accent mb-3"
            />
            {error && <p className="text-wa-danger text-[13px] mb-3">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-wa-accent hover:bg-wa-accent/90 disabled:opacity-60 text-white rounded-full py-2.5 text-[15px] font-medium"
            >
              {loading ? "Sending code..." : "Send code"}
            </button>
          </div>
        ) : (
          <OTPForm email={email} onBack={() => setStage("email")} />
        )}
      </div>
    </div>
  );
}
