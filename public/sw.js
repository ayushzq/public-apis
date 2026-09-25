// public/sw.js

// 1. Install hote hi naye service worker ko turant activate karein
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// 2. Activate hote hi sabhi open tabs ka control lein
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// 3. Background Push Event: Interactive Action Buttons & Rich Layout
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || "New WhatsApp message received",
      icon: data.icon || "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
      badge: data.badge || "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
      vibrate: [250, 100, 250, 100, 250],
      tag: data.tag || "whatsapp-chat-" + (data.senderPhone || "general"),
      renotify: true,
      requireInteraction: true,
      data: {
        url: data.url || "/chat",
        senderPhone: data.senderPhone || "",
      },
      // Android Chrome Action Buttons (Direct Reply & Open Chat)
      actions: [
        {
          action: "reply_action",
          type: "text", // Android notification tray me typing input kholta hai
          title: "💬 Reply",
          placeholder: "Type a reply...",
        },
        {
          action: "open_chat_action",
          title: "📂 Open Chat",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "WhatsApp Alert", options)
    );
  } catch (e) {
    console.error("Push event parsing error in Service Worker:", e);
  }
});

// 4. Click & Inline Reply Event Handling
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const senderPhone = event.notification.data?.senderPhone || "";
  let targetUrl = event.notification.data?.url || "/chat";

  // Agar user ne notification ke andar text type karke 'Reply' send kiya
  if (event.action === "reply_action" && event.reply) {
    const replyText = event.reply;
    targetUrl = `/chat?phone=${encodeURIComponent(senderPhone)}&draft=${encodeURIComponent(replyText)}`;
  } else if (event.action === "open_chat_action") {
    targetUrl = senderPhone ? `/chat?phone=${encodeURIComponent(senderPhone)}` : "/chat";
  }

  // Active tab ko switch/focus karein ya naya window kholein
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes("/chat")) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
