import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = dbStore.getLandRecordById(id);
  if (!record) {
    return NextResponse.json({ success: false, error: 'Land record not found' }, { status: 404 });
  }

  const document = dbStore.getDocumentById(record.documentId);
  const parcel = record.gisParcelId ? dbStore.getParcelById(record.gisParcelId) : null;

  // Ensure tokens are populated for character-level inspection
  if ((!record.tokens || record.tokens.length === 0) && document) {
    const { generateIndicTokensForDoc } = await import('@/services/document-processing');
    record.tokens = generateIndicTokensForDoc(document);
  }

  return NextResponse.json({
    success: true,
    data: {
      record,
      document,
      parcel
    }
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fieldName, newValue, officerComment } = body;

    if (!fieldName || newValue === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing fieldName or newValue in request body' },
        { status: 400 }
      );
    }

    const updatedRecord = dbStore.correctField(id, fieldName, newValue, officerComment);
    if (!updatedRecord) {
      return NextResponse.json({ success: false, error: 'Record or field not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Field "${fieldName}" updated successfully with audit trail and AI feedback entry`,
      data: updatedRecord
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
