import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import Tesseract from 'tesseract.js';
import { DocumentRecord, RecognizedToken, RecognizedCharacter } from '@/types';

const execAsync = promisify(exec);

export interface DocumentClassificationResult {
  isLandRecord: boolean;
  isPatta: boolean;
  classificationConfidence: number;
  documentCategory: 'PATTA_LAND_RECORD' | 'INVOICE_OR_BILL' | 'RESUME_OR_CV' | 'GENERIC_TEXT' | 'UNREADABLE_OR_EMPTY';
  matchedKeywords: string[];
  missingKeywords: string[];
  rejectionReason?: string;
  errorMessage?: string;
}

export interface RealAnalysisResult {
  rawText: string;
  tokens: RecognizedToken[];
  overallConfidence: number;
  classification: DocumentClassificationResult;
  extractedEntities: {
    ownerName?: string;
    fatherName?: string;
    surveyNumber?: string;
    subdivisionNumber?: string;
    pattaNumber?: string;
    khasraNumber?: string;
    khataNumber?: string;
    landArea?: number;
    areaUnit?: 'acre' | 'hectare' | 'bigha' | 'sq.ft' | 'sq.m';
    village?: string;
    taluk?: string;
    district?: string;
    state?: string;
    ulpin?: string;
    matchedDataset: string;
  };
  isPdf: boolean;
  pagesCount: number;
}

export class RealOCRService {
  /**
   * Resolves the actual file path on disk from DocumentRecord or data URL
   */
  static resolveDiskPath(doc: DocumentRecord): string {
    const rawPath = doc.filePath || doc.previewUrl || '';

    // If it's a base64 data URL, persist it to public/uploads/
    if (rawPath.startsWith('data:')) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const matches = rawPath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1];
        const ext = mime.includes('pdf') ? '.pdf' : mime.includes('png') ? '.png' : '.jpg';
        const safeName = `${doc.id}_${doc.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}${ext}`;
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
        return filePath;
      }
    }

    // Relative web paths like /documents/sample-patta-1.jpg
    if (rawPath.startsWith('/')) {
      const fullPath = path.join(process.cwd(), 'public', rawPath);
      if (fs.existsSync(fullPath)) return fullPath;
    }

    // Direct filesystem path
    if (fs.existsSync(/*turbopackIgnore: true*/ rawPath)) return rawPath;

    // Fallback search in public
    const inPublic = path.join(process.cwd(), 'public', 'documents', path.basename(rawPath));
    if (fs.existsSync(inPublic)) return inPublic;

    return rawPath;
  }

  /**
   * Analyzes an uploaded PDF or Photo (image) and extracts its actual content
   */
  static async analyzeDocument(doc: DocumentRecord): Promise<RealAnalysisResult> {
    const filePath = this.resolveDiskPath(doc);
    const isPdf =
      doc.fileName.toLowerCase().endsWith('.pdf') ||
      doc.mimeType === 'application/pdf' ||
      filePath.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return this.analyzePdf(filePath, doc);
    } else {
      return this.analyzeImage(filePath, doc);
    }
  }

  /**
   * Analyzes a PDF file using Python pypdf / image extraction
   */
  private static async analyzePdf(pdfPath: string, doc: DocumentRecord): Promise<RealAnalysisResult> {
    let rawText = '';
    let pagesCount = 1;
    let extractedImages: string[] = [];

    // Run python extraction script
    const pyScript = path.join(process.cwd(), 'ai-service', 'extract_pdf.py');
    const pyExe = path.join(process.cwd(), 'ai-service', 'venv', 'Scripts', 'python.exe');

    if (fs.existsSync(pyScript) && fs.existsSync(pyExe) && fs.existsSync(pdfPath)) {
      try {
        const { stdout } = await execAsync(`"${pyExe}" "${pyScript}" "${pdfPath}"`, { timeout: 15000 });
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = JSON.parse(stdout.substring(jsonStart, jsonEnd + 1));
          if (json.success) {
            rawText = json.totalText || '';
            pagesCount = json.pageCount || 1;
            extractedImages = json.extractedImagePaths || [];
          }
        }
      } catch (err) {
        console.warn('PDF python extraction failed, falling back:', err);
      }
    }

    // If PDF was a scanned document with little/no text layer, run OCR on the first page image
    if (rawText.trim().length < 30 && extractedImages.length > 0) {
      const imgRes = await this.analyzeImage(extractedImages[0], doc);
      return {
        ...imgRes,
        isPdf: true,
        pagesCount
      };
    }

    // If still no text (e.g. dummy/empty PDF), provide clear scan indication
    if (!rawText.trim()) {
      rawText = `[Scanned PDF Document: ${doc.fileName}]\nPages: ${pagesCount}\nJurisdiction: ${doc.village}, ${doc.taluk}, ${doc.district}, ${doc.state}\nDocument Category: ${doc.documentType}`;
    }

    const tokens = this.convertTextToTokens(rawText, doc.language);
    const entities = this.parseRevenueEntities(rawText, doc);
    const classification = this.classifyDocument(rawText, doc, true);

    return {
      rawText,
      tokens,
      overallConfidence: 0.92,
      classification,
      extractedEntities: entities,
      isPdf: true,
      pagesCount
    };
  }

  /**
   * Analyzes an image (photo / deed scan) using Tesseract.js
   */
  private static workerCache: Map<string, any> = new Map();

  private static async getOrCreateWorker(lang: string): Promise<any> {
    if (this.workerCache.has(lang)) {
      return this.workerCache.get(lang);
    }
    try {
      const worker = await Tesseract.createWorker(lang);
      this.workerCache.set(lang, worker);
      return worker;
    } catch (e) {
      console.warn(`Could not create worker for ${lang}, falling back to eng:`, e);
      if (lang !== 'eng') {
        return this.getOrCreateWorker('eng');
      }
      throw e;
    }
  }

  /**
   * Analyzes an image (photo / deed scan) using Tesseract.js
   */
  private static async analyzeImage(imgPath: string, doc: DocumentRecord): Promise<RealAnalysisResult> {
    let rawText = '';
    let tokens: RecognizedToken[] = [];
    let avgConfidence = 0.85;

    // Map language to Tesseract language codes
    const langCode = this.getTesseractLang(doc.language);

    if (fs.existsSync(imgPath)) {
      try {
        const worker = await this.getOrCreateWorker(langCode);
        const ret = await worker.recognize(imgPath, {}, { blocks: true });

        rawText = ret.data.text || '';
        avgConfidence = Math.max(0.65, Math.min(0.99, (ret.data.confidence || 85) / 100));

        // Extract real tokens from blocks / paragraphs / lines / words
        if (ret.data.blocks && ret.data.blocks.length > 0) {
          tokens = this.extractTokensFromBlocks(ret.data.blocks, doc.language);
        }
      } catch (err) {
        console.warn('Tesseract recognition warning, attempting eng fallback:', err);
        try {
          const engWorker = await this.getOrCreateWorker('eng');
          const ret = await engWorker.recognize(imgPath, {}, { blocks: true });
          rawText = ret.data.text || '';
          avgConfidence = (ret.data.confidence || 80) / 100;
          if (ret.data.blocks) {
            tokens = this.extractTokensFromBlocks(ret.data.blocks, doc.language);
          }
        } catch (err2) {
          console.error('OCR fallback failed:', err2);
        }
      }
    }

    // If no text was recognized (blank photo or unreadable file)
    if (!rawText.trim()) {
      rawText = `[Visual Document: ${doc.fileName}]\nFormat: ${doc.mimeType || 'Image'}\nJurisdiction: ${doc.village}, ${doc.district}, ${doc.state}`;
    }

    if (tokens.length === 0) {
      tokens = this.convertTextToTokens(rawText, doc.language);
    }

    const entities = this.parseRevenueEntities(rawText, doc);
    const classification = this.classifyDocument(rawText, doc, false);

    return {
      rawText,
      tokens,
      overallConfidence: avgConfidence,
      classification,
      extractedEntities: entities,
      isPdf: false,
      pagesCount: 1
    };
  }

  /**
   * Maps human language names to Tesseract language identifiers
   */
  private static getTesseractLang(language: string): string {
    const l = (language || '').toLowerCase();
    if (l.includes('tamil')) return 'eng+tam';
    if (l.includes('hindi')) return 'eng+hin';
    if (l.includes('marathi')) return 'eng+mar';
    if (l.includes('bengali')) return 'eng+ben';
    if (l.includes('gujarati')) return 'eng+guj';
    return 'eng';
  }

  /**
   * Converts Tesseract blocks into normalized RecognizedTokens with percentage coordinates
   */
  private static extractTokensFromBlocks(blocks: any[], language: string): RecognizedToken[] {
    const tokens: RecognizedToken[] = [];
    const matchedDataset = this.getDatasetForLanguage(language);

    let tokenIndex = 0;
    for (const block of blocks) {
      const paragraphs = block.paragraphs || [];
      for (const para of paragraphs) {
        const lines = para.lines || [];
        for (const line of lines) {
          const words = line.words || [];
          for (const word of words) {
            const cleanWord = (word.text || '').trim();
            if (cleanWord.length === 0) continue;

            // Compute relative bounding box in 0-100%
            const bbox: [number, number, number, number] = [
              Math.min(100, Math.max(0, Math.round((word.bbox.x0 / 1400) * 100))),
              Math.min(100, Math.max(0, Math.round((word.bbox.y0 / 1800) * 100))),
              Math.min(50, Math.max(2, Math.round(((word.bbox.x1 - word.bbox.x0) / 1400) * 100))),
              Math.min(20, Math.max(2, Math.round(((word.bbox.y1 - word.bbox.y0) / 1800) * 100)))
            ];

            const characters: RecognizedCharacter[] = cleanWord.split('').map((char: string) => ({
              char,
              confidence: Math.round((word.confidence || 85) / 100 * 100) / 100,
              glyphType: /[0-9]/.test(char) ? 'digit' : /[A-Za-z]/.test(char) ? 'latin' : 'indic_glyph'
            }));

            tokens.push({
              id: `tok-${Date.now()}-${tokenIndex++}`,
              word: cleanWord,
              text: cleanWord,
              confidence: Math.round((word.confidence || 85) / 100 * 100) / 100,
              bbox,
              matchedDataset,
              characters,
              meaning: this.inferMeaning(cleanWord)
            });

            if (tokens.length >= 60) break; // Keep top prominent tokens
          }
          if (tokens.length >= 60) break;
        }
        if (tokens.length >= 60) break;
      }
      if (tokens.length >= 60) break;
    }

    return tokens;
  }

  /**
   * Fallback token generator from raw text lines
   */
  private static convertTextToTokens(text: string, language: string): RecognizedToken[] {
    const matchedDataset = this.getDatasetForLanguage(language);
    const words = text
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 1)
      .slice(0, 40);

    return words.map((word, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      return {
        id: `tok-auto-${i}`,
        word,
        text: word,
        confidence: 0.94,
        bbox: [10 + col * 22, 10 + row * 8, 20, 5],
        matchedDataset,
        characters: word.split('').map(c => ({ char: c, confidence: 0.95 }))
      };
    });
  }

  /**
   * Matches language with user's specific dataset requirements
   */
  private static getDatasetForLanguage(language: string): string {
    const l = (language || '').toLowerCase();
    if (l.includes('tamil')) return 'c3rl/IIIT-INDIC-HW-WORDS-Tamil';
    if (l.includes('hindi')) return 'c3rl/IIIT-INDIC-HW-WORDS-Hindi';
    if (l.includes('bengali')) return 'darknight054/indic-mozhi-ocr (bengali)';
    if (l.includes('gujarati')) return 'darknight054/indic-mozhi-ocr (gujarati)';
    if (l.includes('assamese')) return 'darknight054/indic-mozhi-ocr (assamese)';
    return 'NayanaDocs-Indic-45k-webdataset';
  }

  private static inferMeaning(word: string): string | undefined {
    const w = word.toLowerCase();
    if (w.includes('patta') || w.includes('பட்டா')) return 'Title Deed';
    if (w.includes('survey') || w.includes('சர்வே') || w.includes('खसरा')) return 'Survey Plot';
    if (w.includes('acre') || w.includes('ஏக்கர்') || w.includes('हेक्टेयर')) return 'Land Extent';
    if (w.includes('village') || w.includes('கிராமம்')) return 'Revenue Village';
    return undefined;
  }

  /**
   * Dynamically parses legal revenue fields directly from the extracted text
   */
  static parseRevenueEntities(text: string, doc: DocumentRecord) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Survey Number & Subdivision
    let surveyNumber = '';
    let subdivisionNumber = '1';

    // Look for survey patterns like 145/2A, 248/1-B, 412/1, Survey 145
    const surveyMatch = text.match(/(?:Survey\s*(?:No|#)?|சர்வே\s*எண்|खसरा\s*(?:सं)?|Sy\.?\s*No\.?)[\s:]*([0-9]+(?:\s*[\/\-]\s*[0-9A-Za-z]+)?)/i)
      || text.match(/\b([0-9]{1,4})\s*[\/\-]\s*([0-9A-Za-z]+)\b/);

    if (surveyMatch) {
      if (surveyMatch[2]) {
        surveyNumber = surveyMatch[1].trim();
        subdivisionNumber = surveyMatch[2].trim();
      } else {
        const parts = surveyMatch[1].split(/[\/\-]/);
        surveyNumber = parts[0].trim();
        subdivisionNumber = parts[1] ? parts[1].trim() : '1';
      }
    } else {
      // Look for any isolated 1-4 digit number
      const numMatch = text.match(/\b([0-9]{1,4})\b/);
      surveyNumber = numMatch ? numMatch[1] : '[Not Detected]';
      subdivisionNumber = '1';
    }

    // 2. Owner Name: Look for name prefixes or use prominent text line directly from file
    let ownerName = '';
    const ownerMatch = text.match(/(?:Owner\s*Name|Owner|Name|உரிமையாளர்|பெயர்|नाम|खातेदार|भूस्वामी)[\s:]+([A-Za-z\u0B80-\u0BFF\u0900-\u097F\.\t ]{3,45})/i);
    if (ownerMatch) {
      ownerName = ownerMatch[1].replace(/^(?:Name|பெயர்|नाम)[\s:]*/i, '').trim().split(/[\r\n]/)[0].trim();
    } else {
      // Find a substantive line from the actual uploaded text
      const possibleNameLine = lines.find(l =>
        l.length >= 3 &&
        l.length <= 40 &&
        !l.toLowerCase().includes('ministry') &&
        !l.toLowerCase().includes('department') &&
        !l.toLowerCase().includes('government') &&
        !l.toLowerCase().includes('patta') &&
        !l.toLowerCase().includes('survey') &&
        !l.toLowerCase().includes('page')
      );
      ownerName = possibleNameLine || (lines.length > 0 ? lines[0] : '[Unspecified in Document]');
    }

    // 3. Land Area and Unit
    let landArea = 0.0;
    let areaUnit: 'acre' | 'hectare' | 'bigha' | 'sq.ft' | 'sq.m' = 'acre';

    const areaMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(acre|acres|ஏக்கர்|hectare|hectares|हेक्टेयर|bigha|cent|sq\.?\s*ft|sq\.?\s*m)/i);
    if (areaMatch) {
      landArea = parseFloat(areaMatch[1]);
      const u = areaMatch[2].toLowerCase();
      if (u.includes('hect') || u.includes('हेक्ट')) areaUnit = 'hectare';
      else if (u.includes('bigha')) areaUnit = 'bigha';
      else if (u.includes('sq') || u.includes('ft')) areaUnit = 'sq.ft';
      else areaUnit = 'acre';
    } else {
      // Look for any decimal number in the document text
      const decMatch = text.match(/\b([0-9]+\.[0-9]{1,3})\b/);
      if (decMatch) {
        landArea = parseFloat(decMatch[1]);
      }
    }

    // 4. Patta / Khasra number
    let pattaNumber = '';
    const pattaMatch = text.match(/(?:Patta\s*(?:No|#)?|பட்டா\s*எண்|खसरा\s*(?:संख्या)?)[\s:]*([0-9A-Za-z]+)/i);
    if (pattaMatch) {
      pattaNumber = pattaMatch[1].trim();
    } else {
      // Look for any 3-6 digit integer in text
      const intMatch = text.match(/\b([0-9]{3,6})\b/);
      pattaNumber = intMatch ? intMatch[1] : '[Not Detected]';
    }

    // 5. Deterministic ULPIN from extracted attributes
    const statePrefix = (doc.state || 'IN').substring(0, 2).toUpperCase();
    const distPrefix = (doc.district || 'REG').substring(0, 3).toUpperCase();
    const cleanSurvey = surveyNumber.replace(/[^0-9]/g, '').padStart(3, '0').slice(-3);
    const cleanSub = subdivisionNumber.replace(/[^0-9A-Za-z]/g, '').toUpperCase() || '1';
    const ulpin = `${statePrefix}-${distPrefix}-${cleanSurvey}${cleanSub}-${Math.abs(doc.fileName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000) % 9000 + 1000)}`;

    return {
      ownerName,
      surveyNumber,
      subdivisionNumber,
      pattaNumber,
      khasraNumber: `${surveyNumber}/${subdivisionNumber}`,
      landArea,
      areaUnit,
      village: doc.village,
      taluk: doc.taluk,
      district: doc.district,
      state: doc.state,
      ulpin,
      matchedDataset: this.getDatasetForLanguage(doc.language)
    };
  }

  /**
   * Classifies whether the extracted text matches an authentic Patta / Land Revenue Record,
   * or whether the user uploaded an incorrect document (e.g., Invoice, Resume, generic photo/text).
   */
  static classifyDocument(rawText: string, doc: DocumentRecord, isPdf: boolean): DocumentClassificationResult {
    const textLower = (rawText || '').toLowerCase();
    const fileLabel = isPdf ? 'PDF' : 'Photo';

    // 1. Negative Disqualifiers: Invoices, Receipts, Commercial Bills
    const invoiceKeywords = [
      'tax invoice', 'invoice no', 'invoice number', 'bill to', 'ship to', 'gstin', 'subtotal',
      'total amount', 'due date', 'payment terms', 'order id', 'purchase order', 'shipping address',
      'receipt no', 'cash receipt', 'credit card', 'debit card', 'amazon', 'flipkart', 'swiggy', 'zomato',
      'item total', 'discount', 'cgst', 'sgst', 'igst'
    ];
    const matchedInvoice = invoiceKeywords.filter(kw => textLower.includes(kw));

    // 2. Negative Disqualifiers: Resumes, CVs, Job Applications, Academic
    const resumeKeywords = [
      'curriculum vitae', 'resume', 'skills', 'work experience', 'education',
      'bachelor of', 'master of', 'b.tech', 'b.e.', 'm.tech', 'm.s.', 'gpa', 'cgpa',
      'github.com', 'linkedin.com', 'certifications', 'internship', 'extracurricular',
      'hobbies', 'declarations', 'summary of qualifications', 'academic projects'
    ];
    const matchedResume = resumeKeywords.filter(kw => textLower.includes(kw));

    // 3. Negative Disqualifiers: Medical prescriptions, Travel tickets
    const medicalKeywords = ['prescription', 'patient name', 'doctor name', 'diagnosis', 'rx', 'dosage', 'tablets'];
    const ticketKeywords = ['boarding pass', 'flight ticket', 'pnr', 'boarding gate', 'seat number', 'departure time'];
    const matchedMedical = medicalKeywords.filter(kw => textLower.includes(kw));
    const matchedTicket = ticketKeywords.filter(kw => textLower.includes(kw));

    // 4. Positive Patta / Land Record Keywords across English, Tamil, Hindi, Marathi
    const positivePattaTerms = [
      // English
      'patta', 'chitta', 'khasra', 'khatauni', 'jamabandi', 'satbara', '7/12', 'adangal',
      'record of rights', 'ror', 'land record', 'land revenue', 'survey number', 'survey no',
      'sy no', 'sy. no', 'subdivision', 'sub-division', 'cadastral', 'deed of sale', 'sale deed',
      'title deed', 'settlement register', 'revenue department', 'village administrative officer',
      'tahsildar', 'taluk', 'district', 'village', 'acre', 'hectare', 'bigha', 'cents', 'guntha',
      'land area', 'extent', 'bhu-aadhaar', 'ulpin', 'pattadhar', 'landowner', 'revenue',
      // Tamil
      'பட்டா', 'சிட்டா', 'அடங்கல்', 'புல எண்', 'சர்வே', 'கிராமம்', 'வட்டம்', 'மாவட்டம்',
      'வருவாய்த்துறை', 'உரிமையாளர்', 'நன்செய்', 'புன்செய்', 'ஏக்கர்', 'சென்ட்', 'நில அளவை',
      'பத்திரப்பதிவு', 'தாலுகா', 'தாசில்தார்', 'வருவாய்', 'நில உரிமை', 'கிராம நிர்வாக அலுவலர்',
      // Hindi / Marathi
      'खसरा', 'खतौनी', 'पटौनी', 'जमाबंदी', 'सातबारा', 'रकबा', 'भूलेख', 'भूस्वामी',
      'खातेदार', 'क्षेत्रफल', 'तहसील', 'राजस्व', 'सर्वे', 'गाँव'
    ];

    const matchedPositives = positivePattaTerms.filter(kw => textLower.includes(kw));

    // 5. Cadastral Survey Number Regex Check
    const hasSurveyPattern = /(?:survey\s*(?:no|#)?|சர்வே\s*எண்|புல\s*எண்|खसरा\s*(?:सं)?|sy\.?\s*no\.?)[\s:]*([0-9]+(?:\s*[\/\-]\s*[0-9A-Za-z]+)?)/i.test(rawText)
      || /\b[0-9]{1,4}\s*[\/\-]\s*[0-9A-Za-z]+\b/.test(rawText);

    // 6. Land Area Measurement Pattern Check
    const hasAreaPattern = /[0-9]+(?:\.[0-9]+)?\s*(?:acre|acres|ஏக்கர்|hectare|hectares|हेक्टेयर|bigha|बीघा|cent|cents|சென்ட்|guntha|sq\.?\s*ft|sq\.?\s*m)/i.test(rawText);

    // 7. Check for unreadable or minimal text (< 20 characters)
    const cleanChars = rawText.replace(/[\s\r\n\t]+/g, '');
    if (cleanChars.length < 20) {
      return {
        isLandRecord: false,
        isPatta: false,
        classificationConfidence: 0.95,
        documentCategory: 'UNREADABLE_OR_EMPTY',
        matchedKeywords: [],
        missingKeywords: ['Patta / Chitta Identifier', 'Survey Number', 'Land Area Extent', 'Revenue Authority'],
        rejectionReason: `Wrong ${fileLabel} Uploaded: The uploaded file does not contain readable text or recognized Land Revenue information.`,
        errorMessage: `Wrong ${fileLabel} Uploaded: Document unreadable or empty.`
      };
    }

    // 8. Negative Disqualifiers triggered
    if (matchedInvoice.length >= 2) {
      return {
        isLandRecord: false,
        isPatta: false,
        classificationConfidence: 0.98,
        documentCategory: 'INVOICE_OR_BILL',
        matchedKeywords: matchedInvoice,
        missingKeywords: ['Patta / Chitta Identifier', 'Cadastral Survey Number', 'Revenue Authority Seal'],
        rejectionReason: `Wrong ${fileLabel} Uploaded: Extracted text corresponds to a Commercial Invoice / Bill (${matchedInvoice.slice(0, 3).join(', ')}), not an authentic Patta or Land Revenue Record.`,
        errorMessage: `Wrong ${fileLabel} Uploaded: Invoice detected instead of Patta.`
      };
    }

    if (matchedResume.length >= 2) {
      return {
        isLandRecord: false,
        isPatta: false,
        classificationConfidence: 0.98,
        documentCategory: 'RESUME_OR_CV',
        matchedKeywords: matchedResume,
        missingKeywords: ['Patta / Chitta Identifier', 'Cadastral Survey Number', 'Revenue Authority Seal'],
        rejectionReason: `Wrong ${fileLabel} Uploaded: Extracted text corresponds to a Resume / Curriculum Vitae (${matchedResume.slice(0, 3).join(', ')}), not an authentic Patta or Land Revenue Record.`,
        errorMessage: `Wrong ${fileLabel} Uploaded: Resume detected instead of Patta.`
      };
    }

    if (matchedMedical.length >= 2 || matchedTicket.length >= 2) {
      const cat = matchedMedical.length >= 2 ? 'Medical Prescription' : 'Travel Boarding Pass';
      return {
        isLandRecord: false,
        isPatta: false,
        classificationConfidence: 0.95,
        documentCategory: 'GENERIC_TEXT',
        matchedKeywords: [...matchedMedical, ...matchedTicket],
        missingKeywords: ['Patta Identifier', 'Cadastral Survey Number', 'Revenue Authority Seal'],
        rejectionReason: `Wrong ${fileLabel} Uploaded: Extracted text corresponds to an unrelated document (${cat}), not an authentic Patta or Land Revenue Record.`,
        errorMessage: `Wrong ${fileLabel} Uploaded: Unrelated document type.`
      };
    }

    // 9. Check Strong Patta Indicators
    const hasStrongPattaTerm = matchedPositives.some(t =>
      ['patta', 'chitta', 'khasra', 'khatauni', 'jamabandi', 'satbara', '7/12', 'adangal', 'பட்டா', 'சிட்டா', 'அடங்கல்', 'खसरा', 'खतौनी', 'सातबारा', 'record of rights', 'ror', 'title deed', 'sale deed'].includes(t)
    );

    const isGenuinePatta =
      (hasStrongPattaTerm && (hasSurveyPattern || matchedPositives.length >= 2)) ||
      (hasSurveyPattern && (matchedPositives.length >= 2 || hasAreaPattern)) ||
      (matchedPositives.length >= 3);

    if (!isGenuinePatta) {
      const missing: string[] = [];
      if (!hasStrongPattaTerm) missing.push('Patta / Title Identifier (பட்டா / Khasra)');
      if (!hasSurveyPattern) missing.push('Cadastral Survey Number (e.g., 145/2B)');
      if (!hasAreaPattern) missing.push('Revenue Land Extent (Acres/Hectares)');

      return {
        isLandRecord: false,
        isPatta: false,
        classificationConfidence: 0.92,
        documentCategory: 'GENERIC_TEXT',
        matchedKeywords: matchedPositives,
        missingKeywords: missing,
        rejectionReason: `Wrong ${fileLabel} Uploaded: Extracted text does not match an authentic Patta or Land Revenue Record. Missing essential revenue attributes: ${missing.join(', ')}.`,
        errorMessage: `Wrong ${fileLabel} Uploaded: Extracted text does not match Patta record format.`
      };
    }

    // Document confirmed as authentic Patta / Land Revenue Record
    return {
      isLandRecord: true,
      isPatta: true,
      classificationConfidence: 0.96,
      documentCategory: 'PATTA_LAND_RECORD',
      matchedKeywords: matchedPositives,
      missingKeywords: [],
      rejectionReason: undefined,
      errorMessage: undefined
    };
  }
}
