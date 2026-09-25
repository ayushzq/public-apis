"use client";

import { useState, useEffect } from "react";
import { signIn, useSession, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  KeyRound, Lock, Mail, Loader2, ArrowLeft, ShieldCheck, Edit2, CheckCircle2
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";

// Types for strictly managing screens
type UserRole = "ADMIN" | "AGENT";
type AuthTab = "LOGIN" | "REGISTER";
type AdminFlow = 
  | "IDLE" 
  | "REGISTER_OTP" 
  | "REGISTER_PASS" 
  | "FORGOT_EMAIL" 
  | "FORGOT_OTP" 
  | "FORGOT_PASS";

export default function LoginComponent() {
  const router = useRouter();
  const { status } = useSession();

  // Main States
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [authTab, setAuthTab] = useState<AuthTab>("LOGIN");
  const [adminFlow, setAdminFlow] = useState<AdminFlow>("IDLE");

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Timer State for OTP
  const [timer, setTimer] = useState(0);

  // -------------------------------------------------------------
  // 1. AUTO REDIRECT IF ALREADY LOGGED IN
  // -------------------------------------------------------------
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  // -------------------------------------------------------------
  // 2. ANDROID BACK BUTTON HANDLER (NATIVE APP FEEL)
  // -------------------------------------------------------------
  const changeAdminFlow = (newFlow: AdminFlow) => {
    // History me state push karo taaki phone ka back button kaam kare
    if (newFlow !== "IDLE") {
      window.history.pushState({ step: newFlow }, "");
    }
    setAdminFlow(newFlow);
    setMessage({ type: "", text: "" });
  };

  useEffect(() => {
    const handleHardwareBack = (e: PopStateEvent) => {
      if (adminFlow === "IDLE") return; // Normal back chalne do
      
      // Agar kisi andar ki screen par hai, toh ek step pichhe aao
      if (adminFlow === "REGISTER_OTP" || adminFlow === "REGISTER_PASS" || adminFlow === "FORGOT_EMAIL") {
        setAdminFlow("IDLE");
      } else if (adminFlow === "FORGOT_OTP" || adminFlow === "FORGOT_PASS") {
        setAdminFlow("FORGOT_EMAIL");
      }
    };
    
    window.addEventListener("popstate", handleHardwareBack);
    return () => window.removeEventListener("popstate", handleHardwareBack);
  }, [adminFlow]);

  // -------------------------------------------------------------
  // TIMER LOGIC FOR OTP RESEND
  // -------------------------------------------------------------
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const startTimer = () => setTimer(30);

  // -------------------------------------------------------------
  // ANIMATION VARIANTS (Extra Smooth Spring)
  // -------------------------------------------------------------
  const slideVariants = {
    enter: { x: 30, opacity: 0, scale: 0.98 },
    center: { x: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } },
    exit: { x: -30, opacity: 0, scale: 0.98, transition: { duration: 0.2 } }
  };

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------
  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  const handleAgentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    // 🔒 SECURITY FIX (BaseKey audit — critical): this used to POST to
    // /api/team/login, which compared passwords with plain `===` (NOT
    // bcrypt, despite the column being called `passwordHash` — passwords
    // were effectively stored in plaintext) and, on success, just handed
    // back the user's raw database ID for the frontend to store as
    // `localStorage.setItem("agent_token", id)`. That was never a real
    // session — nothing server-side ever re-checked it, so anyone with
    // devtools could open the console and type
    // `localStorage.setItem("agent_token", "<any-known-user-id>")` to
    // fully impersonate any team member with zero password needed.
    //
    // Team members now authenticate through the exact same secure
    // NextAuth CredentialsProvider (bcrypt.compare, real signed httpOnly
    // JWT cookie) that admin login already used below — a User row is a
    // User row regardless of role.
    const res = await signIn("credentials", {
      redirect: false, email, password, loginType: "password", accountType: "AGENT",
    });

    if (res?.error) {
      setMessage({ type: "error", text: res.error });
      setIsLoading(false);
      return;
    }

    const session = await getSession();
    window.location.href = (session?.user as any)?.primaryPage || "/chat";
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    
    const res = await signIn("credentials", {
      redirect: false, email, password, loginType: "password", accountType: "ROOT"
    });

    if (res?.error) {
      setMessage({ type: "error", text: res.error });
      setIsLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleSendOTP = async (e: React.FormEvent, flowType: "register" | "forgot") => {
    e.preventDefault();
    if (!email) return setMessage({ type: "error", text: "Please enter your email." });
    
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: flowType }) 
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `OTP sent to ${email}` });
        startTimer();
        changeAdminFlow(flowType === "register" ? "REGISTER_OTP" : "FORGOT_OTP");
        setOtp(""); 
      } else {
        setMessage({ type: "error", text: data.error || "Failed to send OTP." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if(otp.length !== 6) return setMessage({type: "error", text: "Enter 6-digit OTP"});
    
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, type: "register" }) 
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: "success", text: "OTP Verified! Now set your password." });
        changeAdminFlow("REGISTER_PASS");
      } else {
        setMessage({ type: "error", text: data.error || "Invalid or Expired OTP." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password: newPassword, type: "register" })
      });
      if (res.ok) {
        await signIn("credentials", { redirect: false, email, password: newPassword, loginType: "password", accountType: "ROOT" });
        window.location.href = "/dashboard";
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Registration failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if(otp.length !== 6) return setMessage({type: "error", text: "Enter 6-digit OTP"});
    
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, type: "forgot" }) 
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: "success", text: "OTP Verified! Create a new password." });
        changeAdminFlow("FORGOT_PASS");
      } else {
        setMessage({ type: "error", text: data.error || "Invalid or Expired OTP." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Network error. Try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword, type: "forgot" })
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Password changed successfully! Please login." });
        setAdminFlow("IDLE");
        setAuthTab("LOGIN");
        setPassword("");
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Reset failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setIsLoading(false);
    }
  };


  // -------------------------------------------------------------
  // REUSABLE COMPONENTS
  // -------------------------------------------------------------
  const SocialButtons = () => (
    <div className="mt-5">
      <div className="relative py-4 flex items-center">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => handleSocialLogin("google")} className="flex justify-center items-center py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M19.6429 10.2273C19.6429 9.51705 19.5771 8.83523 19.4583 8.18182H10V12.0568H15.4036C15.1718 13.3068 14.4668 14.3636 13.4079 15.0739V17.5852H16.6393C18.5293 15.8466 19.6429 13.2784 19.6429 10.2273Z" fill="#4285F4"/><path d="M10 20C12.7 20 14.9621 19.1023 16.6393 17.5852L13.4079 15.0739C12.5111 15.6761 11.3571 16.0341 10 16.0341C7.38929 16.0341 5.17857 14.267 4.38571 11.8977H1.08214V14.4545C2.73 17.7273 6.09821 20 10 20Z" fill="#34A853"/><path d="M4.38571 11.8977C4.18571 11.3068 4.07143 10.6705 4.07143 10C4.07143 9.32955 4.18571 8.69318 4.38571 8.10227V5.54545H1.08214C0.4 6.89773 0 8.40909 0 10C0 11.5909 0.4 13.1023 1.08214 14.4545L4.38571 11.8977Z" fill="#FBBC05"/><path d="M10 3.96591C11.4679 3.96591 12.7857 4.46591 13.8196 5.45455L16.7121 2.5625C14.9571 0.977273 12.6964 0 10 0C6.09821 0 2.73 2.27273 1.08214 5.54545L4.38571 8.10227C5.17857 5.73295 7.38929 3.96591 10 3.96591Z" fill="#EA4335"/></svg>
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => handleSocialLogin("facebook")} className="flex justify-center items-center py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0C5.373 0 0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24V15.562H7.078V12.073H10.125V9.413C10.125 6.388 11.916 4.714 14.657 4.714C15.97 4.714 17.343 4.95 17.343 4.95V7.935H15.83C14.339 7.935 13.875 8.868 13.875 9.837V12.073H17.203L16.671 15.562H13.875V24C19.612 23.094 24 18.1 24 12.073Z" /></svg>
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => handleSocialLogin("twitter")} className="flex justify-center items-center py-3 border border-gray-200 rounded-xl bg-black hover:bg-gray-800 transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => handleSocialLogin("github")} className="flex justify-center items-center py-3 border border-gray-200 rounded-xl bg-gray-900 hover:bg-gray-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12C2 16.42 4.87 20.17 8.84 21.5C9.34 21.59 9.5 21.28 9.5 21.01C9.5 20.77 9.49 20.14 9.49 19.31C6.71 19.91 6.12 17.97 6.12 17.97C5.67 16.81 5.03 16.5 5.03 16.5C4.13 15.89 5.09 15.9 5.09 15.9C6.08 15.97 6.59 16.92 6.59 16.92C7.47 18.42 8.89 17.99 9.45 17.74C9.54 17.11 9.79 16.68 10.07 16.44C7.85 16.19 5.52 15.33 5.52 11.45C5.52 10.35 5.91 9.44 6.56 8.73C6.45 8.48 6.12 7.46 6.66 6.07C6.66 6.07 7.5 5.8 9.49 7.15C10.29 6.93 11.14 6.82 12 6.82C12.86 6.82 13.71 6.93 14.51 7.15C16.5 5.8 17.34 6.07 17.34 6.07C17.88 7.46 17.55 8.48 17.44 8.73C18.09 9.44 18.48 10.35 18.48 11.45C18.48 15.34 16.14 16.19 13.91 16.43C14.26 16.73 14.57 17.31 14.57 18.2C14.57 19.47 14.56 20.5 14.56 20.81C14.56 21.08 14.72 21.4 15.22 21.31C19.13 20.17 22 16.42 22 12C22 6.477 17.523 2 12 2Z" /></svg>
        </motion.button>
      </div>
    </div>
  );

  return (
    <motion.div
      key="login-screen"
      className="w-full max-w-[420px] p-8 bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-200/60 relative overflow-hidden"
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
      layout
    >
      {/* Top Main Toggles (Role) */}
      <motion.div layout className="flex bg-gray-100 p-1 rounded-xl mb-6 shadow-inner">
        <button 
          onClick={() => { setRole("ADMIN"); changeAdminFlow("IDLE"); setMessage({type:"", text:""}); }}
          className={`flex-1 text-[13px] py-2 rounded-lg font-bold transition-all duration-200 ${role === "ADMIN" ? "bg-white text-[#1877F2] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Business Owner
        </button>
        <button 
          onClick={() => { setRole("AGENT"); setMessage({type:"", text:""}); }}
          className={`flex-1 text-[13px] py-2 rounded-lg font-bold transition-all duration-200 ${role === "AGENT" ? "bg-white text-[#00A884] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Support Agent
        </button>
      </motion.div>

      <motion.div layout className="text-center mb-6">
        <img src="/logo.png" alt="BaseKey Logo" className="w-12 h-12 mx-auto drop-shadow-sm mb-3" />
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {role === "ADMIN" ? "Welcome to BaseKey" : "Agent Workspace"}
        </h1>
      </motion.div>

      {message.text && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} layout
          className={`p-3 rounded-lg text-sm font-semibold mb-5 text-center ${message.type === "error" ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}
        >
          {message.text}
        </motion.div>
      )}

      {/* ======================================================================== */}
      {/* 🔴 SUPPORT AGENT VIEW */}
      {/* ======================================================================== */}
      {role === "AGENT" && (
        <motion.form onSubmit={handleAgentLogin} initial="enter" animate="center" exit="exit" variants={slideVariants} className="space-y-4">
          <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#00A884] focus-within:bg-white transition-all">
            <Mail className="w-5 h-5 text-gray-400" />
            <input type="email" required placeholder="Agent Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#00A884] focus-within:bg-white transition-all">
            <Lock className="w-5 h-5 text-gray-400" />
            <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
          </div>
          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-[#00A884] text-white py-3.5 rounded-xl font-bold hover:bg-[#009172] transition flex items-center justify-center gap-2 mt-4 shadow-md shadow-[#00A884]/20">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access Workspace"}
          </motion.button>
        </motion.form>
      )}

      {/* ======================================================================== */}
      {/* 🔵 BUSINESS OWNER (ADMIN) VIEW */}
      {/* ======================================================================== */}
      {role === "ADMIN" && (
        <div className="relative min-h-[340px]">
          <AnimatePresence mode="wait" initial={false}>
            
            {/* --- IDLE STATE: SHOWS LOGIN/REGISTER TABS --- */}
            {adminFlow === "IDLE" && (
              <motion.div key="IDLE" variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute w-full">
                
                {/* Facebook/Instagram style Sub-Tabs */}
                <div className="flex border-b border-gray-200 mb-6 relative">
                  <button type="button" onClick={() => setAuthTab("LOGIN")} className={`pb-3 flex-1 text-center font-bold text-[14px] transition-colors ${authTab === "LOGIN" ? "text-[#1877F2]" : "text-gray-400 hover:text-gray-600"}`}>Login</button>
                  <button type="button" onClick={() => setAuthTab("REGISTER")} className={`pb-3 flex-1 text-center font-bold text-[14px] transition-colors ${authTab === "REGISTER" ? "text-[#1877F2]" : "text-gray-400 hover:text-gray-600"}`}>Register</button>
                  {/* Indicator Line */}
                  <div className={`absolute bottom-[-1px] h-[2px] w-1/2 bg-[#1877F2] transition-transform duration-300 ${authTab === "REGISTER" ? "translate-x-full" : "translate-x-0"}`}></div>
                </div>

                {/* LOGIN TAB */}
                {authTab === "LOGIN" && (
                  <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#1877F2] focus-within:bg-white transition-all">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#1877F2] focus-within:bg-white transition-all">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => changeAdminFlow("FORGOT_EMAIL")} className="text-[13px] font-bold text-[#1877F2] hover:underline">Forgot password?</button>
                    </div>
                    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-[#1877F2] text-white py-3.5 rounded-xl font-bold hover:bg-[#166FE5] transition flex items-center justify-center gap-2 shadow-md shadow-[#1877F2]/20">
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                    </motion.button>
                    <SocialButtons />
                  </motion.form>
                )}

                {/* REGISTER TAB */}
                {authTab === "REGISTER" && (
                  <motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={(e) => handleSendOTP(e, "register")} className="space-y-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#1877F2] focus-within:bg-white transition-all">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <input type="email" required placeholder="Enter email to get OTP" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
                    </div>
                    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-[#1877F2] text-white py-3.5 rounded-xl font-bold hover:bg-[#166FE5] transition flex items-center justify-center gap-2 shadow-md shadow-[#1877F2]/20">
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get OTP & Register"}
                    </motion.button>
                    <SocialButtons />
                  </motion.form>
                )}
              </motion.div>
            )}

            {/* --- REGISTER FLOW: OTP VERIFY --- */}
            {adminFlow === "REGISTER_OTP" && (
              <motion.form key="REGISTER_OTP" onSubmit={handleVerifyOtpRegister} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute w-full space-y-5">
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-xl">
                  <div className="text-sm">
                    <span className="text-gray-500 text-xs block">OTP sent to:</span>
                    <strong className="text-gray-900">{email}</strong>
                  </div>
                  <button type="button" onClick={() => changeAdminFlow("IDLE")} className="flex items-center gap-1 text-[13px] font-bold text-[#1877F2] hover:bg-blue-100 py-1.5 px-3 rounded-lg transition">
                    <Edit2 className="w-3.5 h-3.5" /> Change
                  </button>
                </div>
                
                {/* 🔥 PERFECTLY CENTERED OTP BOX UI */}
                <div className="flex items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-200 focus-within:border-[#1877F2] focus-within:bg-white transition-all">
                  <input 
                    type="text" required maxLength={6} placeholder="6-DIGIT CODE" 
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                    className="bg-transparent w-full outline-none text-center text-3xl font-mono font-bold tracking-[0.5em] text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-[14px]" 
                  />
                </div>

                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={otp.length !== 6 || isLoading} className="w-full bg-[#1877F2] text-white py-3.5 rounded-xl font-bold hover:bg-[#166FE5] transition disabled:opacity-50 flex justify-center items-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                </motion.button>
                <div className="text-center pt-2">
                  {timer > 0 ? (
                    <span className="text-sm font-medium text-gray-400">Resend OTP in {timer}s</span>
                  ) : (
                    <button type="button" onClick={(e) => handleSendOTP(e, "register")} className="text-sm font-bold text-[#1877F2] hover:underline">Resend OTP</button>
                  )}
                </div>
              </motion.form>
            )}

            {/* --- REGISTER FLOW: SET PASSWORD --- */}
            {adminFlow === "REGISTER_PASS" && (
              <motion.form key="REGISTER_PASS" onSubmit={handleFinalRegister} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute w-full space-y-4">
                <div className="text-center mb-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h3 className="font-bold text-gray-900">Email Verified!</h3>
                  <p className="text-sm text-gray-500">Create a secure password to finish registration.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#1877F2] focus-within:bg-white transition-all">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <input type="password" required autoFocus placeholder="Set New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
                </div>
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-[#1877F2] text-white py-3.5 rounded-xl font-bold hover:bg-[#166FE5] transition flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                </motion.button>
              </motion.form>
            )}

            {/* --- FORGOT PASSWORD FLOW: ENTER EMAIL --- */}
            {adminFlow === "FORGOT_EMAIL" && (
              <motion.form key="FORGOT_EMAIL" onSubmit={(e) => handleSendOTP(e, "forgot")} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute w-full space-y-4">
                <button type="button" onClick={() => changeAdminFlow("IDLE")} className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 mb-2 transition">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
                </button>
                <p className="text-sm text-gray-600 font-medium">Enter your registered email to reset your password.</p>
                <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-[#1877F2] focus-within:bg-white transition-all">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <input type="email" required placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
                </div>
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset OTP"}
                </motion.button>
              </motion.form>
            )}

            {/* --- FORGOT PASSWORD FLOW: OTP VERIFY --- */}
            {adminFlow === "FORGOT_OTP" && (
              <motion.form key="FORGOT_OTP" onSubmit={handleVerifyOtpForgot} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute w-full space-y-5">
                <div className="flex items-center justify-between bg-gray-100 border border-gray-200 p-3 rounded-xl">
                  <div className="text-sm">
                    <span className="text-gray-500 text-xs block">Reset OTP sent to:</span>
                    <strong className="text-gray-900">{email}</strong>
                  </div>
                  <button type="button" onClick={() => changeAdminFlow("FORGOT_EMAIL")} className="flex items-center gap-1 text-[13px] font-bold text-gray-600 hover:bg-gray-200 py-1.5 px-3 rounded-lg transition">
                    <Edit2 className="w-3.5 h-3.5" /> Change
                  </button>
                </div>
                
                {/* 🔥 PERFECTLY CENTERED OTP BOX UI */}
                <div className="flex items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-200 focus-within:border-gray-900 focus-within:bg-white transition-all">
                  <input 
                    type="text" required maxLength={6} placeholder="6-DIGIT CODE" 
                    value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                    className="bg-transparent w-full outline-none text-center text-3xl font-mono font-bold tracking-[0.5em] text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-[14px]" 
                  />
                </div>

                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={otp.length !== 6 || isLoading} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex justify-center items-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
                </motion.button>
                <div className="text-center pt-2">
                  {timer > 0 ? (
                    <span className="text-sm font-medium text-gray-400">Resend OTP in {timer}s</span>
                  ) : (
                    <button type="button" onClick={(e) => handleSendOTP(e, "forgot")} className="text-sm font-bold text-gray-900 hover:underline">Resend OTP</button>
                  )}
                </div>
              </motion.form>
            )}

            {/* --- FORGOT PASSWORD FLOW: SET NEW PASSWORD --- */}
            {adminFlow === "FORGOT_PASS" && (
              <motion.form key="FORGOT_PASS" onSubmit={handleFinalReset} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute w-full space-y-4">
                 <div className="text-center mb-2">
                  <h3 className="font-bold text-gray-900">Set New Password</h3>
                  <p className="text-sm text-gray-500">Create a new password for your account.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 focus-within:border-gray-900 focus-within:bg-white transition-all">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <input type="password" required autoFocus placeholder="Enter New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-transparent flex-1 outline-none text-[15px] font-medium text-gray-900" />
                </div>
                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password & Login"}
                </motion.button>
              </motion.form>
            )}

          </AnimatePresence>
        </div>
      )}

      <motion.div layout className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[12px] text-gray-400 font-semibold">
        <KeyRound className="w-3.5 h-3.5" />
        Secured by BaseKey Infrastructure
      </motion.div>
    </motion.div>
  );
}
