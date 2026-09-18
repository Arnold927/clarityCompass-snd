import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Complaint, 
  ComplaintFollowUp, 
  ComplaintAttachment, 
  ComplaintComment,
  PRIORITIES,
  STATUSES
} from '../../types/complaint.types';
import { 
  Paperclip,
  MessageCircle,
  Clock,
  User,
  Tag,
  FileText,
  Download,
  X,
  Calendar,
  MapPin,
  Phone,
  Globe,
  AlertCircle,
  CheckCircle,
  Send,
  Upload,
  Briefcase,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  complaint: Complaint;
  followUps: ComplaintFollowUp[];
  attachments: ComplaintAttachment[];
  comments: ComplaintComment[];
  onAddComment: (content: string) => Promise<ComplaintComment>;
  onAddFollowUp: (data: FormData) => Promise<ComplaintFollowUp>;
  onAddAttachment: (data: FormData) => Promise<ComplaintAttachment>;
  onDeleteAttachment: (id: number) => Promise<void>;
  onAssign: (userId: number) => Promise<Complaint>;
  onClose: () => Promise<Complaint>;
  onUpdate: (data: Partial<Complaint>) => Promise<Complaint>;
  users?: Array<{ id: number; first_name: string; last_name: string }>;
  onBack?: () => void;
  onEdit?: () => void;
  onRefresh?: () => Promise<void>;
}

export const ComplaintDetail: React.FC<Props> = ({
  complaint,
  followUps,
  attachments,
  comments,
  onAddComment,
  onAddFollowUp,
  onAddAttachment,
  onDeleteAttachment,
  onAssign,
  onClose,
  onUpdate,
  users = [],
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'followups' | 'attachments' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');
  const [newFollowUp, setNewFollowUp] = useState({
    action_taken: '',
    response_to_complainant: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('Complaint data:', complaint);
    console.log('Assigned to fields:', {
      assigned_to: complaint.assigned_to,
      assigned_to_name: complaint.assigned_to_name
    });
  }, [complaint]);

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-primary/5 text-primary border border-primary/20',
      medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      high: 'bg-orange-50 text-orange-700 border border-orange-200',
      critical: 'bg-red-50 text-red-700 border border-red-200',
    };
    return colors[priority as keyof typeof colors] || 'bg-muted/50 text-foreground border border-border';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-muted/50 text-foreground border border-border',
      in_progress: 'bg-primary/5 text-primary border border-primary/20',
      completed: 'bg-green-50 text-green-700 border border-green-200',
      overdue: 'bg-red-50 text-red-700 border border-red-200',
      cancelled: 'bg-muted/50 text-muted-foreground border border-border',
    };
    return colors[status as keyof typeof colors] || 'bg-muted/50 text-foreground border border-border';
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUp.action_taken.trim()) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('action_taken', newFollowUp.action_taken);
      if (newFollowUp.response_to_complainant) {
        formData.append('response_to_complainant', newFollowUp.response_to_complainant);
      }
      selectedFiles.forEach(file => {
        formData.append('evidence_file', file);
      });

      await onAddFollowUp(formData);
      setNewFollowUp({ action_taken: '', response_to_complainant: '' });
      setSelectedFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAttachment = async () => {
    if (selectedFiles.length === 0) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('file', file);
      });

      await onAddAttachment(formData);
      setSelectedFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    try {
      await onAssign(Number(selectedUserId));
      setShowAssignModal(false);
      setSelectedUserId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportToExcel = () => {
    const exportData = [
      {
        'Case ID': complaint.case_id,
        'Status': complaint.status,
        'Priority': complaint.priority,
        'Feedback Provider Name': complaint.full_name,
        'Gender': complaint.gender,
        'Phone': complaint.phone_number || '—',
        'ID Number': complaint.id_number || '—',
        'Nationality': complaint.nationality || '—',
        'Date Received': formatDate(complaint.date_feedback_received),
        'Channel': complaint.feedback_channel,
        'Feedback Type': complaint.feedback_type,
        'Geographic Area': complaint.geographic_area,
        'Specific Location': complaint.specific_location || '—',
        // 'Category': complaint.category,
        // 'Sub Category': complaint.sub_category || '—',
        'Other Subject': complaint.other_subject || '—',
        'Has Thanking Note': complaint.has_thanking_note ? 'Yes' : 'No',
        'Sensitivity Level': complaint.sensitivity_level,
        'Description': complaint.description,
        'Alleged Perpetrator Type': complaint.alleged_perpetrator_type || '—',
        'Alleged Perpetrator Details': complaint.alleged_perpetrator_details || '—',
        'Responsible Person': complaint.responsible_person || '—',
        'Actions Taken': complaint.actions_taken || '—',
        'Additional Comments': complaint.additional_comments || '—',
        'Date Response Provided': complaint.date_response_provided ? formatDate(complaint.date_response_provided) : '—',
        'Date Case Closed': complaint.date_case_closed ? formatDate(complaint.date_case_closed) : '—',
        'Deadline': complaint.deadline ? formatDate(complaint.deadline) : '—',
        'Created By': complaint.created_by_name || 'Unknown',
        'Assigned To': complaint.assigned_to_name || 'Unassigned',
        'Created At': formatDate(complaint.created_at),
        'Updated At': formatDate(complaint.updated_at),
        'Follow-ups Count': followUps.length,
        'Attachments Count': attachments.length,
        'Comments Count': comments.length,
        'Project': complaint.project?.title || '—',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Complaint Details');
    
    if (followUps.length > 0) {
      const followUpsData = followUps.map(f => ({
        'Follow-up Date': formatDate(f.follow_up_date),
        'Followed By': f.followed_by_name || 'Unknown',
        'Action Taken': f.action_taken,
        'Response to Complainant': f.response_to_complainant || '—',
        'Has Evidence': f.evidence_file ? 'Yes' : 'No',
      }));
      const wsFollowUps = XLSX.utils.json_to_sheet(followUpsData);
      XLSX.utils.book_append_sheet(wb, wsFollowUps, 'Follow-ups');
    }
    
    if (comments.length > 0) {
      const commentsData = comments.map(c => ({
        'Date': formatDate(c.created_at),
        'User': c.user ? `${c.user.first_name} ${c.user.last_name}` : 'Unknown',
        'Comment': c.content,
      }));
      const wsComments = XLSX.utils.json_to_sheet(commentsData);
      XLSX.utils.book_append_sheet(wb, wsComments, 'Comments');
    }
    
    if (attachments.length > 0) {
      const attachmentsData = attachments.map(a => ({
        'File Name': a.file.split('/').pop(),
        'Uploaded By': a.uploaded_by_name || 'Unknown',
        'Uploaded At': formatDate(a.uploaded_at),
        'Description': a.description || '—',
      }));
      const wsAttachments = XLSX.utils.json_to_sheet(attachmentsData);
      XLSX.utils.book_append_sheet(wb, wsAttachments, 'Attachments');
    }
    
    const fileName = `complaint_${complaint.case_id}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatLabel = (value?: string) => {
    if (!value) return '—';
    return value.replace(/_/g, ' ');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM dd, yyyy • HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const tabs = [
    { id: 'details', label: 'Details', icon: FileText },
    { id: 'followups', label: 'Follow-ups', icon: Clock, count: followUps.length },
    { id: 'attachments', label: 'Attachments', icon: Paperclip, count: attachments.length },
    { id: 'comments', label: 'Comments', icon: MessageCircle, count: comments.length },
  ] as const;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-b from-muted/40 to-card px-8 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-foreground">{complaint.case_id}</h1>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(complaint.status)}`}>
                {formatLabel(complaint.status)}
              </span>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getPriorityColor(complaint.priority)}`}>
                {formatLabel(complaint.priority)}
              </span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground border border-border">
                Level {complaint.sensitivity_level}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(complaint.created_at)} by {complaint.created_by_name || 'Unknown'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export to Excel Button */}
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-all flex items-center gap-2 shadow-sm"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export
            </button>

            {complaint.assigned_to_name && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-lg border border-orange-100">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  {complaint.assigned_to_name}
                </span>
              </div>
            )}
            {/* <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 hover:border-input transition-all flex items-center gap-2 shadow-sm"
              disabled={isSubmitting}
            >
              <User className="h-4 w-4" />
              Assign
            </button> */}
            {complaint.status !== 'completed' && complaint.status !== 'cancelled' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4" />
                Close Case
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-muted/30 px-8">
        <nav className="flex -mb-px space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-input'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'details' && (
          <div className="space-y-8">
            {/* Feedback Provider Information */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Feedback Provider Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</dt>
                  <dd className="text-sm text-foreground font-medium">{complaint.full_name}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</dt>
                  <dd className="text-sm text-foreground capitalize">{complaint.gender || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
                  <dd className="text-sm text-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground/70" />
                    {complaint.phone_number || '—'}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID Number</dt>
                  <dd className="text-sm text-foreground">{complaint.id_number || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nationality</dt>
                  <dd className="text-sm text-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3 text-muted-foreground/70" />
                    {complaint.nationality || '—'}
                  </dd>
                </div>
              </div>
            </section>

            {/* Feedback Information */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Feedback Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Received</dt>
                  <dd className="text-sm text-foreground">{formatDate(complaint.date_feedback_received)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channel</dt>
                  <dd className="text-sm text-foreground capitalize">{formatLabel(complaint.feedback_channel)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Feedback Type</dt>
                  <dd className="text-sm text-foreground capitalize">{formatLabel(complaint.feedback_type)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Geographic Area</dt>
                  <dd className="text-sm text-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground/70" />
                    {complaint.geographic_area}
                  </dd>
                </div>
                {complaint.specific_location && (
                  <div className="col-span-full">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Specific Location</dt>
                    <dd className="text-sm text-foreground mt-1 bg-muted/50 p-3 rounded-lg border border-border">
                      {complaint.specific_location}
                    </dd>
                  </div>
                )}
              </div>
            </section>

            {/* Feedback Details */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Feedback Details
              </h3>
              {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</dt>
                  <dd className="text-sm text-foreground capitalize">{formatLabel(complaint.category)}</dd>
                </div>
                {complaint.sub_category && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub Category</dt>
                    <dd className="text-sm text-foreground">{complaint.sub_category}</dd>
                  </div>
                )}
                {complaint.other_subject && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other Subject</dt>
                    <dd className="text-sm text-foreground">{complaint.other_subject}</dd>
                  </div>
                )}
                <div className="space-y-1">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Has Thanking Note</dt>
                  <dd className="text-sm text-foreground">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      complaint.has_thanking_note ? 'bg-green-50 text-green-700' : 'bg-muted/50 text-muted-foreground'
                    }`}>
                      {complaint.has_thanking_note ? 'Yes' : 'No'}
                    </span>
                  </dd>
                </div>
                {complaint.alleged_perpetrator_type && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perpetrator Type</dt>
                    <dd className="text-sm text-foreground capitalize">{formatLabel(complaint.alleged_perpetrator_type)}</dd>
                  </div>
                )}
              </div> */}
              <div className="space-y-2">
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</dt>
                <dd className="text-sm text-foreground bg-muted/50 p-4 rounded-lg border border-border whitespace-pre-wrap">
                  {complaint.description}
                </dd>
              </div>
            </section>

            {/* Follow-up Information */}
            {(complaint.responsible_person || complaint.actions_taken || complaint.additional_comments) && (
              <section className="space-y-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Follow-up Information
                </h3>
                <div className="space-y-4">
                  {complaint.responsible_person && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Responsible Person</dt>
                      <dd className="text-sm text-foreground">{complaint.responsible_person}</dd>
                    </div>
                  )}
                  {complaint.actions_taken && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions Taken</dt>
                      <dd className="text-sm text-foreground bg-muted/50 p-3 rounded-lg border border-border">
                        {complaint.actions_taken}
                      </dd>
                    </div>
                  )}
                  {complaint.additional_comments && (
                    <div className="space-y-1">
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Comments</dt>
                      <dd className="text-sm text-foreground bg-muted/50 p-3 rounded-lg border border-border">
                        {complaint.additional_comments}
                      </dd>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Important Dates */}
            <section className="space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {complaint.date_response_provided && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Response Provided</dt>
                    <dd className="text-sm text-foreground">{format(new Date(complaint.date_response_provided), 'MMMM dd, yyyy')}</dd>
                  </div>
                )}
                {complaint.date_case_closed && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Case Closed</dt>
                    <dd className="text-sm text-foreground">{format(new Date(complaint.date_case_closed), 'MMMM dd, yyyy')}</dd>
                  </div>
                )}
                {complaint.deadline && (
                  <div className="space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deadline</dt>
                    <dd className="text-sm text-foreground">{format(new Date(complaint.deadline), 'MMMM dd, yyyy')}</dd>
                  </div>
                )}
              </div>
            </section>

            {/* Project */}
            {complaint.project && (
              <section className="space-y-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Project
                </h3>
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground">{complaint.project.title}</p>
                  {complaint.project.code && (
                    <p className="text-xs text-muted-foreground mt-1">Code: {complaint.project.code}</p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'followups' && (
          <div className="space-y-6">
            {/* Follow-up Form */}
            <div className="bg-muted/50 rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">Add Follow-up</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Action Taken <span className="text-red-500">*</span></label>
                  <textarea
                    placeholder="Describe the action taken..."
                    value={newFollowUp.action_taken}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, action_taken: e.target.value })}
                    className="w-full text-sm border border-input rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Response to Complainant (Optional)</label>
                  <textarea
                    placeholder="Any response provided to the complainant..."
                    value={newFollowUp.response_to_complainant}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, response_to_complainant: e.target.value })}
                    className="w-full text-sm border border-input rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Evidence File (Optional)</label>
                  <div className="border-2 border-dashed border-input rounded-lg p-4 hover:border-primary/40 transition-colors">
                    <input
                      type="file"
                      id="followup-file"
                      className="hidden"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <label htmlFor="followup-file" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="h-5 w-5 text-muted-foreground/70" />
                      <span className="text-xs text-muted-foreground">Click to upload evidence</span>
                      <span className="text-xs text-muted-foreground/70">PDF, Images (max 10MB)</span>
                    </label>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Selected: {selectedFiles.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddFollowUp}
                  disabled={!newFollowUp.action_taken || isSubmitting}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Adding...' : 'Add Follow-up'}
                </button>
              </div>
            </div>

            {/* Follow-ups List */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Follow-up History</h4>
              {followUps.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 bg-muted/50 rounded-lg border border-border">
                  No follow-ups recorded yet
                </p>
              ) : (
                <div className="space-y-4">
                  {followUps.map(followup => (
                    <div key={followup.id} className="bg-card border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground block">
                              {followup.followed_by_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(followup.follow_up_date), 'MMM dd, yyyy • HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 ml-11">
                        <div className="bg-muted/50 p-3 rounded-lg border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Action Taken</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{followup.action_taken}</p>
                        </div>
                        {followup.response_to_complainant && (
                          <div className="bg-muted/50 p-3 rounded-lg border border-border">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Response to Complainant</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{followup.response_to_complainant}</p>
                          </div>
                        )}
                        {followup.evidence_file && (
                          <a
                            href={followup.evidence_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                          >
                            <Download className="h-4 w-4" />
                            Download Evidence
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-6">
            {/* Attachment Form */}
            <div className="bg-muted/50 rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">Add Attachments</h4>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-input rounded-lg p-6 hover:border-primary/40 transition-colors">
                  <input
                    type="file"
                    id="attachment-file"
                    multiple
                    className="hidden"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  />
                  <label htmlFor="attachment-file" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground/70" />
                    <span className="text-sm text-muted-foreground">Click to upload files</span>
                    <span className="text-xs text-muted-foreground/70">PDF, Images, Documents (max 10MB each)</span>
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Selected {selectedFiles.length} file(s)
                  </div>
                )}
                <button
                  onClick={handleAddAttachment}
                  disabled={selectedFiles.length === 0 || isSubmitting}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload Attachments'}
                </button>
              </div>
            </div>

            {/* Attachments List */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Attachments</h4>
              {attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 bg-muted/50 rounded-lg border border-border">
                  No attachments yet
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                          <Paperclip className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {attachment.file.split('/').pop()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {attachment.uploaded_by_name} • {format(new Date(attachment.uploaded_at), 'MMM dd, yyyy')}
                          </p>
                          {attachment.description && (
                            <p className="text-xs text-muted-foreground mt-1">{attachment.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-muted-foreground/70 hover:text-primary transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => onDeleteAttachment(attachment.id)}
                          className="p-2 text-muted-foreground/70 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Comment Form */}
            <div className="bg-muted/50 rounded-xl border border-border p-6">
              <h4 className="text-sm font-semibold text-foreground mb-4">Add Comment</h4>
              <div className="space-y-4">
                <textarea
                  placeholder="Write your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full text-sm border border-input rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  rows={3}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Comments</h4>
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 bg-muted/50 rounded-lg border border-border">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-border flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 bg-muted/50 rounded-lg p-4 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {comment.user?.first_name} {comment.user?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), 'MMM dd, yyyy • HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Assign Complaint</h3>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value as any)}
                className="w-full text-sm border border-input rounded-lg p-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-input rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedUserId || isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};