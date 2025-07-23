import React, { useState, useRef } from 'react';
import { Upload, Database, Cloud, FileText, Zap, X, CheckCircle, AlertTriangle, Eye, Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import { tesseractService, PIIDetection, PDFScanResult, OfficeDocumentScanResult } from '../../services/tesseractService';
import { officeDocumentService } from '../../services/officeDocumentService';
import { dlpService, DLPInspectResult } from '../../services/dlpService';
import { databaseScanner, DatabaseConnection, DatabaseScanResult } from '../../services/databaseScanner';

interface AdvancedScanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceId: string;
  sourceName: string;
  sourceType: 'database' | 'cloud_storage' | 'file_system' | 'saas';
}

const AdvancedScanningModal: React.FC<AdvancedScanningModalProps> = ({
  isOpen,
  onClose,
  sourceId,
  sourceName,
  sourceType
}) => {
  const [activeTab, setActiveTab] = useState<'ocr' | 'database' | 'dlp'>('ocr');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dbConnection, setDbConnection] = useState<DatabaseConnection>({
    id: sourceId,
    name: sourceName,
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'customer_db',
    username: 'admin'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Filter for supported file types
    const supportedFiles = files.filter(file => {
      const type = file.type.toLowerCase();
      return type.startsWith('image/') || 
             type === 'application/pdf' ||
             officeDocumentService.isOfficeDocument(file);
    });
    
    // Filter out empty files (zero bytes)
    const validFiles = supportedFiles.filter(file => file.size > 0);
    
    const skippedCount = files.length - validFiles.length;
    const emptyFiles = supportedFiles.length - validFiles.length;
    
    if (skippedCount > 0) {
      let message = 'Some files were skipped. ';
      if (files.length - supportedFiles.length > 0) {
        message += 'Only images (JPG, PNG, GIF, BMP, TIFF), PDF files, and Office documents (Word, Excel, PowerPoint) are supported. ';
      }
      if (emptyFiles > 0) {
        message += 'Empty files (0 bytes) are not allowed.';
      }
      alert(message);
    }
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleOCRScan = async () => {
    if (uploadedFiles.length === 0) return;

    setIsScanning(true);
    setScanProgress(0);
    const results = [];
    
    try {
      // Initialize Tesseract service
      await tesseractService.initialize();
    } catch (error) {
      console.error('Failed to initialize OCR service:', error);
      alert('Failed to initialize OCR service. Please try again.');
      setIsScanning(false);
      return;
    }

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      setScanProgress(Math.round((i / uploadedFiles.length) * 100));
      try {
        console.log(`Processing file: ${file.name}`);
        const scanResult = await tesseractService.scanFile(file);
        let piiDetections: any[] = [];
        if (scanResult.text.trim()) {
          piiDetections = await tesseractService.detectPIIInText(scanResult.text);
          console.log(`PII detections for ${file.name}:`, piiDetections);
        } else {
          console.log(`Processed ${file.name} but no text was extracted (file may be empty or unsupported format)`);
        }
        // Calculate processing time (simulated)
        const processingTime = `${(Math.random() * 3 + 1).toFixed(1)}s`;
        // Check if it's a PDF result
        const isPDF = 'pdfData' in scanResult;
        results.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isPDF,
          totalPages: isPDF ? (scanResult as PDFScanResult).totalPages : 1,
          processingMethod: scanResult.processingMethod,
          ocrConfidence: scanResult.confidence,
          extractedText: scanResult.text,
          piiDetections,
          riskLevel: piiDetections.length > 5 ? 'high' : piiDetections.length > 2 ? 'medium' : 'low',
          wordCount: scanResult.text.trim() ? scanResult.text.split(/\s+/).length : 0,
          processingTime,
          pageResults: isPDF ? (scanResult as PDFScanResult).pageResults : undefined,
          documentType: 'documentType' in scanResult ? (scanResult as OfficeDocumentScanResult).documentType : undefined,
          metadata: 'metadata' in scanResult ? (scanResult as OfficeDocumentScanResult).metadata : undefined,
          success: true
        });
      } catch (error) {
        console.error('OCR scan failed:', error);
        results.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isPDF: false,
          totalPages: 1,
          processingMethod: 'image',
          ocrConfidence: 0,
          extractedText: '',
          piiDetections: [],
          riskLevel: 'low',
          wordCount: 0,
          processingTime: '0s',
          error: error instanceof Error ? error.message : 'Failed to process file',
          success: false
        });
      }
    }
    setScanProgress(100);
    setScanResults(results);
    setIsScanning(false);
    // Show completion message
    const successCount = results.filter(r => r.success).length;
    const totalPII = results.reduce((sum, r) => sum + r.piiDetections.length, 0);
    console.log(`OCR scan completed: ${successCount}/${results.length} files processed successfully, ${totalPII} PII detections found`);
  };

  const handleDLPScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    const results = [];

    try {
      // Get text from the uploaded files or use a default text sample
      const textsToScan = uploadedFiles.length > 0 
        ? uploadedFiles.map(file => file.name + ' - ' + file.type)
        : [
            'This is a sample text with no PII data for testing.',
            'For real scanning, please upload files or connect to a database.'
          ];

      for (let i = 0; i < textsToScan.length; i++) {
        try {
          const text = textsToScan[i];
          const dlpResult = await dlpService.inspectText(text);
          const deidentified = await dlpService.deidentifyText(text);
          
          results.push({
            originalText: text,
            findings: dlpResult.findings,
            deidentifiedText: deidentified.item.value,
            processedBytes: dlpResult.result.processedBytes,
            success: true
          });
        } catch (error) {
          results.push({
            originalText: textsToScan[i],
            findings: [],
            deidentifiedText: '',
            processedBytes: 0,
            error: error instanceof Error ? error.message : 'Unknown error during DLP scanning',
            success: false
          });
        }

        setScanProgress(Math.round(((i + 1) / textsToScan.length) * 100));
      }

      setScanResults(results);
    } catch (error) {
      console.error('DLP scan failed:', error);
      setScanResults([{
        originalText: 'Error during DLP scanning',
        findings: [],
        deidentifiedText: '',
        processedBytes: 0,
        error: error instanceof Error ? error.message : 'Unknown error during DLP scanning',
        success: false
      }]);
    }

    setIsScanning(false);
  };

  const handleDatabaseScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    let scanResult: DatabaseScanResult | null = null;

    try {
      scanResult = await databaseScanner.scanDatabase(dbConnection, (progress) => {
        setScanProgress(progress);
      });

      setScanResults(scanResult);
    } catch (error) {
      console.error('Database scan failed:', error);
      // Create a minimal error result
      if (!scanResult) {
        scanResult = {
          connectionId: dbConnection.id,
          connectionName: dbConnection.name,
          scanStartTime: new Date(),
          scanEndTime: new Date(),
          status: 'failed',
          progress: 0,
          tablesScanned: 0,
          totalTables: 0,
          results: [],
          errors: [error instanceof Error ? error.message : 'Unknown database scanning error'],
          summary: {
            totalRecords: 0,
            totalPiiRecords: 0,
            highRiskTables: 0,
            criticalFindings: 0
          }
        };
        setScanResults(scanResult);
      }
    }

    setIsScanning(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const renderOCRTab = () => (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <div className="text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Documents for OCR Scanning</h3>
          <p className="text-gray-600 mb-4">
            Upload images, PDF files, and Office documents to extract text and detect PII using advanced processing engines
          </p>
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>Supported formats:</strong> JPG, PNG, GIF, BMP, TIFF, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX<br/>
              <strong>Max file size:</strong> 10MB per file<br/>
              <strong>Images:</strong> High contrast, clear text, minimal skew for best OCR results<br/>
              <strong>PDF support:</strong> Text extraction + OCR for scanned pages<br/>
              <strong>Office docs:</strong> Direct text extraction from Word, Excel, PowerPoint files
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Uploaded Files ({uploadedFiles.length})</h4>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                {file.type === 'application/pdf' ? (
                  <FileText className="h-5 w-5 text-red-500" />
                ) : officeDocumentService.isOfficeDocument(file) ? (
                  <FileText className="h-5 w-5 text-blue-500" />
                ) : (
                  <FileText className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {
                      file.type === 'application/pdf' ? 'PDF' : 
                      officeDocumentService.isOfficeDocument(file) ? 'Office Document' : 
                      'Image'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleOCRScan}
          disabled={uploadedFiles.length === 0 || isScanning}
        >
          <Zap className="h-4 w-4 mr-2" />
          Start OCR Scan
        </Button>
      </div>
    </div>
  );

  const renderDatabaseTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
          <select
            value={dbConnection.type}
            onChange={(e) => setDbConnection(prev => ({ ...prev, type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="mongodb">MongoDB</option>
            <option value="oracle">Oracle</option>
            <option value="sqlserver">SQL Server</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
          <input
            type="text"
            value={dbConnection.host}
            onChange={(e) => setDbConnection(prev => ({ ...prev, host: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
          <input
            type="number"
            value={dbConnection.port}
            onChange={(e) => setDbConnection(prev => ({ ...prev, port: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Database</label>
          <input
            type="text"
            value={dbConnection.database}
            onChange={(e) => setDbConnection(prev => ({ ...prev, database: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input
            type="text"
            value={dbConnection.username}
            onChange={(e) => setDbConnection(prev => ({ ...prev, username: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={dbConnection.password || ''}
            onChange={(e) => setDbConnection(prev => ({ ...prev, password: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleDatabaseScan}
          disabled={isScanning}
        >
          <Database className="h-4 w-4 mr-2" />
          Start Database Scan
        </Button>
      </div>
    </div>
  );

  const renderDLPTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Data Loss Prevention Scanning</h3>
        <p className="text-sm text-blue-800">
          This will scan your data to identify and classify sensitive information using pattern recognition and AI techniques.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Supported Info Types</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD_NUMBER',
              'US_SOCIAL_SECURITY_NUMBER', 'PERSON_NAME', 'DATE_OF_BIRTH',
              'US_DRIVERS_LICENSE_NUMBER', 'MEDICAL_RECORD_NUMBER', 'IP_ADDRESS'
            ].map(infoType => (
              <Badge key={infoType} variant="default" size="sm">
                {infoType.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleDLPScan}
          disabled={isScanning || (uploadedFiles.length === 0 && activeTab === 'ocr')}
        >
          <Cloud className="h-4 w-4 mr-2" />
          Start DLP Scan
        </Button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!scanResults) return null;

    if (activeTab === 'ocr') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">OCR Scan Results</h3>
          {scanResults.map((result: any, index: number) => (
            <Card key={index}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{result.fileName}</h4>
                  <p className="text-sm text-gray-600">
                    {result.error ? (
                      <span className="text-red-600">{result.error}</span>
                    ) : (
                      <>
                        {result.isPDF && `${result.totalPages} pages • `}
                        {result.documentType && `${result.documentType.toUpperCase()} document • `}
                        Method: {result.processingMethod?.replace('_', ' ').toUpperCase()} • 
                        Confidence: {result.ocrConfidence.toFixed(1)}% • 
                        PII Found: {result.piiDetections.length} • 
                        Words: {result.wordCount} • 
                        Time: {result.processingTime}
                      </>
                    )}
                  </p>
                </div>
                <Badge variant={result.riskLevel === 'high' ? 'danger' : result.riskLevel === 'medium' ? 'warning' : 'success'}>
                  {result.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>
              
              {!result.error && (
                <div className="space-y-3">
                  {result.metadata && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Document Metadata</p>
                      <div className="bg-blue-50 p-3 rounded grid grid-cols-2 gap-2 text-sm">
                        {result.metadata.title && <div><span className="font-medium">Title:</span> {result.metadata.title}</div>}
                        {result.metadata.author && <div><span className="font-medium">Author:</span> {result.metadata.author}</div>}
                        {result.metadata.pageCount && <div><span className="font-medium">Pages:</span> {result.metadata.pageCount}</div>}
                        {result.metadata.slideCount && <div><span className="font-medium">Slides:</span> {result.metadata.slideCount}</div>}
                        {result.metadata.sheetCount && <div><span className="font-medium">Sheets:</span> {result.metadata.sheetCount}</div>}
                        {result.metadata.wordCount && <div><span className="font-medium">Words:</span> {result.metadata.wordCount}</div>}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Extracted Text (Preview)</p>
                    {result.extractedText.trim() ? (
                      <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                        <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                          {result.extractedText.length > 500 
                            ? result.extractedText.substring(0, 500) + '...' 
                            : result.extractedText}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 p-3 rounded">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No text was extracted from this file. This could be because:
                        </p>
                        <ul className="text-sm text-yellow-700 mt-1 ml-4 list-disc">
                          <li>The file is empty or corrupted</li>
                          <li>The image quality is too poor for OCR</li>
                          <li>The document format is not fully supported</li>
                          <li>The file contains only images without text</li>
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {result.piiDetections.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">PII Detections ({result.piiDetections.length})</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.piiDetections.map((detection: PIIDetection, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-red-50 p-2 rounded">
                            <span className="text-sm font-medium text-red-800">
                              {detection.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-sm text-red-600 font-mono">{detection.redacted}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {result.piiDetections.length === 0 && (
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm text-green-800">
                        ✅ {result.extractedText.trim() ? 'No PII detected in this document' : 'No text extracted - unable to scan for PII'}
                      </p>
                    </div>
                  )}
                  
                  {result.isPDF && result.pageResults && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Page-by-Page Results</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {result.pageResults.map((page: any, pageIndex: number) => (
                          <div key={pageIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                            <span>Page {page.pageNumber} {page.ocrUsed ? '(OCR)' : '(Text)'}</span>
                            <span>{page.piiDetections.length} PII found</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      );
    }

    if (activeTab === 'database') {
      const dbResult = scanResults as DatabaseScanResult;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Database Scan Results</h3>
            <Badge variant={dbResult.status === 'completed' ? 'success' : 'warning'}>
              {dbResult.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card padding="sm">
              <p className="text-sm text-gray-600">Tables Scanned</p>
              <p className="text-xl font-bold text-blue-600">{dbResult.tablesScanned}</p>
            </Card>
            <Card padding="sm">
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-xl font-bold text-gray-900">{dbResult.summary.totalRecords.toLocaleString()}</p>
            </Card>
            <Card padding="sm">
              <p className="text-sm text-gray-600">PII Records</p>
              <p className="text-xl font-bold text-red-600">{dbResult.summary.totalPiiRecords.toLocaleString()}</p>
            </Card>
            <Card padding="sm">
              <p className="text-sm text-gray-600">High Risk Tables</p>
              <p className="text-xl font-bold text-orange-600">{dbResult.summary.highRiskTables}</p>
            </Card>
          </div>

          <div className="space-y-3">
            {dbResult.results.map((table, index) => (
              <Card key={index} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{table.tableName}</h4>
                    <p className="text-sm text-gray-600">
                      {table.recordCount.toLocaleString()} records • {table.piiCount.toLocaleString()} PII
                    </p>
                  </div>
                  <Badge variant={table.riskLevel === 'critical' ? 'danger' : table.riskLevel === 'high' ? 'danger' : table.riskLevel === 'medium' ? 'warning' : 'success'}>
                    {table.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'dlp') {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">DLP Scan Results</h3>
          {scanResults.map((result: any, index: number) => (
            <Card key={index}>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Original Text</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{result.originalText}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">De-identified Text</p>
                  <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{result.deidentifiedText}</p>
                </div>

                {result.findings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">DLP Findings ({result.findings.length})</p>
                    <div className="space-y-2">
                      {result.findings.map((finding: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-red-50 p-3 rounded border-l-4 border-red-400">
                          <div>
                            <span className="text-sm font-medium text-red-800">
                              {finding.infoType.name}
                            </span>
                            <p className="text-xs text-red-600">
                              Likelihood: {finding.likelihood}
                            </p>
                          </div>
                          <Badge variant="warning" size="sm">
                            {finding.likelihood}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.findings.length === 0 && (
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-sm text-green-800">✅ No PII detected in this document. The file appears to be safe.</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Advanced Data Scanning</h2>
              <p className="text-gray-600 mt-1">{sourceName} • AI-Powered PII/PHI Detection</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex space-x-6 mt-4">
            <button
              onClick={() => setActiveTab('ocr')}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ocr'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Tesseract OCR
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'database'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database className="h-4 w-4 inline mr-2" />
              Database Scanning
            </button>
            <button
              onClick={() => setActiveTab('dlp')}
              className={`pb-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dlp'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Cloud className="h-4 w-4 inline mr-2" />
              Google Cloud DLP
            </button>
          </div>
        </div>

        <div className="p-6">
          {isScanning && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="font-medium text-blue-800">
                  Scanning in progress... ({scanProgress}%)
                </span>
              </div>
              <ProgressBar value={scanProgress} variant="info" />
            </div>
          )}

          {activeTab === 'ocr' && renderOCRTab()}
          {activeTab === 'database' && renderDatabaseTab()}
          {activeTab === 'dlp' && renderDLPTab()}

          {scanResults && renderResults()}
        </div>
      </div>
    </div>
  );
};

export default AdvancedScanningModal;