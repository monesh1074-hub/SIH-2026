'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  UploadCloud,
  FileText,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  Zap,
  Cpu,
  Plus
} from 'lucide-react';
import { DocumentRecord, DocumentType, RecognizedToken } from '@/types';
import { MASTER_STATES, MASTER_LOCATIONS } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';

const PRESET_DOCUMENTS = [
  {
    name: 'Tamil Nadu Vintage Patta (1988)',
    fileName: 'Kovilur_Patta_1988_Survey145.jpg',
    previewUrl: '/documents/sample-patta-1.jpg',
    documentType: 'Patta' as DocumentType,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    dataset: 'c3rl/IIIT-INDIC-HW-WORDS-Tamil',
    description: 'Vintage cursive Tamil handwritten title deed with historical ink degradation.'
  },
  {
    name: 'UP Jamabandi Khasra (1994)',
    fileName: 'Varanasi_Khasra_248_1B_1994.jpg',
    previewUrl: '/documents/sample-khasra-1.jpg',
    documentType: 'Historical register' as DocumentType,
    language: 'Hindi',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    taluk: 'Sadar',
    village: 'Shivpur',
    dataset: 'c3rl/IIIT-INDIC-HW-WORDS-Hindi',
    description: 'Devanagari revenue register with column-wise Khasra survey metrics.'
  },
  {
    name: 'Maharashtra Satbara 7/12 Extract',
    fileName: 'Pune_Haveli_Satbara_7_12.jpg',
    previewUrl: '/documents/sample-satbara-1.jpg',
    documentType: 'Land ownership register' as DocumentType,
    language: 'Marathi',
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village: 'Wagholi',
    dataset: 'darknight054/indic-mozhi-ocr',
    description: 'Standard 7/12 land rights extract with Modi/Devanagari typography.'
  },
  {
    name: 'Bengal Khatian & RoR Register',
    fileName: 'Bengal_Arambagh_Khatian_412.jpg',
    previewUrl: '/documents/sample-patta-1.jpg',
    documentType: 'Land ownership register' as DocumentType,
    language: 'Bengali',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    dataset: 'Nayana-cognitivelab/NayanaDocs-Indic-45k-webdataset',
    description: 'Multi-region Bengali land document evaluated against WebDataset layout models.'
  }
];

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);

  // Upload Form State
  const [fileName, setFileName] = useState('');
  const [docType, setDocType] = useState<DocumentType>('Patta');
  const [language, setLanguage] = useState('Tamil');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('Madurai');
  const [taluk, setTaluk] = useState('Madurai North');
  const [village, setVillage] = useState('Kovilur');
  const [previewUrl, setPreviewUrl] = useState<string>('/documents/sample-patta-1.jpg');
  const [fileSizeText, setFileSizeText] = useState<string>('1.84 MB');

  // Filter state
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Post-processing Recognition Result state
  const [lastProcessedDoc, setLastProcessedDoc] = useState<{
    document: DocumentRecord;
    tokens?: RecognizedToken[];
    recordId?: string;
  } | null>(null);
  const [activeToken, setActiveToken] = useState<RecognizedToken | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle cascading location dropdowns
  const availableDistricts = MASTER_LOCATIONS[state]?.districts ? Object.keys(MASTER_LOCATIONS[state].districts) : [];
  const availableTaluks = (district && MASTER_LOCATIONS[state]?.districts[district]?.taluks)
    ? Object.keys(MASTER_LOCATIONS[state].districts[district].taluks)
    : [];
  const availableVillages = (taluk && district && MASTER_LOCATIONS[state]?.districts[district]?.taluks[taluk])
    ? MASTER_LOCATIONS[state].districts[district].taluks[taluk]
    : [];

  const handleSelectPreset = (preset: typeof PRESET_DOCUMENTS[0]) => {
    setFileName(preset.fileName);
    setDocType(preset.documentType);
    setLanguage(preset.language);
    setState(preset.state);
    setDistrict(preset.district);
    setTaluk(preset.taluk);
    setVillage(preset.village);
    setPreviewUrl(preset.previewUrl);
    setFileSizeText('1.85 MB');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSizeText(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName.endsWith('.jpg') || fileName.endsWith('.pdf') || fileName.endsWith('.png') ? fileName : `${fileName}.jpg`,
          documentType: docType,
          language,
          state,
          district,
          taluk,
          village,
          previewUrl: previewUrl || '/documents/sample-patta-1.jpg',
          fileSize: 1850000
        })
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        await fetchDocuments();
        await handleRunProcessing(data.data.id);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRunProcessing = async (docId: string) => {
    setProcessingId(docId);
    setProcessingStepIndex(0);

    const stepTimer1 = setTimeout(() => setProcessingStepIndex(1), 300);
    const stepTimer2 = setTimeout(() => setProcessingStepIndex(2), 700);
    const stepTimer3 = setTimeout(() => setProcessingStepIndex(3), 1200);

    try {
      const res = await fetch(`/api/documents/${docId}/process`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
        const doc = data.data.document;
        const rec = data.data.record;

        setLastProcessedDoc({
          document: doc,
          tokens: doc.tokens || rec.tokens,
          recordId: rec?.id
        });
        if (doc.tokens?.length > 0) {
          setActiveToken(doc.tokens[0]);
        }
      }
    } catch (err) {
      console.error('Processing failed', err);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setProcessingId(null);
    }
  };

  const filteredDocs = documents.filter(doc => {
    if (filterType !== 'ALL' && doc.documentType !== filterType) return false;
    if (filterStatus !== 'ALL' && doc.status !== filterStatus) return false;
    return true;
  });

  return (
    <AppLayout
      title="Document Repository & Digitization Ingestion Suite"
      subtitle="Upload legacy land registers, execute character-level Indic OCR/HTR, and extract structured revenue attributes"
    >
      <div className="space-y-6">

        {/* Action Header Banner */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Land Record Ingestion Pipeline</h2>
              <p className="text-xs text-slate-500">
                Supports PDF, JPG, PNG scanned deeds, Jamabandi Khasra, and Patta registers with OpenCV deskewing and Indic HTR.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/documents/upload"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Full Ingestion Page</span>
            </Link>
          </div>
        </div>

        {/* Main Grid: Upload Panel (Left 5 cols) + Results / Registry (Right 7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (5 Cols): Upload Form & File Dropzone */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Upload Land Document</h3>
                    <p className="text-[11px] text-slate-500">Attach scanned deed or select archival preset</p>
                  </div>
                </div>
              </div>

              {/* Quick Sample Presets */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 font-mono">
                  1-Click Archival Sample Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_DOCUMENTS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-2 rounded border text-[11px] transition ${
                        fileName === preset.fileName
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="truncate font-semibold">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{preset.language}</div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleUploadAndProcess} className="space-y-3.5 text-xs">
                {/* Drag & Drop Zone */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scanned Document File *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.tiff"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-3 text-center cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition"
                  >
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-medium">
                      <UploadCloud className="w-4 h-4" />
                      <span>Click to select file or drop image here</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Supports JPG, PNG, PDF, TIFF (300+ DPI recommended)
                    </span>
                  </div>
                </div>

                {/* Selected File Preview */}
                {previewUrl && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-3">
                    <img
                      src={previewUrl}
                      alt="Uploaded Preview"
                      className="w-14 h-14 object-cover rounded border border-slate-300 bg-white"
                    />
                    <div className="min-w-0 flex-1 text-[11px]">
                      <div className="font-bold text-slate-900 truncate">{fileName || 'Sample_Document.jpg'}</div>
                      <div className="text-slate-500">{fileSizeText} • 300 DPI Pre-verified</div>
                      <div className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ready for Character & Letter Recognition
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Type & Language */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Document Type *</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocumentType)}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                    >
                      <option value="Patta">Patta (Title Deed)</option>
                      <option value="Chitta">Chitta (Register of Holdings)</option>
                      <option value="Adangal">Adangal (Crop & Tenancy)</option>
                      <option value="Historical register">Historical Khasra Register</option>
                      <option value="Land ownership register">7/12 Satbara Extract</option>
                      <option value="Sale deed">Sale deed</option>
                      <option value="Mutation record">Mutation record</option>
                      <option value="Survey record">Survey record</option>
                      <option value="Cadastral document">Cadastral document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Script & Language *</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-800"
                    >
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="Hindi">Hindi (हिन्दी / Devanagari)</option>
                      <option value="Marathi">Marathi (मराठी)</option>
                      <option value="Bengali">Bengali (বাংলা)</option>
                      <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                      <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                      <option value="Telugu">Telugu (తెలుగు)</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                </div>

                {/* Geographical Hierarchy */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Location Hierarchy</span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-600 mb-0.5">State</label>
                      <select
                        value={state}
                        onChange={(e) => {
                          setState(e.target.value);
                          const newDists = Object.keys(MASTER_LOCATIONS[e.target.value]?.districts || {});
                          if (newDists.length > 0) {
                            setDistrict(newDists[0]);
                            const newTaluks = Object.keys(MASTER_LOCATIONS[e.target.value].districts[newDists[0]].taluks);
                            setTaluk(newTaluks[0] || '');
                            setVillage(MASTER_LOCATIONS[e.target.value].districts[newDists[0]].taluks[newTaluks[0]]?.[0] || '');
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
                      >
                        {MASTER_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-600 mb-0.5">District</label>
                      <select
                        value={district}
                        onChange={(e) => {
                          setDistrict(e.target.value);
                          const newTaluks = Object.keys(MASTER_LOCATIONS[state]?.districts[e.target.value]?.taluks || {});
                          setTaluk(newTaluks[0] || '');
                          setVillage(MASTER_LOCATIONS[state]?.districts[e.target.value]?.taluks[newTaluks[0]]?.[0] || '');
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
                      >
                        {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-slate-600 mb-0.5">Taluk / Tehsil</label>
                      <select
                        value={taluk}
                        onChange={(e) => {
                          setTaluk(e.target.value);
                          setVillage(MASTER_LOCATIONS[state]?.districts[district]?.taluks[e.target.value]?.[0] || '');
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
                      >
                        {availableTaluks.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-600 mb-0.5">Village</label>
                      <select
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
                      >
                        {availableVillages.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading || !!processingId}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded shadow-xs transition flex items-center justify-center gap-2"
                >
                  {uploading || processingId ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Executing Indic Recognition Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Submit & Execute Indic AI Pipeline</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Pipeline Step Progress */}
            {processingId && (
              <div className="bg-indigo-950 text-white border border-indigo-800 rounded-lg p-4 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                    Pipeline Executing
                  </span>
                  <span className="text-[10px] text-indigo-300">Phase {processingStepIndex + 1} of 4</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className={`flex items-center gap-2 ${processingStepIndex >= 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> 1. OpenCV Preprocessing (Deskewing & Contrast Normalization)
                  </div>
                  <div className={`flex items-center gap-2 ${processingStepIndex >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> 2. Indic Multilingual Character & Letter Recognition ({language})
                  </div>
                  <div className={`flex items-center gap-2 ${processingStepIndex >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> 3. LayoutLMv3 Spatial Token & Bounding Box Extraction
                  </div>
                  <div className={`flex items-center gap-2 ${processingStepIndex >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> 4. Business Validation Engine & ULPIN Assignment
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (7 Cols): RECOGNIZED LETTERS & EXTRACTED DATA VIEW */}
          <div className="lg:col-span-7 space-y-5">
            {lastProcessedDoc && lastProcessedDoc.tokens && lastProcessedDoc.tokens.length > 0 ? (
              <div className="bg-white border-2 border-indigo-500 rounded-lg shadow-sm p-5 space-y-4">
                {/* Result Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Letters & Data Recognized via Indic Engine
                      </h3>
                      <p className="text-xs text-slate-500">
                        Processed: {lastProcessedDoc.document.fileName} • {lastProcessedDoc.tokens.length} Text Regions Mapped
                      </p>
                    </div>
                  </div>

                  {lastProcessedDoc.recordId && (
                    <Link
                      href={`/records/${lastProcessedDoc.recordId}`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <span>Open Full Master Record</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>

                {/* Document Bounding Boxes & Token Character Segmentation */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                  {/* Document Visual with Bounding Box Overlays (5 Cols) */}
                  <div className="md:col-span-5 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block">
                      Spatial Layout & Bounding Boxes
                    </span>

                    <div className="relative rounded border border-slate-300 overflow-hidden bg-slate-900 flex items-center justify-center min-h-[300px]">
                      <img
                        src={lastProcessedDoc.document.previewUrl || lastProcessedDoc.document.filePath || '/documents/sample-patta-1.jpg'}
                        alt="Document with Bounding Boxes"
                        className="w-full object-contain filter contrast-105"
                      />

                      {/* Bounding Box Highlights */}
                      {lastProcessedDoc.tokens.map((tok) => {
                        const isSelected = activeToken?.id === tok.id;
                        return (
                          <div
                            key={tok.id}
                            onClick={() => setActiveToken(tok)}
                            style={{
                              left: `${tok.bbox[0]}%`,
                              top: `${tok.bbox[1]}%`,
                              width: `${tok.bbox[2]}%`,
                              height: `${tok.bbox[3]}%`
                            }}
                            className={`absolute cursor-pointer transition border rounded-xs ${
                              isSelected
                                ? 'border-amber-400 bg-amber-400/30 ring-2 ring-amber-300'
                                : tok.confidence >= 0.90
                                ? 'border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                                : 'border-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                            }`}
                            title={`${tok.word} (${Math.round(tok.confidence * 100)}%)`}
                          />
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-slate-400 italic">
                      Click any bounding box or list item to view character-level letter recognition breakdown.
                    </p>
                  </div>

                  {/* Character-by-Character Segmentation Inspector (7 Cols) */}
                  <div className="md:col-span-7 space-y-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block">
                      Recognized Letters & Glyphs Breakdown
                    </span>

                    {activeToken ? (
                      <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-base font-bold text-slate-900">{activeToken.word}</span>
                            <span className="text-xs text-slate-500 block">
                              Transliteration: {activeToken.transliteration || 'N/A'} • {activeToken.meaning || ''}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                            activeToken.confidence >= 0.90
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {Math.round(activeToken.confidence * 100)}% Confidence
                          </span>
                        </div>

                        {/* Model & Dataset Attribution */}
                        <div className="text-[11px] flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 font-mono">
                          <Cpu className="w-3.5 h-3.5" />
                          <span>Matched Model: {activeToken.matchedDataset}</span>
                        </div>

                        {/* Letter-by-Letter Character Chips */}
                        {activeToken.characters && activeToken.characters.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                              Individual Character Glyphs ({activeToken.characters.length} characters):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeToken.characters.map((ch, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2 py-1 rounded border text-center font-mono ${
                                    ch.confidence >= 0.90
                                      ? 'bg-white border-emerald-300 text-slate-900'
                                      : 'bg-amber-50 border-amber-300 text-amber-900'
                                  }`}
                                >
                                  <span className="text-sm font-bold block">{ch.char}</span>
                                  <span className="text-[9px] text-slate-400 block">{Math.round(ch.confidence * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                        Select a word token below to view letter-by-letter glyph recognition.
                      </div>
                    )}

                    {/* All Detected Words List */}
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {lastProcessedDoc.tokens.map((tok) => (
                        <div
                          key={tok.id}
                          onClick={() => setActiveToken(tok)}
                          className={`p-2 rounded border cursor-pointer flex items-center justify-between text-xs transition ${
                            activeToken?.id === tok.id
                              ? 'bg-indigo-50 border-indigo-300 shadow-2xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900">{tok.word}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">[{tok.fieldTag}]</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                              {tok.matchedDataset.split('/')[1] || tok.matchedDataset}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              tok.confidence >= 0.90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {Math.round(tok.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Ingested Documents Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Ingested Land Record Documents ({documents.length})
                  </h3>
                  <p className="text-xs text-slate-500">Pipeline states: Ingestion → Preprocessing → OCR → Validation</p>
                </div>

                {/* Quick Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="VERIFICATION_REQUIRED">Verification Required</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="PROCESSING">Processing</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-100 flex-1 overflow-x-auto">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs font-mono truncate max-w-xs">
                          {doc.fileName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium">
                          {doc.documentType}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-medium">
                          {doc.language}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Location: {doc.village}, {doc.taluk}, {doc.district}, {doc.state} • Uploaded {formatDate(doc.uploadedAt)}
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">Status:</span>
                        {doc.status === 'VERIFIED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Digitized & Verified
                          </span>
                        )}
                        {doc.status === 'VERIFICATION_REQUIRED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            <Clock className="w-3 h-3" /> Verification Required
                          </span>
                        )}
                        {doc.status === 'PROCESSING' && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold animate-pulse">
                            <Sparkles className="w-3 h-3" /> Processing Pipeline...
                          </span>
                        )}
                        {doc.status === 'UPLOADED' && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 font-semibold">
                            Pending OCR
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.recordId ? (
                        <Link
                          href={`/records/${doc.recordId}`}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold flex items-center gap-1 transition"
                        >
                          Inspect Record <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleRunProcessing(doc.id)}
                          disabled={processingId === doc.id}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                        >
                          <Play className="w-3 h-3" /> {processingId === doc.id ? 'Running AI...' : 'Run Pipeline'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
