import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Complaint, 
  FEEDBACK_CHANNELS, 
  FEEDBACK_TYPES, 
  CATEGORIES, 
  SENSITIVITY_LEVELS,
  GENDERS,
  PRIORITIES,
  STATUSES
} from '../../types/complaint.types';
import { 
  AlertCircle, 
  Upload, 
  X, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  Tag as TagIcon,
  AlertTriangle,
  FileText,
  Clock,
  ChevronRight,
  CheckCircle,
  Circle,
  Lock
} from 'lucide-react';
import { fetchProjectTeamMembers } from '@/lib/api';

interface ApiTeamMember {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
  } | null;
  member_name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
}

interface TeamMemberOption {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
}

interface Props {
  initialData?: Partial<Complaint>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  projects?: Array<{ id: number; name: string }>;
  users?: Array<{ id: number; first_name: string; last_name: string }>;
  tags?: Array<{ id: number; name: string; color?: string }>;
  loading?: boolean;
}

export const ComplaintForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  onCancel,
  projects = [],
  users = [],
  tags = [],
  loading = false,
}) => {
  const [selectedTags, setSelectedTags] = useState<number[]>(initialData?.tags?.map(t => t.id) || []);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState<string>('complainant');
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  // Check if we're in edit mode (complaint already exists)
  const isEditMode = !!initialData?.id;
  const isFollowUpDisabled = !isEditMode;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty, touchedFields } } = useForm({
    defaultValues: {
      full_name: '',
      gender: 'unknown',
      phone_number: '',
      id_number: '',
      nationality: '',
      date_feedback_received: new Date().toISOString().slice(0, 16),
      feedback_channel: 'phone',
      feedback_type: 'beneficiary',
      geographic_area: '',
      specific_location: '',
      has_thanking_note: false,
      sensitivity_level: 1,
      other_subject: '',
      description: '',
      alleged_perpetrator_type: '',
      alleged_perpetrator_details: '',
      responsible_person: '',
      actions_taken: '',
      additional_comments: '',
      priority: 'medium',
      status: 'pending',
      deadline: '',
      project: '',
      assigned_to: '',
    }
  });

  const watchSensitivity = watch('sensitivity_level');
  const watchProject = watch('project');
  const showAllegedPerpetrator = watchSensitivity >= 4;

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('Resetting form with initialData:', initialData);
      reset({
        full_name: initialData.full_name || '',
        gender: initialData.gender || 'unknown',
        phone_number: initialData.phone_number || '',
        id_number: initialData.id_number || '',
        nationality: initialData.nationality || '',
        date_feedback_received: initialData.date_feedback_received 
          ? new Date(initialData.date_feedback_received).toISOString().slice(0, 16) 
          : new Date().toISOString().slice(0, 16),
        feedback_channel: initialData.feedback_channel || 'phone',
        feedback_type: initialData.feedback_type || 'beneficiary',
        geographic_area: initialData.geographic_area || '',
        specific_location: initialData.specific_location || '',
        has_thanking_note: initialData.has_thanking_note || false,
        sensitivity_level: initialData.sensitivity_level || 1,
        other_subject: initialData.other_subject || '',
        description: initialData.description || '',
        alleged_perpetrator_type: initialData.alleged_perpetrator_type || '',
        alleged_perpetrator_details: initialData.alleged_perpetrator_details || '',
        responsible_person: initialData.responsible_person || '',
        actions_taken: initialData.actions_taken || '',
        additional_comments: initialData.additional_comments || '',
        priority: initialData.priority || 'medium',
        status: initialData.status || 'pending',
        deadline: initialData.deadline || '',
        project: initialData.project?.id?.toString() || '',
        assigned_to: initialData.assigned_to?.id?.toString() || '',
      });
      
      // Update selected tags
      if (initialData.tags) {
        setSelectedTags(initialData.tags.map(t => t.id));
      }
    }
  }, [initialData, reset]);

  // Update completed sections based on initialData
  useEffect(() => {
    const newCompletedSections = new Set(completedSections);
    
    if (initialData?.full_name) newCompletedSections.add('complainant');
    if (initialData?.date_feedback_received) newCompletedSections.add('feedback');
    if (initialData?.description) newCompletedSections.add('complaint');
    if (initialData?.priority) newCompletedSections.add('assignment');
    if (initialData?.actions_taken && isEditMode) newCompletedSections.add('followup');
    
    setCompletedSections(newCompletedSections);
  }, [initialData, isEditMode]);

  // Load team members when project changes
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (watchProject) {
        try {
          const response = await fetchProjectTeamMembers(Number(watchProject));
          const teamMembersData = response as unknown as ApiTeamMember[];
          
          // Filter to only include members that have a user object (actual system users)
          const mappedTeamMembers: TeamMemberOption[] = teamMembersData
            .filter(m => m.user !== null) // Only include members with user accounts
            .map(m => {
              // Since we filtered out null users, m.user is guaranteed to exist here
              return {
                id: m.user!.id,
                first_name: m.user!.first_name || '',
                last_name: m.user!.last_name || '',
                email: m.user!.email || '',
              };
            });
          
          setTeamMembers(mappedTeamMembers);
          
          const currentAssignee = watch('assigned_to');
          if (currentAssignee && !mappedTeamMembers.some(m => m.id === Number(currentAssignee))) {
            setValue('assigned_to', '');
          }
        } catch (error) {
          console.error('Failed to load team members:', error);
          setTeamMembers([]);
        }
      } else {
        setTeamMembers([]);
        setValue('assigned_to', '');
      }
    };
    
    loadTeamMembers();
  }, [watchProject, watch, setValue]);

  // Set project value when initialData loads
  useEffect(() => {
    if (initialData?.project?.id && projects.length > 0) {
      const projectExists = projects.some(p => p.id === initialData.project?.id);
      if (projectExists) {
        setValue('project', initialData.project.id.toString());
      }
    }
  }, [initialData?.project?.id, projects, setValue]);

  // Set assigned_to value when team members load
  useEffect(() => {
    if (initialData?.assigned_to?.id && teamMembers.length > 0) {
      const memberExists = teamMembers.some(m => m.id === initialData.assigned_to?.id);
      if (memberExists) {
        setValue('assigned_to', initialData.assigned_to.id.toString());
      }
    }
  }, [initialData?.assigned_to?.id, teamMembers, setValue]);

  // Scroll to first error
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0];
      const element = document.getElementById(`section-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [errors]);

  const handleFormSubmit = async (data: any) => {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        if (key === 'project' || key === 'assigned_to') {
          formData.append(key, data[key].toString());
        } else {
          formData.append(key, data[key]);
        }
      }
    });

    selectedTags.forEach(tagId => {
      formData.append('tags', tagId.toString());
    });

    attachments.forEach(file => {
      formData.append('attachments', file);
    });

    await onSubmit(formData);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sections = [
    { id: 'complainant', label: 'Provider Information', icon: User },
    { id: 'feedback', label: 'Feedback Information', icon: Clock },
    { id: 'complaint', label: 'Feedback Details', icon: FileText },
    { id: 'assignment', label: 'Assignment & Tracking', icon: TagIcon },
    { id: 'followup', label: 'Follow-up Information', icon: AlertCircle, disabled: !isEditMode },
  ];

  const getSectionIcon = (sectionId: string, Icon: any, disabled?: boolean) => {
    if (disabled) {
      return <Lock className="h-4 w-4 text-muted-foreground/70" />;
    }
    if (completedSections.has(sectionId)) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (activeSection === sectionId) {
      return <Icon className="h-4 w-4 text-primary" />;
    }
    return <Icon className="h-4 w-4 text-muted-foreground/70" />;
  };

  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-4 py-6">
      {/* Debug Panel - Remove after fixing */}
      <div className="hidden">
        <div className="bg-yellow-50 p-2 mb-4 rounded text-xs">
          Debug: feedback_channel = "{watch('feedback_channel')}" | 
          initialData?.feedback_channel = "{initialData?.feedback_channel}"
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6 space-y-2">
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Form Sections</h4>
            <div className="space-y-1">
              {sections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    if (!section.disabled) {
                      setActiveSection(section.id);
                      document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  disabled={section.disabled}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    section.disabled
                      ? 'opacity-50 cursor-not-allowed bg-muted/50'
                      : activeSection === section.id
                      ? 'bg-primary/5 text-primary shadow-sm border-l-3 border-primary'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getSectionIcon(section.id, section.icon, section.disabled)}
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  {!section.disabled && activeSection === section.id && (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                  {section.disabled && (
                    <span className="text-xs text-muted-foreground/70">(Save first)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Progress Card */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Progress</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-foreground">{completedSections.size}/{sections.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary/50 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSections.size / sections.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Info Banner for Create Mode */}
          {!isEditMode && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">Follow-up disabled</p>
                  <p>Save this complaint first to enable follow-up information and actions.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Form */}
      <div className="flex-1">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Complainant Information */}
          <div id="section-complainant" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all hover:shadow-md">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/30 border-b border-orange-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center">
                  <User className="h-5 w-5 mr-2 text-primary" />
                  Feedback Provider Information
                </h3>
                {completedSections.has('complainant') && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" /> Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-primary/70 mt-1">Personal details of the feedback provider</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('full_name', { required: 'Full name is required' })}
                    className={`w-full text-sm border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      errors.full_name ? 'border-red-300 bg-red-50' : 'border-input'
                    }`}
                    placeholder="Enter full name"
                  />
                  {errors.full_name && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Gender</label>
                  <select
                    {...register('gender')}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {GENDERS.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                    <input
                      {...register('phone_number')}
                      className="w-full text-sm border border-input rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="+254 XXX XXX XXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">ID Number</label>
                  <input
                    {...register('id_number')}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="ID/Passport"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nationality</label>
                  <input
                    {...register('nationality')}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="e.g., Kenyan"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Information */}
          <div id="section-feedback" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all hover:shadow-md">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/30 border-b border-orange-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  Feedback Information
                </h3>
                {completedSections.has('feedback') && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" /> Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-primary/70 mt-1">How and when the feedback was received</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Date Received <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    {...register('date_feedback_received', { required: 'Date received is required' })}
                    className={`w-full text-sm border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                      errors.date_feedback_received ? 'border-red-300 bg-red-50' : 'border-input'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Feedback Channel <span className="text-red-500">*</span>
                  </label>
                  <select
                    key={`feedback-channel-${initialData?.feedback_channel || 'default'}`}
                    {...register('feedback_channel', { required: 'Channel is required' })}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {FEEDBACK_CHANNELS.map(channel => (
                      <option key={channel.value} value={channel.value}>{channel.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Feedback Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('feedback_type', { required: 'Feedback type is required' })}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    {FEEDBACK_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Geographic Area <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/70" />
                    <input
                      {...register('geographic_area', { required: 'Geographic area is required' })}
                      className={`w-full text-sm border rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                        errors.geographic_area ? 'border-red-300 bg-red-50' : 'border-input'
                      }`}
                      placeholder="Region/District"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Specific Location
                  </label>
                  <textarea
                    {...register('specific_location')}
                    rows={2}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Village, camp, exact location..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Complaint Details */}
          <div id="section-complaint" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all hover:shadow-md">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/30 border-b border-orange-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Feedback Details
                </h3>
                {completedSections.has('complaint') && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" /> Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-primary/70 mt-1">Detailed information about the feedback</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center bg-muted/50/80 px-4 py-3 rounded-lg border border-border/50">
                  <input
                    type="checkbox"
                    {...register('has_thanking_note')}
                    className="h-4 w-4 text-primary rounded border-input focus:ring-primary"
                  />
                  <label className="ml-3 text-sm text-muted-foreground">
                    Contains thanking note / appreciation
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Sensitivity Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('sensitivity_level', { required: 'Sensitivity level is required' })}
                      className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      {SENSITIVITY_LEVELS.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      {...register('description', { required: 'Description is required' })}
                      rows={4}
                      className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="Provide detailed description of the feedback..."
                    />
                  </div>

                  {showAllegedPerpetrator && (
                    <>
                      <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Person Providing Feedback <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register('alleged_perpetrator_type', { required: 'Provider type is required' })}
                          className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                          <option value="">Select type...</option>
                          <option value="snd_staff">SND Staff</option>
                          <option value="beneficiary">Beneficiary</option>
                          <option value="contractor">Contractor</option>
                          <option value="implementing_partner">Implementing Partner</option>
                          <option value="third_party_with_link">Third Parties WITH link</option>
                          <option value="third_party_without_link">Third Parties WITHOUT link</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assignment & Tracking */}
          <div id="section-assignment" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all hover:shadow-md">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/30 border-b border-orange-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground flex items-center">
                  <TagIcon className="h-5 w-5 mr-2 text-primary" />
                  Assignment & Tracking
                </h3>
                {completedSections.has('assignment') && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" /> Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-primary/70 mt-1">Case assignment and priority settings</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
                  <select {...register('priority')} className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    {PRIORITIES.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                  <select {...register('status')} className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    {STATUSES.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Deadline</label>
                  <input
                    type="date"
                    {...register('deadline')}
                    className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Project</label>
                  <select {...register('project')} className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Assign To</label>
                  <select {...register('assigned_to')} className="w-full text-sm border border-input rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Information - Disabled in create mode */}
          <div id="section-followup" className={`bg-card rounded-xl shadow-sm border overflow-hidden transition-all ${
            isFollowUpDisabled ? 'border-border opacity-75' : 'border-border hover:shadow-md'
          }`}>
            <div className={`border-b px-6 py-4 ${
              isFollowUpDisabled ? 'bg-muted/50 border-border/50' : 'bg-gradient-to-r from-orange-50 to-orange-50/30 border-orange-100'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-semibold flex items-center ${
                  isFollowUpDisabled ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {isFollowUpDisabled ? (
                    <Lock className="h-5 w-5 mr-2 text-muted-foreground/70" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2 text-primary" />
                  )}
                  Follow-up Information
                </h3>
                {completedSections.has('followup') && !isFollowUpDisabled && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" /> Complete
                  </span>
                )}
                {isFollowUpDisabled && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    <Lock className="h-3 w-3 mr-1" /> Disabled
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${
                isFollowUpDisabled ? 'text-muted-foreground/70' : 'text-primary/70'
              }`}>
                {isFollowUpDisabled 
                  ? 'Save the complaint first to enable follow-up information' 
                  : 'Actions taken and follow-up details'}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isFollowUpDisabled ? 'text-muted-foreground/70' : 'text-foreground'
                  }`}>
                    Responsible Person
                  </label>
                  <input
                    {...register('responsible_person')}
                    disabled={isFollowUpDisabled}
                    className={`w-full text-sm border rounded-lg px-4 py-2.5 transition-all ${
                      isFollowUpDisabled 
                        ? 'bg-muted/50 border-border text-muted-foreground/70 cursor-not-allowed' 
                        : 'border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                    placeholder={isFollowUpDisabled ? 'Save complaint to enable' : 'Name of person handling this case'}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${
                    isFollowUpDisabled ? 'text-muted-foreground/70' : 'text-foreground'
                  }`}>
                    Actions Taken
                  </label>
                  <textarea
                    {...register('actions_taken')}
                    disabled={isFollowUpDisabled}
                    rows={2}
                    className={`w-full text-sm border rounded-lg px-4 py-2.5 transition-all ${
                      isFollowUpDisabled 
                        ? 'bg-muted/50 border-border text-muted-foreground/70 cursor-not-allowed' 
                        : 'border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'
                    }`}
                    placeholder={isFollowUpDisabled ? 'Save complaint to enable' : 'Describe actions taken so far...'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-medium border border-input rounded-lg text-foreground hover:bg-muted/50 hover:border-input transition-all flex items-center"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!isEditMode && !isDirty)}
              className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm hover:shadow"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : initialData ? 'Update Feedback' : 'Create Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};