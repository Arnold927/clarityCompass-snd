import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ComplaintsList } from './complaints-list';
import { ComplaintDetail } from './complaint-detail';
import { ComplaintForm } from './complaint-form';
import { 
  Complaint, 
  ComplaintFilters, 
  ComplaintFollowUp, 
  ComplaintAttachment, 
  ComplaintComment, 
  Tag,
  User,
  Project,
  CaseStatus,
  AllegedPerpetratorType
} from '../../types/complaint.types';
import { complaintService } from '../../services/complaint.service';
import { fetchProjects, fetchProjectTeamMembers } from '@/lib/api';

interface ProjectTeamMember {
  id: number;
  project: number;
  user: User | null;
  member_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
}

interface ComplaintsModalProps {
  onClose: () => void;
  complaint?: Complaint | null;
  mode?: 'create' | 'edit' | 'view';
  onSave?: (complaintData: Partial<Complaint>) => Promise<void>;
}

type View = 'list' | 'detail' | 'create' | 'edit';

const isValidPriority = (value: string): value is Complaint['priority'] => {
  return ['low', 'medium', 'high', 'critical'].includes(value);
};

const isValidFeedbackChannel = (value: string): value is Complaint['feedback_channel'] => {
  return ['phone', 'email', 'sms', 'whatsapp', 'in_person', 'website', 'social_media', 'complaint_box', 'crfm_clinics', 'gender_help_desk', 'other'].includes(value);
};

const isValidGender = (value: string): value is Complaint['gender'] => {
  return ['male', 'female', 'other', 'unknown'].includes(value);
};

const isValidFeedbackType = (value: string): value is Complaint['feedback_type'] => {
  return ['snd_staff', 'beneficiary', 'contractor', 'implementing_partner', 'third_party_with_link', 'third_party_without_link'].includes(value);
};

// const isValidCategory = (value: string): value is Complaint['category'] => {
//   return ['corruption_fraud', 'sexual_exploitation_abuse', 'child_ill_treatment', 'other'].includes(value);
// };

const isValidStatus = (value: string): value is Complaint['status'] => {
  return ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'].includes(value);
};

const isValidSensitivityLevel = (value: number): value is Complaint['sensitivity_level'] => {
  return [1, 2, 3, 4, 5].includes(value);
};

const isValidAllegedPerpetratorType = (value: string): value is AllegedPerpetratorType => {
  return ['snd_staff', 'beneficiary', 'contractor', 'implementing_partner', 'third_party_with_link', 'third_party_without_link'].includes(value);
};

export const ComplaintsModal: React.FC<ComplaintsModalProps> = ({ 
  onClose, 
  complaint: externalComplaint, 
  mode: externalMode,
  onSave: externalOnSave 
}) => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ComplaintFilters>({});

  const [followUps, setFollowUps] = useState<ComplaintFollowUp[]>([]);
  const [attachments, setAttachments] = useState<ComplaintAttachment[]>([]);
  const [comments, setComments] = useState<ComplaintComment[]>([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const [isInternalMode, setIsInternalMode] = useState(true);

  useEffect(() => {
    if (externalMode !== undefined || externalComplaint !== undefined) {
      setIsInternalMode(false);
      
      if (externalMode !== undefined) {
        setCurrentView(externalMode === 'view' ? 'detail' : externalMode);
      }
      if (externalComplaint !== undefined) {
        setSelectedComplaint(externalComplaint);
      }
    }
  }, [externalMode, externalComplaint]);

  useEffect(() => {
    if (currentView === 'list') {
      loadComplaints();
    }
  }, [filters, currentView]);

  useEffect(() => {
    if (selectedComplaint && currentView === 'detail') {
      loadComplaintDetails(selectedComplaint.id);
    }
  }, [selectedComplaint, currentView]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getComplaints(filters);
      setComplaints(data);
    } catch (error) {
      console.error('Failed to load complaints', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      
      const projectsData = await fetchProjects();
      const mappedProjects: Project[] = projectsData.map(p => ({
        id: Number(p.id),
        name: p.title || '',
        code: p.code || '',
      }));
      setProjects(mappedProjects);
      
      if (selectedComplaint?.project?.id) {
        const teamMembersData = await fetchProjectTeamMembers(selectedComplaint.project.id) as ProjectTeamMember[];
        
        const mappedTeamMembers: User[] = teamMembersData.map(m => {
          if (m.user) {
            return {
              id: m.user.id,
              username: m.user.username || '',
              email: m.user.email || m.email || '',
              first_name: m.user.first_name || '',
              last_name: m.user.last_name || '',
              full_name: `${m.user.first_name || ''} ${m.user.last_name || ''}`.trim() || m.member_name || '',
            };
          } else {
            const nameParts = (m.member_name || '').split(' ');
            return {
              id: m.id,
              username: m.email?.split('@')[0] || '',
              email: m.email || '',
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              full_name: m.member_name || '',
            };
          }
        });
        
        setTeamMembers(mappedTeamMembers);
      }
      
      // const tagsData = await fetchTags();
      // setTags(tagsData);
      
    } catch (error) {
      console.error('Failed to load reference data', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComplaintDetails = async (complaintId: number) => {
    setLoading(true);
    try {
      console.log('Fetching details for complaint:', complaintId);
      
      const [followUpsData, attachmentsData, commentsData] = await Promise.all([
        complaintService.getFollowUps(complaintId),
        complaintService.getAttachments(complaintId),
        complaintService.getComments(complaintId),
      ]);
      
      setFollowUps(Array.isArray(followUpsData) ? followUpsData : []);
      setAttachments(Array.isArray(attachmentsData) ? attachmentsData : []);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      
    } catch (error) {
      console.error('Failed to load complaint details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewComplaint = (complaint: Complaint) => {
    if (isInternalMode) {
      setSelectedComplaint(complaint);
      setCurrentView('detail');
    }
  };

  const handleEditComplaint = (complaint: Complaint) => {
    if (isInternalMode) {
      setSelectedComplaint(complaint);
      setCurrentView('edit');
    }
  };

  const handleCreateComplaint = () => {
    if (isInternalMode) {
      setSelectedComplaint(null);
      setCurrentView('create');
    }
  };

  const handleBack = () => {
    onClose();
  };

  const convertFormDataToComplaint = (formData: FormData): Partial<Complaint> => {
    const data: Partial<Complaint> = {};
    
    for (const [key, value] of formData.entries()) {
      if (!value || value.toString().trim() === '' || key === 'attachments') {
        continue;
      }

      const stringValue = value.toString();

      switch (key) {
        case 'id':
        case 'comment_count':
        case 'followup_count':
          const numValue = parseInt(stringValue);
          if (!isNaN(numValue)) {
            (data as any)[key] = numValue;
          }
          break;

        case 'project':
        case 'assigned_to':
        case 'created_by':
        case 'updated_by':
          const id = parseInt(stringValue);
          if (!isNaN(id)) {
            (data as any)[key] = id;
          }
          break;

        case 'tags':
          const tagNames = stringValue.split(',').map(tag => tag.trim());
          const tagObjects: Tag[] = tagNames
            .map(name => {
              const existingTag = tags.find(t => t.name === name);
              return existingTag || { id: 0, name, color: undefined };
            })
            .filter(tag => tag.name !== '');
          if (tagObjects.length > 0) {
            data.tags = tagObjects;
          }
          break;

        case 'has_thanking_note':
          data.has_thanking_note = stringValue === 'true' || stringValue === 'on';
          break;

        case 'sensitivity_level':
          const level = parseInt(stringValue);
          if (!isNaN(level) && isValidSensitivityLevel(level)) {
            data.sensitivity_level = level;
          }
          break;

        case 'priority':
          if (isValidPriority(stringValue)) {
            data.priority = stringValue;
          }
          break;

        case 'feedback_channel':
          if (isValidFeedbackChannel(stringValue)) {
            data.feedback_channel = stringValue;
          }
          break;

        case 'gender':
          if (isValidGender(stringValue)) {
            data.gender = stringValue;
          }
          break;

        case 'feedback_type':
          if (isValidFeedbackType(stringValue)) {
            data.feedback_type = stringValue;
          }
          break;

        // case 'category':
        //   if (isValidCategory(stringValue)) {
        //     data.category = stringValue;
        //   }
        //   break;

        case 'status':
          if (isValidStatus(stringValue)) {
            data.status = stringValue;
          }
          break;

        case 'alleged_perpetrator_type':
          if (isValidAllegedPerpetratorType(stringValue)) {
            data.alleged_perpetrator_type = stringValue;
          }
          break;

        case 'date_feedback_received':
        case 'date_response_provided':
        case 'date_case_closed':
        case 'created_at':
        case 'updated_at':
        case 'deadline':
          if (stringValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            (data as any)[key] = stringValue;
          }
          break;

        default:
          if (typeof value === 'string') {
            (data as any)[key] = stringValue;
          }
      }
    }
    
    data.case_status = computeCaseStatus(data);
    
    return data;
  };

  const computeCaseStatus = (complaint: Partial<Complaint>): CaseStatus => {
    if (complaint.date_case_closed) return 'closed';
    if (complaint.date_response_provided) return 'response_sent';
    if (complaint.assigned_to) return 'in_progress';
    return 'pending';
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const complaintData = convertFormDataToComplaint(formData);
      
      if (currentView === 'create') {
        if (externalOnSave) {
          await externalOnSave(complaintData);
        } else {
          await complaintService.createComplaint(complaintData);
        }
      } else if (currentView === 'edit' && selectedComplaint) {
        if (externalOnSave) {
          await externalOnSave(complaintData);
        } else {
          await complaintService.updateComplaint(selectedComplaint.id, complaintData);
        }
      }
      
      if (externalMode) {
        onClose();
      } else {
        handleBack();
      }
    } catch (error) {
      console.error('Failed to save complaint', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string): Promise<ComplaintComment> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      const comment = await complaintService.createComment(selectedComplaint.id, content);
      setComments(prev => [...prev, comment]);
      return comment;
    } finally {
      setLoading(false);
    }
  };

  const addFollowUp = async (data: FormData): Promise<ComplaintFollowUp> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      const followUp = await complaintService.createFollowUp(selectedComplaint.id, data);
      setFollowUps(prev => [...prev, followUp]);
      return followUp;
    } finally {
      setLoading(false);
    }
  };

  const addAttachment = async (data: FormData): Promise<ComplaintAttachment> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      const attachment = await complaintService.createAttachment(selectedComplaint.id, data);
      setAttachments(prev => [...prev, attachment]);
      return attachment;
    } finally {
      setLoading(false);
    }
  };

  const deleteAttachment = async (id: number): Promise<void> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      await complaintService.deleteAttachment(selectedComplaint.id, id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } finally {
      setLoading(false);
    }
  };

  const assignComplaint = async (userId: number): Promise<Complaint> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      const updated = await complaintService.assignComplaint(selectedComplaint.id, userId);
      setSelectedComplaint(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const closeComplaint = async (): Promise<Complaint> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      const updated = await complaintService.closeComplaint(selectedComplaint.id);
      setSelectedComplaint(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  };

  const updateComplaint = async (data: Partial<Complaint>): Promise<Complaint> => {
    if (!selectedComplaint) throw new Error('No complaint selected');
    setLoading(true);
    try {
      const updated = await complaintService.partialUpdateComplaint(selectedComplaint.id, data);
      setSelectedComplaint(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentView === 'list' && 'Complaints Management'}
              {currentView === 'detail' && 'Feedback Details'}
              {currentView === 'create' && 'New Feedback'}
              {currentView === 'edit' && 'Edit Feedback'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading && currentView !== 'list' && (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}

            {currentView === 'list' && (
              <ComplaintsList
                complaints={complaints}
                loading={loading}
                filters={filters}
                onFilterChange={setFilters}
                onViewComplaint={handleViewComplaint}
                onCreateNew={handleCreateComplaint}
                onEditComplaint={handleEditComplaint}
                onRefresh={loadComplaints}
              />
            )}

            {currentView === 'detail' && selectedComplaint && !loading && (
              <ComplaintDetail
                complaint={selectedComplaint}
                followUps={followUps}
                attachments={attachments}
                comments={comments}
                onAddComment={addComment}
                onAddFollowUp={addFollowUp}
                onAddAttachment={addAttachment}
                onDeleteAttachment={deleteAttachment}
                onAssign={assignComplaint}
                onClose={closeComplaint}
                onUpdate={updateComplaint}
                users={teamMembers}
              />
            )}

            {(currentView === 'create' || currentView === 'edit') && (
              <ComplaintForm
                initialData={currentView === 'edit' && selectedComplaint ? selectedComplaint : undefined}
                onSubmit={handleSubmit}
                onCancel={handleBack}
                projects={projects}
                users={teamMembers}
                tags={tags}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};