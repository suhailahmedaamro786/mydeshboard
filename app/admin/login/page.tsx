"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setError("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6"><div className="p-4 bg-gradient-to-br from-primary-600 to-blue-600 rounded-full"><Lock className="text-white" size={32} /></div></div>
          <h1 className="text-3xl font-bold text-center mb-2">Admin Login</h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Secure dashboard access</p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-lg border-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-primary-400 transition-all duration-300" placeholder="Enter admin password" autoFocus />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60">
              <Lock size={20} /> {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
