import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action = 'APPROVE', reason, officerName } = body;

    const currentOfficer = officerName || dbStore.getCurrentUser().name;

    if (action === 'REJECT') {
      const rejected = dbStore.rejectRecord(id, reason || 'Rejected by verification officer');
      return NextResponse.json({ success: true, message: 'Record marked as REJECTED', data: rejected });
    }

    const verified = dbStore.verifyRecord(id, currentOfficer);
    if (!verified) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Record #${id} officially verified and marked as VERIFIED in Land Registry`,
      data: verified
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
