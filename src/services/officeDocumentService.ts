// Office Document Processing Service
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface OfficeDocumentResult {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    createdDate?: Date;
    modifiedDate?: Date;
    pageCount?: number;
    wordCount?: number;
    slideCount?: number;
    sheetCount?: number;
  };
  documentType: 'word' | 'excel' | 'powerpoint' | 'text';
  processingMethod: 'text_extraction' | 'text';
  confidence: number;
}

class OfficeDocumentService {
  async processDocument(file: File): Promise<OfficeDocumentResult> {
    const fileType = this.getDocumentType(file);
    
    try {
      console.log(`Processing ${fileType} document: ${file.name}`);
      
      // For demo purposes, we'll simulate document processing
      // In production, you would use libraries like:
      // - mammoth.js for Word documents
      // - xlsx for Excel files
      // - officegen or similar for PowerPoint
      
      const simulatedText = await this.simulateTextExtraction(file, fileType);
      let metadata;
      if (fileType === 'text') {
        metadata = {
          title: file.name.replace(/\.[^/.]+$/, ""),
          author: 'Unknown',
          creator: 'Unknown',
          createdDate: new Date(),
          modifiedDate: new Date(),
          wordCount: simulatedText.split(/\s+/).length
        };
      } else {
        metadata = await this.extractMetadata(file, fileType as 'word' | 'excel' | 'powerpoint');
      }
      
      return {
        text: simulatedText,
        metadata,
        documentType: fileType,
        processingMethod: fileType === 'text' ? 'text' : 'text_extraction',
        confidence: 95
      };
      
    } catch (error) {
      console.error('Office document processing failed:', error);
      throw new Error(`Failed to process ${fileType} document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getDocumentType(file: File): 'word' | 'excel' | 'powerpoint' | 'text' {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Word documents
    if (mimeType.includes('wordprocessingml') || 
        mimeType.includes('msword') ||
        fileName.endsWith('.docx') || 
        fileName.endsWith('.doc')) {
      return 'word';
    }
    // Excel documents
    if (mimeType.includes('spreadsheetml') || 
        mimeType.includes('excel') ||
        fileName.endsWith('.xlsx') || 
        fileName.endsWith('.xls')) {
      return 'excel';
    }
    // PowerPoint documents
    if (mimeType.includes('presentationml') || 
        mimeType.includes('powerpoint') ||
        fileName.endsWith('.pptx') || 
        fileName.endsWith('.ppt')) {
      return 'powerpoint';
    }
    // Plain text files
    if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
      return 'text';
    }
    return 'word'; // Default fallback
  }

  private async simulateTextExtraction(file: File, type: 'word' | 'excel' | 'powerpoint' | 'text'): Promise<string> {
    // Real extraction for Word
    if (type === 'word') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        return value;
      } catch (err) {
        console.error('Failed to extract Word text:', err);
        return '';
      }
    }
    // Real extraction for Excel
    if (type === 'excel') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        let text = '';
        workbook.SheetNames.forEach((sheetName: string) => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_csv(worksheet);
          text += `\nSheet: ${sheetName}\n${sheetText}`;
        });
        return text;
      } catch (err) {
        console.error('Failed to extract Excel text:', err);
        return '';
      }
    }
    // Plain text extraction
    if (type === 'text') {
      try {
        const text = await file.text();
        return text;
      } catch (err) {
        console.error('Failed to extract text from .txt file:', err);
        return '';
      }
    }
    // PowerPoint: not implemented yet
    if (type === 'powerpoint') {
      console.log(`Text extraction not implemented for PowerPoint documents. File: ${file.name}`);
      return '';
    }
    // Fallback
    return '';
  }

  private generateSampleContent(type: 'word' | 'excel' | 'powerpoint', fileName: string): string {
    // Return empty string - actual text extraction would be implemented here
    // In a real implementation, this would use libraries like:
    // - mammoth.js for Word documents
    // - xlsx for Excel files  
    // - officegen or similar for PowerPoint
    console.log(`Text extraction not implemented for ${type} documents. File: ${fileName}`);
    return '';
  }

  private async extractMetadata(file: File, type: 'word' | 'excel' | 'powerpoint'): Promise<OfficeDocumentResult['metadata']> {
    // In a real implementation, this would extract actual metadata from the file
    const baseMetadata = {
      title: file.name.replace(/\.[^/.]+$/, ""), // Use actual filename
      author: 'Unknown', // Would be extracted from file metadata
      creator: 'Unknown', // Would be extracted from file metadata
      createdDate: new Date(), // Would be extracted from file metadata
      modifiedDate: new Date(), // Would be extracted from file metadata
    };

    switch (type) {
      case 'word':
        return {
          ...baseMetadata,
          subject: 'Document', // Would be extracted from file metadata
          pageCount: 1, // Would be calculated from actual content
          wordCount: 0, // Would be calculated from actual content
        };

      case 'excel':
        return {
          ...baseMetadata,
          subject: 'Spreadsheet', // Would be extracted from file metadata
          sheetCount: 1, // Would be calculated from actual content
          wordCount: 0, // Would be calculated from actual content
        };

      case 'powerpoint':
        return {
          ...baseMetadata,
          subject: 'Presentation', // Would be extracted from file metadata
          slideCount: 1, // Would be calculated from actual content
          wordCount: 0, // Would be calculated from actual content
        };

      default:
        return baseMetadata;
    }
  }

  isOfficeDocument(file: File): boolean {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument',
      'application/vnd.ms-',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'text/plain'
    ];
    
    const officeExtensions = [
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'
    ];
    
    return officeTypes.some(type => mimeType.includes(type)) ||
           officeExtensions.some(ext => fileName.endsWith(ext));
  }

  getSupportedFormats(): string[] {
    return [
      '.doc', '.docx',   // Word documents
      '.xls', '.xlsx',   // Excel spreadsheets
      '.ppt', '.pptx',   // PowerPoint presentations
      '.txt'             // Plain text files
    ];
  }
}

export const officeDocumentService = new OfficeDocumentService();