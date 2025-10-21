import { 
  Document, 
  DocumentVersion, 
  DocumentApproval, 
  DocumentWorkflow, 
  DocumentTemplate,
  DocumentLifecycle,
  DocumentComment,
  DocumentSearchFilters,
  DocumentStats,
  DigitalSignature,
  ApprovalStatus,
  DocumentStatus,
  VersionStatus
} from '../types/document-management';

class DocumentManagementService {
  private baseUrl = '/api/documents';

  // Document CRUD operations
  async getDocuments(filters?: DocumentSearchFilters): Promise<Document[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && 'start' in value) {
            params.append(`${key}[start]`, value.start.toISOString());
            params.append(`${key}[end]`, value.end.toISOString());
          } else if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  }

  async getDocument(id: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch document');
    return response.json();
  }

  async createDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Document> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document)
    });
    if (!response.ok) throw new Error('Failed to create document');
    return response.json();
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update document');
    return response.json();
  }

  async deleteDocument(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete document');
  }

  // Version control operations
  async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const response = await fetch(`${this.baseUrl}/${documentId}/versions`);
    if (!response.ok) throw new Error('Failed to fetch document versions');
    return response.json();
  }

  async getDocumentVersion(documentId: string, version: number): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseUrl}/${documentId}/versions/${version}`);
    if (!response.ok) throw new Error('Failed to fetch document version');
    return response.json();
  }

  async createDocumentVersion(
    documentId: string, 
    content: string, 
    comment: string
  ): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseUrl}/${documentId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, comment })
    });
    if (!response.ok) throw new Error('Failed to create document version');
    return response.json();
  }

  async compareVersions(
    documentId: string, 
    version1: number, 
    version2: number
  ): Promise<{ changes: any[], diff: string }> {
    const response = await fetch(
      `${this.baseUrl}/${documentId}/versions/compare?v1=${version1}&v2=${version2}`
    );
    if (!response.ok) throw new Error('Failed to compare versions');
    return response.json();
  }

  async revertToVersion(documentId: string, version: number): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/${documentId}/revert/${version}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to revert document');
    return response.json();
  }

  // Approval workflow operations
  async getWorkflows(): Promise<DocumentWorkflow[]> {
    const response = await fetch(`${this.baseUrl}/workflows`);
    if (!response.ok) throw new Error('Failed to fetch workflows');
    return response.json();
  }

  async createWorkflow(workflow: Omit<DocumentWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentWorkflow> {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    if (!response.ok) throw new Error('Failed to create workflow');
    return response.json();
  }

  async submitForApproval(documentId: string, workflowId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${documentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId })
    });
    if (!response.ok) throw new Error('Failed to submit for approval');
  }

  async approveDocument(
    documentId: string, 
    versionId: string, 
    comment?: string,
    digitalSignature?: DigitalSignature
  ): Promise<DocumentApproval> {
    const response = await fetch(`${this.baseUrl}/${documentId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, comment, digitalSignature })
    });
    if (!response.ok) throw new Error('Failed to approve document');
    return response.json();
  }

  async rejectDocument(
    documentId: string, 
    versionId: string, 
    comment: string
  ): Promise<DocumentApproval> {
    const response = await fetch(`${this.baseUrl}/${documentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, comment })
    });
    if (!response.ok) throw new Error('Failed to reject document');
    return response.json();
  }

  async getDocumentApprovals(documentId: string): Promise<DocumentApproval[]> {
    const response = await fetch(`${this.baseUrl}/${documentId}/approvals`);
    if (!response.ok) throw new Error('Failed to fetch approvals');
    return response.json();
  }

  // Publication and distribution
  async publishDocument(documentId: string, versionId: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/${documentId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId })
    });
    if (!response.ok) throw new Error('Failed to publish document');
    return response.json();
  }

  async unpublishDocument(documentId: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/${documentId}/unpublish`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to unpublish document');
    return response.json();
  }

  async distributeDocument(
    documentId: string, 
    recipients: string[], 
    message?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${documentId}/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients, message })
    });
    if (!response.ok) throw new Error('Failed to distribute document');
  }

  // Template operations
  async getTemplates(): Promise<DocumentTemplate[]> {
    const response = await fetch(`${this.baseUrl}/templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  }

  async getTemplate(id: string): Promise<DocumentTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`);
    if (!response.ok) throw new Error('Failed to fetch template');
    return response.json();
  }

  async createTemplate(template: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentTemplate> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    if (!response.ok) throw new Error('Failed to create template');
    return response.json();
  }

  async generateFromTemplate(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables })
    });
    if (!response.ok) throw new Error('Failed to generate document from template');
    return response.json();
  }

  // Lifecycle management
  async getDocumentLifecycle(documentId: string): Promise<DocumentLifecycle> {
    const response = await fetch(`${this.baseUrl}/${documentId}/lifecycle`);
    if (!response.ok) throw new Error('Failed to fetch document lifecycle');
    return response.json();
  }

  async updateDocumentLifecycle(
    documentId: string, 
    lifecycle: Partial<DocumentLifecycle>
  ): Promise<DocumentLifecycle> {
    const response = await fetch(`${this.baseUrl}/${documentId}/lifecycle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lifecycle)
    });
    if (!response.ok) throw new Error('Failed to update document lifecycle');
    return response.json();
  }

  async getUpcomingReviews(): Promise<Document[]> {
    const response = await fetch(`${this.baseUrl}/reviews/upcoming`);
    if (!response.ok) throw new Error('Failed to fetch upcoming reviews');
    return response.json();
  }

  async scheduleReview(documentId: string, reviewDate: Date, reviewers: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${documentId}/schedule-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewDate, reviewers })
    });
    if (!response.ok) throw new Error('Failed to schedule review');
  }

  async archiveDocument(documentId: string): Promise<Document> {
    const response = await fetch(`${this.baseUrl}/${documentId}/archive`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to archive document');
    return response.json();
  }

  // Comments and collaboration
  async getDocumentComments(documentId: string, versionId?: string): Promise<DocumentComment[]> {
    const url = versionId 
      ? `${this.baseUrl}/${documentId}/versions/${versionId}/comments`
      : `${this.baseUrl}/${documentId}/comments`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json();
  }

  async addComment(
    documentId: string, 
    content: string, 
    versionId?: string,
    parentCommentId?: string,
    position?: any
  ): Promise<DocumentComment> {
    const url = versionId 
      ? `${this.baseUrl}/${documentId}/versions/${versionId}/comments`
      : `${this.baseUrl}/${documentId}/comments`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parentCommentId, position })
    });
    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
  }

  async resolveComment(commentId: string): Promise<DocumentComment> {
    const response = await fetch(`${this.baseUrl}/comments/${commentId}/resolve`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to resolve comment');
    return response.json();
  }

  // Digital signatures
  async signDocument(
    documentId: string, 
    versionId: string, 
    signature: string,
    certificate: string
  ): Promise<DigitalSignature> {
    const response = await fetch(`${this.baseUrl}/${documentId}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId, signature, certificate })
    });
    if (!response.ok) throw new Error('Failed to sign document');
    return response.json();
  }

  async verifySignature(signatureId: string): Promise<{ isValid: boolean; details: any }> {
    const response = await fetch(`${this.baseUrl}/signatures/${signatureId}/verify`);
    if (!response.ok) throw new Error('Failed to verify signature');
    return response.json();
  }

  // Analytics and reporting
  async getDocumentStats(): Promise<DocumentStats> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) throw new Error('Failed to fetch document stats');
    return response.json();
  }

  async exportDocument(documentId: string, format: 'pdf' | 'docx' | 'html'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/${documentId}/export?format=${format}`);
    if (!response.ok) throw new Error('Failed to export document');
    return response.blob();
  }
}

export const documentManagementService = new DocumentManagementService();