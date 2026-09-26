import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET() {
  const stats = dbStore.getStats();
  return NextResponse.json({ success: true, data: stats });
}
