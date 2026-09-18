'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { 
  PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Target, Goal, 
  Calendar, User, MapPin, DollarSign, Clock, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { OutcomeEditor } from '@/components/strategic-plan/outcome-editor';
import { OutputEditor } from '@/components/strategic-plan/output-editor';
import { IndicatorEditor } from '@/components/strategic-plan/indicator-editor';
import { Input } from '../ui/input';
import { ActivityEditor } from '../strategic-plan/activity-editor';
import api from '@/lib/api';
import { X } from 'lucide-react';
import type { Output as OutputEditorOutput } from '@/components/strategic-plan/output-editor';
import { TaskEditor } from '../tasks/task-editor';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { OutcomeIndicatorEditor } from './outcome-indicator-editor';
import { OutputIndicatorEditor } from './output-indicator-editor';


type Disaggregator = {
  id: number;
  name: string;
};
type Indicator = { id?: number | null; name: string; description?: string; disaggregators?: Disaggregator[] };
type Activity = { id?: string | number; name: string; description?: string };
type Output = OutputEditorOutput & {
  activities?: Activity[];
  tasks?: Task[];
};
type Outcome = { id?: string | number; name: string; description?: string; indicators?: Indicator[]; outputs?: Output[] };
type ResultsFramework = { id?: string | number; objective: string; description?: string; outcomes: Outcome[] };
type Project = { id: string | number; resultsFramework?: ResultsFramework[]; [key: string]: any };
type Task = { 
  id?: string; 
  title: string; 
  description: string;
  output?: number;
  start_date?: string;
  end_date?: string;
  budget?: string;
  locationIds?: string[];
  updates?: any[];
  indicatorData?: any;
  attachments?: any[];
  activity?: number;
  focal_person?: { id: number; name: string } | null;
  location?: number[];
  cumulative_spent?: number;
};

export function ProjectResultsFramework({ project, setProject }: { project: Project; setProject: Function }) {
  const [framework, setFramework] = useState<ResultsFramework[]>(
    project.resultsFramework && project.resultsFramework.length > 0
      ? project.resultsFramework
      : [{ objective: '', description: '', outcomes: [] }]
  );

  const [editingObjectiveIndex, setEditingObjectiveIndex] = useState<number | null>(null);
  const [editingOutcome, setEditingOutcome] = useState<{ outcome: Outcome; objIndex: number } | null>(null);
  const [editingOutput, setEditingOutput] = useState<{ output: Output; objIndex: number; outIndex: number; outputIndex?: number } | null>(null);
  const [editingActivity, setEditingActivity] = useState<{ activity: Activity; objIndex: number; outIndex: number; actIndex?: number } | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<{
    indicator: { id?: number | null; name: string; description?: string; project_indicator?: any | null };
    parentType: 'outcome' | 'output';
    objIndex: number;
    outIndex?: number;
    outputIndex?: number;
    indIndex?: number;
  } | null>(null);

  const [editingTask, setEditingTask] = useState<{ 
    task: Task; 
    objIndex: number; 
    outIndex: number; 
    outputIndex: number;
    taskIndex?: number;
  } | null>(null);

  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [openOutcomes, setOpenOutcomes] = useState<string[]>([]);
  const [openOutputs, setOpenOutputs] = useState<string[]>([]);

  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [editingOutcomeIndicator, setEditingOutcomeIndicator] = useState<{
    indicator: Indicator;
    objIndex: number;
    outIndex: number;
    indIndex?: number;
  } | null>(null);
  const [editingOutputIndicator, setEditingOutputIndicator] = useState<{
    indicator: Indicator;
    objIndex: number;
    outIndex: number;
    outputIndex: number;
    indIndex?: number;
  } | null>(null);
  const [availableDisaggregators, setAvailableDisaggregators] = useState<Disaggregator[]>([]);

useEffect(() => {
  const fetchDisaggregators = async () => {
    try {
      const response = await api.get('/strategic/disaggregators/');
      setAvailableDisaggregators(response.data);
    } catch (error) {
      console.error('Failed to fetch disaggregators:', error);
    }
  };
  
  fetchDisaggregators();
}, []);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!project.id) return;
      
      setLoadingTeam(true);
      try {
        const response = await api.get(`/projects/${project.id}/team-members/`);
        
        const formattedMembers = response.data.map((member: any) => ({
          id: member.id,
          name: member.member_name || member.name || member.full_name || `Team Member ${member.id}`,
          role: member.member_role || member.role || 'Team Member',
        }));
        
        setTeamMembers(formattedMembers);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeamMembers();
  }, [project.id]);

  const handleSaveOutcomeIndicator = async (indicator: Indicator) => {
  if (!editingOutcomeIndicator) return;

  const { objIndex, outIndex, indIndex } = editingOutcomeIndicator;
  const newFramework = [...framework];
  const outcome = newFramework[objIndex].outcomes[outIndex];

  try {
    let savedIndicator;
    
    const disaggregatorIds = indicator.disaggregators
      ?.map(d => {
        if (typeof d === 'object' && d.id && typeof d.id === 'number') {
          return d.id;
        }
        if (typeof d === 'object' && d.id && typeof d.id === 'number' && d.id > 1000000000000) {
          console.warn('Skipping temporary disaggregator ID:', d.id);
          return undefined;
        }
        if (typeof d === 'string') {
          const found = availableDisaggregators?.find(ad => ad.name === d);
          return found?.id;
        }
        return undefined;
      })
      .filter(id => id !== undefined);

    const payload = {
      name: indicator.name,
      description: indicator.description || '',
      outcome: outcome.id,
      disaggregator_ids: disaggregatorIds || [],
    };


    if (indIndex !== undefined && outcome.indicators?.[indIndex]?.id) {
      const response = await api.put(
        `/projects/project-outcome-indicators/${outcome.indicators[indIndex].id}/`,
        payload
      );
      savedIndicator = response.data;
      outcome.indicators![indIndex] = savedIndicator;
    } else {
      const response = await api.post('/projects/project-outcome-indicators/', payload);
      savedIndicator = response.data;
      outcome.indicators = [...(outcome.indicators || []), savedIndicator];
    }

    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
    setEditingOutcomeIndicator(null);
  } catch (err) {
    console.error('Failed to save outcome indicator', err);
    alert('Failed to save outcome indicator. Please try again.');
  }
};

const handleSaveOutputIndicator = async (indicator: Indicator) => {
  if (!editingOutputIndicator) return;

  const { objIndex, outIndex, outputIndex, indIndex } = editingOutputIndicator;
  const newFramework = [...framework];
  const output = newFramework[objIndex].outcomes[outIndex].outputs?.[outputIndex];

  if (!output) return;

  try {
    let savedIndicator;
    
    const disaggregatorIds = indicator.disaggregators
      ?.map(d => {
        if (typeof d === 'object' && d.id && typeof d.id === 'number') {
          return d.id;
        }
        if (typeof d === 'object' && d.id && typeof d.id === 'number' && d.id > 1000000000000) {
          console.warn('Skipping temporary disaggregator ID:', d.id);
          return undefined;
        }
        if (typeof d === 'string') {
          const found = availableDisaggregators?.find(ad => ad.name === d);
          return found?.id;
        }
        return undefined;
      })
      .filter(id => id !== undefined);

    const payload = {
      name: indicator.name,
      description: indicator.description || '',
      output: output.id,
      disaggregator_ids: disaggregatorIds || [],
    };


    if (indIndex !== undefined && output.indicators?.[indIndex]?.id) {
      const response = await api.put(
        `/projects/project-output-indicators/${output.indicators[indIndex].id}/`,
        payload
      );
      savedIndicator = response.data;
      output.indicators![indIndex] = savedIndicator;
    } else {
      const response = await api.post('/projects/project-output-indicators/', payload);
      savedIndicator = response.data;
      output.indicators = [...(output.indicators || []), savedIndicator];
    }

    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
    setEditingOutputIndicator(null);
  } catch (err) {
    console.error('Failed to save output indicator', err);
    alert('Failed to save output indicator. Please try again.');
  }
};

  const fetchTasksForOutputs = async (framework: ResultsFramework[]) => {
    if (!project.id) return framework;

    try {
      const response = await api.get(`/tasks/tasks/?project=${project.id}`);
      const allTasks = response.data;
      
      const tasksByOutput: Record<string, any[]> = {};
      allTasks.forEach((task: any) => {
        if (task.output) {
          const outputId = String(task.output);
          if (!tasksByOutput[outputId]) {
            tasksByOutput[outputId] = [];
          }
          tasksByOutput[outputId].push(task);
        }
      });

      const updatedFramework = framework.map(objective => ({
        ...objective,
        outcomes: objective.outcomes?.map(outcome => ({
          ...outcome,
          outputs: outcome.outputs?.map(output => ({
            ...output,
            tasks: tasksByOutput[String(output.id)] || output.tasks || []
          }))
        }))
      }));

      return updatedFramework;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return framework;
    }
  };

  useEffect(() => {
    const initializeFramework = async () => {
      const initialFramework = project.resultsFramework && project.resultsFramework.length > 0
        ? project.resultsFramework
        : [{ objective: '', description: '', outcomes: [] }];
      
      const frameworkWithTasks = await fetchTasksForOutputs(initialFramework);
      setFramework(frameworkWithTasks);
    };

    initializeFramework();
  }, [project.id]);

  const getDaysRemaining = (endDate?: string | null) => {
    if (!endDate) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0); 
      
      if (isNaN(end.getTime())) return null;
      
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const getProgressPercentage = (task: Task) => {
    if (task.indicatorData && Object.keys(task.indicatorData).length > 0) {
      const values = Object.values(task.indicatorData);
      const total = values.reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
      return Math.min(100, total);
    }
    
    if (task.updates && task.updates.length > 0) {
      const completeUpdates = task.updates.filter((u: any) => u.isComplete).length;
      return Math.min(100, Math.round((completeUpdates / task.updates.length) * 100));
    }
    
    if (task.start_date && task.end_date) {
      try {
        const start = new Date(task.start_date).getTime();
        const end = new Date(task.end_date).getTime();
        const today = new Date().getTime();
        
        if (isNaN(start) || isNaN(end)) return 0;
        if (today <= start) return 0;
        if (today >= end) return 100;
        
        const totalDuration = end - start;
        const elapsed = today - start;
        return Math.round((elapsed / totalDuration) * 100);
      } catch {
        return 0;
      }
    }
    
    return 0;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount?: string | number) => {
    if (!amount) return new Intl.NumberFormat('en-US', { style: 'currency', currency: project.currency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(0);
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: project.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const getBudgetUtilization = (task: Task) => {
    if (!task.budget || parseFloat(task.budget) === 0) return 0;
    const spent = task.cumulative_spent || 0;
    return Math.round((spent / parseFloat(task.budget)) * 100);
  };

  const getTaskStatusBadge = (task: Task) => {
    const daysRemaining = getDaysRemaining(task.end_date);
    const progress = getProgressPercentage(task);
    
    if (daysRemaining !== null && daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="gap-1 whitespace-nowrap">
          <AlertCircle className="w-3 h-3" />
          Overdue
        </Badge>
      );
    }

    if (daysRemaining !== null && daysRemaining <= 7) {
      return (
        <Badge variant="default" className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200 gap-1 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          Due Soon
        </Badge>
      );
    }

    if (progress >= 100) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200 gap-1 whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      );
    }

    if (progress > 0) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 gap-1 whitespace-nowrap">
          In Progress
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-gray-600 border-gray-200 gap-1 whitespace-nowrap">
        Not Started
      </Badge>
    );
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newFramework = [...framework];
    newFramework[index].objective = value;
    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
  };

  const handleObjectiveDescriptionChange = (index: number, value: string) => {
    const newFramework = [...framework];
    newFramework[index].description = value;
    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
  };

  const saveObjectiveToDB = async (objIndex: number) => {
    const objective = framework[objIndex];

    if (!objective.objective?.trim()) {
      alert('Objective name cannot be empty');
      return;
    }

    const payload = {
      project: project.id,
      name: objective.objective,
      description: objective.description || '',
      outcomes: objective.outcomes || []
    };

    try {
      let response;
      if (objective.id) {
        response = await api.put(`/projects/project-objectives/${objective.id}/`, payload);
      } else {
        response = await api.post('/projects/project-objectives/', payload);
      }

      const savedObjective = response.data;

      const newFramework = [...framework];
      newFramework[objIndex] = {
        ...newFramework[objIndex],
        id: savedObjective.id,
        objective: savedObjective.name,
        description: savedObjective.description,
        outcomes: savedObjective.outcomes || []
      };

      setFramework(newFramework);
      setProject({ ...project, resultsFramework: newFramework });
      setEditingObjectiveIndex(null);
    } catch (error) {
      console.error('Failed to save objective', error);
      alert('Failed to save objective. Please try again.');
    }
  };

  const addObjective = () => {
    const newFramework = [...framework, { objective: '', description: '', outcomes: [] }];
    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
  };

  const toggleOutcome = (id: string) => {
    setOpenOutcomes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleOutput = (id: string) => {
    setOpenOutputs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSaveOutcome = (objIndex: number, outcomeToSave: Outcome) => {
    const newFramework = [...framework];
    const outcomes = newFramework[objIndex].outcomes || [];
    if (outcomeToSave.id) {
      newFramework[objIndex].outcomes = outcomes.map(o => o.id === outcomeToSave.id ? outcomeToSave : o);
    } else {
      newFramework[objIndex].outcomes = [...outcomes, { ...outcomeToSave, id: `prj-outcome-${Date.now()}`, outputs: [], indicators: [] }];
    }
    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
    setEditingOutcome(null);
  };

  const saveOutcomeToDB = async (objIndex: number, outcome: Outcome) => {
    const objective = framework[objIndex];
    if (!objective.id) {
      alert("Save the objective first before adding outcomes.");
      return;
    }

    const payload = {
      name: outcome.name,
      description: outcome.description || "",
      project_objective: objective.id
    };

    try {
      let response;

      if (outcome.id && typeof outcome.id === "number") {
        response = await api.put(`/projects/project-outcomes/${outcome.id}/`, payload);
      } else {
        response = await api.post(`/projects/project-outcomes/`, payload);
      }

      const savedOutcome = response.data;

      const newFramework = [...framework];
      const outcomes = newFramework[objIndex].outcomes || [];

      if (outcome.id) {
        newFramework[objIndex].outcomes = outcomes.map(o =>
          o.id === outcome.id ? savedOutcome : o
        );
      } else {
        newFramework[objIndex].outcomes.push(savedOutcome);
      }

      setFramework(newFramework);
      setProject({ ...project, resultsFramework: newFramework });
      setEditingOutcome(null);

    } catch (err) {
      console.error("Failed to save outcome", err);
      alert("Failed to save outcome.");
    }
  };

  const saveOutputToDB = async (objIndex: number, outIndex: number, output: Output) => {
    const objective = framework[objIndex];
    const outcome = objective.outcomes?.[outIndex];

    if (!objective.id || !outcome?.id) {
      alert("Save the objective and outcome first before adding outputs.");
      return;
    }

    const payload = {
      name: output.name,
      description: output.description || "",
      project_outcome: outcome.id,
    };

    try {
      let response;

      if (output.id && typeof output.id === "number") {
        response = await api.put(`/projects/project-outputs/${output.id}/`, payload);
      } else {
        response = await api.post(`/projects/project-outputs/`, payload);
      }

      const savedOutput = response.data;

      const newFramework = [...framework];
      const outputs = newFramework[objIndex].outcomes![outIndex].outputs || [];

      if (output.id) {
        newFramework[objIndex].outcomes![outIndex].outputs = outputs.map(op =>
          op.id === output.id ? savedOutput : op
        );
      } else {
        newFramework[objIndex].outcomes![outIndex].outputs = [...outputs, savedOutput];
      }

      setFramework(newFramework);
      setProject({ ...project, resultsFramework: newFramework });
      setEditingOutput(null);
    } catch (err) {
      console.error("Failed to save output", err);
      alert("Failed to save output. Please try again.");
    }
  };

  const handleSaveActivity = (objIndex: number, outIndex: number, activityToSave: Activity) => {
    const newFramework = [...framework];
    const op = newFramework[objIndex].outcomes[outIndex].outputs?.[0];
    if (!op) return;
    const activities = op.activities || [];
    if (activityToSave.id) {
      op.activities = activities.map(a => a.id === activityToSave.id ? activityToSave : a);
    } else {
      op.activities = [...activities, { ...activityToSave, id: `prj-act-${Date.now()}` }];
    }
    setFramework(newFramework);
    setProject({ ...project, resultsFramework: newFramework });
    setEditingActivity(null);
  };

  const handleSaveTask = (objIndex: number, outIndex: number, outputIndex: number, savedTask: any) => {
    // task-editor has already made the API call and returns the server response as savedTask.
    // We just update local state here — no second API call needed.
    setFramework(prev => {
      const newFramework = prev.map(obj => ({
        ...obj,
        outcomes: obj.outcomes?.map(oc => ({
          ...oc,
          outputs: oc.outputs?.map(op => ({
            ...op,
            tasks: op.tasks ? [...op.tasks] : [],
          })),
        })),
      }));

      const output = newFramework[objIndex]?.outcomes[outIndex]?.outputs?.[outputIndex];
      if (!output) return prev;

      if (savedTask.id && output.tasks?.some((t: any) => t.id === savedTask.id)) {
        // Update existing task
        output.tasks = output.tasks.map((t: any) => t.id === savedTask.id ? savedTask : t);
      } else {
        // Append new task
        output.tasks = [...(output.tasks || []), savedTask];
      }

      return newFramework;
    });
    setEditingTask(null);
  };

  const handleSaveIndicator = async (indicatorObj: { name: string; description?: string; project_indicator?: { id: number; name: string } | null; }) => {
    if (!editingIndicator) return;

    const { objIndex, outIndex, parentType, outputIndex, indIndex } = editingIndicator;
    const newFramework = [...framework];
    let savedIndicator;

    try {
      if (parentType === 'outcome') {
        const outcome = newFramework[objIndex].outcomes[outIndex!];
        const payload = {
          name: indicatorObj.name,
          description: indicatorObj.description || '',
          project_outcome: outcome.id,
        };

        if (indIndex !== undefined && outcome.indicators?.[indIndex]?.id) {
          const id = outcome.indicators[indIndex].id;
          const response = await api.put(`/projects/project-indicators/${id}/`, payload);
          savedIndicator = response.data;
          outcome.indicators![indIndex] = savedIndicator;
        } else {
          const response = await api.post('/projects/project-indicators/', payload);
          savedIndicator = response.data;
          outcome.indicators = [...(outcome.indicators || []), savedIndicator];
        }
      }

      if (parentType === 'output') {
        const output = newFramework[objIndex].outcomes[outIndex!].outputs![outputIndex!];
        const payload = {
          name: indicatorObj.name,
          description: indicatorObj.description || '',
          output: output.id,
          project_indicator_id: indicatorObj.project_indicator?.id || null,
        };

        if (indIndex !== undefined && output.indicators?.[indIndex]?.id) {
          const id = output.indicators[indIndex].id;
          const response = await api.put(`/projects/project-output-indicators/${id}/`, payload);
          savedIndicator = response.data;
          output.indicators![indIndex] = savedIndicator;
        } else {
          const response = await api.post('/projects/project-output-indicators/', payload);
          savedIndicator = response.data;
          output.indicators = [...(output.indicators || []), savedIndicator];
        }
      }

      setFramework(newFramework);
      setProject({ ...project, resultsFramework: newFramework });
      setEditingIndicator(null);

    } catch (err) {
      console.error('Failed to save indicator', err);
      alert('Failed to save indicator. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;

    const { type, objIndex, outIndex, outputIndex, actIndex, indIndex, parentType, taskIndex } = deletingItem;
    const newFramework = [...framework];

    try {
      switch (type) {
        case "objective":
          if (newFramework[objIndex]?.id) await api.delete(`/projects/project-objectives/${newFramework[objIndex].id}/`);
          newFramework.splice(objIndex, 1);
          break;

        case "outcome":
          if (newFramework[objIndex].outcomes?.[outIndex]?.id) await api.delete(`/projects/project-outcomes/${newFramework[objIndex].outcomes[outIndex].id}/`);
          newFramework[objIndex].outcomes?.splice(outIndex, 1);
          break;

        case "output":
          if (newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.id)
            await api.delete(`/projects/project-outputs/${newFramework[objIndex].outcomes[outIndex].outputs[outputIndex].id}/`);
          newFramework[objIndex].outcomes?.[outIndex]?.outputs?.splice(outputIndex, 1);
          break;

        case "activity":
          if (newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.activities?.[actIndex]?.id)
            await api.delete(`/projects/project-activities/${newFramework[objIndex].outcomes[outIndex].outputs[outputIndex].activities[actIndex].id}/`);
          newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.activities?.splice(actIndex, 1);
          break;

        case "indicator":
          if (parentType === "outcome") {
            if (newFramework[objIndex].outcomes?.[outIndex]?.indicators?.[indIndex]?.id) {
              const indicatorId = newFramework[objIndex].outcomes[outIndex].indicators[indIndex].id;
              await api.delete(`/projects/project-outcome-indicators/${indicatorId}/`);
            }
            newFramework[objIndex].outcomes?.[outIndex]?.indicators?.splice(indIndex, 1);
          }
          if (parentType === "output") {
            if (newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.indicators?.[indIndex]?.id) {
              const indicatorId = newFramework[objIndex].outcomes[outIndex].outputs[outputIndex].indicators[indIndex].id;
              await api.delete(`/projects/project-output-indicators/${indicatorId}/`);
            }
            newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.indicators?.splice(indIndex, 1);
          }
          break;
        
        case "task":
          if (newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.tasks?.[taskIndex]?.id)
            await api.delete(`/tasks/tasks/${newFramework[objIndex].outcomes[outIndex].outputs[outputIndex].tasks[taskIndex].id}/`);
          newFramework[objIndex].outcomes?.[outIndex]?.outputs?.[outputIndex]?.tasks?.splice(taskIndex, 1);
          break;

        default:
          break;
      }

      setFramework(newFramework);
      setProject({ ...project, resultsFramework: newFramework });
      setDeletingItem(null);

    } catch (err) {
      console.error("Failed to delete item", err);
      alert("Failed to delete item. Please try again.");
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={addObjective}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Objective
        </Button>
      </div>

      {/* Render Objectives */}
      {framework.map((objective, objIndex) => (
        <Card 
          key={`objective-${objective.id || 'new'}-${objIndex}`} 
          className="mb-4 border shadow-sm hover:shadow-md transition-shadow duration-300"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Project Objective {objIndex + 1}</CardTitle>
            <CardDescription>Define the objective and its results chain.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border-l-4 border-primary bg-primary/5 rounded-r-lg space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary flex items-center gap-3">
                  <Goal className="h-6 w-6" /> Objective
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editingObjectiveIndex === objIndex ? saveObjectiveToDB(objIndex) : setEditingObjectiveIndex(objIndex)}
                    className="h-8 px-3"
                  >
                    <Edit className="mr-2 h-4 w-4" /> {editingObjectiveIndex === objIndex ? 'Done' : 'Edit'}
                  </Button>
                  {objective.objective === '' && objective.description === '' && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-100"
                      onClick={() => {
                        const newFramework = [...framework];
                        newFramework.splice(objIndex, 1);
                        setFramework(newFramework);
                        setProject({ ...project, resultsFramework: newFramework });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {editingObjectiveIndex === objIndex ? (
                <div className="space-y-3 pl-9">
                  <Input
                    value={objective.objective}
                    onChange={e => handleObjectiveChange(objIndex, e.target.value)}
                    placeholder="Define objective..."
                    className="border-primary/20 focus-visible:ring-primary"
                  />
                  <textarea
                    value={objective.description || ''}
                    onChange={e => handleObjectiveDescriptionChange(objIndex, e.target.value)}
                    placeholder="Add description..."
                    className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    rows={3}
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-primary/90 pl-9">{objective.objective || 'Not defined'}</p>
                  {objective.description && (
                    <p className="text-sm text-muted-foreground pl-9 mt-1">{objective.description}</p>
                  )}
                </>
              )}
            </div>

            <div className="mb-4 flex justify-end">
              <Button
                onClick={() =>
                  setEditingOutcome({
                    outcome: { name: '', outputs: [], indicators: [] },
                    objIndex,
                  })
                }
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" /> Add Outcome
              </Button>
            </div>

            {/* Outcomes Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableBody>
                  {objective.outcomes.map((outcome, outIndex) => (
                    <React.Fragment key={`outcome-${outcome.id || 'new'}-${objIndex}-${outIndex}`}>
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableCell colSpan={4} className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleOutcome(outcome.id?.toString() || `outcome-${objIndex}-${outIndex}`)}
                              >
                                {openOutcomes.includes(outcome.id?.toString() || `outcome-${objIndex}-${outIndex}`) ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                              </Button>
                              <Target className="h-5 w-5 text-accent-foreground" />
                              <span className="font-semibold">{outcome.name || 'Unnamed Outcome'}</span>
                              {outcome.description && (
                                <span className="text-sm text-muted-foreground ml-2">- {outcome.description}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingOutcome({ outcome, objIndex })}
                                className="h-8 px-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-100"
                                onClick={() =>
                                  setDeletingItem({ type: 'outcome', objIndex, outIndex, name: outcome.name })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>

                      {openOutcomes.includes(outcome.id?.toString() || `outcome-${objIndex}-${outIndex}`) && (
                        <>
                          {/* Outcome Indicators */}
                          {(outcome.indicators || []).length > 0 && (
                            <TableRow className="bg-muted/5">
                              <TableCell colSpan={4} className="py-2 pl-16">
                                <div className="text-sm font-bold text-muted-foreground mb-2">Outcome Indicators</div>
                                <div className="space-y-2">
                                  {(outcome.indicators || []).map((indicator, indIndex) => (
                                    <div 
                                      key={`outcome-ind-${outcome.id || objIndex}-${outIndex}-${indicator.id || indIndex}`} 
                                      className="flex items-center justify-between pl-4 py-1 hover:bg-muted/20 rounded"
                                    >
                                      <div className="flex-1">
                                        <span className="text-sm">{indicator.name}</span>
                                        {indicator.disaggregators && indicator.disaggregators.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {indicator.disaggregators.map((d, idx) => {
                                              const disKey = typeof d === 'object' 
                                                ? `dis-${d.id || idx}-${d.name || idx}` 
                                                : `dis-${d}-${idx}`;
                                              return (
                                                <span 
                                                  key={disKey}
                                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/5 text-primary text-xs"
                                                >
                                                  {typeof d === 'string' ? d : d.name || d.id || JSON.stringify(d)}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            setEditingOutcomeIndicator({
                                              indicator: { ...indicator },
                                              objIndex,
                                              outIndex,
                                              indIndex,
                                            })
                                          }
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 text-red-600"
                                          onClick={() =>
                                            setDeletingItem({
                                              type: 'indicator',
                                              parentType: 'outcome',
                                              objIndex,
                                              outIndex,
                                              indIndex,
                                              name: indicator.name,
                                            })
                                          }
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          
                          <TableRow key={`add-outcome-ind-${outcome.id || objIndex}-${outIndex}`}>
                            <TableCell colSpan={4} className="py-2 pl-16">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setEditingOutcomeIndicator({
                                    indicator: { name: '', description: '' },
                                    objIndex,
                                    outIndex,
                                  })
                                }
                                className="h-8"
                              >
                                <PlusCircle className="mr-2 h-3 w-3" /> Add Outcome Indicator
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Outputs */}
                          {(outcome.outputs || []).map((output, outputIndex) => (
                            <React.Fragment key={`output-${output.id || 'new'}-${objIndex}-${outIndex}-${outputIndex}`}>
                              <TableRow className="bg-muted/10 hover:bg-muted/20">
                                <TableCell colSpan={4} className="py-2 pl-16">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => toggleOutput(output.id?.toString() || `output-${objIndex}-${outIndex}-${outputIndex}`)}
                                      >
                                        {openOutputs.includes(output.id?.toString() || `output-${objIndex}-${outIndex}-${outputIndex}`) ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <span className="font-medium">{output.name}</span>
                                      {output.description && (
                                        <span className="text-xs text-muted-foreground">- {output.description}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7"
                                        onClick={() => setEditingOutput({ output, objIndex, outIndex, outputIndex })}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 text-red-600"
                                        onClick={() =>
                                          setDeletingItem({ type: 'output', objIndex, outIndex, outputIndex, name: output.name })
                                        }
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {openOutputs.includes(output.id?.toString() || `output-${objIndex}-${outIndex}-${outputIndex}`) && (
                                <>
                                  {/* Output Indicators */}
                                  {(output.indicators || []).length > 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="py-2 pl-24">
                                        <div className="text-xs font-bold text-muted-foreground mb-2">Output Indicators</div>
                                        <div className="space-y-2">
                                          {(output.indicators || []).map((ind, indIndex) => (
                                            <div 
                                              key={`output-ind-${output.id || objIndex}-${outIndex}-${outputIndex}-${ind.id || indIndex}`} 
                                              className="flex items-center justify-between pl-4 py-1 hover:bg-muted/20 rounded"
                                            >
                                              <div className="flex-1">
                                                <span className="text-sm">{ind.name}</span>
                                                {ind.disaggregators && ind.disaggregators.length > 0 && (
                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                    {ind.disaggregators.map((d: any, idx: number) => {
                                                      const disKey = typeof d === 'object' 
                                                        ? `dis-${d.id || idx}-${d.name || idx}` 
                                                        : `dis-${d}-${idx}`;
                                                      return (
                                                        <span 
                                                          key={disKey}
                                                          className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/5 text-primary text-xs"
                                                        >
                                                          {typeof d === 'string' ? d : d.name || d.id || JSON.stringify(d)}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6"
                                                  onClick={() =>
                                                    setEditingOutputIndicator({
                                                      indicator: ind,
                                                      objIndex,
                                                      outIndex,
                                                      outputIndex,
                                                      indIndex,
                                                    })
                                                  }
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 w-6 text-red-600"
                                                  onClick={() =>
                                                    setDeletingItem({
                                                      type: 'indicator',
                                                      parentType: 'output',
                                                      objIndex,
                                                      outIndex,
                                                      outputIndex,
                                                      indIndex,
                                                      name: ind.name,
                                                    })
                                                  }
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}

                                  {/* Tasks */}
                                  {(output.tasks || []).length > 0 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="py-2 pl-24">
                                        <div className="text-xs font-bold text-muted-foreground mb-2">Activities</div>
                                        <div className="space-y-3">
                                          {(output.tasks || []).map((task, taskIndex) => {
                                            const daysRemaining = getDaysRemaining(task.end_date);
                                            const progress = getProgressPercentage(task);
                                            const isOverdue = daysRemaining !== null && daysRemaining < 0;
                                            const budgetUtilization = getBudgetUtilization(task);
                                            
                                            return (
                                              <div 
                                                key={`task-${task.id || 'new'}-${objIndex}-${outIndex}-${outputIndex}-${taskIndex}`} 
                                                className={`p-3 rounded-lg border ${
                                                  isOverdue 
                                                    ? 'bg-red-50 border-red-200' 
                                                    : 'bg-white border-gray-200 hover:border-primary/20'
                                                } transition-colors`}
                                              >
                                                <div className="flex items-start justify-between mb-2">
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className="font-medium">{task.title}</span>
                                                      {getTaskStatusBadge(task)}
                                                    </div>
                                                    {task.description && (
                                                      <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                                                    )}
                                                    
                                                    {/* Task Details Grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                                                      {task.focal_person && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                          <User className="h-3 w-3" />
                                                          <span className="truncate" title={task.focal_person.name}>
                                                            {task.focal_person.name}
                                                          </span>
                                                        </div>
                                                      )}
                                                      
                                                      {task.start_date && task.end_date && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                          <Calendar className="h-3 w-3" />
                                                          <span>
                                                            {formatDate(task.start_date)} - {formatDate(task.end_date)}
                                                          </span>
                                                        </div>
                                                      )}
                                                      
                                                      {task.budget && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                          <span>{formatCurrency(task.budget)}</span>
                                                          {task.cumulative_spent ? (
                                                            <span className="text-xs ml-1">
                                                              ({budgetUtilization}% used)
                                                            </span>
                                                          ) : null}
                                                        </div>
                                                      )}
                                                      
                                                      {daysRemaining !== null && (
                                                        <div className={`flex items-center gap-1 ${
                                                          daysRemaining < 0 
                                                            ? 'text-red-600' 
                                                            : daysRemaining <= 7 
                                                              ? 'text-amber-600' 
                                                              : 'text-muted-foreground'
                                                        }`}>
                                                          <Clock className="h-3 w-3" />
                                                          <span>
                                                            {daysRemaining < 0 
                                                              ? `${Math.abs(daysRemaining)}d overdue` 
                                                              : `${daysRemaining}d left`
                                                            }
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Progress Bar */}
                                                    {progress > 0 && (
                                                      <div className="mt-2">
                                                        <div className="flex items-center gap-2">
                                                          <Progress value={progress} className="h-1.5 flex-1" />
                                                          <span className="text-xs text-muted-foreground">{progress}%</span>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-1 ml-2">
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7"
                                                            onClick={() =>
                                                              setEditingTask({
                                                                task: task,
                                                                objIndex,
                                                                outIndex,
                                                                outputIndex,
                                                                taskIndex,
                                                              })
                                                            }
                                                          >
                                                            <Edit className="h-3 w-3" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Edit task</TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                    
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                                                            onClick={() =>
                                                              setDeletingItem({
                                                                type: 'task',
                                                                objIndex,
                                                                outIndex,
                                                                outputIndex,
                                                                taskIndex,
                                                                name: task.title,
                                                              })
                                                            }
                                                          >
                                                            <Trash2 className="h-3 w-3" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete task</TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}

                                  {/* Add Buttons */}
                                  <TableRow key={`add-buttons-${output.id || objIndex}-${outIndex}-${outputIndex}`}>
                                    <TableCell colSpan={4} className="py-2 pl-24">
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setEditingOutputIndicator({
                                              indicator: { name: '', description: '' },
                                              objIndex,
                                              outIndex,
                                              outputIndex,
                                            })
                                          }
                                          className="h-8"
                                        >
                                          <PlusCircle className="mr-2 h-3 w-3" /> Add Output Indicator
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setEditingTask({ 
                                              task: { 
                                                title: '', 
                                                description: '', 
                                                output: typeof output.id === 'number' ? output.id : Number(output.id),
                                                start_date: '',
                                                end_date: '',
                                                budget: '',
                                              }, 
                                              objIndex, 
                                              outIndex,
                                              outputIndex
                                            })
                                          }
                                          className="h-8"
                                        >
                                          <PlusCircle className="mr-2 h-3 w-3" /> Add Task
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </>
                              )}
                            </React.Fragment>
                          ))}

                          {/* Add Output Button */}
                          <TableRow key={`add-output-${outcome.id || objIndex}-${outIndex}`}>
                            <TableCell colSpan={4} className="py-2 pl-16">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setEditingOutput({
                                    output: { id: null, name: '', indicators: [], activities: [] },
                                    objIndex,
                                    outIndex,
                                  })
                                }
                                className="h-8"
                              >
                                <PlusCircle className="mr-2 h-3 w-3" /> Add Output
                              </Button>
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Editors */}
      {editingOutcome && (
        <OutcomeEditor
          outcome={editingOutcome.outcome}
          isOpen={!!editingOutcome}
          onClose={() => setEditingOutcome(null)}
          onSave={(o: Outcome) => saveOutcomeToDB(editingOutcome.objIndex, o)}
        />
      )}
      
      {editingOutput && (
        <OutputEditor
          output={editingOutput.output}
          isOpen={!!editingOutput}
          onClose={() => setEditingOutput(null)}
          onSave={(o: Output) => saveOutputToDB(editingOutput.objIndex, editingOutput.outIndex, o)}
        />
      )}
      
      {editingActivity && (
        <ActivityEditor
          activity={editingActivity.activity}
          isOpen={!!editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={(a: Activity) => handleSaveActivity(editingActivity.objIndex, editingActivity.outIndex, a)}
        />
      )}
      
      {editingIndicator && (
        <IndicatorEditor
          indicator={editingIndicator.indicator}
          isOpen={!!editingIndicator}
          onClose={() => setEditingIndicator(null)}
          onSave={handleSaveIndicator}
          title={`Add/Edit Indicator`}
          projectIndicators={(project.indicators || []).map((pi: any) => ({
            id: pi.id,
            name: pi.name
          }))}
        />
      )}

      {editingTask && (
        <TaskEditor
          task={{
            ...editingTask.task,
            description: editingTask.task.description || '',
          }}
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(t: any) => {
            handleSaveTask(
              editingTask.objIndex, 
              editingTask.outIndex, 
              editingTask.outputIndex, 
              t
            );
          }}
          projectActivities={[]}
          projectTeam={teamMembers}
          projectIndicators={project.indicators || []}
          projectLocations={project.locations || []}
          projectCurrency={project.currency || 'USD'}
          projectId={String(project.id)}
        />
      )}

      {editingOutcomeIndicator && (
        <OutcomeIndicatorEditor
          indicator={{
            ...editingOutcomeIndicator.indicator,
            disaggregators: editingOutcomeIndicator.indicator.disaggregators || []
          }}
          isOpen={!!editingOutcomeIndicator}
          onClose={() => setEditingOutcomeIndicator(null)}
          onSave={(indicator: Indicator) => handleSaveOutcomeIndicator(indicator)}
          title="Outcome Indicator"
        />
      )}

      {editingOutputIndicator && (
        <OutputIndicatorEditor
          indicator={{
            ...editingOutputIndicator.indicator,
            disaggregators: (editingOutputIndicator.indicator.disaggregators || []).map(d =>
              typeof d === 'string' ? d : d.name
            )
          }}
          isOpen={!!editingOutputIndicator}
          onClose={() => setEditingOutputIndicator(null)}
          onSave={(indicator) => handleSaveOutputIndicator({
            ...indicator,
            disaggregators: (indicator.disaggregators || []).map(name => {
              const found = availableDisaggregators.find(d => d.name === name);
              return found ?? { id: 0, name };
            })
          })}
          title="Output Indicator"
        />
      )}

      {/* Delete Dialog */}
      {deletingItem && (
        <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the {deletingItem.type} "{deletingItem.name}" and all its children.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}