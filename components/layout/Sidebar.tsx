'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  MapPin,
  BarChart3,
  History,
  ShieldCheck,
  Settings,
  Users,
  KeyRound,
  Bell,
  User,
  Landmark,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_USERS } from '@/lib/mock-data';

interface SidebarProps {
  currentUser?: any;
  onSwitchUser?: (userId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser = DEMO_USERS[0], onSwitchUser }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Documents', href: '/documents/upload', icon: FileText, badge: '31', permission: 'DOCUMENT_VIEW' },
    { name: 'Land Records', href: '/records', icon: FileSpreadsheet, permission: 'RECORD_VIEW' },
    { name: 'Verification Queue', href: '/verification', icon: CheckSquare, badge: '3', badgeColor: 'bg-amber-100 text-amber-800', permission: 'VERIFICATION_VIEW' },
    { name: 'Cadastral GIS Map', href: '/gis', icon: MapPin, permission: 'GIS_VIEW' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, permission: 'ANALYTICS_VIEW' },
    { name: 'Users', href: '/users', icon: Users, permission: 'USER_VIEW' },
    { name: 'Roles & Permissions', href: '/roles', icon: KeyRound, permission: 'ROLE_VIEW' },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Audit Trail', href: '/audit', icon: History, permission: 'AUDIT_VIEW' },
    { name: 'Settings', href: '/settings', icon: Settings, permission: 'SYSTEM_SETTINGS' },
  ];

  const userPerms: string[] = currentUser?.permissions || [];
  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const visibleNavItems = navItems.filter(
    item => !item.permission || isSuper || userPerms.includes(item.permission)
  );

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-screen text-slate-300">
      {/* Government Department Emblem Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 via-orange-500 to-emerald-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 tracking-wider uppercase font-mono">DoLR • Govt of India</div>
            <div className="text-sm font-semibold text-white leading-tight">ILRDVS Portal</div>
            <div className="text-[10px] text-slate-400">SIH 2026 • PS ID: 26018</div>
          </div>
        </div>
        <div className="mt-3 text-[11px] px-2.5 py-1 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>DEMO REVENUE ENVIRONMENT</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[10px] font-semibold text-slate-400 px-3 mb-2 uppercase tracking-wider">Administration</div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white font-semibold border-l-4 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-slate-500')} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono font-bold', item.badgeColor || 'bg-slate-800 text-slate-300')}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role Switcher & User Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Active Role Session</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
            {currentUser?.role?.replace('_', ' ')}
          </span>
        </div>

        {/* Quick Role Switcher for Hackathon Demonstrators */}
        {onSwitchUser && (
          <div>
            <select
              value={currentUser?.id || DEMO_USERS[0].id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {DEMO_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.role.replace('_', ' ')}: {u.name.split(',')[0].slice(0, 20)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
          <span className="truncate">Jurisdiction:</span>
          <span className="text-slate-200 font-bold truncate max-w-[120px]">{currentUser?.district || 'Tamil Nadu'}</span>
        </div>
      </div>
    </aside>
  );
};
