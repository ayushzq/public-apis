import React from "react";
import Link from "next/link";
import { db as prisma } from "@/prisma/lib/db";
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck, Mail, User } from "lucide-react";

interface VerifyPageProps {
  params: Promise<{ token: string }>;
}

export default async function VerifyAgentPage({ params }: VerifyPageProps) {
  const { token } = await params;

  // 1. Token find karo
  const verificationRecord = await prisma.verificationToken.findUnique({
    where: { token }
  });

  // Agar token exist nahi karta ya expire ho gaya
  if (!verificationRecord || verificationRecord.expires < new Date()) {
    return (
      <div className="min-h-screen bg-[#f2f3f3] dark:bg-[#0f1114] flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-xl shadow-lg max-w-md w-full p-6 text-center">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800/50">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-lg font-bold text-[#16191f] dark:text-[#eaeded]">Link Expired or Invalid</h1>
          <p className="text-xs text-[#545b64] dark:text-[#aab7b8] mt-2 mb-6">
            This verification link is either invalid or has expired (24-hour validity). Please contact your workspace administrator for a new invitation.
          </p>
          <Link
            href="https://basekey.in/login"
            className="inline-flex items-center justify-center w-full bg-[#232f3e] hover:bg-[#16191f] text-white py-2.5 rounded-md text-xs font-bold transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // 2. User ko find karo — invited team members are always accountType AGENT.
  const user = await prisma.user.findFirst({
    where: { email: verificationRecord.identifier, accountType: "AGENT" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      currentActivity: true,
      primaryPage: true
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f2f3f3] dark:bg-[#0f1114] flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-xl shadow-lg max-w-md w-full p-6 text-center">
          <h1 className="text-lg font-bold text-red-600">User Not Found</h1>
          <p className="text-xs text-[#545b64] mt-2 mb-4">No associated account found for this token.</p>
          <Link href="https://basekey.in/login" className="text-xs text-[#0073bb] font-bold">Return to Login</Link>
        </div>
      </div>
    );
  }

  // 3. 🔥 FIX: 'id: user.id' use kiya taaki TypeScript Build error na de
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      status: "ONLINE",
      currentActivity: "Account Activated"
    }
  });

  await prisma.verificationToken.delete({
    where: { token }
  });

  return (
    <div className="min-h-screen bg-[#f2f3f3] dark:bg-[#0f1114] flex items-center justify-center p-4 font-sans text-[#16191f] dark:text-[#eaeded]">
      <div className="bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        
        <div className="bg-[#232f3e] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00a4b4]" />
            <span className="text-sm font-bold text-white tracking-wide">BaseKey Workspace Authorization</span>
          </div>
          <span className="text-[11px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
            Active
          </span>
        </div>

        <div className="p-6 md:p-8">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[#16191f] dark:text-white">Verification Complete!</h1>
            <p className="text-xs text-[#545b64] dark:text-[#aab7b8] mt-1">
              Your agent credentials have been verified and access has been granted.
            </p>
          </div>

          <div className="bg-[#fafafa] dark:bg-[#1c2128] border border-[#eaeded] dark:border-[#414750] rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#eaeded] dark:border-[#414750]">
              <span className="text-[#545b64] dark:text-[#aab7b8] font-medium">Invited By:</span>
              <span className="font-bold text-[#16191f] dark:text-white">
                {user.currentActivity?.replace("Invited by ", "") || "Workspace Owner"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#eaeded] dark:border-[#414750]">
              <span className="text-[#545b64] dark:text-[#aab7b8] font-medium">Account Name:</span>
              <span className="font-bold flex items-center gap-1.5 text-[#16191f] dark:text-white">
                <User className="w-3.5 h-3.5 text-[#0073bb]" /> {user.name}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#eaeded] dark:border-[#414750]">
              <span className="text-[#545b64] dark:text-[#aab7b8] font-medium">Registered Email:</span>
              <span className="font-bold flex items-center gap-1.5 text-[#16191f] dark:text-white">
                <Mail className="w-3.5 h-3.5 text-[#0073bb]" /> {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#545b64] dark:text-[#aab7b8] font-medium">Assigned Role:</span>
              <span className="font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-[#0073bb]/10 text-[#0073bb] dark:text-[#3b99fc] border border-[#0073bb]/20">
                {user.role}
              </span>
            </div>
          </div>

          <Link
            href="https://basekey.in/login"
            className="w-full bg-[#0073bb] hover:bg-[#005a93] text-white py-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            Proceed to Login <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="text-[11px] text-center text-[#545b64] dark:text-[#879596] mt-4">
            Use your email and the temporary password provided in the invitation email to sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
