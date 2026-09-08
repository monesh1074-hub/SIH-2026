'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { LandRecord } from '@/types';
import { getConfidenceBadgeClass } from '@/lib/utils';

function RecordsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchRecords();
  }, [query, statusFilter]);

  async function fetchRecords() {
    try {
      const url = new URL('/api/records', window.location.origin);
      if (query.trim()) url.searchParams.set('search', query.trim());
      if (statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error('Failed to load records', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Survey No, Khasra, Owner Name, ULPIN..."
            className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="REQUIRES_VERIFICATION">Requires Verification</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Land Records Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Survey / Khasra No</th>
                <th className="py-3 px-4">ULPIN (Bhu-Aadhaar)</th>
                <th className="py-3 px-4">Registered Owner</th>
                <th className="py-3 px-4">Extent (Area)</th>
                <th className="py-3 px-4">Village / District</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Validation Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {rec.surveyNumber.value}/{rec.subdivisionNumber.value}
                  </td>
                  <td className="py-3 px-4 font-mono text-indigo-700 font-semibold">
                    {rec.ulpin || <span className="text-slate-400">Pending</span>}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {rec.ownerName.value}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {rec.landArea.value} {rec.areaUnit.value}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {rec.village.value}, {rec.district.value}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(rec.overallConfidence)}`}>
                      {Math.round(rec.overallConfidence * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {rec.status === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Review Queue
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/records/${rec.id}`}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold inline-flex items-center gap-1 transition"
                    >
                      Inspect <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function RecordsListPage() {
  return (
    <AppLayout
      title="Master Land Records Registry"
      subtitle="Comprehensive digital repository of RoR (Record of Rights), Khasra, Patta, and Cadastral attributes"
    >
      <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading master records...</div>}>
        <RecordsContent />
      </Suspense>
    </AppLayout>
  );
}
