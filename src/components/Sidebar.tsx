"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react"; 
import { usePathname, useRouter } from "next/navigation"; 
import Link from "next/link";
import {
  MessageSquare,
  Settings,
  AlertCircle,
  CheckCircle2,
  LayoutTemplate,
  LayoutDashboard,
  Megaphone,
  GitFork,
  Users,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Code2,
  UserPlus, 
  LogOut,
  Sparkles
} from "lucide-react";
import ConfigModal from "./ConfigModal";

export default function Sidebar() {
  const { data: session, status } = useSession(); 
  
  const [isMatched, setIsMatched] = useState<boolean>(true); // Optimistic: initially true to avoid layout flicker
  const [checkingConfig, setCheckingConfig] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hideOnMobile, setHideOnMobile] = useState<boolean>(false);

  const pathname = usePathname();
  const router = useRouter();

  const rawRole = String((session?.user as any)?.role || "").toUpperCase();
  const userRole = (rawRole === "AGENT" || rawRole === "MEMBER") ? "AGENT" : "ADMIN";
  const agentName = session?.user?.name || "Team Member";
  const allowedPages = ((session?.user as any)?.allowedPages as string[]) || [];

  // Background silent check — page ko block nahi karta
  const fetchConfigStatus = async () => {
    try {
      setCheckingConfig(true);
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        const conf = data?.settings || data?.config || data;
        setIsMatched(!!(conf && conf.accessToken && String(conf.accessToken).length > 10));
      } else {
        setIsMatched(false); 
      }
    } catch {
      setIsMatched(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && userRole === "ADMIN") {
      fetchConfigStatus();
    }
  }, [status, userRole]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && pathname === "/") {
      const primaryPage = (session?.user as any)?.primaryPage as string | undefined;
      router.push(userRole === "AGENT" ? (primaryPage || "/chat") : "/dashboard");
    }
  }, [status, userRole, pathname, router, session]);

  useEffect(() => {
    const checkIfDetailViewOpen = () => {
      const isDetailView =
        document.getElementById("hide-bottom-bar") ||
        document.getElementById("mobile-chat-view") ||
        document.getElementById("template-builder-view") ||
        document.getElementById("flow-builder-view");
      setHideOnMobile(!!isDetailView);
    };
    checkIfDetailViewOpen();
    const observer = new MutationObserver(checkIfDetailViewOpen);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      await signOut({ callbackUrl: "/login" });
    }
  };

  const isActive = (paths: string[]) =>
    paths.some((p) => pathname === p || pathname?.startsWith(p + "/"));

  const rawNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", activePaths: ["/dashboard"], roles: ["ADMIN"] },
    { href: "/campaigns", icon: Megaphone, label: "Campaigns", activePaths: ["/campaigns"], roles: ["ADMIN"] },
    { href: "/chat", icon: MessageSquare, label: "Chat", activePaths: ["/chat"], roles: ["ADMIN", "AGENT"] },
    { href: "/chatbot-builder", icon: GitFork, label: "Flows", activePaths: ["/chatbot-builder"], roles: ["ADMIN"] },
    { href: "/template", icon: LayoutTemplate, label: "Templates", activePaths: ["/template"], roles: ["ADMIN"] },
    { href: "/contacts", icon: Users, label: "Contacts", activePaths: ["/contacts"], roles: ["ADMIN", "AGENT"] },
    { href: "/dashboard/team", icon: UserPlus, label: "Team", activePaths: ["/dashboard/team"], roles: ["ADMIN"] },
  ];

  const rawBottomItems = [
    { href: "/settings", icon: Settings, label: "Settings", activePaths: ["/settings"], roles: ["ADMIN"] },
    { href: "/developers", icon: Code2, label: "Developers", activePaths: ["/developers"], roles: ["ADMIN"] },
    { href: "/help", icon: HelpCircle, label: "Help Center", activePaths: ["/help"], roles: ["ADMIN", "AGENT"] },
  ];

  const visibleForAgent = (href: string) =>
    userRole !== "AGENT" || href === "/dashboard/team" || allowedPages.some((p) => href.startsWith(p));

  const navItems = rawNavItems
    .filter(item => item.roles.includes(userRole))
    .filter(item => visibleForAgent(item.href));
  const bottomItems = rawBottomItems
    .filter(item => item.roles.includes(userRole))
    .filter(item => visibleForAgent(item.href));

  if (status === "loading") return null;

  return (
    <>
      <aside
        className={`hidden md:flex flex-col h-full bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 z-40 shrink-0 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[64px]" : "w-[220px]"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center h-14 border-b border-zinc-200 dark:border-zinc-800 px-3 shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 tracking-tight whitespace-nowrap">
                BaseKey
              </span>
            </div>
          ) : (
            <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Unconnected Warning Strip (Only for Admin when API is not linked) */}
        {!isMatched && userRole === "ADMIN" && (
          <div 
            onClick={() => setIsModalOpen(true)}
            className={`mx-2 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 cursor-pointer hover:bg-amber-100/70 transition-all flex items-center gap-2 ${collapsed ? "justify-center px-1" : ""}`}
            title="Setup WhatsApp API"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            {!collapsed && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-tight">API Setup Pending</span>
                <span className="text-[9.5px] text-amber-600 dark:text-amber-400 truncate">Tap to connect Meta</span>
              </div>
            )}
          </div>
        )}

        {/* Main Navigation: Always Visible */}
        <div className="flex-1 flex flex-col py-3 overflow-y-auto no-scrollbar gap-1 px-2">
          {navItems.map((item) => {
            const active = isActive(item.activePaths);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`group flex items-center gap-3 rounded-md px-2.5 py-2 cursor-pointer transition-all duration-150 relative ${
                    active
                      ? "bg-[#e8faf0] dark:bg-[#25D366]/10 text-[#25D366]"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#25D366] rounded-r-full" />
                  )}
                  <item.icon
                    className={`shrink-0 ${
                      active ? "text-[#25D366]" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                    } ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
                  />
                  {!collapsed && (
                    <span className={`text-[13.5px] font-medium whitespace-nowrap ${active ? "text-[#25D366]" : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"}`}>
                      {item.label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col pb-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 gap-1 px-2">
          {bottomItems.map((item) => {
            const active = isActive(item.activePaths);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`group flex items-center gap-3 rounded-md px-2.5 py-2 cursor-pointer transition-all duration-150 ${
                    active 
                      ? "bg-[#e8faf0] dark:bg-[#25D366]/10 text-[#25D366]" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"} ${active ? "text-[#25D366]" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600"}`} />
                  {!collapsed && <span className="text-[13px] font-medium whitespace-nowrap">{item.label}</span>}
                </div>
              </Link>
            );
          })}

          {/* Profile & Logout */}
          <div
            onClick={handleLogout}
            className={`group flex items-center gap-2.5 mt-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "Logout" : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
              {userRole === "ADMIN" ? (session?.user?.name || "O").charAt(0).toUpperCase() : agentName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-red-600 truncate leading-tight">
                  {userRole === "ADMIN" ? (session?.user?.name || "Owner") : agentName}
                </span>
                <span className="text-[10px] text-zinc-500 truncate leading-tight">
                  {userRole === "ADMIN" ? "Admin / Owner" : "Support Agent"}
                </span>
              </div>
            )}
            {!collapsed && <LogOut className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-500 ml-auto shrink-0 transition-colors" />}
          </div>
        </div>
      </aside>

      {/* WhatsApp Setup Modal */}
      {userRole === "ADMIN" && (
        <ConfigModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={async () => {
            setIsModalOpen(false);
            await fetchConfigStatus();
          }}
        />
      )}
    </>
  );
}
