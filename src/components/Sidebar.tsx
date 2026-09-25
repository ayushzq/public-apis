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
  Loader2,
  Link2,
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
  LogOut    
} from "lucide-react";
import ConfigModal from "./ConfigModal";

export default function Sidebar() {
  const { data: session, status } = useSession(); 
  
  const [user, setUser] = useState<any>(null);
  const [isMatched, setIsMatched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hideOnMobile, setHideOnMobile] = useState<boolean>(false);

  const [userRole, setUserRole] = useState<"ADMIN" | "AGENT" | null>(null);
  const [agentName, setAgentName] = useState<string>("");
  const [allowedPages, setAllowedPages] = useState<string[]>([]);

  const pathname = usePathname();
  const router = useRouter();

  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        const conf = data?.settings || data?.config || data;
        setIsMatched(!!(conf && conf.accessToken && String(conf.accessToken).length > 10));
      } else {
        setIsMatched(false); 
      }
    } catch (error) {
      console.error("Error fetching API config for sidebar:", error);
      setIsMatched(false);
    }
  };

  useEffect(() => {
    const checkAuthAndConfig = async () => {
      if (status === "loading") return;

      if (session?.user) {
        // 🔥 FIX 1: OWNER ya undefined role ko ADMIN access do taaki modal block na ho
        const rawRole = String((session.user as any)?.role || "").toUpperCase();
        const role = (rawRole === "AGENT" || rawRole === "MEMBER") ? "AGENT" : "ADMIN";
        
        setUserRole(role);
        setAgentName(session.user.name || "Team Member");
        setUser(session.user);
        // Root/Admin decide per-agent page access (User.allowedPages, set from Team management).
        // OWNER/ADMIN sessions always carry the full page list, so this only ever narrows AGENT nav.
        setAllowedPages(((session.user as any)?.allowedPages as string[]) || []);

        if (role === "ADMIN") {
          await fetchConfigStatus();
        } else {
          setIsMatched(true); 
        }

        setLoading(false);
      } else {
        setUserRole(null);
        setUser(null);
        setLoading(false);
      }
    };

    checkAuthAndConfig();
  }, [session, status]);

  useEffect(() => {
    if (!loading) {
      if (!userRole) {
        router.push("/login");
      } else if (pathname === "/") {
        const primaryPage = (session?.user as any)?.primaryPage as string | undefined;
        router.push(userRole === "AGENT" ? (primaryPage || "/chat") : "/dashboard");
      }
    }
  }, [loading, userRole, pathname, router]);

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

  // Base filter: does this role see this section of the app at all.
  // Extra filter for AGENT logins: does the workspace admin's per-user
  // allowedPages list (set from /dashboard/team) actually include this page?
  // "/dashboard/team" and "/dashboard" stay ADMIN-only regardless of allowedPages.
  const visibleForAgent = (href: string) =>
    userRole !== "AGENT" || href === "/dashboard/team" || allowedPages.some((p) => href.startsWith(p));

  const navItems = rawNavItems
    .filter(item => item.roles.includes(userRole || ""))
    .filter(item => visibleForAgent(item.href));
  const bottomItems = rawBottomItems
    .filter(item => item.roles.includes(userRole || ""))
    .filter(item => visibleForAgent(item.href));

  if (loading || status === "loading") {
    return (
      <>
        <div className="hidden md:flex flex-col h-full w-[220px] bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#25D366]" />
        </div>
        <div className="md:hidden fixed bottom-0 left-0 z-30 w-full h-16 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#25D366]" />
        </div>
      </>
    );
  }

  if (!userRole) return null; 

  return (
    <>
      <aside
        className={`hidden md:flex flex-col h-full bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 z-40 shrink-0 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[64px]" : "w-[220px]"
        }`}
      >
        {/* Header / Logo */}
        <div
          className={`flex items-center h-14 border-b border-zinc-200 dark:border-zinc-800 px-3 shrink-0 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 tracking-tight whitespace-nowrap">
                BaseKey
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-colors shrink-0 ${
              collapsed ? "mt-0 ml-0" : ""
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 flex flex-col py-3 overflow-y-auto no-scrollbar gap-1 px-2">
          {isMatched ? (
            <>
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
                        className={`shrink-0 transition-none ${
                          active ? "text-[#25D366]" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                        } ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
                      />
                      {!collapsed && (
                        <span
                          className={`text-[13.5px] font-medium whitespace-nowrap ${
                            active ? "text-[#25D366]" : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                      {collapsed && (
                        <div className="absolute left-[52px] px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                          {item.label}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </>
          ) : (
            /* 🔥 FIX 2: Desktop par clickable card aur connect button banaya */
            <div
              onClick={() => setIsModalOpen(true)}
              className={`flex flex-col items-center gap-2 mt-4 px-3 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-500/10 cursor-pointer hover:bg-red-100/70 transition-all ${
                collapsed ? "px-1.5" : ""
              }`}
              title="Click to Connect WhatsApp API"
            >
              <div className="w-9 h-9 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              {!collapsed && (
                <>
                  <p className="text-[12px] text-red-600 dark:text-red-400 text-center font-bold">
                    API Not Linked
                  </p>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 text-center leading-tight">
                    Click here to setup your Meta Token & Phone ID
                  </p>
                  <button
                    type="button"
                    className="mt-1 w-full py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-bold rounded-lg shadow-sm transition"
                  >
                    Connect API
                  </button>
                </>
              )}
            </div>
          )}
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
                  <item.icon className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"} ${active ? "text-[#25D366]" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} />
                  {!collapsed && (
                    <span className="text-[13px] font-medium whitespace-nowrap">{item.label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-[52px] px-2.5 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {userRole === "ADMIN" && (
            <div
              className={`flex items-center gap-3 rounded-md px-2.5 py-2 cursor-pointer transition-all duration-150 ${
                !isMatched 
                  ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-medium" 
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
              } ${collapsed ? "justify-center px-0" : ""}`}
              onClick={() => setIsModalOpen(true)}
              title={collapsed ? (isMatched ? "Configuration" : "Connect API") : undefined}
            >
              <Link2 className={`shrink-0 ${!isMatched ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"} ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
              {!collapsed && (
                <span className="text-[13px]">
                  {isMatched ? "Configuration" : "Connect API"}
                </span>
              )}
            </div>
          )}

          {/* Profile & Logout */}
          <div
            onClick={handleLogout}
            className={`group flex items-center gap-2.5 mt-2 px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "Logout" : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0 overflow-hidden transition-colors">
              {userRole === "ADMIN" && user?.image ? (
                <img src={user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                (userRole === "AGENT" ? agentName : user?.name || user?.email)?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-red-600 dark:group-hover:text-red-400 truncate leading-tight transition-colors">
                  {userRole === "ADMIN" ? (user?.name || user?.email?.split("@")[0] || "Owner") : agentName}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate leading-tight">
                  {userRole === "ADMIN" ? (user?.email || "Admin") : "Support Agent"}
                </span>
              </div>
            )}
            {!collapsed && isMatched && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] ml-auto shrink-0 group-hover:hidden" />
                <LogOut className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0 hidden group-hover:block" />
              </>
            )}
            {!collapsed && !isMatched && (
              <LogOut className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#09090b] border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] transition-all duration-300 ease-in-out ${
          hideOnMobile
            ? "translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-center h-16 px-2 overflow-x-auto gap-2 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {isMatched ? (
            <>
              {navItems.map((item) => {
                const active = isActive(item.activePaths);
                return (
                  <Link key={item.href} href={item.href} className="flex-1 min-w-[70px] shrink-0">
                    <div className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                      <div
                        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          active
                            ? "bg-[#e8faf0] dark:bg-[#25D366]/10 text-[#25D366]"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                        {active && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#09090b]" />
                        )}
                      </div>
                      <span
                        className={`text-[9.5px] font-medium ${
                          active ? "text-[#25D366]" : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {userRole === "ADMIN" && (
                <>
                  <Link href="/settings" className="flex-1 min-w-[70px] shrink-0">
                    <div className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                      <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        pathname === "/settings" || pathname?.startsWith("/settings/") ? "bg-[#e8faf0] dark:bg-[#25D366]/10 text-[#25D366]" : "text-zinc-400 dark:text-zinc-500"
                      }`}>
                        <Settings className="w-[18px] h-[18px]" />
                      </div>
                      <span className={`text-[9.5px] font-medium ${
                        pathname === "/settings" || pathname?.startsWith("/settings/") ? "text-[#25D366]" : "text-zinc-500 dark:text-zinc-400"
                      }`}>Settings</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 min-w-[70px] shrink-0 flex flex-col items-center justify-center gap-0.5 py-1.5"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                      <Link2 className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-[9.5px] font-medium text-zinc-500 dark:text-zinc-400">Config</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center w-full gap-3 py-2 min-w-full">
              <div className="w-8 h-8 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center border border-red-100 dark:border-red-500/20">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">API Not Connected</p>
              
              {userRole === "ADMIN" && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
                >
                  Connect
                </button>
              )}
            </div>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-[#09090b]" />
      </nav>

      {/* 🔥 FIX 3: Success hone par config turant refetch karega */}
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
