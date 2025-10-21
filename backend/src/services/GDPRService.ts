import { GDPRRepository } from '../repositories/GDPRRepository.js';
import type { 
  LawfulBasisRecord, 
  ProcessingRecord, 
  DPIA, 
  DataBreach, 
  DataPortabilityRequest,
  CreateLawfulBasisRequest,
  CreateProcessingRecordRequest,
  CreateDPIARequest,
  CreateDataBreachRequest,
  CreateDataPortabilityRequest,
  GDPRFilters,
  GDPRDashboardStats
} from '../models/GDPR.js';

export class GDPRService {
  constructor(private gdprRepository: GDPRRepository) {}

  // Lawful Basis Management
  async createLawfulBasisRecord(data: CreateLawfulBasisRequest): Promise<LawfulBasisRecord> {
    // Validate lawful basis
    const validBases = [
      'consent', 'contract', 'legal_obligation', 
      'vital_interests', 'public_task', 'legitimate_interests'
    ];
    
    if (!validBases.includes(data.lawfulBasis)) {
      throw new Error('Invalid lawful basis provided');
    }

    return await this.gdprRepository.createLawfulBasisRecord(data);
  }

  async getLawfulBasisRecords(filters: GDPRFilters = {}): Promise<LawfulBasisRecord[]> {
    return await this.gdprRepository.getLawfulBasisRecords(filters);
  }

  async updateLawfulBasisRecord(id: string, updates: Partial<LawfulBasisRecord>): Promise<LawfulBasisRecord> {
    return await this.gdprRepository.updateLawfulBasisRecord(id, updates);
  }

  async deleteLawfulBasisRecord(id: string): Promise<void> {
    return await this.gdprRepository.deleteLawfulBasisRecord(id);
  }

  // Processing Records Management
  async createProcessingRecord(data: CreateProcessingRecordRequest): Promise<ProcessingRecord> {
    // Validate required fields
    if (!data.activityName || !data.controller || !data.lawfulBasis) {
      throw new Error('Missing required fields for processing record');
    }

    return await this.gdprRepository.createProcessingRecord(data);
  }

  async getProcessingRecords(filters: GDPRFilters = {}): Promise<ProcessingRecord[]> {
    return await this.gdprRepository.getProcessingRecords(filters);
  }

  async exportProcessingRecords(): Promise<string> {
    const records = await this.gdprRepository.getProcessingRecords();
    
    // Generate CSV content
    const headers = [
      'Activity Name', 'Controller', 'Processor', 'Purposes', 'Lawful Basis',
      'Data Categories', 'Data Subjects', 'Recipients', 'Third Country Transfers',
      'Retention Period', 'Technical Measures', 'Organisational Measures', 'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...records.map(record => [
        `"${record.activityName}"`,
        `"${record.controller}"`,
        `"${record.processor || ''}"`,
        `"${record.purposes.join('; ')}"`,
        `"${record.lawfulBasis}"`,
        `"${record.dataCategories.join('; ')}"`,
        `"${record.dataSubjects.join('; ')}"`,
        `"${record.recipients.join('; ')}"`,
        record.thirdCountryTransfers ? 'Yes' : 'No',
        `"${record.retentionPeriod}"`,
        `"${record.technicalMeasures.join('; ')}"`,
        `"${record.organisationalMeasures.join('; ')}"`,
        record.createdAt.toISOString()
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  // DPIA Management
  async createDPIA(data: CreateDPIARequest): Promise<DPIA> {
    // Validate processing type
    const validTypes = [
      'Automated Decision Making', 'Systematic Monitoring', 'Profiling',
      'Large Scale Processing', 'Special Category Data', 'Biometric Processing',
      'Genetic Processing', 'Location Tracking', 'Vulnerable Groups', 'New Technology'
    ];

    if (!validTypes.includes(data.processingType)) {
      throw new Error('Invalid processing type for DPIA');
    }

    return await this.gdprRepository.createDPIA(data);
  }

  async getDPIAs(filters: GDPRFilters = {}): Promise<DPIA[]> {
    return await this.gdprRepository.getDPIAs(filters);
  }

  async updateDPIA(id: string, updates: Partial<DPIA>): Promise<DPIA> {
    // If status is being updated to approved, set completion date
    if (updates.status === 'approved' && !updates.completedDate) {
      updates.completedDate = new Date();
    }

    return await this.gdprRepository.updateDPIA(id, updates);
  }

  async assessDPIARisk(id: string, riskLevel: 'low' | 'medium' | 'high'): Promise<DPIA> {
    const updates: Partial<DPIA> = { riskLevel };
    
    // Determine if supervisory authority consultation is required
    if (riskLevel === 'high') {
      updates.status = 'requires_consultation';
    }

    return await this.gdprRepository.updateDPIA(id, updates);
  }

  // Data Breach Management
  async createDataBreach(data: CreateDataBreachRequest): Promise<DataBreach> {
    // Validate severity and affected data subjects
    if (data.affectedDataSubjects < 0) {
      throw new Error('Affected data subjects count cannot be negative');
    }

    return await this.gdprRepository.createDataBreach(data);
  }

  async getDataBreaches(filters: GDPRFilters = {}): Promise<DataBreach[]> {
    return await this.gdprRepository.getDataBreaches(filters);
  }

  async updateDataBreach(id: string, updates: Partial<DataBreach>): Promise<DataBreach> {
    // If status is being updated to reported, set reported date
    if (updates.status === 'reported' && !updates.reportedDate) {
      updates.reportedDate = new Date();
    }

    return await this.gdprRepository.updateDataBreach(id, updates);
  }

  async notifySupervisoryAuthority(id: string): Promise<DataBreach> {
    const updates: Partial<DataBreach> = {
      supervisoryAuthorityNotified: true,
      reportedDate: new Date(),
      status: 'reported'
    };

    return await this.gdprRepository.updateDataBreach(id, updates);
  }

  async notifyDataSubjects(id: string): Promise<DataBreach> {
    const updates: Partial<DataBreach> = {
      dataSubjectsNotified: true
    };

    return await this.gdprRepository.updateDataBreach(id, updates);
  }

  // Data Portability Management
  async createDataPortabilityRequest(data: CreateDataPortabilityRequest): Promise<DataPortabilityRequest> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.dataSubjectEmail)) {
      throw new Error('Invalid email address format');
    }

    return await this.gdprRepository.createDataPortabilityRequest(data);
  }

  async getDataPortabilityRequests(filters: GDPRFilters = {}): Promise<DataPortabilityRequest[]> {
    return await this.gdprRepository.getDataPortabilityRequests(filters);
  }

  async processDataPortabilityRequest(id: string): Promise<DataPortabilityRequest> {
    // In a real implementation, this would trigger data extraction
    const updates: Partial<DataPortabilityRequest> = {
      status: 'processing'
    };

    return await this.gdprRepository.updateDataPortabilityRequest(id, updates);
  }

  async completeDataPortabilityRequest(id: string, fileSize: string): Promise<DataPortabilityRequest> {
    const updates: Partial<DataPortabilityRequest> = {
      status: 'ready',
      completionDate: new Date(),
      fileSize
    };

    return await this.gdprRepository.updateDataPortabilityRequest(id, updates);
  }

  async deliverDataPortabilityRequest(id: string): Promise<DataPortabilityRequest> {
    const request = await this.gdprRepository.getDataPortabilityRequestById(id);
    if (!request) {
      throw new Error('Data portability request not found');
    }

    const updates: Partial<DataPortabilityRequest> = {
      status: 'delivered',
      downloadCount: request.downloadCount + 1
    };

    return await this.gdprRepository.updateDataPortabilityRequest(id, updates);
  }

  // Dashboard and Analytics
  async getDashboardStats(): Promise<GDPRDashboardStats> {
    const [
      lawfulBasisRecords,
      processingRecords,
      dpias,
      breaches,
      portabilityRequests
    ] = await Promise.all([
      this.gdprRepository.getLawfulBasisRecords(),
      this.gdprRepository.getProcessingRecords(),
      this.gdprRepository.getDPIAs(),
      this.gdprRepository.getDataBreaches(),
      this.gdprRepository.getDataPortabilityRequests()
    ]);

    // Calculate compliance metrics
    const totalLawfulBasis = lawfulBasisRecords.length;
    const activeLawfulBasis = lawfulBasisRecords.filter(r => r.status === 'active').length;
    const lawfulBasisCoverage = totalLawfulBasis > 0 ? (activeLawfulBasis / totalLawfulBasis) * 100 : 0;

    const completedDPIAs = dpias.filter(d => d.status === 'approved').length;
    
    // Calculate breach response time
    const resolvedBreaches = breaches.filter(b => b.status === 'resolved' && b.reportedDate);
    const avgResponseTime = resolvedBreaches.length > 0 
      ? resolvedBreaches.reduce((sum, breach) => {
          const responseTime = breach.reportedDate!.getTime() - breach.discoveryDate.getTime();
          return sum + responseTime;
        }, 0) / resolvedBreaches.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    const breachResponseTime = avgResponseTime < 72 ? '< 72h' : `${Math.round(avgResponseTime)}h`;

    // Recent activities
    const recentActivities = [
      ...dpias.slice(0, 2).map(dpia => ({
        id: dpia.id,
        type: 'DPIA',
        description: `${dpia.title} ${dpia.status}`,
        timestamp: dpia.updatedAt,
        status: dpia.status
      })),
      ...breaches.slice(0, 2).map(breach => ({
        id: breach.id,
        type: 'Breach',
        description: breach.title,
        timestamp: breach.updatedAt,
        status: breach.status
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 4);

    // Calculate overall compliance score
    const complianceFactors = [
      lawfulBasisCoverage,
      (completedDPIAs / Math.max(dpias.length, 1)) * 100,
      avgResponseTime < 72 ? 100 : Math.max(0, 100 - (avgResponseTime - 72) * 2)
    ];
    
    const overallScore = Math.round(
      complianceFactors.reduce((sum, factor) => sum + factor, 0) / complianceFactors.length
    );

    return {
      overallScore,
      lawfulBasisCoverage: Math.round(lawfulBasisCoverage),
      dpiasCompleted: completedDPIAs,
      recordsOfProcessing: processingRecords.length,
      breachResponseTime,
      dataPortabilityRequests: portabilityRequests.length,
      complianceByCategory: {
        principles: 85,
        rights: 90,
        obligations: 88,
        governance: 92,
        security: 80
      },
      recentActivities
    };
  }

  // Compliance Matrix
  async getComplianceMatrix(): Promise<any[]> {
    // This would typically be stored in the database
    // For now, returning a static compliance matrix
    return [
      {
        id: '1',
        article: 'Article 5',
        requirement: 'Lawfulness, fairness and transparency',
        description: 'Personal data shall be processed lawfully, fairly and in a transparent manner',
        status: 'compliant',
        evidence: ['Lawful basis documentation', 'Privacy notices', 'Consent records'],
        responsible: 'Data Protection Officer',
        lastReviewed: new Date('2024-01-15'),
        nextReview: new Date('2024-07-15'),
        priority: 'high',
        category: 'principles'
      },
      // Add more compliance items as needed
    ];
  }

  // Audit and Reporting
  async generateComplianceReport(filters: GDPRFilters = {}): Promise<any> {
    const stats = await this.getDashboardStats();
    const lawfulBasisRecords = await this.getLawfulBasisRecords(filters);
    const processingRecords = await this.getProcessingRecords(filters);
    const dpias = await this.getDPIAs(filters);
    const breaches = await this.getDataBreaches(filters);

    return {
      generatedAt: new Date(),
      reportPeriod: {
        from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: filters.dateTo || new Date()
      },
      summary: stats,
      details: {
        lawfulBasisRecords: lawfulBasisRecords.length,
        processingRecords: processingRecords.length,
        dpiasCompleted: dpias.filter(d => d.status === 'approved').length,
        breachesReported: breaches.filter(b => b.supervisoryAuthorityNotified).length
      },
      recommendations: this.generateRecommendations(stats, breaches, dpias)
    };
  }

  private generateRecommendations(stats: GDPRDashboardStats, breaches: DataBreach[], dpias: DPIA[]): string[] {
    const recommendations: string[] = [];

    if (stats.overallScore < 80) {
      recommendations.push('Overall compliance score is below 80%. Consider reviewing and updating privacy policies and procedures.');
    }

    if (stats.lawfulBasisCoverage < 90) {
      recommendations.push('Lawful basis coverage is incomplete. Review all processing activities to ensure proper legal basis documentation.');
    }

    const pendingBreaches = breaches.filter(b => b.status !== 'resolved').length;
    if (pendingBreaches > 0) {
      recommendations.push(`${pendingBreaches} data breaches are still pending resolution. Prioritize breach response activities.`);
    }

    const pendingDPIAs = dpias.filter(d => d.status === 'draft' || d.status === 'in_review').length;
    if (pendingDPIAs > 0) {
      recommendations.push(`${pendingDPIAs} DPIAs are pending completion. Complete risk assessments for high-risk processing activities.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('GDPR compliance appears to be well-maintained. Continue regular monitoring and reviews.');
    }

    return recommendations;
  }
}
