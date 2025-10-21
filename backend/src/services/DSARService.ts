import { DSARRepository } from '../repositories/DSARRepository';
import type { 
  DSARRequest, 
  DSARStatusHistory, 
  CreateDSARRequest, 
  UpdateDSARRequest, 
  DSARFilters, 
  DSARStatusChange
} from '../types/dsar';
import type { PaginatedResponse } from '../types/common';

export class DSARService {
  constructor(private dsarRepository: DSARRepository) {}

  async createRequest(data: CreateDSARRequest): Promise<DSARRequest> {
    // Validate request data
    this.validateCreateRequest(data);
    
    // Check for duplicate requests from the same email within 24 hours
    const existingRequests = await this.dsarRepository.findBySubjectEmail(data.subjectEmail);
    const recentRequest = existingRequests.find(req => {
      const timeDiff = Date.now() - req.createdAt.getTime();
      return timeDiff < 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    });

    if (recentRequest) {
      throw new Error('A DSAR request from this email address was already submitted within the last 24 hours');
    }

    return await this.dsarRepository.create(data);
  }

  async getRequests(filters: DSARFilters): Promise<PaginatedResponse<DSARRequest>> {
    return await this.dsarRepository.findMany(filters);
  }

  async getRequestById(id: string): Promise<DSARRequest> {
    const request = await this.dsarRepository.findById(id);
    if (!request) {
      throw new Error('DSAR request not found');
    }
    return request;
  }

  async getRequestByRequestId(requestId: string): Promise<DSARRequest> {
    const request = await this.dsarRepository.findByRequestId(requestId);
    if (!request) {
      throw new Error('DSAR request not found');
    }
    return request;
  }

  async updateRequest(id: string, updates: UpdateDSARRequest, userId: string): Promise<DSARRequest> {
    // Validate update data
    this.validateUpdateRequest(updates);
    
    const existingRequest = await this.dsarRepository.findById(id);
    if (!existingRequest) {
      throw new Error('DSAR request not found');
    }

    // Check if status is being updated
    if (updates.status && updates.status !== existingRequest.status) {
      this.validateStatusTransition(existingRequest.status, updates.status);
      
      // Update status with history tracking
      await this.dsarRepository.updateStatus(id, updates.status, userId);
      
      // Remove status from updates since it's handled separately
      const { status, ...otherUpdates } = updates;
      if (Object.keys(otherUpdates).length > 0) {
        return await this.dsarRepository.update(id, otherUpdates);
      } else {
        return await this.dsarRepository.findById(id) as DSARRequest;
      }
    }

    return await this.dsarRepository.update(id, updates);
  }

  async updateRequestStatus(statusChange: DSARStatusChange): Promise<DSARRequest> {
    const existingRequest = await this.dsarRepository.findById(statusChange.dsarId);
    if (!existingRequest) {
      throw new Error('DSAR request not found');
    }

    this.validateStatusTransition(existingRequest.status, statusChange.status);
    
    await this.dsarRepository.updateStatus(
      statusChange.dsarId, 
      statusChange.status, 
      statusChange.changedBy, 
      statusChange.comment
    );

    return await this.dsarRepository.findById(statusChange.dsarId) as DSARRequest;
  }

  async assignRequest(id: string, assigneeId: string, assignedBy: string): Promise<DSARRequest> {
    const existingRequest = await this.dsarRepository.findById(id);
    if (!existingRequest) {
      throw new Error('DSAR request not found');
    }

    // Update assignment and status if currently submitted
    const updates: UpdateDSARRequest = { assignedTo: assigneeId };
    if (existingRequest.status === 'submitted') {
      updates.status = 'in_review';
    }

    if (updates.status) {
      await this.dsarRepository.updateStatus(id, updates.status, assignedBy, `Assigned to user ${assigneeId}`);
      delete updates.status;
    }

    return await this.dsarRepository.update(id, updates);
  }

  async getStatusHistory(dsarId: string): Promise<DSARStatusHistory[]> {
    const request = await this.dsarRepository.findById(dsarId);
    if (!request) {
      throw new Error('DSAR request not found');
    }

    return await this.dsarRepository.getStatusHistory(dsarId);
  }

  async generateReport(id: string): Promise<any> {
    const request = await this.dsarRepository.findById(id);
    if (!request) {
      throw new Error('DSAR request not found');
    }

    const statusHistory = await this.dsarRepository.getStatusHistory(id);

    return {
      request,
      statusHistory,
      generatedAt: new Date(),
      reportType: 'DSAR_SUMMARY'
    };
  }

  async getRequestsBySubjectEmail(email: string): Promise<DSARRequest[]> {
    return await this.dsarRepository.findBySubjectEmail(email);
  }

  async deleteRequest(id: string): Promise<void> {
    const request = await this.dsarRepository.findById(id);
    if (!request) {
      throw new Error('DSAR request not found');
    }

    // Only allow deletion of cancelled or rejected requests
    if (!['cancelled', 'rejected'].includes(request.status)) {
      throw new Error('Only cancelled or rejected DSAR requests can be deleted');
    }

    await this.dsarRepository.delete(id);
  }

  async getStatistics(): Promise<any> {
    const totalRequests = await this.dsarRepository.count();
    const submittedRequests = await this.dsarRepository.count({ status: 'submitted' });
    const inProgressRequests = await this.dsarRepository.count({ status: 'in_progress' });
    const completedRequests = await this.dsarRepository.count({ status: 'completed' });
    const overdueRequests = await this.dsarRepository.count({
      dateTo: new Date(),
      status: 'in_progress'
    });

    return {
      total: totalRequests,
      submitted: submittedRequests,
      inProgress: inProgressRequests,
      completed: completedRequests,
      overdue: overdueRequests,
      completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
    };
  }

  private validateCreateRequest(data: CreateDSARRequest): void {
    if (!data.subjectName?.trim()) {
      throw new Error('Subject name is required');
    }

    if (!data.subjectEmail?.trim()) {
      throw new Error('Subject email is required');
    }

    if (!this.isValidEmail(data.subjectEmail)) {
      throw new Error('Invalid email format');
    }

    if (!data.requestType) {
      throw new Error('Request type is required');
    }

    const validRequestTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'];
    if (!validRequestTypes.includes(data.requestType)) {
      throw new Error('Invalid request type');
    }
  }

  private validateUpdateRequest(updates: UpdateDSARRequest): void {
    if (updates.status) {
      const validStatuses = ['submitted', 'in_review', 'in_progress', 'completed', 'rejected', 'cancelled'];
      if (!validStatuses.includes(updates.status)) {
        throw new Error('Invalid status');
      }
    }

    if (updates.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(updates.priority)) {
        throw new Error('Invalid priority');
      }
    }
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'submitted': ['in_review', 'cancelled', 'rejected'],
      'in_review': ['in_progress', 'cancelled', 'rejected'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // No transitions from completed
      'rejected': [], // No transitions from rejected
      'cancelled': [] // No transitions from cancelled
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
