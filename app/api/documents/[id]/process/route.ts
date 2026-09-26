import { NextResponse } from 'next/server';
import { DocumentProcessingService } from '@/services/document-processing';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await DocumentProcessingService.processDocument(id);
    return NextResponse.json({
      success: true,
      message: 'Document processed successfully through OpenCV, OCR, and Validation Engine',
      data: result
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
