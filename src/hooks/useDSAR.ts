import { useState, useEffect, useCallback } from 'react';
import { dsarService, DSARRequest, DSARFilters, CreateDSARRequest, UpdateDSARRequest, DSARStatistics, PaginatedResponse } from '../services/dsarService';

export const useDSARRequests = (filters?: DSARFilters) => {
  const [data, setData] = useState<PaginatedResponse<DSARRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.getRequests(filters);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch DSAR requests');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    data,
    loading,
    error,
    refetch: fetchRequests,
  };
};

export const useDSARRequest = (id: string) => {
  const [data, setData] = useState<DSARRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.getRequestById(id);
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch DSAR request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  return {
    data,
    loading,
    error,
    refetch: fetchRequest,
  };
};

export const useDSARStatistics = () => {
  const [data, setData] = useState<DSARStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.getStatistics();
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch DSAR statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    data,
    loading,
    error,
    refetch: fetchStatistics,
  };
};

export const useDSARActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = async (data: CreateDSARRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.submitRequest(data);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to submit DSAR request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (id: string, updates: UpdateDSARRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.updateRequest(id, updates);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update DSAR request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: DSARRequest['status'], comment?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.updateRequestStatus(id, status, comment);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update DSAR status';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const assignRequest = async (id: string, assigneeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.assignRequest(id, assigneeId);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to assign DSAR request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await dsarService.deleteRequest(id);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete DSAR request';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await dsarService.checkRequestStatus(requestId);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to check request status';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    submitRequest,
    updateRequest,
    updateStatus,
    assignRequest,
    deleteRequest,
    checkStatus,
  };
};