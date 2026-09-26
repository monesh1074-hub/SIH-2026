import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { supabase, persistFeedbackToSupabase } from '@/lib/supabase';

export async function GET() {
  // Query Supabase first, fallback to dbStore
  try {
    const { data, error } = await supabase.from('feedback_corrections').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map(item => ({
        id: item.id,
        recordId: item.land_record_id,
        documentId: item.document_id,
        fieldName: item.field_name,
        originalValue: item.original_prediction,
        correctedValue: item.corrected_value,
        officerReason: item.correction_reason,
        verifiedBy: item.corrected_by,
        timestamp: item.created_at,
        modelSource: item.model_name
      }));
      return NextResponse.json({
        success: true,
        count: mapped.length,
        source: 'supabase',
        note: 'Human correction records saved for offline/batch active learning and model retraining.',
        data: mapped
      });
    }
  } catch (err) {
    console.warn('[Feedback API] Supabase query fallback to local store:', err);
  }

  const feedback = dbStore.getAIFeedback();
  return NextResponse.json({
    success: true,
    count: feedback.length,
    source: 'store',
    note: 'Human correction records saved for offline/batch active learning and model retraining.',
    data: feedback
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordId, documentId, fieldName, originalValue, correctedValue, officerReason, verifiedBy, modelSource } = body;

    if (!recordId || !fieldName || correctedValue === undefined) {
      return NextResponse.json({ success: false, error: 'recordId, fieldName, and correctedValue are required' }, { status: 400 });
    }

    const feedbackEntry = {
      id: `fb-${Date.now()}`,
      recordId,
      documentId: documentId || 'doc-unknown',
      fieldName,
      originalValue: String(originalValue ?? ''),
      correctedValue: String(correctedValue),
      officerReason: officerReason || 'Officer manual correction',
      verifiedBy: verifiedBy || 'Revenue Officer',
      timestamp: new Date().toISOString(),
      modelSource: modelSource || 'Tesseract.js / Indic-HTR'
    };

    // Store in memory
    (dbStore as any).aiFeedback?.unshift?.(feedbackEntry);

    // Persist to Supabase
    await persistFeedbackToSupabase({
      land_record_id: recordId,
      document_id: documentId,
      field_name: fieldName,
      original_prediction: String(originalValue ?? ''),
      corrected_value: String(correctedValue),
      correction_reason: officerReason || 'Officer manual correction',
      corrected_by: verifiedBy,
      model_name: modelSource || 'Tesseract.js / Indic-HTR'
    });

    return NextResponse.json({ success: true, data: feedbackEntry }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
