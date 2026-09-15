"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Inbox, Trash2, RefreshCw, Eye, ArrowLeft, Download, Search, LogOut, Mail, Users, TrendingUp, CheckCircle2, BarChart3, CalendarDays, Target, Clock3 } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  read?: boolean;
}

function extractField(message: string, label: string) {
  const match = message.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "—";
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "short" });
}

function normalizeCategory(value: string) {
  const v = value.toLowerCase();
  if (v.includes("ai") || v.includes("agent") || v.includes("automation")) return "AI / Automation";
  if (v.includes("web") || v.includes("website")) return "Web Development";
  if (v.includes("ecommerce") || v.includes("e-commerce") || v.includes("shop")) return "E-commerce";
  if (v.includes("saas")) return "SaaS";
  if (!value || value === "—") return "Other";
  return value;
}

export default function AdminDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [range, setRange] = useState<"all" | "30" | "90" | "365">("all");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/messages", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load leads");
      const payload = await response.json();
      setMessages((payload.messages || []) as Message[]);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const stats = useMemo(() => {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    const inRange = (m: Message) => {
      if (range === "all") return true;
      return now.getTime() - new Date(m.created_at).getTime() <= Number(range) * day;
    };
    const scoped = messages.filter(inRange);
    const today = scoped.filter(m => {
      const d = new Date(m.created_at);
      return d.toDateString() === now.toDateString();
    }).length;
    const week = scoped.filter(m => now.getTime() - new Date(m.created_at).getTime() <= 7 * day).length;
    const month = scoped.filter(m => {
      const d = new Date(m.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const unread = scoped.filter(m => m.read !== true).length;
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthCount = messages.filter(m => {
      const d = new Date(m.created_at);
      return d.getMonth() === previousMonth.getMonth() && d.getFullYear() === previousMonth.getFullYear();
    }).length;
    const growth = previousMonthCount === 0 ? (month > 0 ? 100 : 0) : Math.round(((month - previousMonthCount) / previousMonthCount) * 100);
    return { total: scoped.length, today, unread, week, month, previousMonthCount, growth, scoped };
  }, [messages, range]);

  const monthlyReport = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      const key = monthKey(d);
      const count = messages.filter(m => monthKey(new Date(m.created_at)) === key).length;
      return { key, label: monthLabel(d), count, date: d };
    });
  }, [messages]);

  const projectReport = useMemo(() => {
    const counts = new Map<string, number>();
    stats.scoped.forEach(m => {
      const category = normalizeCategory(extractField(m.message, "Project Type"));
      counts.set(category, (counts.get(category) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [stats.scoped]);

  const timelineReport = useMemo(() => {
    const counts = new Map<string, number>();
    stats.scoped.forEach(m => {
      const value = extractField(m.message, "Timeline");
      if (value !== "—") counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [stats.scoped]);

  const maxMonthly = Math.max(1, ...monthlyReport.map(m => m.count));

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stats.scoped.filter(m => {
      const matchesFilter = filter === "all" || (filter === "unread" ? m.read !== true : m.read === true);
      const matchesSearch = !q || [m.name, m.email, m.subject, m.message].some(v => v?.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [stats.scoped, search, filter]);

  const markRead = async (msg: Message) => {
    if (msg.read === true) return;
    const response = await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msg.id, read: true }),
    });
    if (response.ok) {
      const updated = { ...msg, read: true };
      setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
      setSelectedMessage(updated);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const response = await fetch("/api/admin/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    }
  };

  const deleteAll = async () => {
    if (!confirm("Are you sure you want to delete all messages?")) return;
    const response = await fetch("/api/admin/messages", { method: "DELETE" });
    if (response.ok) { setMessages([]); setSelectedMessage(null); }
  };

  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin/login"; };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Subject", "Message", "Date"];
    const escapeCSV = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = stats.scoped.map(m => [m.name, m.email, m.subject, m.message, m.created_at].map(escapeCSV).join(","));
    const csv = [headers.map(escapeCSV).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container-custom px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between gap-4">
          <div><Link href="/" className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-2 text-sm"><ArrowLeft size={16}/> Back to Portfolio</Link><h1 className="text-3xl font-bold">Lead CRM</h1><p className="text-gray-600 dark:text-gray-400 mt-1">Manage portfolio leads, messages and activity.</p></div>
          <div className="flex flex-wrap gap-2 items-start">
            <select value={range} onChange={e => setRange(e.target.value as typeof range)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"><option value="all">All time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select>
            <button onClick={fetchMessages} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-50"><RefreshCw size={18} className={loading ? "animate-spin" : ""}/> Refresh</button>
            {messages.length > 0 && <><button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg"><Download size={18}/> Export</button><button onClick={deleteAll} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"><Trash2 size={18}/> Delete All</button></>}
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 border rounded-lg"><LogOut size={18}/> Logout</button>
          </div>
        </div>
      </header>

      <main className="container-custom px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[{label:"Total Leads",value:stats.total,icon:Users},{label:"Today",value:stats.today,icon:TrendingUp},{label:"Unread",value:stats.unread,icon:Mail},{label:"7 Days",value:stats.week,icon:CheckCircle2},{label:"This Month",value:stats.month,icon:Inbox}].map(({label,value,icon:Icon}) => <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700"><div className="flex justify-between items-center"><div><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="text-3xl font-bold mt-1">{value}</p></div><Icon size={24} className="text-primary-600"/></div></div>)}
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5"><div><h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 size={20}/> Monthly Lead Report</h2><p className="text-sm text-gray-500 mt-1">Leads received over the last 12 months</p></div><div className={`text-sm font-semibold ${stats.growth >= 0 ? "text-green-600" : "text-red-600"}`}>{stats.growth >= 0 ? "+" : ""}{stats.growth}% vs last month</div></div>
            <div className="flex items-end gap-2 h-48">{monthlyReport.map(item => <div key={item.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><span className="text-xs font-semibold">{item.count}</span><div className="w-full max-w-12 rounded-t-md bg-primary-600 transition-all" style={{ height: `${Math.max(5, (item.count / maxMonthly) * 78)}%` }} title={`${item.label}: ${item.count} leads`} /><span className="text-xs text-gray-500">{item.label}</span></div>)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"><h2 className="text-xl font-bold flex items-center gap-2"><Target size={20}/> Performance</h2><div className="mt-5 space-y-5"><div><p className="text-sm text-gray-500">This month</p><p className="text-3xl font-bold">{stats.month}</p><p className="text-xs text-gray-500 mt-1">Previous month: {stats.previousMonthCount}</p></div><div><p className="text-sm text-gray-500">Unread rate</p><p className="text-3xl font-bold">{stats.total ? Math.round((stats.unread / stats.total) * 100) : 0}%</p></div><div><p className="text-sm text-gray-500">Last 7 days</p><p className="text-3xl font-bold">{stats.week}</p></div></div></div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"><h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp size={20}/> Project Demand</h2><p className="text-sm text-gray-500 mt-1">Based on the Project Type selected by leads</p><div className="mt-5 space-y-4">{projectReport.length === 0 ? <p className="text-gray-500">No project data yet.</p> : projectReport.map(([name, count]) => <div key={name}><div className="flex justify-between text-sm mb-1"><span>{name}</span><span className="font-semibold">{count}</span></div><div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${Math.max(4, (count / Math.max(1, projectReport[0][1])) * 100)}%` }} /></div></div>)}</div></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"><h2 className="text-xl font-bold flex items-center gap-2"><Clock3 size={20}/> Timeline Demand</h2><p className="text-sm text-gray-500 mt-1">Most requested delivery timelines</p><div className="mt-5 space-y-3">{timelineReport.length === 0 ? <p className="text-gray-500">No timeline data yet.</p> : timelineReport.map(([name, count]) => <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"><span className="truncate pr-4">{name}</span><span className="font-bold">{count}</span></div>)}</div></div>
        </section>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, subject or message..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 outline-none"/></div>
          <div className="flex gap-2">{(["all","unread","read"] as const).map(f=><button key={f} onClick={()=>setFilter(f)} className={`px-4 py-2 rounded-lg capitalize ${filter===f?"bg-primary-600 text-white":"bg-gray-100 dark:bg-gray-700"}`}>{f}</button>)}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700"><h2 className="text-xl font-bold">Leads <span className="text-sm font-normal text-gray-500">({filteredMessages.length})</span></h2></div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[650px] overflow-y-auto">
              {loading ? <div className="p-12 text-center"><RefreshCw className="animate-spin mx-auto mb-4" size={32}/>Loading...</div> : filteredMessages.length === 0 ? <div className="p-12 text-center text-gray-500"><Inbox className="mx-auto mb-4" size={48}/><p className="font-medium">No matching leads</p></div> : filteredMessages.map(msg => <button key={msg.id} onClick={()=>{setSelectedMessage(msg); markRead(msg)}} className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-l-4 ${selectedMessage?.id===msg.id?"border-primary-600 bg-primary-50 dark:bg-primary-900/20":"border-transparent"}`}><div className="flex justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className={`font-semibold truncate ${msg.read!==true?"":"text-gray-600"}`}>{msg.name}</h3>{msg.read!==true&&<span className="w-2 h-2 rounded-full bg-primary-600 shrink-0"/>}</div><p className="text-sm text-primary-600 truncate">{msg.subject}</p></div><span className="text-xs text-gray-500 shrink-0">{formatDate(msg.created_at)}</span></div><p className="text-sm text-gray-500 line-clamp-2 mt-1">{msg.message}</p></button>)}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[400px]">
            {selectedMessage ? <><div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between gap-4"><div><h2 className="text-xl font-bold">{selectedMessage.subject}</h2><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedMessage.name} · {selectedMessage.email}</p><p className="text-xs text-gray-500 mt-1">{formatDate(selectedMessage.created_at)}</p></div><button onClick={()=>deleteMessage(selectedMessage.id)} className="p-2 h-fit text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button></div><div className="p-6 space-y-5"><div><h3 className="text-sm font-semibold text-gray-500 mb-2">Lead Details</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span className="text-xs text-gray-500">Project</span><p className="font-medium">{extractField(selectedMessage.message,"Project Type")}</p></div><div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span className="text-xs text-gray-500">Budget</span><p className="font-medium">{extractField(selectedMessage.message,"Budget")}</p></div><div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"><span className="text-xs text-gray-500">Timeline</span><p className="font-medium">{extractField(selectedMessage.message,"Timeline")}</p></div></div></div><div><h3 className="text-sm font-semibold text-gray-500 mb-2">Message</h3><div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">{selectedMessage.message}</div></div><a href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`} className="inline-flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-lg"><Mail size={18}/> Reply by Email</a></div></> : <div className="p-12 text-center text-gray-500"><Eye className="mx-auto mb-4" size={48}/><p className="text-lg font-medium">Select a lead</p><p className="text-sm mt-2">Choose a lead to view its CRM details.</p></div>}
          </section>
        </div>

        <section className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"><h2 className="text-xl font-bold mb-2 flex items-center gap-2"><CalendarDays size={20}/> Analytics Snapshot</h2><p className="text-sm text-gray-500 mb-5">Current analytics are based on contact-form leads. A lead is not counted as a confirmed client until a CRM pipeline status is added.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><p className="text-sm text-gray-500">Weekly activity</p><p className="text-3xl font-bold mt-2">{stats.week}</p><p className="text-xs text-gray-500 mt-1">leads in the last 7 days</p></div><div><p className="text-sm text-gray-500">Monthly leads</p><p className="text-3xl font-bold mt-2">{stats.month}</p><p className="text-xs text-gray-500 mt-1">current calendar month</p></div><div><p className="text-sm text-gray-500">Growth</p><p className={`text-3xl font-bold mt-2 ${stats.growth >= 0 ? "text-green-600" : "text-red-600"}`}>{stats.growth >= 0 ? "+" : ""}{stats.growth}%</p><p className="text-xs text-gray-500 mt-1">vs previous month</p></div></div></section>
      </main>
    </div>
  );
}
