import React from 'react';
import AppLayout from '@/components/layout/app-layout';
import { ComplaintsContainer } from '@/components/complaints/complaints-container';

export default function ComplaintsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Community Feedback Management</h1>
        <ComplaintsContainer />
      </div>
    </AppLayout>
  );
}