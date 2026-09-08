import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = dbStore.getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
  }

  const record = doc.recordId ? dbStore.getLandRecordById(doc.recordId) : null;
  return NextResponse.json({ success: true, data: { document: doc, record } });
}
