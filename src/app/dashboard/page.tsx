"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react"; 
import { useTheme } from "next-themes"; 
import Sidebar from "@/components/Sidebar"; 
import { 
  Users, Send, CheckCircle2, Sparkles, Bot, 
  Activity, ArrowDownToLine, ArrowUpFromLine, Key,
  TrendingUp, TrendingDown, RefreshCw, FileText, MapPin, 
  Image as ImageIcon, Mic, MessageSquare, Video, Sticker, Globe,
  Info, ChevronRight, GripHorizontal
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

// 🔥 NAYA: Smart Grid Layout Import kiya gaya
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Updated Colors: No Black. Text is Blue. Media is Emerald/Orange.
const PIE_COLORS = {
  Text: '#0073bb', 
  Images: '#10B981', 
  Videos: '#F59E0B', 
  Documents: '#8B5CF6', 
  Audio: '#EC4899', 
  Location: '#14B8A6', 
  Stickers: '#6366F1', 
  Interactive: '#e77c40'
};

// --- AWS Style Loading Spinner ---
const AWSSpinner = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-[#16191f] z-10 rounded-xl">
    <svg className="animate-spin h-8 w-8 text-[#0073bb] dark:text-[#3b99fc]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

// --- Custom Resize Handle (Bada aur chamakdar) ---
const CustomResizeHandle = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div
      ref={ref}
      {...props}
      className={`absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-1 touch-none z-50 ${props.className}`}
    >
      <div className="w-3 h-3 border-r-2 border-b-2 border-[#aab7b8] hover:border-[#0073bb] transition-colors rounded-br-sm" />
    </div>
  );
});
CustomResizeHandle.displayName = "CustomResizeHandle";

// --- Default AWS Layout Grid ---
// w: width, h: height, x/y: position
const DEFAULT_LAYOUT = [
  { i: 'welcome', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
  { i: 'traffic', x: 4, y: 0, w: 8, h: 3, minW: 5, minH: 2 },
  { i: 'health', x: 0, y: 2, w: 4, h: 3, minW: 3, minH: 2 },
  { i: 'outbound', x: 4, y: 3, w: 4, h: 2.5, minW: 3, minH: 2 },
  { i: 'inbound', x: 8, y: 3, w: 4, h: 2.5, minW: 3, minH: 2 }
];

export default function DashboardPage() {
  const { data: session, status } = useSession(); 
  const { theme } = useTheme(); 
  const isDark = theme === 'dark';
  
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("7d"); 
  
  // Layout State for Memory Save
  const [layouts, setLayouts] = useState<{lg: any[]}>({ lg: DEFAULT_LAYOUT });
  const [isMounted, setIsMounted] = useState(false);

  const [data, setData] = useState<any>({
    contacts: { total: 0, google: 0, csv: 0, manual: 0 },
    system: { botActive: false, activeFlows: 0, approvedTemplates: 0, activeApiKeys: 0, activeSessions: 0 },
    outbound: { total: 0, read: 0, delivered: 0, sent: 0, chat: 0, flow: 0, api: 0, campaign: 0 },
    inbound: { total: 0, text: 0, image: 0, video: 0, document: 0, audio: 0, location: 0, sticker: 0, interactive: 0 },
    types: { template: 0, text: 0, media: 0, interactive: 0 },
    readRate: 0,
    chartData: []
  });

  // Hydration & Layout Memory Load
  useEffect(() => {
    setIsMounted(true);
    const savedLayout = localStorage.getItem('basekey_aws_layout');
    if (savedLayout) {
      try { setLayouts({ lg: JSON.parse(savedLayout) }); } catch(e) { }
    }
  }, []);

  const onLayoutChange = (newLayout: any) => {
    setLayouts({ lg: newLayout });
    localStorage.setItem('basekey_aws_layout', JSON.stringify(newLayout));
  };

  const resetLayout = () => {
    if (confirm("Reset dashboard layout to default?")) {
      setLayouts({ lg: DEFAULT_LAYOUT });
      localStorage.setItem('basekey_aws_layout', JSON.stringify(DEFAULT_LAYOUT));
    }
  };

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetch(`/api/dashboard-stats?range=${timeRange}`);
      if (res.ok) {
        const stats = await res.json();
        setData((prev: any) => ({ ...prev, ...stats }));
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      // Fix (BaseKey audit — "loading dikhta rehta hai"): this used to force
      // a 600ms `setTimeout` before clearing the spinner on every single
      // fetch, even when data was already back instantly — every range
      // change or refresh flashed a spinner for no reason. Clear it as soon
      // as the real fetch resolves.
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUserName(session.user.name || session.user.email?.split("@")[0] || "there");
      fetchStats();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, session, fetchStats]);

  const { isTrendUp, trendColor } = useMemo(() => {
    if (!data?.chartData || data.chartData.length < 2) return { isTrendUp: true, trendColor: '#0073bb' }; 
    const latest = data.chartData[data.chartData.length - 1] || {};
    const previous = data.chartData[data.chartData.length - 2] || {};
    const isUp = (latest.sent || 0) >= (previous.sent || 0);
    return { isTrendUp: isUp, trendColor: isUp ? '#0073bb' : '#d62728' };
  }, [data?.chartData]);

  const inboundPieData = [
    { name: 'Text', value: data?.inbound?.text || 0, icon: <MessageSquare className="w-3 h-3"/> },
    { name: 'Images', value: data?.inbound?.image || 0, icon: <ImageIcon className="w-3 h-3"/> },
    { name: 'Videos', value: data?.inbound?.video || 0, icon: <Video className="w-3 h-3"/> },
    { name: 'Documents', value: data?.inbound?.document || 0, icon: <FileText className="w-3 h-3"/> },
    { name: 'Audio', value: data?.inbound?.audio || 0, icon: <Mic className="w-3 h-3"/> },
    { name: 'Location', value: data?.inbound?.location || 0, icon: <MapPin className="w-3 h-3"/> },
    { name: 'Stickers', value: data?.inbound?.sticker || 0, icon: <Sticker className="w-3 h-3"/> },
    { name: 'Interactive', value: data?.inbound?.interactive || 0, icon: <Globe className="w-3 h-3"/> },
  ].filter(item => item.value > 0);

  const outboundSourceData = [
    { name: 'Manual Chat', volume: data?.outbound?.chat || 0, fill: '#0073bb' },
    { name: 'Flow Builder', volume: data?.outbound?.flow || 0, fill: '#e77c40' },
    { name: 'API Triggers', volume: data?.outbound?.api || 0, fill: '#2ca02c' },
    { name: 'Campaigns', volume: data?.outbound?.campaign || 0, fill: '#d62728' },
  ].filter(item => item.volume > 0);

  // Widget Wrapper with AWS Blue Focus Ring & Mobile touch fixes
  const renderWidget = (id: string, title: string, IconCmp: any, children: React.ReactNode) => (
    <div key={id} className="w-full h-full flex flex-col bg-white dark:bg-[#16191f] border border-[#eaeded] dark:border-[#414750] rounded-xl overflow-hidden shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-[#0073bb] hover:ring-1 hover:ring-[#0073bb]/50 transition-all select-none">
      <div className="drag-handle px-4 py-3 border-b border-[#eaeded] dark:border-[#414750] flex items-center justify-between cursor-move active:cursor-grabbing bg-white dark:bg-[#16191f] touch-none">
        <div className="flex items-center gap-2 pointer-events-none">
          <h2 className="text-[15px] font-bold text-[#16191f] dark:text-[#eaeded] tracking-tight">{title}</h2>
          {IconCmp && <IconCmp className="w-4 h-4 text-[#545b64] dark:text-[#aab7b8] ml-1" />}
        </div>
        <GripHorizontal className="w-4 h-4 text-[#545b64] dark:text-[#aab7b8] opacity-50" />
      </div>
      <div className="flex-1 relative p-4 overflow-y-auto custom-scrollbar cursor-default touch-pan-y">
        {loading ? <AWSSpinner /> : children}
      </div>
    </div>
  );

  if (!isMounted) return null;

  return (
    <div className="flex h-[100dvh] w-full bg-[#f2f3f3] dark:bg-[#0f1114] text-[#16191f] dark:text-[#eaeded] overflow-hidden pb-[70px] md:pb-0 font-sans">
      <div className="shrink-0 z-50">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-full relative overflow-y-auto no-scrollbar">
        
        {/* Top Bar */}
        <div className="bg-[#232f3e] dark:bg-[#16191f] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 shadow-sm border-b border-[#232f3e] dark:border-[#414750]">
          <div className="flex items-center gap-4">
            <h1 className="text-[18px] font-bold text-white flex items-center gap-2 tracking-tight">
              Console Home <span className="text-[#aab7b8] text-[14px] font-normal">| BaseKey CRM</span>
            </h1>
            <button onClick={resetLayout} className="text-[12px] text-[#aab7b8] hover:text-white transition-colors border border-[#545b64] px-2 py-0.5 rounded-sm active:bg-[#2a3039]">
              Reset Layout
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-[#16191f] dark:bg-[#0f1114] rounded-lg border border-[#545b64] overflow-hidden">
              {['24h', '7d', '15d', '30d'].map((range) => (
                <button 
                  key={range} onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-[13px] font-bold transition-all border-r border-[#545b64] last:border-0 ${timeRange === range ? 'bg-[#0073bb] text-white' : 'text-[#aab7b8] hover:text-white hover:bg-[#2a3039]'}`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
            <button 
              onClick={() => fetchStats(true)} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-[#2a3039] text-white border border-[#545b64] rounded-lg font-bold text-[13px] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* --- SMART GRID LAYOUT --- */}
        <div className="p-2 md:p-4 max-w-[1800px] mx-auto w-full">
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={120}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
            resizeHandle={<CustomResizeHandle />}
            compactType="vertical"
            margin={[16, 16]}
          >
            {/* Widget 1: Welcome */}
            {renderWidget('welcome', 'Welcome to BaseKey API', Info, (
              <div className="flex flex-col h-full">
                <p className="text-[14px] text-[#545b64] dark:text-[#aab7b8] mb-5">
                  Welcome back, <strong>{userName || "there"}</strong>. Getting started with your WhatsApp API performance.
                </p>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 h-full mt-auto">
                  <div className="border-l-2 border-[#0073bb] pl-3 flex flex-col justify-center">
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8] font-bold">Total Sent</p>
                    <p className="text-[24px] font-light text-[#16191f] dark:text-[#eaeded]">{data?.outbound?.total || 0}</p>
                  </div>
                  <div className="border-l-2 border-[#10B981] pl-3 flex flex-col justify-center">
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8] font-bold">Total Received</p>
                    <p className="text-[24px] font-light text-[#16191f] dark:text-[#eaeded]">{data?.inbound?.total || 0}</p>
                  </div>
                  <div className="border-l-2 border-[#F59E0B] pl-3 flex flex-col justify-center">
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8] font-bold">Active Contacts</p>
                    <p className="text-[24px] font-light text-[#16191f] dark:text-[#eaeded]">{data?.contacts?.total || 0}</p>
                  </div>
                  <div className="border-l-2 border-[#8B5CF6] pl-3 flex flex-col justify-center">
                    <p className="text-[12px] text-[#545b64] dark:text-[#aab7b8] font-bold">Average Read Rate</p>
                    <p className="text-[24px] font-light text-[#16191f] dark:text-[#eaeded]">{data?.readRate || 0}%</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Widget 2: Traffic */}
            {renderWidget('traffic', 'Message Traffic Over Time', Activity, (
              <div className="flex flex-col h-full relative">
                <div className="absolute top-0 right-2 flex items-center gap-1 text-[12px] font-bold z-10">
                  {isTrendUp ? <TrendingUp className="w-3.5 h-3.5 text-[#0073bb]" /> : <TrendingDown className="w-3.5 h-3.5 text-[#d62728]" />}
                  <span className={isTrendUp ? "text-[#0073bb]" : "text-[#d62728]"}>{isTrendUp ? 'Upward Trend' : 'Downward Trend'}</span>
                </div>
                <div className="flex-1 w-full relative mt-4">
                  <div className="absolute inset-0">
                    {!data?.chartData || data.chartData.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-[#545b64] text-[14px]">No activity in this period.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={trendColor} stopOpacity={0.3}/><stop offset="95%" stopColor={trendColor} stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e77c40" stopOpacity={0.3}/><stop offset="95%" stopColor="#e77c40" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#414750' : '#eaeded'} />
                          <XAxis dataKey="date" tick={{fontSize: 12, fill: '#879596'}} axisLine={false} tickLine={false} dy={10} />
                          <YAxis tick={{fontSize: 12, fill: '#879596'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ stroke: isDark ? '#aab7b8' : '#545b64', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: isDark ? '#16191f' : '#ffffff', border: `1px solid ${isDark ? '#414750' : '#eaeded'}`, borderRadius: '8px', color: isDark ? '#eaeded' : '#16191f', fontSize: '13px' }} />
                          <Area type="monotone" dataKey="sent" name="Outbound" stroke={trendColor} strokeWidth={2} fillOpacity={1} fill="url(#colorOutbound)" activeDot={{ r: 4 }}/>
                          <Area type="monotone" dataKey="received" name="Inbound" stroke="#e77c40" strokeWidth={2} fillOpacity={1} fill="url(#colorInbound)" activeDot={{ r: 4 }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Widget 3: Health */}
            {renderWidget('health', 'System Infrastructure', CheckCircle2, (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between"><span className="text-[14px] text-[#545b64] dark:text-[#aab7b8]">AI Bot (Gemini)</span><span className={`text-[14px] font-bold ${data?.system?.botActive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{data?.system?.botActive ? 'Operational' : 'Offline'}</span></div>
                <div className="h-[1px] w-full bg-[#eaeded] dark:bg-[#414750]"></div>
                <div className="flex items-center justify-between"><span className="text-[14px] text-[#545b64] dark:text-[#aab7b8]">Automated Chat Flows</span><span className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded]">{data?.system?.activeFlows || 0} active</span></div>
                <div className="h-[1px] w-full bg-[#eaeded] dark:bg-[#414750]"></div>
                <div className="flex items-center justify-between"><span className="text-[14px] text-[#545b64] dark:text-[#aab7b8]">Developer API Keys</span><span className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded]">{data?.system?.activeApiKeys || 0} configured</span></div>
                <div className="h-[1px] w-full bg-[#eaeded] dark:bg-[#414750]"></div>
                <div className="flex items-center justify-between"><span className="text-[14px] text-[#545b64] dark:text-[#aab7b8]">Approved Templates</span><span className="text-[14px] font-bold text-[#16191f] dark:text-[#eaeded]">{data?.system?.approvedTemplates || 0}</span></div>
                <div className="mt-auto pt-4"><a href="/settings" className="text-[#0073bb] dark:text-[#3b99fc] text-[13px] hover:underline flex items-center w-max">Manage Configurations <ChevronRight className="w-3 h-3 ml-1" /></a></div>
              </div>
            ))}

            {/* Widget 4: Outbound Analytics */}
            {renderWidget('outbound', 'Cost and usage (Outbound)', Send, (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-end mb-4 bg-[#f2f3f3] dark:bg-[#0f1114] p-3 rounded-lg border border-[#eaeded] dark:border-[#414750]">
                  <div><p className="text-[11px] text-[#545b64] dark:text-[#aab7b8] font-bold uppercase tracking-wide">Templates Sent</p><p className="text-[18px] font-bold text-[#16191f] dark:text-[#eaeded]">{data?.types?.template || 0}</p></div>
                  <div className="text-right"><p className="text-[11px] text-[#545b64] dark:text-[#aab7b8] font-bold uppercase tracking-wide">Free Text</p><p className="text-[18px] font-bold text-[#16191f] dark:text-[#eaeded]">{data?.types?.text || 0}</p></div>
                </div>
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-0">
                    {outboundSourceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={outboundSourceData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? '#414750' : '#eaeded'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#879596'}} width={90} />
                          <Tooltip cursor={{fill: isDark ? '#2a3039' : '#f2f3f3'}} contentStyle={{ backgroundColor: isDark ? '#16191f' : '#ffffff', border: `1px solid ${isDark ? '#414750' : '#eaeded'}`, borderRadius: '8px', color: isDark ? '#eaeded' : '#16191f', fontSize: '13px' }} />
                          <Bar dataKey="volume" barSize={16}>{outboundSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : ( <div className="flex h-full items-center justify-center text-[#545b64] text-[13px]">No outbound data</div> )}
                  </div>
                </div>
              </div>
            ))}

            {/* Widget 5: Inbound Formats */}
            {renderWidget('inbound', 'Security (Inbound Data)', ArrowDownToLine, (
               <div className="flex items-center h-full flex-col md:flex-row relative">
                 <div className="flex-1 w-full md:w-1/2 relative min-h-[150px]">
                   <div className="absolute inset-0">
                     {inboundPieData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={inboundPieData} cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2} dataKey="value" stroke="none">
                             {/* 🔥 FIX: Exact AWS color matching based on category name */}
                             {inboundPieData.map((entry: any, index) => <Cell key={`cell-${index}`} fill={(PIE_COLORS as any)[entry.name] || '#879596'} />)}
                           </Pie>
                           <Tooltip contentStyle={{ backgroundColor: isDark ? '#16191f' : '#ffffff', border: `1px solid ${isDark ? '#414750' : '#eaeded'}`, borderRadius: '8px', color: isDark ? '#eaeded' : '#16191f', fontSize:'13px' }}/>
                         </PieChart>
                       </ResponsiveContainer>
                     ) : ( <div className="flex h-full items-center justify-center text-[#545b64] text-[13px]">No inbound data</div> )}
                   </div>
                 </div>
                 <div className="w-full md:w-1/2 pl-0 md:pl-4 mt-4 md:mt-0 flex flex-col gap-2 justify-center overflow-y-auto max-h-[150px] custom-scrollbar">
                   {inboundPieData.map((item: any, i) => (
                     <div key={item.name} className="flex items-center justify-between text-[13px]">
                       <div className="flex items-center gap-2 text-[#16191f] dark:text-[#eaeded]">
                         <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (PIE_COLORS as any)[item.name] || '#879596' }}></div>
                         {item.name}
                       </div>
                       <span className="font-bold text-[#545b64] dark:text-[#aab7b8]">{item.value}</span>
                     </div>
                   ))}
                   {inboundPieData.length === 0 && !loading && ( <p className="text-[#545b64] text-[13px]">No records found</p> )}
                 </div>
               </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      </div>
    </div>
  );
}
