import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');
  const action = searchParams.get('action');

  let logs = dbStore.getAuditLogs();
  if (recordId) {
    logs = logs.filter(l => l.recordId === recordId);
  }
  if (action) {
    logs = logs.filter(l => l.action === action);
  }

  return NextResponse.json({ success: true, count: logs.length, data: logs });
}
