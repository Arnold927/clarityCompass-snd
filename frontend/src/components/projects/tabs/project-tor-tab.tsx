// components/projects/tabs/project-tor-tab.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { useAppPermissions } from '@/hooks/use-app-permissions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  CheckCircle,
  Clock,
  Eye,
  Download,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Type definitions
interface Task {
  id: number;
  title: string;
  description: string;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  project: number | {
    id: number;
    title: string;
    code?: string;
  };
  activity: {
    id: number;
    name: string;
    project_id?: number;
  } | null;
  focal_person: {
    id: number;
    member_name: string;
    user: {
      id: number;
      full_name: string;
      email?: string;
    };
  } | null;
  start_date: string;
  end_date: string;
  has_tor: boolean;
  has_completion_report: boolean;
  tor_details?: {
    id: number;
    filename: string;
    file_url: string;
    uploaded_by: string;
    uploaded_at: string;
    description: string;
  };
  completion_report_details?: {
    id: number;
    activity_report_filename: string;
    activity_report_url: string;
    participants_filename: string;
    participants_url: string;
    submitted_by: string;
    submitted_at: string;
    notes: string;
  };
  notifications?: Notification[];
}

interface Notification {
  id: number;
  notification_type: string;
  message: string;
  sent_at: string;
  is_read: boolean;
}

interface Staff {
  id: number;
  member_name: string;
  user: {
    id: number;
    full_name: string;
    email?: string;
  };
}

interface Project {
  id: number;
  title: string;
  code?: string;
}

interface TORUploadData {
  file: File | null;
  description: string;
}

interface CompletionReportData {
  activity_report: File | null;
  participants_list: File | null;
  notes: string;
}

interface StepData {
  staff: Staff | null;
  project: Project | null;
  activity: Task | null;
  tor: TORUploadData;
  completionReport: CompletionReportData;
}

interface ProjectTorTabProps {
  project?: any;
  setProject?: (project: any) => void;
  tasks?: Task[];
  onSaveTask?: (task: any) => void;
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

// Helper function to get project ID from task
const getTaskProjectId = (task: Task): number | undefined => {
  if (typeof task.project === 'number') return task.project;
  return task.project?.id;
};

// Helper function to get project title from task
// Falls back to projectsList lookup when the API returns a bare numeric ID.
const getTaskProjectTitle = (task: Task, projectsList: Project[] = []): string => {
  if (typeof task.project === 'number') {
    const found = projectsList.find(p => p.id === task.project);
    return found?.title ?? `Project ${task.project}`;
  }
  return task.project?.title || `Project ${task.project?.id}`;
};

// Helper function to get project object from task
const getTaskProjectObject = (task: Task, projectsList: Project[]): Project | null => {
  const projectId = getTaskProjectId(task);
  if (!projectId) return null;
  return projectsList.find(p => p.id === projectId) || { id: projectId, title: `Project ${projectId}` };
};

export const ProjectTorTab: React.FC<ProjectTorTabProps> = ({ 
  project: propProject, 
  tasks: propTasks = [],
  onSaveTask 
}) => {
  const perms = useAppPermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLANNED' | 'ONGOING' | 'COMPLETED'>('ALL');
  const [stepData, setStepData] = useState<StepData>({
    staff: null,
    project: propProject || null,
    activity: null,
    tor: { file: null, description: '' },
    completionReport: { activity_report: null, participants_list: null, notes: '' },
  });
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Filter tasks by status
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'ALL') return tasks;
    return tasks.filter(task => task.status === statusFilter);
  }, [tasks, statusFilter]);

  // Filter tasks for dropdown - exclude COMPLETED, include PLANNED and ONGOING
  const availableTasksForTOR = useMemo(() => {
    if (!stepData.project?.id) return [];

    const sourceTasks = propTasks.length > 0 ? propTasks : tasks;
    
    return sourceTasks.filter(task => {
      const projectId = getTaskProjectId(task);
      // Exclude COMPLETED tasks, include PLANNED and ONGOING
      return projectId === stepData.project?.id && task.status !== 'COMPLETED';
    });
  }, [stepData.project?.id, propTasks, tasks]);

  // Pagination calculations
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredTasks.slice(start, end);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      if (propTasks && propTasks.length > 0) {
        setTasks(propTasks);
        setLoading(false);
      } else {
        await fetchData();
      }
      
      await Promise.all([
        fetchStaff(),
        fetchProjects(),
        fetchNotifications()
      ]);
    };
    
    initializeData();
  }, []);

  // Update tasks when propTasks changes
  useEffect(() => {
    if (propTasks && propTasks.length > 0) {
      setTasks(propTasks);
      setLoading(false);
    }
  }, [propTasks]);

  // Reset page when filter or tasks change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, tasks.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const projectId = propProject?.id;
      const url = projectId ? `/tasks/tasks/?project=${projectId}` : '/tasks/tasks/';
      const tasksRes = await api.get(url);
      const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showSnackbar('Failed to load tasks', 'error');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const fetchStaff = async () => {
    try {
      const projectId = propProject?.id;
      
      if (projectId) {
        const response = await api.get(`/projects/${projectId}/team-members/`);
        const allTeamMembers = Array.isArray(response.data) ? response.data : [];
        const systemUsers = allTeamMembers.filter((member: any) => member.user !== null);
        
        const staffMembers = systemUsers.map((member: any) => ({
          id: member.id,
          member_name: member.member_name || member.user?.full_name || member.user?.username,
          user: {
            id: member.user?.id,
            full_name: member.user?.full_name || member.member_name,
            email: member.user?.email || member.email,
          }
        }));
        
        setStaff(staffMembers);
      } else {
        const projectsResponse = await api.get('/projects/');
        const projectsList = Array.isArray(projectsResponse.data) ? projectsResponse.data : [];
        
        let allSystemUsers: any[] = [];
        
        for (const project of projectsList) {
          try {
            const teamResponse = await api.get(`/projects/${project.id}/team-members/`);
            const teamMembers = Array.isArray(teamResponse.data) ? teamResponse.data : [];
            
            teamMembers.forEach((member: any) => {
              if (member.user !== null && !allSystemUsers.some(u => u.user?.id === member.user?.id)) {
                allSystemUsers.push({
                  id: member.id,
                  member_name: member.member_name || member.user?.full_name || member.user?.username,
                  user: {
                    id: member.user?.id,
                    full_name: member.user?.full_name || member.member_name,
                    email: member.user?.email || member.email,
                  }
                });
              }
            });
          } catch (error) {
            console.error(`Error fetching team members for project ${project.id}:`, error);
          }
        }
        
        setStaff(allSystemUsers);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/tasks/tasks/my-notifications/');
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => setSnackbar(prev => ({ ...prev, open: false })), 6000);
  };

  const handleNextStep = () => {
    if (activeStep === 0 && !stepData.staff) {
      showSnackbar('Please select staff member', 'warning');
      return;
    }
    if (activeStep === 1 && !stepData.project) {
      showSnackbar('Please select project', 'warning');
      return;
    }
    if (activeStep === 2 && !stepData.activity) {
      showSnackbar('Please select a task', 'warning');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleStaffChange = (staffId: string) => {
    const selected = staff.find((s) => s.id === parseInt(staffId));
    setStepData({ ...stepData, staff: selected || null });
  };

  const handleProjectChange = (projectId: string) => {
    const selected = projects.find((p) => p.id === parseInt(projectId));
    setStepData({ ...stepData, project: selected || null, activity: null });
  };

  const handleActivityChange = (activityId: string) => {
    const selected = availableTasksForTOR.find((a) => a.id === parseInt(activityId));
    setStepData({ ...stepData, activity: selected || null });
  };

  const handleTORUpload = async () => {
    if (!stepData.tor.file) {
      showSnackbar('Please select TOR file', 'warning');
      return;
    }

    if (!stepData.activity) {
      showSnackbar('Please select a task', 'warning');
      return;
    }

    setUploading(true);
    try {
      const taskId = stepData.activity.id;
      
      const formData = new FormData();
      formData.append('file', stepData.tor.file);
      formData.append('description', stepData.tor.description);
      
      await api.post(`/tasks/tasks/${taskId}/upload-tor/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSnackbar('TOR uploaded successfully! Task status updated to ONGOING', 'success');
      handleCloseDialog();
      await fetchData();
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error uploading TOR:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Failed to upload TOR';
      showSnackbar(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCompletionReportUpload = async () => {
    if (!stepData.completionReport.activity_report || !stepData.completionReport.participants_list) {
      showSnackbar('Please upload activity report and participants list', 'warning');
      return;
    }

    if (!selectedTask) {
      showSnackbar('No task selected', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('activity_report', stepData.completionReport.activity_report);
      formData.append('participants_list', stepData.completionReport.participants_list);
      if (stepData.completionReport.notes) {
        formData.append('notes', stepData.completionReport.notes);
      }
      
      await api.post(`/tasks/tasks/${selectedTask.id}/submit-completion-report/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSnackbar('Completion report submitted successfully! Task status updated to COMPLETED', 'success');
      handleCloseDialog();
      await fetchData();
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error submitting completion report:', error);
      showSnackbar(error.response?.data?.error || 'Failed to submit completion report', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenTORFlow = () => {
    setActiveStep(0);
    setSelectedTask(null);
    setStepData({
      staff: null,
      project: propProject || null,
      activity: null,
      tor: { file: null, description: '' },
      completionReport: { activity_report: null, participants_list: null, notes: '' },
    });
    setDialogOpen(true);
  };

  const handleOpenCompletionFlow = (task: Task) => {
    const taskProject = getTaskProjectObject(task, projects);
    
    setSelectedTask(task);
    setStepData({
      ...stepData,
      staff: task.focal_person,
      project: taskProject,
      activity: task,
      completionReport: { activity_report: null, participants_list: null, notes: '' },
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setActiveStep(0);
    setSelectedTask(null);
    setStepData({
      staff: null,
      project: propProject || null,
      activity: null,
      tor: { file: null, description: '' },
      completionReport: { activity_report: null, participants_list: null, notes: '' },
    });
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setViewDialogOpen(true);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PLANNED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ONGOING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const pendingTOR = tasks.filter((t) => t?.status === 'PLANNED' && !t?.has_tor);
  const pendingCompletion = tasks.filter((t) => t?.status === 'ONGOING' && !t?.has_completion_report);

  // Status filter counts
  const statusCounts = {
    ALL: tasks.length,
    PLANNED: tasks.filter(t => t.status === 'PLANNED').length,
    ONGOING: tasks.filter(t => t.status === 'ONGOING').length,
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Field visit Upload</p>
                <h3 className="text-2xl font-bold mt-1">{pendingTOR.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Completion Reports</p>
                <h3 className="text-2xl font-bold mt-1">{pendingCompletion.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button — Program Managers and M&E officers can initiate field visit docs */}
      <div className="flex justify-end">
        {perms.canUploadTOR && (
          <Button onClick={handleOpenTORFlow} className="gap-2">
            <Upload className="h-4 w-4" />
            Start Field Visit Process
          </Button>
        )}
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl">Field Visit Tasks</CardTitle>
            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={statusFilter === 'ALL' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('ALL')}
                  className="h-7 px-2 text-xs"
                >
                  All ({statusCounts.ALL})
                </Button>
                <Button
                  variant={statusFilter === 'PLANNED' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('PLANNED')}
                  className="h-7 px-2 text-xs"
                >
                  Planned ({statusCounts.PLANNED})
                </Button>
                <Button
                  variant={statusFilter === 'ONGOING' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('ONGOING')}
                  className="h-7 px-2 text-xs"
                >
                  Ongoing ({statusCounts.ONGOING})
                </Button>
                <Button
                  variant={statusFilter === 'COMPLETED' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter('COMPLETED')}
                  className="h-7 px-2 text-xs"
                >
                  Completed ({statusCounts.COMPLETED})
                </Button>
              </div>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter !== 'ALL' 
                ? `No ${statusFilter.toLowerCase()} tasks found.` 
                : 'No tasks found. Click "Start Field Visit Process" to create your first task.'}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{task.title}</h4>
                        <Badge className={`${getStatusColor(task.status)} text-xs`}>
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {task.description}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>Project: {getTaskProjectTitle(task, projects)}</span>
                        <span>Staff: {task.focal_person?.member_name || 'Not assigned'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {task.has_tor && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          TOR
                        </Badge>
                      )}
                      {task.has_completion_report && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Report
                        </Badge>
                      )}
                      {!task.has_tor && task.status === 'PLANNED' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Field visit Pending
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTask(task)}
                        className="h-8 px-2"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {task.status === 'ONGOING' && !task.has_completion_report && perms.canUploadTOR && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenCompletionFlow(task)}
                          className="h-8 px-3 text-sm"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Submit Report
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTasks.length)} of {filteredTasks.length} tasks
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm mx-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* TOR Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">
              {selectedTask ? 'Submit Completion Report' : 'Field Visit Documentation'}
            </DialogTitle>
            <DialogDescription>
              {selectedTask 
                ? 'Upload completion report for the field visit' 
                : 'Complete the steps to document your field visit'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Step indicators */}
            {!selectedTask && (
              <div className="flex items-center justify-between mb-4">
                {['Staff', 'Project', 'Task', 'Upload'].map((label, idx) => (
                  <div key={label} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      idx <= activeStep 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`text-xs mt-1 ${idx <= activeStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                    {idx < 3 && <div className="h-px bg-border flex-1 ml-2" />}
                  </div>
                ))}
              </div>
            )}

            {/* Step 1: Select Staff */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Staff Member (Must be a user in the system)</Label>
              <Select
                value={stepData.staff?.id?.toString() || ''}
                onValueChange={handleStaffChange}
                disabled={selectedTask ? true : activeStep !== 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.member_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTask && activeStep === 0 && (
                <Button onClick={handleNextStep} className="w-full mt-2" size="sm">
                  Next
                </Button>
              )}
            </div>

            {/* Step 2: Select Project */}
            {(!selectedTask && activeStep >= 1) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project</Label>
                <Select
                  value={stepData.project?.id?.toString() || ''}
                  onValueChange={handleProjectChange}
                  disabled={activeStep !== 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.title} {p.code && `(${p.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeStep === 1 && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={handleBackStep} size="sm" className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleNextStep} size="sm" className="flex-1">
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Task - Only shows PLANNED and ONGOING tasks */}
            {(!selectedTask && activeStep >= 2) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Task</Label>
                <Select
                  value={stepData.activity?.id?.toString() || ''}
                  onValueChange={handleActivityChange}
                  disabled={activeStep !== 2 || !stepData.project}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasksForTOR.length === 0 ? (
                      <div className="p-2 text-center text-muted-foreground text-sm">
                        No pending tasks found for this project
                      </div>
                    ) : (
                      availableTasksForTOR.map((task) => (
                        <SelectItem key={task.id} value={task.id.toString()}>
                          {task.title} - {task.status}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {activeStep === 2 && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={handleBackStep} size="sm" className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleNextStep} size="sm" className="flex-1">
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Upload TOR */}
            {!selectedTask && activeStep >= 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Field Visit Document</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setStepData({
                        ...stepData,
                        tor: { ...stepData.tor, file },
                      });
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Accepted formats: PDF, DOC, DOCX
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (Optional)</Label>
                  <Textarea
                    placeholder="Add any additional notes about this field visit..."
                    value={stepData.tor.description}
                    onChange={(e) =>
                      setStepData({
                        ...stepData,
                        tor: { ...stepData.tor, description: e.target.value },
                      })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleBackStep} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleTORUpload} disabled={uploading} className="flex-1">
                    {uploading ? 'Uploading...' : 'Submit TOR'}
                  </Button>
                </div>
              </div>
            )}

            {/* Upload Completion Report */}
            {selectedTask && (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-lg mb-2">
                  <p className="text-sm font-medium">{selectedTask.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedTask.description}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Activity Report *</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setStepData({
                          ...stepData,
                          completionReport: {
                            ...stepData.completionReport,
                            activity_report: file,
                          },
                        });
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Participants List *</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setStepData({
                          ...stepData,
                          completionReport: {
                            ...stepData.completionReport,
                            participants_list: file,
                          },
                        });
                      }}
                      className="cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Additional Notes</Label>
                    <Textarea
                      placeholder="Add any observations, challenges, or recommendations..."
                      value={stepData.completionReport.notes}
                      onChange={(e) =>
                        setStepData({
                          ...stepData,
                          completionReport: {
                            ...stepData.completionReport,
                            notes: e.target.value,
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCompletionReportUpload} disabled={uploading} className="flex-1">
                    {uploading ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Task Dialog - Removed Activity field */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Task Details</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedTask.description}</p>
                <div className="mt-2">
                  <Badge className={getStatusColor(selectedTask.status)}>
                    {selectedTask.status}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <p className="font-medium mt-0.5">{getTaskProjectTitle(selectedTask, projects)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Focal Person</Label>
                  <p className="font-medium mt-0.5">{selectedTask.focal_person?.member_name || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <p className="font-medium mt-0.5">{selectedTask.start_date}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <p className="font-medium mt-0.5">{selectedTask.end_date}</p>
                </div>
              </div>

              {/* TOR Section */}
              {selectedTask.tor_details && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Field Visit Document
                  </h4>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 space-y-1 text-sm">
                      <p><span className="font-medium">Filename:</span> {selectedTask.tor_details.filename}</p>
                      <p><span className="font-medium">Uploaded By:</span> {selectedTask.tor_details.uploaded_by}</p>
                      <p><span className="font-medium">Uploaded At:</span> {new Date(selectedTask.tor_details.uploaded_at).toLocaleString()}</p>
                      {selectedTask.tor_details.description && (
                        <p><span className="font-medium">Description:</span> {selectedTask.tor_details.description}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.open(selectedTask.tor_details?.file_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Field Visit Document
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Completion Report Section */}
              {selectedTask.completion_report_details && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Completion Report
                  </h4>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 space-y-1 text-sm">
                      <p><span className="font-medium">Submitted By:</span> {selectedTask.completion_report_details.submitted_by}</p>
                      <p><span className="font-medium">Submitted At:</span> {new Date(selectedTask.completion_report_details.submitted_at).toLocaleString()}</p>
                      {selectedTask.completion_report_details.notes && (
                        <p><span className="font-medium">Notes:</span> {selectedTask.completion_report_details.notes}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedTask.completion_report_details?.activity_report_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Activity Report
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedTask.completion_report_details?.participants_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Participants List
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar/Toast */}
      {snackbar.open && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5">
          <Alert variant={snackbar.severity === 'error' ? 'destructive' : 'default'} className="shadow-lg">
            <AlertDescription>{snackbar.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};