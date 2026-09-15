"use client";

import { useEffect, useState, useCallback } from "react";
import { Inbox, Trash2, RefreshCw, Eye, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, unread: 0 });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase()
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      const msgs = data || [];
      setMessages(msgs);

      const today = new Date().toISOString().split("T")[0];
      setStats({
        total: msgs.length,
        today: msgs.filter((m) => m.created_at.startsWith(today)).length,
        unread: msgs.filter((m) => !m.read).length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const deleteMessage = async (id: string) => {
    const { error } = await supabase().from("messages").delete().eq("id", id);

    if (error) {
      console.error("Error deleting message:", error);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    }
  };

  const deleteAll = async () => {
    if (!confirm("Are you sure you want to delete all messages?")) return;
    const { error } = await supabase().from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) {
      setMessages([]);
      setSelectedMessage(null);
      setStats({ total: 0, today: 0, unread: 0 });
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Subject", "Message", "Date"];
    const rows = messages.map((m) => [
      m.name,
      m.email,
      m.subject,
      `"${m.message.replace(/"/g, '""')}"`,
      m.created_at,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `messages_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container-custom px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-2 text-sm"
              >
                <ArrowLeft size={16} />
                Back to Portfolio
              </Link>
              <h1 className="text-3xl font-bold">Message Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View and manage all contact form submissions
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchMessages}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              {messages.length > 0 && (
                <>
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                  <button
                    onClick={deleteAll}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete All
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Messages</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Inbox className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today</p>
                <p className="text-3xl font-bold">{stats.today}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Eye className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unread</p>
                <p className="text-3xl font-bold">{stats.unread}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Inbox className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Messages List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold">All Messages</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                  <Inbox className="mx-auto mb-4" size={48} />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm mt-2">Messages from contact form will appear here</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      selectedMessage?.id === msg.id
                        ? "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-sm">{msg.name}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                      {msg.subject}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {msg.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Message Detail */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
            {selectedMessage ? (
              <>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedMessage.subject}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      From: {selectedMessage.name} &lt;{selectedMessage.email}&gt;
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(selectedMessage.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete message"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Message
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {selectedMessage.message}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Email:
                      </span>
                      <a
                        href={`mailto:${selectedMessage.email}`}
                        className="ml-2 text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {selectedMessage.email}
                      </a>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Eye className="mx-auto mb-4" size={48} />
                <p className="text-lg font-medium">Select a message</p>
                <p className="text-sm mt-2">Click on any message from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
