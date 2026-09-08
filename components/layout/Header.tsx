'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Shield, HelpCircle, CheckCircle2, User as UserIcon, LogOut } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Land Record Modernization & Validation System',
  subtitle = 'Ministry of Rural Development • Department of Land Resources'
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchSession();
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
      }
    } catch {
      // ignore
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/records?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
          {title}
          <span className="text-[10px] font-normal px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-mono">
            DILRMP Compliant
          </span>
        </h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Survey No, Khasra, Owner, ULPIN..."
            className="w-72 bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </form>

        {/* System Status Indicators */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-[11px] font-medium text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>OCR & Validation: Active</span>
        </div>

        {/* Notifications Icon Button */}
        <Link
          href="/notifications"
          title="System Notifications"
          className="relative p-2 rounded-md hover:bg-slate-100 text-slate-600 transition"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          )}
        </Link>

        {/* Profile Link */}
        <Link
          href="/profile"
          title="User Profile & Jurisdiction"
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 text-xs font-semibold transition"
        >
          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <span className="hidden xl:inline text-xs font-medium text-slate-700">
            {currentUser?.name?.split(' ')[0] || 'Profile'}
          </span>
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out Session"
          className="p-2 rounded-md hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
