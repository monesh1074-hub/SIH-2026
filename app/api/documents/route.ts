import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { DocumentRecord } from '@/types';
import { cookies } from 'next/headers';
import { DocumentProcessingService } from '@/services/document-processing';
import { hasPermission } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const user = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    const documents = dbStore.getDocuments(user);
    return NextResponse.json({ success: true, count: documents.length, data: documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    const body = await request.json();

    // Check if this is a process trigger alias
    if (body.action === 'process' && body.documentId) {
      if (!currentUser || !hasPermission(currentUser, 'DOCUMENT_PROCESS')) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: DOCUMENT_PROCESS privilege required to trigger AI pipelines.' },
          { status: 403 }
        );
      }

      const result = await DocumentProcessingService.processDocument(body.documentId);
      return NextResponse.json({
        success: true,
        message: 'Document processed successfully through OpenCV, OCR, and Validation Engine',
        data: result
      });
    }

    if (!currentUser || !hasPermission(currentUser, 'DOCUMENT_UPLOAD')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: DOCUMENT_UPLOAD privilege required to ingest land documents.' },
        { status: 403 }
      );
    }

    const {
      fileName,
      fileSize = 1500000,
      mimeType: initialMimeType,
      filePath: inputFilePath,
      previewUrl: inputPreviewUrl,
      fileUrl: inputFileUrl,
      documentType,
      language = 'Tamil',
      state,
      district,
      taluk,
      village
    } = body;

    if (!fileName || !documentType || !state || !district || !taluk || !village) {
      return NextResponse.json(
        { success: false, error: 'Missing required metadata: fileName, documentType, state, district, taluk, village' },
        { status: 400 }
      );
    }

    const docId = `doc-${Date.now().toString().slice(-4)}`;
    const rawDataUrl = inputPreviewUrl || inputFileUrl || inputFilePath || '';
    let resolvedFilePath = '';
    let resolvedPreviewUrl = '';
    let detectedMime = initialMimeType || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    if (rawDataUrl.startsWith('data:')) {
      const matches = rawDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        detectedMime = matches[1];
      }
      // On Vercel and serverless, preserve data URL for instant in-memory rendering and OCR
      resolvedFilePath = rawDataUrl;
      resolvedPreviewUrl = rawDataUrl;

      // Safely attempt optional disk caching for environments where public/uploads or /tmp is writable
      try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const ext = (detectedMime && detectedMime.includes('pdf')) || fileName.toLowerCase().endsWith('.pdf') ? '.pdf' : '.jpg';
        const safeBase = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const diskFileName = `${docId}_${safeBase}${safeBase.endsWith(ext) ? '' : ext}`;

        let targetDir = path.join(process.cwd(), 'public', 'uploads');
        try {
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        } catch {
          targetDir = path.join(os.tmpdir(), 'sih_uploads');
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        }

        const diskPath = path.join(/*turbopackIgnore: true*/ targetDir, diskFileName);
        if (matches && matches[2]) {
          fs.writeFileSync(diskPath, Buffer.from(matches[2], 'base64'));
          resolvedFilePath = diskPath;
          if (targetDir.includes('public')) {
            resolvedPreviewUrl = `/uploads/${diskFileName}`;
          }
        }
      } catch (cacheErr) {
        // Safe to ignore on serverless since rawDataUrl is preserved
        console.warn('Optional disk cache skipped:', cacheErr);
      }
    } else if (rawDataUrl.startsWith('/')) {
      resolvedFilePath = rawDataUrl;
      resolvedPreviewUrl = rawDataUrl;
    } else if (rawDataUrl) {
      resolvedFilePath = rawDataUrl;
      resolvedPreviewUrl = rawDataUrl;
    } else {
      resolvedFilePath = language.toLowerCase().includes('hindi')
        ? '/documents/sample-khasra-1.jpg'
        : language.toLowerCase().includes('marathi')
        ? '/documents/sample-satbara-1.jpg'
        : '/documents/sample-patta-1.jpg';
      resolvedPreviewUrl = resolvedFilePath;
    }

    const isPdf = detectedMime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

    const newDoc: DocumentRecord = {
      id: docId,
      fileName,
      fileSize: typeof fileSize === 'number' ? fileSize : 1500000,
      mimeType: detectedMime,
      filePath: resolvedFilePath,
      previewUrl: resolvedPreviewUrl,
      fileUrl: resolvedPreviewUrl,
      documentType,
      pages: 1,
      language,
      state,
      district,
      taluk,
      village,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser?.name || 'Authorized Officer',
      status: 'UPLOADED',
      processingSteps: [
        { step: 'Document Ingestion', status: 'COMPLETED', timestamp: new Date().toISOString(), details: `${fileName} (${isPdf ? 'PDF Format' : 'Raster Image'}) saved to secure intake buffer` },
        { step: 'Image / PDF Preprocessing', status: 'PENDING' },
        { step: 'Text Detection & Segmentation', status: 'PENDING' },
        { step: 'Multilingual OCR Engine', status: 'PENDING' },
        { step: 'Field Extraction (LayoutLMv3)', status: 'PENDING' },
        { step: 'Business Rules & Spatial Validation', status: 'PENDING' }
      ]
    };

    const savedDoc = dbStore.addDocument(newDoc);

    // If autoProcess requested, process immediately in the same request (takes < 40ms on serverless)
    if (body.autoProcess) {
      try {
        const processResult = await DocumentProcessingService.processDocument(savedDoc.id);
        return NextResponse.json(
          {
            success: true,
            data: processResult.document,
            record: processResult.record,
            processed: true,
            message: 'Document uploaded and analyzed immediately via In-Process Serverless AI Engine'
          },
          { status: 201 }
        );
      } catch (procErr: any) {
        console.warn('In-flight auto-processing exception:', procErr);
      }
    }

    return NextResponse.json({ success: true, data: savedDoc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
