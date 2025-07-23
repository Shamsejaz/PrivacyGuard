import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PDFPageData {
  pageNumber: number;
  text: string;
  imageData?: ImageData;
  canvas?: HTMLCanvasElement;
}

export interface PDFProcessingResult {
  totalPages: number;
  extractedText: string;
  pages: PDFPageData[];
  hasImages: boolean;
  processingTime: number;
}

class PDFService {
  async processPDF(file: File): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting PDF processing for: ${file.name}`);
      
      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      console.log(`PDF loaded successfully. Total pages: ${totalPages}`);
      
      const pages: PDFPageData[] = [];
      let extractedText = '';
      let hasImages = false;
      
      // Process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        console.log(`Processing page ${pageNum}/${totalPages}`);
        
        const page = await pdf.getPage(pageNum);
        
        // Extract text content
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        // Render page to canvas for OCR if needed
        let canvas: HTMLCanvasElement | undefined;
        let imageData: ImageData | undefined;
        
        // Check if page has minimal text (might be scanned document)
        if (pageText.length < 50) {
          console.log(`Page ${pageNum} has minimal text, rendering for OCR`);
          hasImages = true;
          
          const viewport = page.getViewport({ scale: 2.0 });
          canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          
          await page.render(renderContext).promise;
          imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        pages.push({
          pageNumber: pageNum,
          text: pageText,
          imageData,
          canvas
        });
        
        extractedText += pageText + '\n';
      }
      
      const processingTime = Date.now() - startTime;
      
      console.log(`PDF processing completed in ${processingTime}ms`);
      
      return {
        totalPages,
        extractedText: extractedText.trim(),
        pages,
        hasImages,
        processingTime
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async extractImagesFromPDF(file: File): Promise<HTMLCanvasElement[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const canvases: HTMLCanvasElement[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        canvases.push(canvas);
      }
      
      return canvases;
    } catch (error) {
      console.error('PDF image extraction failed:', error);
      throw new Error(`PDF image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }
}

export const pdfService = new PDFService();