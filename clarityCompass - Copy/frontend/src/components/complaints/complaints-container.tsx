'use client';

import React, { useState, useEffect } from 'react';
import { ComplaintsList } from './complaints-list';
import { Complaint, ComplaintFilters } from '@/types/complaint.types';
import { ComplaintsModal } from './complaints-modal';
import api from '@/lib/api';

export const ComplaintsContainer: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ComplaintFilters>({});
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ngo_access_token');
    setIsAuthReady(!!token);
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      fetchComplaints();
    }
  }, [filters, isAuthReady]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      
      // const response = await api.get(`/complaints/complaints/?${params.toString()}`);
      const response = await api.get(`/complaints/complaints/`, {
        params,
      });
      
      let complaintsData: Complaint[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          complaintsData = response.data;
        }
        else if (response.data.results && Array.isArray(response.data.results)) {
          complaintsData = response.data.results;
        }
        else if (response.data && typeof response.data === 'object') {
          if (response.data.id) {
            complaintsData = [response.data];
          } else {
            const possibleArrays = Object.values(response.data).filter(val => Array.isArray(val));
            if (possibleArrays.length > 0) {
              complaintsData = possibleArrays[0] as Complaint[];
            } else {
              console.warn('Unexpected API response structure:', response.data);
              complaintsData = [];
            }
          }
        }
      }
      
      setComplaints(complaintsData);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setError('Failed to fetch complaints. Please try again.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: ComplaintFilters) => {
    setFilters(newFilters);
  };
    const handleViewComplaint = async (complaint: Complaint) => {
    try {
        setLoading(true);
        
        const response = await api.get(`/complaints/complaints/${complaint.id}/`);
        
        setSelectedComplaint(response.data);
        setModalMode('view');
        setIsModalOpen(true);
    } catch (error) {
        console.error('Error fetching complaint details:', error);
    } finally {
        setLoading(false);
    }
    };

    // In ComplaintsContainer.tsx
  const handleEditComplaint = async (complaint: Complaint) => {
    try {
      setLoading(true);
      // Fetch the full complaint details including feedback_channel
      const response = await api.get(`/complaints/complaints/${complaint.id}/`);
      setSelectedComplaint(response.data);  // This will have feedback_channel
      setModalMode('edit');
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching complaint details for edit:', error);
      // Fallback to list data if detail fetch fails
      setSelectedComplaint(complaint);
      setModalMode('edit');
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };


  const handleCreateNew = () => {
        setSelectedComplaint(null);
        setModalMode('create');
        setIsModalOpen(true);
  };

  const handleRefresh = () => {
    fetchComplaints();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedComplaint(null);
  };

  const handleSave = async (complaintData: Partial<Complaint>) => {
    try {
      if (modalMode === 'create') {
        await api.post('/complaints/complaints/', complaintData);
      } else if (modalMode === 'edit' && selectedComplaint) {
        await api.put(`/complaints/complaints/${selectedComplaint.id}/`, complaintData);
      }
      
      await fetchComplaints();
      handleModalClose();
    } catch (error) {
      console.error('Error saving complaint:', error);
      throw error;
    }
  };

  return (
    <>
      <ComplaintsList
        complaints={complaints}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        onViewComplaint={handleViewComplaint}
        onCreateNew={handleCreateNew}
        onEditComplaint={handleEditComplaint}
        onRefresh={handleRefresh}
      />

      {isModalOpen && (
        <ComplaintsModal
          complaint={selectedComplaint}
          mode={modalMode}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </>
  );
};