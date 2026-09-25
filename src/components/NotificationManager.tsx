"use client";

import { useEffect } from "react";

export default function NotificationManager() {
  useEffect(() => {
    // Browser notification permission maangna
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return null;
}

// Notification trigger function jise chat listener me call kar sakein
export function triggerPushNotification(sender: string, messageText: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    // 1. Audio sound play
    const audio = new Audio("/sounds/notification.mp3");
    audio.play().catch(() => {});

    // 2. System/Browser notification popup
    new Notification(`New WhatsApp from ${sender}`, {
      body: messageText,
      icon: "/favicon.ico",
    });
  }
}

