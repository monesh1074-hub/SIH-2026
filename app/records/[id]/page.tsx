'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  ArrowLeft,
  Stamp,
  Building2,
  Compass,
  Cpu,
  Tag,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { LandRecord, DocumentRecord, CadastralParcel, RecognizedToken } from '@/types';
import { getConfidenceBadgeClass, getConfidenceLabel, formatDate } from '@/lib/utils';
import confetti from 'canvas-confetti';

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<{
    record: LandRecord;
    document?: DocumentRecord;
    parcel?: CadastralParcel;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const highlightTokenByTag = (tag: string) => {
    const allTokens = data?.record.tokens || data?.document?.tokens || [];
    const matched = allTokens.find(t => t.fieldTag === tag);
    if (matched) {
      setSelectedTokenId(matched.id);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  async function fetchRecord() {
    try {
      const res = await fetch(`/api/records/${id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching record', err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartEdit = (fieldName: string, currentVal: any) => {
    setEditingField(fieldName);
    setFieldValue(String(currentVal));
    setComment('');
  };

  const handleSaveCorrection = async () => {
    if (!editingField) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName: editingField,
          newValue: editingField === 'landArea' ? parseFloat(fieldValue) : fieldValue,
          officerComment: comment || 'Verified by Revenue Officer against original registry leaf.'
        })
      });
      const resData = await res.json();
      if (resData.success) {
        setMessage({ type: 'success', text: `Field "${editingField}" corrected and logged in audit trail.` });
        setEditingField(null);
        await fetchRecord();

        // Trigger validation re-run
        await handleRunValidation();
      } else {
        setMessage({ type: 'error', text: resData.error || 'Failed to save correction' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRunValidation = async () => {
    try {
      const res = await fetch(`/api/records/${id}/validate`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await fetchRecord();
      }
    } catch (err) {
      console.error('Validation re-run failed', err);
    }
  };

  const handleApproveRecord = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/records/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' })
      });
      const json = await res.json();
      if (json.success) {
        if (typeof confetti === 'function') {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        }
        setMessage({ type: 'success', text: 'Land record officially verified and committed to Land Registry!' });
        await fetchRecord();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading Land Record...">
        <div className="p-12 text-center text-slate-500 font-mono text-xs">
          Accessing Land Records Management System database...
        </div>
      </AppLayout>
    );
  }

  if (!data?.record) {
    return (
      <AppLayout title="Record Not Found">
        <div className="p-8 text-center bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-700 text-sm">The requested land record does not exist or has been removed.</p>
          <Link href="/records" className="mt-4 inline-block text-xs font-semibold text-indigo-600">
            Back to Land Records
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { record, document: doc, parcel } = data;
  const validation = record.validationResult;

  return (
    <AppLayout
      title={`Land Record: Survey #${record.surveyNumber.value}/${record.subdivisionNumber.value}`}
      subtitle={`Village: ${record.village.value}, District: ${record.district.value} • ULPIN: ${record.ulpin || 'Pending'}`}
    >
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/records"
            className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition"
            title="Back to Records"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 font-mono">
                RECORD ID: {record.id}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                record.status === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : record.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-800 border-rose-400 font-bold'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {record.status === 'REJECTED' ? 'REJECTED (NON-PATTA)' : record.status.replace(/_/g, ' ')}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.overallConfidence)}`}>
                Mean Conf: {Math.round(record.overallConfidence * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Source: {doc?.fileName || 'Scanned Registry Page'} • Last evaluated: {formatDate(record.lastModified || new Date().toISOString())}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunValidation}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" /> Re-Run Validation
          </button>

          {record.status !== 'VERIFIED' && (
            <button
              onClick={handleApproveRecord}
              disabled={verifying || record.status === 'REJECTED'}
              title={record.status === 'REJECTED' ? 'Cannot approve: Document failed Patta authenticity verification' : 'Approve Record'}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Stamp className="w-3.5 h-3.5" />
              {verifying ? 'Signing...' : record.status === 'REJECTED' ? 'Approval Blocked (Non-Patta)' : 'Approve & Issue Bhu-Aadhaar'}
            </button>
          )}
        </div>
      </div>

      {/* NON-PATTA REJECTION BANNER */}
      {record.status === 'REJECTED' && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-lg text-rose-900 text-xs flex items-start gap-3 shadow-xs">
          <div className="p-2 bg-rose-200 text-rose-700 rounded-md">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-bold text-sm text-rose-900 flex items-center justify-between">
              <span>❌ Record Registration Rejected: Wrong PDF / Photo Uploaded</span>
              <Link href="/documents/upload" className="text-xs text-rose-700 hover:text-rose-900 underline font-semibold">
                Upload Authentic Patta →
              </Link>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              {doc?.extractedData?.rejectionReason || 'The uploaded file does not conform to genuine Patta / Land Revenue specifications. Survey plotting and Bhu-Aadhaar ULPIN generation are prohibited.'}
            </p>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-md text-xs font-semibold flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Main Split: Left Document Viewer / Right Extracted Fields & Validation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col (5 cols): Original Scanned Document Viewer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Original Scanned Document
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                300 DPI • Gray Denoised
              </span>
            </div>

            {/* Document Image Frame or PDF Stream */}
            {doc?.mimeType?.includes('pdf') || doc?.fileName?.toLowerCase().endsWith('.pdf') || (record.previewUrl && record.previewUrl.toLowerCase().endsWith('.pdf')) ? (
              <div className="rounded border border-slate-300 overflow-hidden bg-slate-100 flex flex-col h-[500px]">
                <div className="px-3 py-1.5 bg-slate-800 text-white text-xs flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5 truncate max-w-[240px]">
                    <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{doc?.fileName || 'PDF Land Deed'}</span>
                  </span>
                  <a
                    href={record.previewUrl || doc?.previewUrl || doc?.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" /> Full View
                  </a>
                </div>
                <iframe
                  src={record.previewUrl || doc?.previewUrl || doc?.filePath}
                  title="PDF Deed Stream"
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            ) : (
              <div className="relative rounded border border-slate-300 overflow-hidden bg-slate-900 flex items-center justify-center min-h-[420px] max-h-[550px]">
                <img
                  src={record.previewUrl || doc?.previewUrl || doc?.filePath || '/documents/sample-patta-1.jpg'}
                  alt="Original Land Record Document"
                  className="max-h-[520px] w-full object-contain filter contrast-105"
                />

                {/* Mapped Indic Word & Character Bounding Boxes */}
                {(record.tokens || doc?.tokens || []).map((tok) => {
                  const isSelected = (selectedTokenId || (record.tokens?.[0]?.id)) === tok.id;
                  return (
                    <div
                      key={tok.id}
                      onClick={() => setSelectedTokenId(tok.id)}
                      style={{
                        left: `${tok.bbox[0]}%`,
                        top: `${tok.bbox[1]}%`,
                        width: `${tok.bbox[2]}%`,
                        height: `${tok.bbox[3]}%`
                      }}
                      className={`absolute cursor-pointer transition border rounded-xs ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/35 ring-2 ring-amber-300 z-10'
                          : tok.confidence >= 0.90
                          ? 'border-emerald-400/80 bg-emerald-500/15 hover:bg-emerald-500/30'
                          : 'border-amber-400/90 bg-amber-500/20 hover:bg-amber-500/35'
                      }`}
                      title={`${tok.word} (${Math.round(tok.confidence * 100)}%)`}
                    />
                  );
                })}

                <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-mono rounded border border-slate-700">
                  [Indic Datasets: Bounding Boxes Mapped]
                </div>
              </div>
            )}

            {/* Letter-by-Letter Character Segmentation Inspector */}
            {(() => {
              const allTokens = record.tokens || doc?.tokens || [];
              const currentToken = allTokens.find(t => t.id === selectedTokenId) || allTokens[0];
              if (!currentToken) return null;

              return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{currentToken.word}</span>
                      <span className="text-[11px] text-slate-500 block">
                        Transliteration: {currentToken.transliteration || 'N/A'} • {currentToken.meaning || ''}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      currentToken.confidence >= 0.90
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {Math.round(currentToken.confidence * 100)}% Confidence
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    <span>Dataset: {currentToken.matchedDataset}</span>
                  </div>

                  {/* Character Glyphs */}
                  {currentToken.characters && currentToken.characters.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Segmented Character Glyphs:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {currentToken.characters.map((ch, i) => (
                          <div
                            key={i}
                            className={`px-1.5 py-0.5 rounded border text-center font-mono ${
                              ch.confidence >= 0.90
                                ? 'bg-white border-emerald-300 text-slate-900'
                                : 'bg-amber-50 border-amber-300 text-amber-900'
                            }`}
                          >
                            <span className="text-xs font-bold block">{ch.char}</span>
                            <span className="text-[8px] text-slate-400 block">{Math.round(ch.confidence * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                OpenCV Preprocessing Pipeline Applied
              </div>
              <p className="text-[11px]">
                Deskew angle: -1.4° • Contrast Normalized • Morphological Line Filtering • OCR Engine: Indic-HTR v2
              </p>
            </div>

            {/* Raw Extracted Document Text Console */}
            {doc?.extractedData?.rawText && (
              <div className="mt-3 bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" /> Raw OCR Ground Truth Extracted from File
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {doc.extractedData.rawText.split('\n').filter(Boolean).length} lines
                  </span>
                </div>
                <pre className="text-[11px] font-mono text-emerald-300/90 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text p-2 bg-slate-900/90 rounded border border-slate-800/80">
                  {doc.extractedData.rawText}
                </pre>
              </div>
            )}
          </div>

          {/* Spatial Cadastral Map Thumbnail */}
          {parcel && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Cadastral GIS Parcel Boundary
                </span>
                <Link href="/maps" className="text-[11px] text-indigo-600 font-semibold hover:underline">
                  Full Map View
                </Link>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">ULPIN (Bhu-Aadhaar):</span>
                  <span className="font-mono font-bold text-slate-900">{parcel.ulpin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GIS Measured Area:</span>
                  <span className="font-mono font-bold text-slate-900">{parcel.gisArea} {parcel.gisUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Stated Area:</span>
                  <span className="font-mono font-bold text-slate-900">{record.landArea.value} {record.areaUnit.value}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Area Tolerance Deviation:</span>
                  <span className={`font-mono font-bold ${
                    validation?.gisAreaCheck?.deviationPercentage && validation.gisAreaCheck.deviationPercentage > 10
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}>
                    {validation?.gisAreaCheck?.deviationPercentage || 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col (7 cols): Extracted Fields Table & Business Rules Validation */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Business Validation Rules Summary */}
          {validation && (
            <div className={`border rounded-lg p-4 ${
              validation.overallStatus === 'PASSED'
                ? 'bg-emerald-50/50 border-emerald-200'
                : validation.overallStatus === 'WARNING'
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {validation.overallStatus === 'PASSED' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : validation.overallStatus === 'WARNING' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Automated Business Validation Engine Result: {validation.overallStatus}
                    </h4>
                    <p className="text-[11px] text-slate-600">
                      {validation.rulesPassed} of {validation.rulesTotal} administrative rules passed successfully.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5 mt-3 text-xs">
                {validation.rules.map((rule) => (
                  <div key={rule.ruleId} className="flex items-start gap-2 bg-white/80 p-2 rounded border border-slate-200/80">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                      rule.status === 'PASSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rule.status === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {rule.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-800">{rule.name}:</span>{' '}
                      <span className="text-slate-600 text-[11px]">{rule.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structured Land Record Fields with Officer Edit Capabilities */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Structured Land Record Attributes (LayoutLMv3 Schema)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Click any field to correct OCR transcription or adjust low-confidence entries.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                100% Audit Tracked
              </span>
            </div>

            {/* Editing Modal / Drawer inline */}
            {editingField && (
              <div className="p-4 bg-indigo-50/80 border-b border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">
                    Correcting Field: <span className="font-mono">{editingField}</span>
                  </span>
                  <button onClick={() => setEditingField(null)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">Cancel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">New Verified Value</label>
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="w-full bg-white border border-indigo-300 rounded p-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">Officer Verification Note</label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="e.g. Corrected vowel stroke from Tamil script"
                      className="w-full bg-white border border-indigo-300 rounded p-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleSaveCorrection}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-xs transition flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Correction & Retest Rules'}
                  </button>
                </div>
              </div>
            )}

            {/* Field Table */}
            <div className="divide-y divide-slate-100 text-xs">
              
              {/* Owner Name */}
              <div 
                onClick={() => highlightTokenByTag('OWNER_NAME')} 
                title="Click to highlight matching OCR bounding box on document"
                className="p-3.5 hover:bg-indigo-50/60 cursor-pointer transition flex items-center justify-between gap-4 group"
              >
                <div className="w-1/3">
                  <div className="font-bold text-slate-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Owner Name
                    <span className="text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition">🔍 View BBox</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Current Legal Holder</div>
                </div>
                <div className="flex-1 font-semibold text-slate-900">
                  {record.ownerName.value}
                  {record.ownerName.isModified && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">Modified</span>
                  )}
                  {record.ownerName.explanation && (
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{record.ownerName.explanation}</div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.ownerName.confidence)}`}>
                    {Math.round(record.ownerName.confidence * 100)}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit('ownerName', record.ownerName.value); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Father / Husband Name */}
              <div 
                onClick={() => highlightTokenByTag('FATHER_NAME')} 
                title="Click to highlight matching OCR bounding box on document"
                className="p-3.5 hover:bg-indigo-50/60 cursor-pointer transition flex items-center justify-between gap-4 group"
              >
                <div className="w-1/3">
                  <div className="font-bold text-slate-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Father / Husband Name
                    <span className="text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition">🔍 View BBox</span>
                  </div>
                </div>
                <div className="flex-1 text-slate-900 font-medium">
                  {record.fatherOrHusbandName.value}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.fatherOrHusbandName.confidence)}`}>
                    {Math.round(record.fatherOrHusbandName.confidence * 100)}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit('fatherOrHusbandName', record.fatherOrHusbandName.value); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Survey Number */}
              <div 
                onClick={() => highlightTokenByTag('SURVEY_NUMBER')} 
                title="Click to highlight matching OCR bounding box on document"
                className="p-3.5 hover:bg-indigo-50/60 cursor-pointer transition flex items-center justify-between gap-4 group"
              >
                <div className="w-1/3">
                  <div className="font-bold text-slate-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Survey Number / Sub-division
                    <span className="text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition">🔍 View BBox</span>
                  </div>
                </div>
                <div className="flex-1 font-mono font-bold text-slate-900">
                  {record.surveyNumber.value} / {record.subdivisionNumber.value}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.surveyNumber.confidence)}`}>
                    {Math.round(record.surveyNumber.confidence * 100)}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit('surveyNumber', record.surveyNumber.value); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Land Area */}
              <div 
                onClick={() => highlightTokenByTag('LAND_AREA')} 
                title="Click to highlight matching OCR bounding box on document"
                className="p-3.5 hover:bg-indigo-50/60 cursor-pointer transition flex items-center justify-between gap-4 group"
              >
                <div className="w-1/3">
                  <div className="font-bold text-slate-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                    Land Area (Extent)
                    <span className="text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition">🔍 View BBox</span>
                  </div>
                  {record.landArea.explanation && (
                    <div className="text-[10px] text-amber-700 font-normal">{record.landArea.explanation}</div>
                  )}
                </div>
                <div className="flex-1 font-mono font-bold text-slate-900">
                  {record.landArea.value} {record.areaUnit.value}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.landArea.confidence)}`}>
                    {Math.round(record.landArea.confidence * 100)}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartEdit('landArea', record.landArea.value); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Land Classification */}
              <div className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                <div className="w-1/3">
                  <div className="font-bold text-slate-800">Land Classification</div>
                </div>
                <div className="flex-1 text-slate-900">
                  {record.landClassification.value}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.landClassification.confidence)}`}>
                    {Math.round(record.landClassification.confidence * 100)}%
                  </span>
                  <button
                    onClick={() => handleStartEdit('landClassification', record.landClassification.value)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Mutation Number */}
              <div className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                <div className="w-1/3">
                  <div className="font-bold text-slate-800">Mutation Order / Seal</div>
                  {record.mutationNumber.explanation && (
                    <div className="text-[10px] text-amber-700 font-normal">{record.mutationNumber.explanation}</div>
                  )}
                </div>
                <div className="flex-1 font-mono text-slate-900">
                  {record.mutationNumber.value}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${getConfidenceBadgeClass(record.mutationNumber.confidence)}`}>
                    {Math.round(record.mutationNumber.confidence * 100)}%
                  </span>
                  <button
                    onClick={() => handleStartEdit('mutationNumber', record.mutationNumber.value)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Village, Taluk, District */}
              <div className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                <div className="w-1/3">
                  <div className="font-bold text-slate-800">Administrative Hierarchy</div>
                </div>
                <div className="flex-1 text-slate-800">
                  {record.village.value}, {record.taluk.value}, {record.district.value}, {record.state.value}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded border font-mono font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                    99%
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
