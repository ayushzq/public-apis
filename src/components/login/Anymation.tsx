"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Globe, Lock, MessageSquare } from "lucide-react";

export default function Anymation({ phase }: { phase: number }) {
  // Agar phase 2 (Login form) aa gaya, toh animation ko hide kar do
  if (phase >= 2) return null;

  return (
    <motion.div
      key="splash-screen"
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAFAFA] z-50"
      exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
    >
      <AnimatePresence mode="wait">
        {/* PHASE 0: WATSAPP JASA ICON CLUSTER */}
        {phase === 0 && (
          <motion.div
            key="cluster"
            className="relative w-48 h-48 flex items-center justify-center"
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.4, ease: "backIn" } }}
          >
            <motion.div
              className="absolute top-2 right-2 text-[#00A884]"
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Globe size={52} strokeWidth={1.5} />
            </motion.div>

            <motion.div
              className="absolute bottom-4 right-4 text-[#00A884] bg-[#FAFAFA] rounded-full p-1 z-20"
              initial={{ x: 15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              <Lock size={36} fill="currentColor" strokeWidth={1} />
            </motion.div>

            <motion.div
              className="absolute bottom-6 left-2 text-[#00A884] z-0"
              initial={{ x: -15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              <MessageCircle size={44} fill="currentColor" strokeWidth={1} />
            </motion.div>

            <motion.div
              className="z-10 bg-white rounded-[1.5rem] p-4 shadow-xl text-[#00A884] border border-gray-100"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            >
              <MessageSquare size={60} fill="white" strokeWidth={1.5} />
            </motion.div>
          </motion.div>
        )}

        {/* PHASE 1: AAKPA LOGO */}
        {phase === 1 && (
          <motion.img
            key="main-logo"
            layoutId="basekey-logo"
            src="/logo.png"
            alt="BaseKey Logo"
            className="w-28 h-28 drop-shadow-xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <motion.div className="absolute bottom-12 flex flex-col items-center gap-1">
        <span className="text-gray-400 text-[13px] font-light">from</span>
        <span className="text-[#3b82f6] font-medium text-lg tracking-widest flex items-center gap-2">
          BaseKey
        </span>
      </motion.div>
    </motion.div>
  );
}
