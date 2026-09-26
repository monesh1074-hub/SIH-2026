'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  CheckSquare,
  AlertTriangle,
  FileText,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { LandRecord } from '@/types';
import { getConfidenceBadgeClass, formatDate } from '@/lib/utils';

export default function VerificationQueuePage() {
  const [records, setRecords] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    try {
      const res = await fetch('/api/records?status=REQUIRES_VERIFICATION');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error('Failed to load verification queue', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout
      title="Human-in-the-Loop (HITL) Verification Queue"
      subtitle="Administrative triage for records flagged with low optical confidence or business validation rule conflicts"
      requiredPermission="VERIFICATION_VIEW"
    >
      {/* Informative Guidance Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-amber-950">Statutory Land Administration Principle: Zero Blind-AI Approvals</div>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            Historical land records involve property rights, succession deeds, and civil titles. Any extracted field with confidence &lt; 90%, faded paper creases, or boundary tolerance warnings is automatically routed to this queue for manual officer confirmation.
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Pending Verification Items ({records.length})
            </h3>
            <p className="text-[11px] text-slate-500">Ordered by risk priority and optical confidence</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold">
            Action Required
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {records.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-slate-800">Queue Cleared!</div>
              <p className="text-[11px]">All submitted land records have been verified or validated.</p>
            </div>
          ) : (
            records.map((rec) => (
              <div key={rec.id} className="p-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      Survey #{rec.surveyNumber.value}/{rec.subdivisionNumber.value}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono">
                      ULPIN: {rec.ulpin || 'Pending'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(rec.overallConfidence)}`}>
                      Mean: {Math.round(rec.overallConfidence * 100)}%
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800">
                    Owner: <span className="text-slate-900">{rec.ownerName.value}</span> • Extent: {rec.landArea.value} {rec.areaUnit.value}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Location: {rec.village.value}, {rec.taluk.value}, {rec.district.value}, {rec.state.value}
                  </div>

                  {rec.validationResult?.rules && (
                    <div className="space-y-1 pt-1">
                      {rec.validationResult.rules.filter(r => r.status !== 'PASSED').map((rule) => (
                        <div key={rule.ruleId} className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span className="font-semibold">{rule.name}:</span>
                          <span>{rule.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/records/${rec.id}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    Open Verification Workbench <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
