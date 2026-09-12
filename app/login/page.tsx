'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Landmark,
  Shield,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  Compass,
  FileCheck,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { DEMO_USERS } from '@/lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'credentials' | 'quick-roles'>('quick-roles');

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Login failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
      setLoading(false);
    }
  };

  const handleQuickRoleLogin = async (user: (typeof DEMO_USERS)[0]) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to switch role session.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
      setLoading(false);
    }
  };

  const roleIcons: Record<string, any> = {
    SUPER_ADMIN: Shield,
    ADMIN: Landmark,
    REVENUE_OFFICER: FileSpreadsheet,
    VERIFICATION_OFFICER: FileCheck,
    DATA_ENTRY_OPERATOR: Users,
    GIS_OFFICER: Compass,
    AUDITOR: KeyRound,
    VIEWER: Eye
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      {/* Official Government Top Bar */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-emerald-600"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 shadow-md flex-shrink-0 bg-slate-950 flex items-center justify-center ring-2 ring-amber-500/20">
              <img src="/logo.png" alt="ILRDVS Emblem" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Ministry of Rural Development • Government of India
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Department of Land Resources (DoLR)
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Intelligent Land Record Digitization &amp; Validation System (ILRDVS) • SIH 2026
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 text-slate-700 rounded border border-slate-300">
              DILRMP Certified
            </span>
            <span className="text-xs font-mono px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure NIC Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Authentication Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
                  Authorized Personnel Access
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Official Revenue Authentication Gateway</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Access cadastre layers, Indic multilingual HTR OCR engines, land ownership verification queues, and tamper-proof audit trails.
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('quick-roles')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'quick-roles'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1-Click Demo Roles (8)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'credentials'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Credential Login
              </button>
            </div>
          </div>

          {error && (
            <div className="m-6 mb-0 p-4 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-3 text-rose-800 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Authentication Error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {activeTab === 'quick-roles' ? (
            /* 8 Real Roles Demonstration Grid */
            <div className="p-6 sm:p-8">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Select Role for Instant Session Sign-In
                  </h3>
                  <p className="text-xs text-slate-500">
                    Each account reflects real government authority, jurisdictional filters, and 31 granular permissions.
                  </p>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 bg-amber-100 text-amber-900 rounded font-semibold border border-amber-300">
                  SIH Evaluator Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {DEMO_USERS.map((user) => {
                  const Icon = roleIcons[user.role] || Shield;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickRoleLogin(user)}
                      className="text-left p-4 rounded-lg border border-slate-200 hover:border-indigo-500 hover:shadow-md bg-white hover:bg-slate-50/80 transition group flex flex-col justify-between h-full"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                          {user.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                          {user.designation}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 font-mono">
                          Jurisdiction: <span className="text-slate-600 font-semibold">{user.district}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                        <span>Sign In As {user.role.split('_')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Traditional Credential Login Form */
            <div className="p-6 sm:p-8 max-w-md mx-auto">
              <form onSubmit={handleStandardLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NIC Government Email ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. officer@rev.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </label>
                    <span className="text-[11px] text-indigo-600 font-mono">Demo: Password@123</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter administrative password"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>2FA Token verified automatically for test session on NIC Intranet.</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-md shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Portal'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Security Notice Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            Official Land Records Department use only. Unauthorized attempts are logged under the Information Technology Act, 2000.
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        Department of Land Resources • Ministry of Rural Development • Government of India • SIH 2026 Problem Statement 26018
      </footer>
    </div>
  );
}
