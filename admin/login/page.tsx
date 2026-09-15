"use client";

import { useState, useEffect } from "react";
import { Lock, Inbox, Trash2, RefreshCw, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/admin?password=${encodeURIComponent(password)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-primary-600 to-blue-600 rounded-full">
              <Lock className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Admin Login</h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Enter password to access dashboard
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                required
                className={`w-full px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-primary-400 transition-all duration-300 ${
                  error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Enter admin password"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Incorrect password. Please try again.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Lock size={20} />
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
