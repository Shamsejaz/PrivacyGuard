// Real Tesseract OCR Service Implementation
import Tesseract from 'tesseract.js';
import { pdfService, PDFProcessingResult } from './pdfService';
import { officeDocumentService, OfficeDocumentResult } from './officeDocumentService';
import { dlpService, MultiEngineDetectionResult } from './dlpService';
import { pythonPIIService } from './pythonPIIService';

export interface OCRResult {
  text: string;
  confidence: number;
  totalPages?: number;
  processingMethod: 'image' | 'pdf_text' | 'pdf_ocr' | 'hybrid';
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

export interface OfficeDocumentScanResult extends OCRResult {
  documentData: OfficeDocumentResult;
  documentType: 'word' | 'excel' | 'powerpoint';
  metadata: OfficeDocumentResult['metadata'];
}
export interface PIIDetection {
  type: string;
  value: string;
  confidence: number;
  location: {
    start: number;
    end: number;
  };
  redacted: string;
  detected_by: string[];
  entity_type: string;
  analysis_explanation?: any;
}

export interface PDFScanResult extends OCRResult {
  pdfData: PDFProcessingResult;
  pageResults: Array<{
    pageNumber: number;
    text: string;
    piiDetections: PIIDetection[];
    ocrUsed: boolean;
  }>;
}
class TesseractService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (!this.worker && !this.isInitialized) {
      try {
        console.log('Initializing Tesseract worker...');
        this.worker = await Tesseract.createWorker('eng');
        
        await this.worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?@#$%^&*()_+-=[]{}|;:,.<>?/~`',
        });
        
        this.isInitialized = true;
        console.log('Tesseract worker initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Tesseract worker:', error);
        throw new Error('OCR initialization failed');
      }
    }
  }

  async scanFile(file: File): Promise<OCRResult | PDFScanResult> {
    const fileType = file.type.toLowerCase();
    
    if (fileType === 'application/pdf') {
      return this.scanPDF(file);
    } else if (officeDocumentService.isOfficeDocument(file)) {
      return this.scanOfficeDocument(file);
    } else if (fileType.startsWith('image/')) {
      return this.scanImage(file);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  async scanOfficeDocument(file: File): Promise<OfficeDocumentScanResult> {
    try {
      console.log(`Starting Office document scan for: ${file.name}`);
      
      // Process Office document to extract text and metadata
      const documentData = await officeDocumentService.processDocument(file);
      console.log('Extracted text:', documentData.text);
      
      // Detect PII in extracted text
      const piiDetections = await this.detectPIIInText(documentData.text);
      console.log('PII Detections:', piiDetections);
      
      console.log(`Office document scan completed: ${piiDetections.length} PII detections found`);
      
      return {
        text: documentData.text,
        confidence: documentData.confidence,
        processingMethod: documentData.processingMethod,
        words: [], // Office documents don't have word-level data like OCR
        documentData,
        documentType: documentData.documentType,
        metadata: documentData.metadata
      };
      
    } catch (error) {
      console.error('Office document scan failed:', error);
      throw new Error(`Office document scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  async scanPDF(pdfFile: File): Promise<PDFScanResult> {
    try {
      await this.initialize();
      
      console.log(`Starting PDF scan for: ${pdfFile.name}`);
      
      // Process PDF to extract text and images
      const pdfData = await pdfService.processPDF(pdfFile);
      
      let combinedText = pdfData.extractedText;
      let overallConfidence = 0;
      let totalWords = 0;
      const pageResults = [];
      
      // Process each page
      for (const page of pdfData.pages) {
        let pageText = page.text;
        let ocrUsed = false;
        
        // If page has minimal text and has image data, use OCR
        if (pageText.length < 50 && page.canvas) {
          console.log(`Running OCR on page ${page.pageNumber}`);
          ocrUsed = true;
          
          try {
            const blob = await pdfService.canvasToBlob(page.canvas);
            const ocrResult = await this.scanImage(new File([blob], `page-${page.pageNumber}.png`, { type: 'image/png' }));
            pageText = ocrResult.text;
            overallConfidence += ocrResult.confidence;
            totalWords += ocrResult.words.length;
          } catch (error) {
            console.error(`OCR failed for page ${page.pageNumber}:`, error);
          }
        } else {
          // Use extracted text, assume high confidence for text-based PDFs
          overallConfidence += 95;
          totalWords += pageText.split(/\s+/).length;
        }
        
        // Detect PII in page text
        const piiDetections = await this.detectPIIInText(pageText);
        
        pageResults.push({
          pageNumber: page.pageNumber,
          text: pageText,
          piiDetections,
          ocrUsed
        });
        
        // Add to combined text if OCR was used
        if (ocrUsed && pageText.trim()) {
          combinedText += '\n' + pageText;
        }
      }
      
      // Calculate overall confidence
      const avgConfidence = pdfData.pages.length > 0 ? overallConfidence / pdfData.pages.length : 0;
      
      // Detect PII in combined text
      const allPiiDetections = await this.detectPIIInText(combinedText);
      
      // Determine processing method
      const hasOcrPages = pageResults.some(p => p.ocrUsed);
      const hasTextPages = pageResults.some(p => !p.ocrUsed && p.text.length > 0);
      
      let processingMethod: 'pdf_text' | 'pdf_ocr' | 'hybrid' = 'pdf_text';
      if (hasOcrPages && hasTextPages) {
        processingMethod = 'hybrid';
      } else if (hasOcrPages) {
        processingMethod = 'pdf_ocr';
      }
      
      console.log(`PDF scan completed: ${pdfData.totalPages} pages, ${allPiiDetections.length} PII detections`);
      
      return {
        text: combinedText,
        confidence: avgConfidence,
        totalPages: pdfData.totalPages,
        processingMethod,
        words: [], // Words are handled per page
        pdfData,
        pageResults
      };
      
    } catch (error) {
      console.error('PDF scan failed:', error);
      throw new Error(`PDF scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async scanImage(imageFile: File): Promise<OCRResult> {
    try {
      // Initialize worker if not already done
      await this.initialize();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      console.log(`Starting OCR scan for file: ${imageFile.name}`);
      
      // Perform OCR recognition
      const { data } = await this.worker.recognize(imageFile);
      
      console.log(`OCR completed for ${imageFile.name}. Confidence: ${data.confidence}%`);
      
      // Extract word-level data
      const words = data.words?.map(word => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1
        }
      })) || [];

      return {
        text: data.text || '',
        confidence: data.confidence || 0,
        processingMethod: 'image',
        words
      };
    } catch (error) {
      console.error('OCR scan failed:', error);
      throw new Error(`OCR scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async detectPIIInText(text: string): Promise<PIIDetection[]> {
    try {
      // Use multi-engine detection for best accuracy
      const multiEngineResult = await dlpService.detectPIIMultiEngine(text);
      
      // Convert consolidated findings to our PIIDetection format
      const detections: PIIDetection[] = multiEngineResult.consolidated_findings.map(finding => ({
        type: this.mapEntityTypeToOurType(finding.entity_type),
        value: finding.text,
        confidence: finding.confidence,
        location: {
          start: finding.start,
          end: finding.end
        },
        redacted: finding.redacted,
        detected_by: finding.detected_by,
        entity_type: finding.entity_type,
        analysis_explanation: finding
      }));
      
      console.log(`Multi-engine PII detection found ${detections.length} items using engines: ${multiEngineResult.best_engine}`);
      return detections;
      
    } catch (error) {
      console.error('Multi-engine PII detection failed, falling back to Google DLP only:', error);
      
      // Fallback to Google DLP only
      try {
        const dlpResult = await dlpService.inspectText(text);
        return dlpResult.findings.map(finding => ({
          type: this.mapEntityTypeToOurType(finding.infoType.name),
          value: finding.quote,
          confidence: this.mapDLPLikelihoodToConfidence(finding.likelihood),
          location: {
            start: finding.location.byteRange.start,
            end: finding.location.byteRange.end
          },
          redacted: this.redactByType(finding.quote, finding.infoType.name),
          detected_by: ['google_dlp'],
          entity_type: finding.infoType.name
        }));
      } catch (dlpError) {
        console.error('All PII detection methods failed:', dlpError);
        return [];
      }
    }
  }

  private mapEntityTypeToOurType(entityType: string): string {
    const typeMapping: Record<string, string> = {
      // Google DLP types
      'EMAIL_ADDRESS': 'email',
      'PHONE_NUMBER': 'phone',
      'US_SOCIAL_SECURITY_NUMBER': 'ssn',
      'CREDIT_CARD_NUMBER': 'credit_card',
      'PERSON_NAME': 'name',
      'PERSON': 'name',
      'STREET_ADDRESS': 'address',
      'DATE_OF_BIRTH': 'date_of_birth',
      'US_DRIVERS_LICENSE_NUMBER': 'ssn',
      'PASSPORT': 'ssn',
      'NATIONAL_ID': 'ssn',
      'MEDICAL_RECORD_NUMBER': 'ssn',
      'US_HEALTHCARE_NPI': 'ssn',
      'IBAN_CODE': 'credit_card',
      'IP_ADDRESS': 'address',
      
      // Presidio/spaCy/Transformers types
      'PER': 'name',
      'ORG': 'organization',
      'LOC': 'location',
      'LOCATION': 'location',
      'ORGANIZATION': 'organization',
      'MISC': 'miscellaneous'
    };
    
    return typeMapping[entityType] || 'name';
  }

  private mapDLPLikelihoodToConfidence(likelihood: string): number {
    const confidenceMapping: Record<string, number> = {
      'VERY_LIKELY': 0.95,
      'LIKELY': 0.85,
      'POSSIBLE': 0.70,
      'UNLIKELY': 0.40,
      'VERY_UNLIKELY': 0.20
    };
    
    return confidenceMapping[likelihood] || 0.50;
  }

  private redactByType(value: string, type: string): string {
    switch (type) {
      case 'email': return this.redactEmail(value);
      case 'phone': return this.redactPhone(value);
      case 'ssn': return this.redactSSN(value);
      case 'credit_card': return this.redactCreditCard(value);
      case 'name': return this.redactName(value);
      case 'address': return this.redactAddress(value);
      case 'date_of_birth': return this.redactDateOfBirth(value);
      case 'organization': return this.redactName(value);
      case 'location': return this.redactAddress(value);
      default: return this.redactGeneric(value);
    }
  }

  private redactGeneric(value: string): string {
    if (value.length <= 2) return value;
    return value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1);
  }

  private redactEmail(email: string): string {
    const [local, domain] = email.split('@');
    const redactedLocal = local.charAt(0) + '*'.repeat(Math.max(local.length - 2, 1)) + (local.length > 1 ? local.charAt(local.length - 1) : '');
    return `${redactedLocal}@${domain}`;
  }

  private redactPhone(phone: string): string {
    return phone.replace(/\d/g, (match, index) => {
      const cleanPhone = phone.replace(/\D/g, '');
      const digitIndex = phone.substring(0, index + 1).replace(/\D/g, '').length - 1;
      return digitIndex < 3 || digitIndex >= cleanPhone.length - 4 ? match : '*';
    });
  }

  private redactSSN(ssn: string): string {
    return ssn.replace(/\d/g, (match, index) => {
      const cleanSSN = ssn.replace(/\D/g, '');
      const digitIndex = ssn.substring(0, index + 1).replace(/\D/g, '').length - 1;
      return digitIndex >= cleanSSN.length - 4 ? match : '*';
    });
  }

  private redactCreditCard(cc: string): string {
    return cc.replace(/\d/g, (match, index) => {
      const cleanCC = cc.replace(/\D/g, '');
      const digitIndex = cc.substring(0, index + 1).replace(/\D/g, '').length - 1;
      return digitIndex < 4 || digitIndex >= cleanCC.length - 4 ? match : '*';
    });
  }

  private redactName(name: string): string {
    const parts = name.split(' ');
    return parts.map(part => {
      if (part.length <= 2) return part;
      return part.charAt(0) + '*'.repeat(part.length - 2) + part.charAt(part.length - 1);
    }).join(' ');
  }

  private redactAddress(address: string): string {
    return address.replace(/^\d+/, '***');
  }

  private redactDateOfBirth(dob: string): string {
    return dob.replace(/\d/g, '*');
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        console.log('Tesseract worker terminated');
      } catch (error) {
        console.error('Error terminating Tesseract worker:', error);
      } finally {
        this.worker = null;
        this.isInitialized = false;
      }
    }
  }
}

export const tesseractService = new TesseractService();