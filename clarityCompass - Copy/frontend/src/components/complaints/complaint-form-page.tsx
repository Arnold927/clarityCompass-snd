'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { ComplaintForm } from '@/components/complaints/complaint-form';
import { complaintService } from '@/services/complaint.service';

export default function ComplaintFormPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const isEditMode = Boolean(id);

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;

    const fetchComplaint = async () => {
      setLoading(true);
      try {
        const complaint = await complaintService.getComplaint(Number(id));
        setInitialData(complaint);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [id, isEditMode]);

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    try {
      const payload = Object.fromEntries(formData.entries());

      if (isEditMode && id) {
        await complaintService.partialUpdateComplaint(Number(id), payload);
      } else {
        await complaintService.createComplaint(payload);
      }

      router.push('/complaints');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/complaints')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Complaints
      </button>

      <ComplaintForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/complaints')}
        loading={submitting}
      />
    </div>
  );
}
