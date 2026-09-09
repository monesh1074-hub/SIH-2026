import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://axrqsmxkfwoqzkglebey.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4cnFzbXhrZndvcXprZ2xlYmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3Mzk1MzMsImV4cCI6MjA4OTMxNTUzM30.BKidOGGB3JoMGOc0v9aFWrjVPnHYIA4EXWcTW3Vz5sc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Persists an ingested document to Supabase
 */
export async function persistDocumentToSupabase(doc: {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  checksum_sha256: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  document_type?: string;
  language?: string;
  status?: string;
  ocr_confidence?: number;
}) {
  try {
    const { data, error } = await supabase.from('documents').upsert([doc]);
    if (error) {
      console.warn('[Supabase] persistDocument warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistDocument exception:', err);
    return null;
  }
}

/**
 * Persists an audit log entry to Supabase
 */
export async function persistAuditLogToSupabase(log: {
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before_state?: any;
  after_state?: any;
  diff?: any;
  remarks?: string;
}) {
  try {
    const { data, error } = await supabase.from('audit_logs').insert([log]);
    if (error) {
      console.warn('[Supabase] persistAuditLog warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistAuditLog exception:', err);
    return null;
  }
}

/**
 * Persists an active learning feedback correction to Supabase
 */
export async function persistFeedbackToSupabase(feedback: {
  land_record_id: string;
  document_id?: string;
  field_name: string;
  original_prediction: string;
  corrected_value: string;
  model_name?: string;
  confidence?: number;
  correction_reason: string;
  corrected_by?: string;
}) {
  try {
    const { data, error } = await supabase.from('feedback_corrections').insert([feedback]);
    if (error) {
      console.warn('[Supabase] persistFeedback warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistFeedback exception:', err);
    return null;
  }
}

/**
 * Persists a validated land record to Supabase
 */
export async function persistLandRecordToSupabase(record: {
  id: string;
  document_id?: string;
  survey_number: string;
  subdivision_number?: string;
  patta_number?: string;
  khasra_number?: string;
  khata_number?: string;
  owner_name: string;
  father_name?: string;
  land_area: number;
  area_unit: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  ulpin?: string;
  status?: string;
  overall_confidence?: number;
}) {
  try {
    const { data, error } = await supabase.from('land_records').upsert([record]);
    if (error) {
      console.warn('[Supabase] persistLandRecord warning:', error.message);
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] persistLandRecord exception:', err);
    return null;
  }
}
