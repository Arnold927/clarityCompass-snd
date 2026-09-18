import { useState, useEffect, useCallback } from 'react';
import { complaintService } from '../services/complaint.service';
import { Complaint, ComplaintFilters, ComplaintStats } from '../types/complaint.types';

export const useComplaints = (initialFilters?: ComplaintFilters) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ComplaintFilters>(initialFilters || {});
  const [stats, setStats] = useState<ComplaintStats | null>(null);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const data = await complaintService.getComplaints(filters);
      setComplaints(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch complaints');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await complaintService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchStats();
  }, [fetchComplaints, fetchStats]);

  const updateFilters = (newFilters: Partial<ComplaintFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const refresh = () => {
    fetchComplaints();
    fetchStats();
  };

  return {
    complaints,
    loading,
    error,
    filters,
    stats,
    updateFilters,
    clearFilters,
    refresh,
  };
};

