import React from 'react';
import { useRouter } from 'next/router';
import { useComplaintDetail } from '../../hooks/useComplaintDetail';
import { ComplaintDetail } from './complaint-detail';
import { ArrowLeft } from 'lucide-react';

export const ComplaintDetailPage: React.FC = () => {
  const router = useRouter();
  const complaintId = parseInt((router.query.id as string) || '0');


  const {
    complaint,
    followUps,
    attachments,
    comments,
    loading,
    error,
    refresh,
    addComment,
    addFollowUp,
    addAttachment,
    deleteAttachment,
    assignComplaint,
    closeComplaint,
    updateComplaint,
  } = useComplaintDetail(complaintId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Complaint not found'}
        </div>
        <button
          onClick={() => router.push('/complaints')}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Feedbacks
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/complaints')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Complaints
      </button>

      <ComplaintDetail
        complaint={complaint}
        followUps={followUps}
        attachments={attachments}
        comments={comments}
        onAddComment={(content) => addComment(content)}
        onAddFollowUp={(data) => addFollowUp(data)}
        onAddAttachment={(data) => addAttachment(data)}
        onDeleteAttachment={deleteAttachment}
        onAssign={(userId) => assignComplaint(userId)}
        onClose={() => closeComplaint()}
        onUpdate={(data) => updateComplaint(data)}
        users={[]}
        />


    </div>
  );
};