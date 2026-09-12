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
import { hasPermission } from '@/lib/auth';

interface SidebarProps {
  currentUser?: any;
  onSwitchUser?: (userId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser = DEMO_USERS[0],
  onSwitchUser,
  isOpen = false,
  onClose
}) => {
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

  const visibleNavItems = navItems.filter(
    item => !item.permission || hasPermission(currentUser, item.permission as any)
  );

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 text-slate-300 z-50',
          'fixed inset-y-0 left-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:z-auto h-full min-h-screen',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Government Department Emblem Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-md flex-shrink-0 bg-slate-950 flex items-center justify-center ring-2 ring-amber-500/30">
                <img
                  src="/logo.png"
                  alt="ILRDVS National Emblem"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-400 tracking-wider uppercase font-mono leading-tight">DoLR • Govt of India</div>
                <div className="text-sm font-bold text-white tracking-tight">ILRDVS Portal</div>
                <div className="text-[10px] text-slate-400 font-mono">SIH 2026 • PS 26018</div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
                title="Close Navigation"
              >
                <span className="text-lg font-bold leading-none">&times;</span>
              </button>
            )}
          </div>

          <div className="mt-3 text-[11px] px-2.5 py-1 bg-amber-950/40 border border-amber-800/60 rounded text-amber-300 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>DEMO REVENUE ENVIRONMENT</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-400 px-3 mb-2 uppercase tracking-wider">Administration</div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
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
    </>
  );
};
