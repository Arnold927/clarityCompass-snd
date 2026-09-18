'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  Save,
  CalendarDays,
  Calendar,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Clock,
  DollarSign,
  MapPin,
  Users,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface TaskUpdate {
  id: number;
  status_date: string;
  status: string;
  status_justification: string;
  is_complete: boolean;
  amount_spent: number;
  created_at: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  focal_person: any;
  start_date: string;
  end_date: string;
  budget: number;
  cumulative_spent: number;
  location: any[];
  updates: TaskUpdate[];
  activityId: number;
  activityName: string;
  indicatorData?: any;
}

interface KeyActivity {
  id: number;
  name: string;
  description: string;
  is_completed: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  project: number;
  tasks: Task[];
}

interface Project {
  id: number;
  title: string;
  code: string;
}

interface ActivitiesModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const ActivitiesModal = ({ project, isOpen, onClose, onUpdate }: ActivitiesModalProps) => {
  const [activities, setActivities] = useState<KeyActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("activities");
  
  const [newActivity, setNewActivity] = useState({
    name: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_completed: false,
  });
  
  const [newTask, setNewTask] = useState({
    activityId: 0,
    title: "",
    description: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    budget: "",
    focal_person_id: "",
  });

  useEffect(() => {
    if (isOpen && project.id) {
      fetchActivitiesAndTasks();
    }
  }, [isOpen, project.id]);

  const fetchActivitiesAndTasks = async () => {
    try {
        setLoading(true);
        
        const activitiesResponse = await api.get('/tasks/key-activities/');
        const projectActivities = activitiesResponse.data.filter(
        (activity: any) => activity.project === project.id
        );
        
        let allTasks = [];
        try {
        const allTasksResponse = await api.get('/tasks/tasks/');
        allTasks = Array.isArray(allTasksResponse.data) ? allTasksResponse.data : [];
        
        allTasks.forEach((task: any, index: number) => {
        });
        } catch (tasksError) {
        console.error('Error fetching all tasks:', tasksError);
        }
        
        const activitiesWithTasks = projectActivities.map((activity: any) => {
        const activityTasks = allTasks.filter((task: any) => {
            let taskActivityId;
            
            if (typeof task.activity === 'number') {
            taskActivityId = task.activity;
            }
            else if (task.activity && typeof task.activity === 'object' && task.activity.id) {
            taskActivityId = task.activity.id;
            }
            else if (task.activityId) {
            taskActivityId = task.activityId;
            }
            else if (task.activity && task.activity.id) {
            taskActivityId = task.activity.id;
            }
            
            return taskActivityId === activity.id;
        });
        
        
        return {
            id: activity.id,
            name: activity.name || activity.title || 'Untitled Activity',
            description: activity.description || '',
            is_completed: activity.is_completed || false,
            start_date: activity.start_date || new Date().toISOString().split('T')[0],
            end_date: activity.end_date || activity.due_date || new Date().toISOString().split('T')[0],
            created_at: activity.created_at || new Date().toISOString(),
            project: activity.project || project.id,
            tasks: activityTasks
        };
        });
        
        setActivities(activitiesWithTasks);
        
        if (activitiesWithTasks.length > 0 && !expandedActivityId) {
        setExpandedActivityId(activitiesWithTasks[0].id);
        }
        
    } catch (error) {
        console.error("Error fetching activities and tasks:", error);
        setActivities([]);
    } finally {
        setLoading(false);
    }
    };

  const handleSaveActivity = async (activity: KeyActivity) => {
    try {
      setSaving(true);
      await api.patch(`/tasks/key-activities/${activity.id}/`, {
        name: activity.name,
        description: activity.description,
        start_date: activity.start_date,
        end_date: activity.end_date,
        is_completed: activity.is_completed,
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving activity:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.name.trim()) return;
    
    try {
      setSaving(true);
      await api.post('/tasks/key-activities/', {
        ...newActivity,
        project: project.id,
      });
      setNewActivity({
        name: "",
        description: "",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        is_completed: false,
      });
      fetchActivitiesAndTasks();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error adding activity:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async (activityId: number) => {
    if (!newTask.title.trim()) return;
    
    try {
      setSaving(true);
      await api.post('/tasks/tasks/', {
        ...newTask,
        activity: activityId,
      });
      setNewTask({
        activityId: 0,
        title: "",
        description: "",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        budget: "",
        focal_person_id: "",
      });
      fetchActivitiesAndTasks();
    } catch (error) {
      console.error("Error adding task:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    if (!confirm("Are you sure you want to delete this activity and all its tasks?")) return;
    
    try {
      setSaving(true);
      await api.delete(`/tasks/key-activities/${activityId}/`);
      setActivities(activities.filter(a => a.id !== activityId));
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deleting activity:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    try {
      setSaving(true);
      await api.delete(`/tasks/${taskId}/`);
      setActivities(prev => prev.map(activity => ({
        ...activity,
        tasks: activity.tasks.filter(task => task.id !== taskId)
      })));
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateActivityField = (id: number, field: string, value: any) => {
    setActivities(activities.map(activity => 
      activity.id === id ? { ...activity, [field]: value } : activity
    ));
  };

  const updateTaskField = (activityId: number, taskId: number, field: string, value: any) => {
    setActivities(prev => prev.map(activity => {
      if (activity.id === activityId) {
        return {
          ...activity,
          tasks: activity.tasks.map(task => 
            task.id === taskId ? { ...task, [field]: value } : task
          )
        };
      }
      return activity;
    }));
  };

  const handleSaveTask = async (activityId: number, task: Task) => {
    try {
      setSaving(true);
      await api.patch(`/tasks/${task.id}/`, {
        title: task.title,
        description: task.description,
        start_date: task.start_date,
        end_date: task.end_date,
        budget: task.budget,
        focal_person_id: task.focal_person?.id || null,
      });
      fetchActivitiesAndTasks();
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setSaving(false);
    }
  };

  const safeFormatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTaskProgress = (task: Task): number => {
    if (!task.updates || task.updates.length === 0) return 0;
    const completedUpdates = task.updates.filter(update => update.is_complete).length;
    return Math.round((completedUpdates / task.updates.length) * 100);
  };

  const getTaskStatus = (task: Task): string => {
    const progress = getTaskProgress(task);
    if (progress === 100) return 'completed';
    if (progress > 0) return 'in-progress';
    return 'not-started';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'not-started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Project Activities & Tasks - {project.title} ({project.code})
          </DialogTitle>
          <DialogDescription>
            Manage key activities and their associated tasks for this project
          </DialogDescription>
        </DialogHeader>

        {/* Tabs for Activities and Tasks */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-[400px] mx-auto mb-6">
            <TabsTrigger value="activities" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Key Activities
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              All Tasks
            </TabsTrigger>
          </TabsList>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-6">
            {/* Add New Activity Form */}
            {/* <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Key Activity
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-medium">
                    Activity Name *
                  </Label>
                  <Input
                    id="name"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                    placeholder="e.g., Conduct baseline survey"
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-medium">
                    Description
                  </Label>
                  <Input
                    id="description"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                    placeholder="Brief description of the activity"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="font-medium">
                    <CalendarDays className="h-4 w-4 inline mr-1" />
                    Start Date
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newActivity.start_date}
                    onChange={(e) => setNewActivity({...newActivity, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date" className="font-medium">
                    <CalendarDays className="h-4 w-4 inline mr-1" />
                    End Date
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newActivity.end_date}
                    onChange={(e) => setNewActivity({...newActivity, end_date: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_completed"
                    checked={newActivity.is_completed}
                    onCheckedChange={(checked) => setNewActivity({...newActivity, is_completed: checked})}
                  />
                  <Label htmlFor="is_completed" className="text-sm font-medium">
                    Mark as completed
                  </Label>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleAddActivity} 
                  disabled={!newActivity.name.trim() || saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key Activity
                    </>
                  )}
                </Button>
              </div>
            </div> */}

            {/* Activities List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">
                  📋 Key Activities ({activities.length})
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchActivitiesAndTasks}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                  <p className="text-muted-foreground">Loading activities...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 font-medium">No key activities found for this project</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Add your first key activity using the form above
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Collapsible
                      key={activity.id}
                      open={expandedActivityId === activity.id}
                      onOpenChange={() => setExpandedActivityId(
                        expandedActivityId === activity.id ? null : activity.id
                      )}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Activity Header */}
                      <div className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-auto">
                                  {expandedActivityId === activity.id ? (
                                    <ChevronUp className="h-5 w-5 mr-2" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 mr-2" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <div className="flex-1">
                                <Input
                                  value={activity.name}
                                  onChange={(e) => updateActivityField(activity.id, 'name', e.target.value)}
                                  onBlur={() => handleSaveActivity(activity)}
                                  className="text-lg font-bold border-0 p-0 focus-visible:ring-0 focus-visible:border-b-2"
                                  placeholder="Activity name"
                                />
                                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={activity.is_completed}
                                  onCheckedChange={(checked) => {
                                    updateActivityField(activity.id, 'is_completed', checked);
                                    handleSaveActivity({...activity, is_completed: checked});
                                  }}
                                />
                                <Badge className={activity.is_completed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                                  {activity.is_completed ? 'Completed' : 'Active'}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteActivity(activity.id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <CalendarDays className="h-4 w-4 inline mr-1" />
                                <span>Start: {safeFormatDate(activity.start_date)}</span>
                              </div>
                              <div>
                                <CalendarDays className="h-4 w-4 inline mr-1" />
                                <span>End: {safeFormatDate(activity.end_date)}</span>
                              </div>
                              <div>
                                <ListTodo className="h-4 w-4 inline mr-1" />
                                <span>{activity.tasks.length} task{activity.tasks.length !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Collapsible Content with Tasks */}
                      <CollapsibleContent>
                        <div className="p-4 border-t bg-white">
                          {/* Add Task Form for this Activity */}
                          {/* <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add Task to this Activity
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Task Title *</Label>
                                <Input
                                  value={newTask.title}
                                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                  placeholder="Task title"
                                />
                              </div>
                              <div>
                                <Label>Budget (USD)</Label>
                                <Input
                                  type="number"
                                  value={newTask.budget}
                                  onChange={(e) => setNewTask({...newTask, budget: e.target.value})}
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <Label>Start Date</Label>
                                <Input
                                  type="date"
                                  value={newTask.start_date}
                                  onChange={(e) => setNewTask({...newTask, start_date: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label>End Date</Label>
                                <Input
                                  type="date"
                                  value={newTask.end_date}
                                  onChange={(e) => setNewTask({...newTask, end_date: e.target.value})}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={newTask.description}
                                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                  placeholder="Task description"
                                  rows={2}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end mt-3">
                              <Button
                                onClick={() => handleAddTask(activity.id)}
                                disabled={!newTask.title.trim() || saving}
                                size="sm"
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-2" />
                                )}
                                Add Task
                              </Button>
                            </div>
                          </div> */}

                          {/* Tasks List */}
                          <div className="space-y-3">
                            <h5 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                              Tasks ({activity.tasks.length})
                            </h5>
                            {activity.tasks.length === 0 ? (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                No tasks added yet. Add a task above.
                              </div>
                            ) : (
                              activity.tasks.map((task) => (
                                <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Input
                                          value={task.title}
                                          onChange={(e) => updateTaskField(activity.id, task.id, 'title', e.target.value)}
                                          onBlur={() => handleSaveTask(activity.id, task)}
                                          className="font-medium border-0 p-0 focus-visible:ring-0"
                                          placeholder="Task title"
                                        />
                                        <Badge className={getStatusColor(getTaskStatus(task))}>
                                          {getTaskStatus(task).replace('-', ' ')}
                                        </Badge>
                                        <span className="text-sm text-gray-600">
                                          {getTaskProgress(task)}% complete
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                      
                                      <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{safeFormatDate(task.start_date)} → {safeFormatDate(task.end_date)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
                                          <span>{formatCurrency(task.budget)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          <span>{task.location?.length || 0} location(s)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          <span>{task.focal_person?.name || 'Unassigned'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-2"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {/* Task Updates */}
                                  {task.updates && task.updates.length > 0 && (
                                    <div className="mt-3 pt-3 border-t">
                                      <h6 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" />
                                        Latest Updates ({task.updates.length})
                                      </h6>
                                      <div className="space-y-2">
                                        {task.updates.slice(0, 2).map((update) => (
                                          <div key={update.id} className="text-xs bg-gray-100 rounded p-2">
                                            <div className="flex justify-between">
                                              <span className="font-medium">{safeFormatDate(update.status_date)}</span>
                                              <Badge variant={update.is_complete ? "default" : "secondary"} className="text-xs">
                                                {update.status}
                                              </Badge>
                                            </div>
                                            <p className="text-gray-600 mt-1">{update.status_justification}</p>
                                            {update.amount_spent > 0 && (
                                              <p className="text-green-700 mt-1">
                                                Spent: {formatCurrency(update.amount_spent)}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                        {task.updates.length > 2 && (
                                          <p className="text-xs text-gray-500 text-center">
                                            +{task.updates.length - 2} more updates
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* All Tasks Tab (Flat View) */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">All Tasks Across Activities</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchActivitiesAndTasks}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {activities.flatMap(activity => 
                  activity.tasks.map(task => ({
                    ...task,
                    activityName: activity.name
                  }))
                ).map(task => (
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{task.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.activityName}
                          </Badge>
                          <Badge className={getStatusColor(getTaskStatus(task))}>
                            {getTaskStatus(task).replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        
                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{safeFormatDate(task.start_date)} → {safeFormatDate(task.end_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Budget: {formatCurrency(task.budget)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Spent: {formatCurrency(task.cumulative_spent)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{task.focal_person?.name || 'Unassigned'}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{getTaskProgress(task)}%</span>
                          </div>
                          <Progress value={getTaskProgress(task)} className="h-2" />
                        </div>
                        
                        {/* Updates Summary */}
                        {task.updates && task.updates.length > 0 && (
                          <div className="mt-3 text-xs text-gray-600">
                            <span className="font-medium">Latest update:</span>{' '}
                            {safeFormatDate(task.updates[0].status_date)} - {task.updates[0].status}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Find and expand the parent activity
                          const parentActivity = activities.find(a => 
                            a.tasks.some(t => t.id === task.id)
                          );
                          if (parentActivity) {
                            setExpandedActivityId(parentActivity.id);
                            setActiveTab("activities");
                          }
                        }}
                      >
                        View in Activity
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-gray-500">
              {activities.length} activities, {activities.reduce((sum, a) => sum + a.tasks.length, 0)} total tasks
            </div>
            <div className="space-x-2">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
              <Button onClick={fetchActivitiesAndTasks} variant="secondary">
                Refresh All
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ActivitiesModal };