'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  UploadCloud,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Play,
  Cpu,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DocumentType } from '@/types';
import { MASTER_STATES, MASTER_LOCATIONS } from '@/lib/mock-data';

const PRESETS = [
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
    dataset: 'c3rl/IIIT-INDIC-HW-WORDS-Tamil'
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
    dataset: 'c3rl/IIIT-INDIC-HW-WORDS-Hindi'
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
    dataset: 'darknight054/indic-mozhi-ocr'
  }
];

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('Kovilur_Patta_1988_Survey145.jpg');
  const [docType, setDocType] = useState<DocumentType>('Patta');
  const [language, setLanguage] = useState('Tamil');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('Madurai');
  const [taluk, setTaluk] = useState('Madurai North');
  const [village, setVillage] = useState('Kovilur');
  const [previewUrl, setPreviewUrl] = useState<string>('/documents/sample-patta-1.jpg');
  const [fileSizeText, setFileSizeText] = useState<string>('1.84 MB');
  const [uploading, setUploading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState('c3rl/IIIT-INDIC-HW-WORDS-Tamil');

  const [autoProcess, setAutoProcess] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSizeText(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setFileName(preset.fileName);
    setDocType(preset.documentType);
    setLanguage(preset.language);
    setState(preset.state);
    setDistrict(preset.district);
    setTaluk(preset.taluk);
    setVillage(preset.village);
    setPreviewUrl(preset.previewUrl);
    setSelectedDataset(preset.dataset);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    const isPdf = fileName.toLowerCase().endsWith('.pdf') || previewUrl.startsWith('data:application/pdf');

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          documentType: docType,
          language,
          state,
          district,
          taluk,
          village,
          fileUrl: previewUrl,
          previewUrl: previewUrl,
          mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
          fileSize: fileSizeText,
          autoProcess: autoProcess
        })
      });

      const data = await res.json();
      if (data.success) {
        const docId = data.data.id;
        // Fallback: If not already processed in-flight by server
        if (autoProcess && !data.processed) {
          try {
            await fetch(`/api/documents/${docId}/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (procErr) {
            console.warn('Fallback auto-processing error:', procErr);
          }
        }
        router.push(`/documents/${docId}`);
      } else {
        alert(data.error || data.message || 'Upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Document Intake &amp; Ingestion Terminal"
          subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
        />

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <Link
                href="/documents"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Document Repository</span>
              </Link>
              <h2 className="text-lg font-bold text-slate-900">Upload Land Deed or Revenue Record</h2>
              <p className="text-xs text-slate-500">
                Upload scans of Patta, Jamabandi, Khasra, or Satbara 7/12 for automated multilingual HTR recognition.
              </p>
            </div>
          </div>

          {/* Presets Bar */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block mb-2 font-mono">
              Quick Archival Demonstration Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="p-3 bg-white rounded-lg border border-indigo-200 hover:border-indigo-500 hover:shadow-xs text-left transition"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.language} • {p.district}</div>
                  <div className="text-[10px] text-indigo-600 mt-1 font-semibold">Load Preset Scan →</div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Upload Drop Area */}
            <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                  Document Image Scan
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-lg p-6 text-center cursor-pointer transition bg-slate-50 hover:bg-indigo-50/20"
                >
                  <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-800">Click to upload scan</div>
                  <div className="text-[10px] text-slate-400 mt-1">JPEG, PNG, TIFF, or PDF (up to 25MB)</div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1 font-mono">
                  <div className="text-slate-500 text-[10px]">Selected File:</div>
                  <div className="font-bold text-slate-900 truncate">{fileName}</div>
                  <div className="text-[11px] text-slate-400">{fileSizeText}</div>
                </div>
              </div>

              {previewUrl && (
                <div className="mt-4">
                  <span className="text-[10px] text-slate-400 font-mono block mb-1">
                    {fileName.toLowerCase().endsWith('.pdf') || previewUrl.startsWith('data:application/pdf') ? 'PDF Document Loaded:' : 'Image Scan Loaded:'}
                  </span>
                  <div className="h-32 w-full rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center p-2">
                    {fileName.toLowerCase().endsWith('.pdf') || previewUrl.startsWith('data:application/pdf') ? (
                      <div className="text-center p-2">
                        <FileText className="w-10 h-10 text-rose-600 mx-auto mb-1" />
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[200px]">{fileName}</span>
                        <span className="text-[10px] text-emerald-600 font-mono font-semibold">PDF Ready for Dynamic OCR</span>
                      </div>
                    ) : (
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ingestion Parameters */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Jurisdiction &amp; Document Metadata
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category *</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as DocumentType)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Patta">Patta (Land Ownership Title)</option>
                    <option value="Chitta">Chitta (Land Ownership Details)</option>
                    <option value="Historical register">Jamabandi / Historical Register</option>
                    <option value="Land ownership register">Satbara 7/12 Extract</option>
                    <option value="Sale Deed">Sale Deed / Conveyance</option>
                    <option value="Survey Settlement Register">Survey Settlement Register</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Language *</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                  <select
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {MASTER_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Taluk / Tehsil *</label>
                  <input
                    type="text"
                    required
                    value={taluk}
                    onChange={e => setTaluk(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Village *</label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={e => setVillage(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target HTR / OCR Indic Dataset</label>
                <input
                  type="text"
                  value={selectedDataset}
                  onChange={e => setSelectedDataset(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono bg-slate-50 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              {/* Patta Verification Advisory */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Automated Patta Document Verification:</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  All uploaded PDFs and photos undergo dynamic text extraction and cadastral classification.
                  If the extracted text does not match a valid Patta, Chitta, Khasra, or Land Revenue document, the system will immediately flag it as <strong>&quot;Wrong PDF / Photo Uploaded&quot;</strong> and block land registration.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={autoProcess}
                    onChange={e => setAutoProcess(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-medium">Execute Dynamic OCR &amp; Indic HTR analysis immediately</span>
                </label>

                <div className="flex items-center gap-3">
                  <Link
                    href="/documents"
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded shadow flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {uploading ? 'Processing AI Pipeline...' : 'Upload & Analyze Document'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
