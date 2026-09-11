import test from 'node:test';
import assert from 'node:assert/strict';
import { RealOCRService } from '../services/real-ocr';
import { DocumentProcessingService } from '../services/document-processing';
import { dbStore } from '../lib/store';
import { DocumentRecord } from '../types';

test('Serverless OCR & Verification: Authentic Patta document analyzes instantly', async () => {
  const doc = dbStore.getDocuments().find(d => d.documentType === 'Patta') || dbStore.getDocuments()[0];
  const t0 = Date.now();
  const analysis = await RealOCRService.analyzeDocument(doc);
  const elapsed = Date.now() - t0;

  assert.ok(elapsed < 2000, `Expected elapsed < 2000ms, got ${elapsed}ms`);
  assert.equal(analysis.classification.isLandRecord, true);
  assert.equal(analysis.classification.isPatta, true);
  assert.ok(analysis.tokens.length > 0);
  assert.ok(analysis.extractedEntities.surveyNumber);

  const res = await DocumentProcessingService.processDocument(doc.id);
  assert.ok(res.document.status !== 'PROCESSING');
  assert.ok(res.record);
});

test('Serverless OCR & Verification: Invoice uploaded is flagged as Wrong Document', async () => {
  const invoiceDoc: DocumentRecord = {
    id: `doc-invoice-test-${Date.now()}`,
    fileName: 'commercial_tax_invoice_98214.jpg',
    fileSize: 1200000,
    mimeType: 'image/jpeg',
    filePath: '/documents/invoice_test.jpg',
    previewUrl: '/documents/invoice_test.jpg',
    fileUrl: '/documents/invoice_test.jpg',
    documentType: 'Patta',
    pages: 1,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Testing Officer',
    status: 'UPLOADED',
    processingSteps: []
  };

  dbStore.addDocument(invoiceDoc);
  const analysis = await RealOCRService.analyzeDocument(invoiceDoc);

  assert.equal(analysis.classification.isLandRecord, false);
  assert.equal(analysis.classification.documentCategory, 'INVOICE_OR_BILL');
  assert.match(analysis.classification.rejectionReason || '', /Wrong Photo Uploaded/);

  const res = await DocumentProcessingService.processDocument(invoiceDoc.id);
  assert.equal(res.document.status, 'FLAGGED');
  assert.equal(res.record.status, 'REJECTED');
  assert.equal(res.record.validationResult?.overallStatus, 'FAILED');
});

test('Serverless Store: Disk cache persists documents across container reloads', () => {
  const testDocId = `doc-persist-${Date.now()}`;
  dbStore.addDocument({
    id: testDocId,
    fileName: 'test_persist_patta.pdf',
    fileSize: 500000,
    mimeType: 'application/pdf',
    filePath: '',
    previewUrl: '',
    fileUrl: '',
    documentType: 'Patta',
    pages: 1,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Officer',
    status: 'UPLOADED',
    processingSteps: []
  });

  const retrieved = dbStore.getDocumentById(testDocId);
  assert.ok(retrieved, 'Expected document to be retrieved from store/disk cache');
  assert.equal(retrieved.id, testDocId);
});
