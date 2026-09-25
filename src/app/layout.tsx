import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 🔥 NextAuth ka Provider
import { NextAuthProvider } from "@/components/providers/SessionProvider"; 
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import RouteProgress from "@/components/RouteProgress";

// 🌙 Naya Theme Provider Import kiya
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BaseKey CRM - WhatsApp Automation",
  description: "Futuristic production-ready WhatsApp Business API Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // Google Schema Markup
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BaseKey",
    "url": "https://basekey.in",
    "logo": "https://basekey.in/logo.png",
    "description": "WhatsApp Business API integration and template management platform.",
    "founder": {
      "@type": "Person",
      "name": "Ayush"
    },
    "parentOrganization": {
      "@type": "Organization",
      "name": "SuperKey"
    }
  };

  return (
    // ⚠️ className="dark" hata diya gaya hai aur suppressHydrationWarning lagaya hai
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon Icon */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        
        {/* Schema Code Injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      
      <body className={inter.className}>
        {/* 🌙 ThemeProvider se puri website ko wrap kar diya */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthProvider>
            {/* Architecture fix (BaseKey audit): Sidebar used to be imported
                and hand-wrapped in 7+ individual pages. It now renders once
                here, in AppShell, based on the current route. */}
            <RouteProgress />
            <AppShell>{children}</AppShell>
          </NextAuthProvider>
          {/* sonner was already a dependency but was never mounted anywhere —
              every toast() call across the app was a silent no-op. */}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
