'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Shield, HelpCircle, CheckCircle2, User as UserIcon, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Land Record Modernization & Validation System',
  subtitle = 'Ministry of Rural Development • Department of Land Resources',
  onToggleSidebar
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const { currentUser } = useAuth();

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
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center min-w-0 mr-2">
        {/* Mobile Hamburger Menu Button */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            type="button"
            className="lg:hidden p-2 -ml-1 mr-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition flex-shrink-0"
            title="Open Menu"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="truncate">{title}</span>
            <span className="hidden sm:inline-block text-[10px] font-normal px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-mono flex-shrink-0">
              DILRMP Compliant
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-500 truncate hidden xs:block">{subtitle}</p>
        </div>
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
