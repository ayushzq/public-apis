"use client";

import Sidebar from "./Sidebar";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import SettingsDrawer from "./SettingsDrawer";
import NewChatDrawer from "./NewChatDrawer";
import MediaModal from "./MediaModal";
import { useChatStore } from "@/store/useChatStore";

export default function AppShell() {
  const { theme } = useChatStore();

  return (
    <div className={theme === "light" ? "light" : ""}>
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
