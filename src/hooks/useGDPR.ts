import { useState, useEffect, useCallback } from 'react';
import { 
  gdprService, 
  GDPRDashboardStats, 
  LawfulBasisRecord, 
  ProcessingRecord, 
  DPIA, 
  DataBreach, 
  DataPortabilityRequest,
  CreateLawfulBasisRequest,
  CreateProcessingRecordRequest,
  CreateDPIARequest,
  CreateDataBreachRequest,
  CreateDataPortabilityRequest
} from '../services/gdprService';

export const useGDPRDashboard = () => {
  const [stats, setStats] = useState<GDPRDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gdprService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch GDPR dashboard stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

export const useLawfulBasis = () => {
  const [records, setRecords] = useState<LawfulBasisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (filters?: { status?: string; limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await gdprService.getLawfulBasisRecords(filters);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lawful basis records');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (data: CreateLawfulBasisRequest) => {
    try {
      const newRecord = await gdprService.createLawfulBasisRecord(data);
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create lawful basis record');
    }
  }, []);

  const updateRecord = useCallback(async (id: string, updates: Partial<LawfulBasisRecord>) => {
    try {
      const updatedRecord = await gdprService.updateLawfulBasisRecord(id, updates);
      setRecords(prev => prev.map(record => record.id === id ? updatedRecord : record));
      return updatedRecord;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update lawful basis record');
    }
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      await gdprService.deleteLawfulBasisRecord(id);
      setRecords(prev => prev.filter(record => record.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete lawful basis record');
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { 
    records, 
    loading, 
    error, 
    refetch: fetchRecords, 
    createRecord, 
    updateRecord, 
    deleteRecord 
  };
};

export const useProcessingRecords = () => {
  const [records, setRecords] = useState<ProcessingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async (filters?: { limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await gdprService.getProcessingRecords(filters);
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch processing records');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(async (data: CreateProcessingRecordRequest) => {
    try {
      const newRecord = await gdprService.createProcessingRecord(data);
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create processing record');
    }
  }, []);

  const exportRecords = useCallback(async () => {
    try {
      const blob = await gdprService.exportProcessingRecords();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processing-records.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to export processing records');
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { 
    records, 
    loading, 
    error, 
    refetch: fetchRecords, 
    createRecord, 
    exportRecords 
  };
};

export const useDPIAs = () => {
  const [dpias, setDpias] = useState<DPIA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDPIAs = useCallback(async (filters?: { status?: string; limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await gdprService.getDPIAs(filters);
      setDpias(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch DPIAs');
    } finally {
      setLoading(false);
    }
  }, []);

  const createDPIA = useCallback(async (data: CreateDPIARequest) => {
    try {
      const newDPIA = await gdprService.createDPIA(data);
      setDpias(prev => [newDPIA, ...prev]);
      return newDPIA;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create DPIA');
    }
  }, []);

  const updateDPIA = useCallback(async (id: string, updates: Partial<DPIA>) => {
    try {
      const updatedDPIA = await gdprService.updateDPIA(id, updates);
      setDpias(prev => prev.map(dpia => dpia.id === id ? updatedDPIA : dpia));
      return updatedDPIA;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update DPIA');
    }
  }, []);

  const assessRisk = useCallback(async (id: string, riskLevel: 'low' | 'medium' | 'high') => {
    try {
      const updatedDPIA = await gdprService.assessDPIARisk(id, riskLevel);
      setDpias(prev => prev.map(dpia => dpia.id === id ? updatedDPIA : dpia));
      return updatedDPIA;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to assess DPIA risk');
    }
  }, []);

  useEffect(() => {
    fetchDPIAs();
  }, [fetchDPIAs]);

  return { 
    dpias, 
    loading, 
    error, 
    refetch: fetchDPIAs, 
    createDPIA, 
    updateDPIA, 
    assessRisk 
  };
};

export const useDataBreaches = () => {
  const [breaches, setBreaches] = useState<DataBreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBreaches = useCallback(async (filters?: { status?: string; assignedTo?: string; limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await gdprService.getDataBreaches(filters);
      setBreaches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data breaches');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBreach = useCallback(async (data: CreateDataBreachRequest) => {
    try {
      const newBreach = await gdprService.createDataBreach(data);
      setBreaches(prev => [newBreach, ...prev]);
      return newBreach;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create data breach');
    }
  }, []);

  const updateBreach = useCallback(async (id: string, updates: Partial<DataBreach>) => {
    try {
      const updatedBreach = await gdprService.updateDataBreach(id, updates);
      setBreaches(prev => prev.map(breach => breach.id === id ? updatedBreach : breach));
      return updatedBreach;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update data breach');
    }
  }, []);

  const notifyAuthority = useCallback(async (id: string) => {
    try {
      const updatedBreach = await gdprService.notifySupervisoryAuthority(id);
      setBreaches(prev => prev.map(breach => breach.id === id ? updatedBreach : breach));
      return updatedBreach;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to notify supervisory authority');
    }
  }, []);

  const notifySubjects = useCallback(async (id: string) => {
    try {
      const updatedBreach = await gdprService.notifyDataSubjects(id);
      setBreaches(prev => prev.map(breach => breach.id === id ? updatedBreach : breach));
      return updatedBreach;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to notify data subjects');
    }
  }, []);

  useEffect(() => {
    fetchBreaches();
  }, [fetchBreaches]);

  return { 
    breaches, 
    loading, 
    error, 
    refetch: fetchBreaches, 
    createBreach, 
    updateBreach, 
    notifyAuthority, 
    notifySubjects 
  };
};

export const useDataPortability = () => {
  const [requests, setRequests] = useState<DataPortabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (filters?: { status?: string; limit?: number; offset?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await gdprService.getDataPortabilityRequests(filters);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data portability requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (data: CreateDataPortabilityRequest) => {
    try {
      const newRequest = await gdprService.createDataPortabilityRequest(data);
      setRequests(prev => [newRequest, ...prev]);
      return newRequest;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create data portability request');
    }
  }, []);

  const processRequest = useCallback(async (id: string) => {
    try {
      const updatedRequest = await gdprService.processDataPortabilityRequest(id);
      setRequests(prev => prev.map(request => request.id === id ? updatedRequest : request));
      return updatedRequest;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to process data portability request');
    }
  }, []);

  const completeRequest = useCallback(async (id: string, fileSize: string) => {
    try {
      const updatedRequest = await gdprService.completeDataPortabilityRequest(id, fileSize);
      setRequests(prev => prev.map(request => request.id === id ? updatedRequest : request));
      return updatedRequest;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to complete data portability request');
    }
  }, []);

  const deliverRequest = useCallback(async (id: string) => {
    try {
      const updatedRequest = await gdprService.deliverDataPortabilityRequest(id);
      setRequests(prev => prev.map(request => request.id === id ? updatedRequest : request));
      return updatedRequest;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to deliver data portability request');
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { 
    requests, 
    loading, 
    error, 
    refetch: fetchRequests, 
    createRequest, 
    processRequest, 
    completeRequest, 
    deliverRequest 
  };
};