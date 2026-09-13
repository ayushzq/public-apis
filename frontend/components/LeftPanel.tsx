"use client";

import { useChatStore } from "@/store/useChatStore";
import ChatList from "./ChatList";
import CallsTab from "./CallsTab";
import StatusTab from "./StatusTab";
import ChannelsTab from "./ChannelsTab";
import CommunitiesTab from "./CommunitiesTab";
import { cn } from "@/lib/utils";

export default function LeftPanel() {
  const { activeRailTab, isMobileViewingChat } = useChatStore();

  let content = <ChatList />;
  if (activeRailTab === "calls") content = <CallsTab />;
  if (activeRailTab === "status") content = <StatusTab />;
  if (activeRailTab === "channels") content = <ChannelsTab />;
  if (activeRailTab === "communities") content = <CommunitiesTab />;

  return (
    <div
      className={cn(
        "w-full md:w-[400px] lg:w-[420px] shrink-0 border-r border-wa-border h-full",
        isMobileViewingChat ? "hidden md:block" : "block"
      )}
    >
      {content}
    </div>
  );
}
