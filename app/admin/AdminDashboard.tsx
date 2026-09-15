"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Inbox, Trash2, RefreshCw, Eye, ArrowLeft, Download, Search, LogOut, Mail, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string; name: string; email: string; subject: string; message: string; created_at: string; read?: boolean;
}

function extractField(message: string, label: string) {
  const match = message.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "—";
}

export default function AdminDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [stats, setStats] = useState({ total: 0, today: 0, unread: 0, week: 0, month: 0 });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase().from("messages").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error fetching messages:", error);
    else {
      const msgs = (data || []) as Message[];
      setMessages(msgs);
      const now = new Date();
      const day = 24 * 60 * 60 * 1000;
      setStats({
        total: msgs.length,
        today: msgs.filter(m => now.getTime() - new Date(m.created_at).getTime() < day && new Date(m.created_at).getDate() === now.getDate()).length,
        unread: msgs.filter(m => m.read !== true).length,
        week: msgs.filter(m => now.getTime() - new Date(m.created_at).getTime() < 7 * day).length,
        month: msgs.filter(m => new Date(m.created_at).getMonth() === now.getMonth() && new Date(m.created_at).getFullYear() === now.getFullYear()).length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const filteredMessages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter(m => {
      const matchesFilter = filter === "all" || (filter === "unread" ? m.read !== true : m.read === true);
      const matchesSearch = !q || [m.name, m.email, m.subject, m.message].some(v => v?.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [messages, search, filter]);

  const markRead = async (msg: Message) => {
    if (msg.read === true) return;
    const { error } = await supabase().from("messages").update({ read: true }).eq("id", msg.id);
    if (!error) {
      const updated = { ...msg, read: true };
      setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
      setSelectedMessage(updated);
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    const { error } = await supabase().from("messages").delete().eq("id", id);
    if (!error) { setMessages(prev => prev.filter(m => m.id !== id)); if (selectedMessage?.id === id) setSelectedMessage(null); }
  };

  const deleteAll = async () => {
    if (!confirm("Are you sure you want to delete all messages?")) return;
    const { error } = await supabase().from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) { setMessages([]); setSelectedMessage(null); setStats({ total: 0, today: 0, unread: 0, week: 0, month: 0 }); }
  };

  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin/login"; };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Subject", "Message", "Date"];
    const escapeCSV = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = messages.map(m => [m.name, m.email, m.subject, m.message, m.created_at].map(escapeCSV).join(","));
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

        <section className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"><h2 className="text-xl font-bold mb-4">Analytics Snapshot</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><p className="text-sm text-gray-500">Weekly conversion activity</p><div className="mt-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-primary-600" style={{width:`${stats.total ? Math.min(100,(stats.week/stats.total)*100) : 0}%`}}/></div><p className="text-xs text-gray-500 mt-2">{stats.week} of {stats.total} leads are from the last 7 days</p></div><div><p className="text-sm text-gray-500">Unread rate</p><p className="text-3xl font-bold mt-2">{stats.total ? Math.round((stats.unread/stats.total)*100) : 0}%</p></div><div><p className="text-sm text-gray-500">Monthly leads</p><p className="text-3xl font-bold mt-2">{stats.month}</p></div></div></section>
      </main>
    </div>
  );
}
