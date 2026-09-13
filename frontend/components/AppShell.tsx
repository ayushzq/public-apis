"use client";

import { useEffect } from "react";
import Sidebar from "./Sidebar";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import SettingsDrawer from "./SettingsDrawer";
import NewChatDrawer from "./NewChatDrawer";
import MediaModal from "./MediaModal";
import WhatsAppLinkScreen from "./WhatsAppLinkScreen";
import useBackButtonHandler from "@/hooks/useBackButtonHandler";
import { useChatStore } from "@/store/useChatStore";

export default function AppShell() {
  const { theme, waStatus, initRealtime, refreshWaStatus } = useChatStore();
  useBackButtonHandler();

  useEffect(() => {
    initRealtime();
    refreshWaStatus();
  }, [initRealtime, refreshWaStatus]);

  const themeClass = theme === "light" ? "light" : "";

  if (waStatus !== "connected") {
    return (
      <div className={themeClass}>
        <WhatsAppLinkScreen />
      </div>
    );
  }

  return (
    <div className={themeClass}>
      <div className="flex h-screen w-screen overflow-hidden bg-wa-bg font-sans">
        <Sidebar />
        <LeftPanel />
        <RightPanel />
      </div>
      <SettingsDrawer />
      <NewChatDrawer />
      <MediaModal />
    </div>
  );
}
