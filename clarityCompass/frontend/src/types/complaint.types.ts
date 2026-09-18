export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface Project {
  id: number;
  name: string;
  code?: string;
  title?:string;
}

export type AllegedPerpetratorType = 
  | 'snd_staff' 
  | 'beneficiary' 
  | 'contractor' 
  | 'implementing_partner' 
  | 'third_party_with_link' 
  | 'third_party_without_link';

export interface Complaint {
  id: number;
  case_id: string;
  case_status: string;
  
  date_feedback_received: string;
  feedback_channel: 'phone' | 'email' | 'sms' | 'whatsapp' | 'in_person' | 'website' | 'social_media' | 'complaint_box' | 'crfm_clinics' | 'gender_help_desk' | 'other';
  
  full_name: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  phone_number?: string;
  id_number?: string;
  nationality?: string;
  
  feedback_type: 'snd_staff' | 'beneficiary' | 'contractor' | 'implementing_partner' | 'third_party_with_link' | 'third_party_without_link';
  
  geographic_area: string;
  specific_location?: string;
  
  has_thanking_note: boolean;
  sensitivity_level: 1 | 2 | 3 | 4 | 5;
  // category: 'corruption_fraud' | 'sexual_exploitation_abuse' | 'child_ill_treatment' | 'other';
  // sub_category: string;
  other_subject?: string;
  description: string;
  alleged_perpetrator_details?: string;
  alleged_perpetrator_type?: AllegedPerpetratorType;
  
  responsible_person?: string;
  actions_taken?: string;
  evidence_of_followup?: string;
  date_response_provided?: string;
  date_case_closed?: string;
  additional_comments?: string;
  
  created_by: User;
  created_by_name?: string;
  assigned_to?: User;
  assigned_to_name?: string;
  updated_by: User;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  deadline?: string;
  project?: Project;
  tags: Tag[];
  
  comment_count?: number;
  followup_count?: number;
}

export const computeCaseStatus = (complaint: Partial<Complaint>): string => {
  if (complaint.date_case_closed) return 'closed';
  if (complaint.date_response_provided) return 'response_sent';
  if (complaint.assigned_to) return 'in_progress';
  return 'pending';
};

export type CaseStatus = 'pending' | 'in_progress' | 'response_sent' | 'closed' | 'overdue';


export const ALLEGED_PERPETRATOR_TYPES = [
  { value: 'snd_staff', label: 'SND Staff' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'implementing_partner', label: 'Implementing Partner' },
  { value: 'third_party_with_link', label: 'Third Parties WITH a link to the project' },
  { value: 'third_party_without_link', label: 'Third Parties WITHOUT link to the project' },
] as const;


export const CORRUPTION_FRAUD_SUB_CATEGORIES = [
  { value: 'product_substitution', label: 'Product substitution: unmatching quality or quantity of aid' },
  { value: 'aid_diversion', label: 'Aid diversion: theft, extortion or irregular/biased beneficiary selection process' },
  { value: 'falsification', label: 'Falsification of data/documents/beneficiaries' },
  { value: 'bid_rigging', label: 'Bid rigging' },
  { value: 'other', label: 'Other' },
] as const;

export const SEXUAL_EXPLOITATION_SUB_CATEGORIES = [
  { value: 'need_for_protection', label: 'Need for protection regarding abuse (if not Pacida-related)' },
  { value: 'sexual_favours', label: 'Sexual favours against aid/food/jobs/other' },
  { value: 'sexual_assault', label: 'Sexual assault' },
  { value: 'paid_sexual_relations', label: 'Paid sexual relations' },
  { value: 'human_trafficking', label: 'Human trafficking of a sexual nature' },
  { value: 'sexual_harassment', label: 'Sexual harassment' },
  { value: 'other', label: 'Other' },
] as const;

export const CHILD_ABUSE_SUB_CATEGORIES = [
  { value: 'need_for_protection', label: 'Need for protection regarding abuse (if not Pacida-related)' },
  { value: 'physical_abuse', label: 'Abuse (physical, emotional maltreatment or negligent treatment)' },
  { value: 'sexual_abuse', label: 'Sexual exploitation/abuse' },
  { value: 'child_labour', label: 'Child labor/commercial exploitation' },
  { value: 'other', label: 'Other' },
] as const;

export const getSubCategoriesForCategory = (category: string) => {
  switch (category) {
    case 'corruption_fraud':
      return CORRUPTION_FRAUD_SUB_CATEGORIES;
    case 'sexual_exploitation_abuse':
      return SEXUAL_EXPLOITATION_SUB_CATEGORIES;
    case 'child_ill_treatment':
      return CHILD_ABUSE_SUB_CATEGORIES;
    default:
      return [{ value: 'other', label: 'Other' }];
  }
};


export const CASE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'response_sent', label: 'Response Sent', color: 'yellow' },
  { value: 'closed', label: 'Closed', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
] as const;

export const OTHER_SUBJECT_REQUIRED = (category: string, sub_category: string): boolean => {
  return sub_category === 'other';
};

export const ALLEGED_PERPETRATOR_REQUIRED = (sensitivity_level: number): boolean => {
  return sensitivity_level >= 4;
};

export interface ComplaintFollowUp {
  id: number;
  complaint: number;
  follow_up_date: string;
  action_taken: string;
  response_to_complainant?: string;
  evidence_file?: string;
  followed_by: User;
  followed_by_name?: string;
  created_at: string;
}

export interface ComplaintAttachment {
  id: number;
  complaint: number;
  file: string;
  file_url?: string;
  description: string;
  uploaded_by: User;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export interface ComplaintComment {
  id: number;
  complaint: number;
  user: User;
  // user_name?: string;
  content: string;
  created_at: string;
}

export interface ComplaintStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  my_tasks: number;
  high_priority: number;
  unassigned: number;
  by_sensitivity: Array<{sensitivity_level: number; count: number}>;
  by_category: Array<{category: string; count: number}>;
  by_status: Array<{status: string; count: number}>;
  by_priority: Array<{priority: string; count: number}>;
}

export interface ComplaintFilters {
  status?: string;
  priority?: string;
  sensitivity_level?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  overdue?: boolean;
  category?: string;
  project_id?: number;
}

export const FEEDBACK_CHANNELS = [
  { value: 'phone', label: 'Phone Call/Toll Free Line' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'in_person', label: 'Face-to-Face with SND staff' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'complaint_box', label: 'Complaint Box' },
  { value: 'crfm_clinics', label: 'CRFM Clinics' },
  { value: 'gender_help_desk', label: 'Gender Help Desk' },
  { value: 'other', label: 'Other' },
] as const;

export const FEEDBACK_TYPES = [
  { value: 'snd_staff', label: 'SND Staff' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'implementing_partner', label: 'Implementing Partner' },
  { value: 'third_party_with_link', label: 'Third Parties WITH a link to the project' },
  { value: 'third_party_without_link', label: 'Third Parties WITHOUT link to the project' },
] as const;

export const CATEGORIES = [
  { value: 'corruption_fraud', label: 'Alleged corruption / fraud' },
  { value: 'sexual_exploitation_abuse', label: 'Alleged sexual exploitation / abuse' },
  { value: 'child_ill_treatment', label: 'Alleged child ill-treatment / negligence' },
  { value: 'other', label: 'Other' },
] as const;

export const SENSITIVITY_LEVELS = [
  { value: 1, label: 'Level 1 (Request for Info)' },
  { value: 2, label: 'Level 2 (Request for assistance)' },
  { value: 3, label: 'Level 3 (Minor complaint regarding the activities)' },
  { value: 4, label: 'Level 4 (Major complaint regarding the activities)' },
  { value: 5, label: 'Level 5 (Major complaint regarding inappropriate behaviour/abuses)' },
] as const;

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'blue' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
] as const;

export const STATUSES = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
] as const;

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unknown', label: 'Prefer not to say' },
] as const;
