import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET() {
  const feedback = dbStore.getAIFeedback();
  return NextResponse.json({
    success: true,
    count: feedback.length,
    note: 'Human correction records saved for offline/batch active learning and model retraining.',
    data: feedback
  });
}
