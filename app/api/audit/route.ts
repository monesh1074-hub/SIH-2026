import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { supabase, persistAuditLogToSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');
  const action = searchParams.get('action');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // Attempt reading from real Supabase table first
  try {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (recordId) {
      query = query.eq('resource_id', recordId);
    }
    if (action) {
      query = query.eq('action', action);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      // Map Supabase rows to AuditLog structure
      const mappedLogs = data.map(row => ({
        id: row.id,
        timestamp: row.created_at,
        userId: row.actor_id,
        userName: row.actor_name,
        userRole: row.actor_role,
        action: row.action,
        recordId: row.resource_type === 'RECORD' ? row.resource_id : undefined,
        documentId: row.resource_type === 'DOCUMENT' ? row.resource_id : undefined,
        details: row.remarks || `${row.action} on ${row.resource_type} ${row.resource_id}`,
        beforeState: row.before_state,
        afterState: row.after_state,
        diff: row.diff
      }));
      return NextResponse.json({ success: true, count: mappedLogs.length, source: 'supabase', data: mappedLogs });
    }
  } catch (err) {
    console.warn('[Audit API] Supabase query fallback to local store:', err);
  }

  // Resilient fallback to local reactive store
  let logs = dbStore.getAuditLogs();
  if (recordId) {
    logs = logs.filter(l => l.recordId === recordId);
  }
  if (action) {
    logs = logs.filter(l => l.action === action);
  }

  return NextResponse.json({ success: true, count: logs.length, source: 'store', data: logs });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userName, userRole, action, recordId, documentId, details, beforeState, afterState, diff } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    const logEntry = dbStore.addAuditLog({
      userId: userId || 'usr-system',
      userName: userName || 'System Auditor',
      userRole: userRole || 'AUDITOR',
      action,
      recordId,
      documentId,
      details: details || `Audit event recorded: ${action}`
    });

    // Synchronize to Supabase asynchronously
    await persistAuditLogToSupabase({
      actor_id: userId || 'usr-system',
      actor_name: userName || 'System Auditor',
      actor_role: userRole || 'AUDITOR',
      action,
      resource_type: recordId ? 'RECORD' : (documentId ? 'DOCUMENT' : 'SYSTEM'),
      resource_id: recordId || documentId || 'SYS-EVENT',
      before_state: beforeState,
      after_state: afterState,
      diff: diff,
      remarks: details
    });

    return NextResponse.json({ success: true, data: logEntry }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
