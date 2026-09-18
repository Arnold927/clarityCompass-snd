'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, PlusCircle, Trash2, CalendarDays, CheckCircle2, Circle, ChevronRight, Target, AlertCircle, Users, MapPin, DollarSign, RefreshCw, BarChart3, ChevronDown, ChevronUp, ChevronLeft, Layers } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import api from '@/lib/api';
import { useToast } from '../ui/use-toast';
import { TaskIndicatorLinker } from './task-indicator-linker';
import axios from 'axios'
import { TaskIndicatorValueUpdater } from './task-indicator-value-updater';
import { useAppPermissions } from '@/hooks/use-app-permissions';

interface Disaggregator {
    id: number;
    name: string;
}

interface DisaggregatedValue {
    id: number;
    disaggregator: number;
    disaggregator_name: string;
    target: number | null;
    actual: number | null;
}

interface TaskIndicatorProgress {
    id: number;
    output_indicator: number;
    indicator_name: string;
    indicator_description?: string;
    target_contribution: number | null;
    actual_contribution: number;
    notes?: string;
    disaggregators: Array<{
        disaggregator_id: number;
        disaggregator_name: string;
        target: number | null;
        actual: number;
    }>;
}

interface OutputIndicator {
    id: number;
    name: string;
    description?: string;
    target: number | null;
    actual: number | null;
    disaggregators: Disaggregator[];
    disaggregated_values: DisaggregatedValue[];
}

interface Task {
    id: number;
    title: string;
    description?: string;
    activity?: number;
    activity_name?: string;
    focal_person?: {
        id: number;
        member_name: string;
        member_role: string;
    } | null;
    focal_person_id?: number;
    start_date?: string;
    end_date?: string;
    budget?: number;
    cumulative_spent?: number;
    locationIds?: number[];
    location?: Array<{id: number, name: string}>;
    location_details?: Array<{id: number, name: string}>;
    qaAdjustments?: Record<string, any>;
    linked_indicator_name?: string;
    indicatorData?: Record<string, number>;
    updates?: any[];
    project?: number;
    status?: string;
    output?: number;
    output_details?: {
        id: number;
        name: string;
        indicators: OutputIndicator[];
    };
    indicator_progress: TaskIndicatorProgress[];
}

interface TasksProps {
    tasks?: Task[];
    onAdd: () => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    isLoading?: boolean;
    projectId?: string;
    autoFetch?: boolean;
    projectCurrency?: string;
}

export function Tasks({ 
    tasks: propTasks, 
    onAdd, 
    onEdit, 
    onDelete,
    isLoading: propLoading = false,
    projectId,
    autoFetch = true,
    projectCurrency = 'USD'
}: TasksProps) {
    
    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(propLoading);
    const [error, setError] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [outputIndicators, setOutputIndicators] = useState<Record<number, OutputIndicator[]>>({});
    const [loadingIndicators, setLoadingIndicators] = useState<Record<number, boolean>>({});
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [groupByIndicators, setGroupByIndicators] = useState(false);
    const { toast } = useToast();
    const perms = useAppPermissions();

    const tasks = propTasks || localTasks;

    const fetchTasks = async () => {
    if (!projectId || !autoFetch) return;
    
    setLoading(true);
    setError(null);
    
    try {
        const response = await api.get(`/tasks/tasks/?project=${projectId}`);
        const fetchedTasks = response.data;
        
        const tasksWithProgress = await Promise.all(
            fetchedTasks.map(async (task: any) => {
                try {
                    const progressResponse = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                    
                    return {
                        ...task,
                        indicator_progress: progressResponse.data || [],
                        location_details: task.location_details || task.location || [],
                        activity_name: task.activity_name || task.activity?.name,
                        cumulative_spent: task.cumulative_spent || 0,
                        start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : undefined,
                        end_date: task.end_date ? new Date(task.end_date).toISOString().split('T')[0] : undefined,
                    };
                } catch (err:unknown) {
                    console.error(`Error fetching indicator progress for task ${task.id}:`, err);
                    if (axios.isAxiosError(err)) {
        console.error('Response status:', err.response?.status);
        console.error('Response data:', err.response?.data);
    } else {
        console.error('Unexpected error:', err);
    }
                    return {
                        ...task,
                        indicator_progress: [],
                        location_details: task.location_details || task.location || [],
                        activity_name: task.activity_name || task.activity?.name,
                        cumulative_spent: task.cumulative_spent || 0,
                        start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : undefined,
                        end_date: task.end_date ? new Date(task.end_date).toISOString().split('T')[0] : undefined,
                    };
                }
            })
        );
        
        setLocalTasks(tasksWithProgress);
        setLastRefreshed(new Date());
        
    } catch (err: any) {
        console.error('Error fetching tasks:', err);
        if (err.response) {
            console.error('Response status:', err.response.status);
            console.error('Response data:', err.response.data);
        }
        setError(err.message || 'Failed to load tasks');
    } finally {
        setLoading(false);
    }
};
    const fetchOutputIndicators = async (outputId: number) => {
        if (outputIndicators[outputId]) return; // Already fetched
        
        setLoadingIndicators(prev => ({ ...prev, [outputId]: true }));
        
        try {
            const response = await api.get(`/projects/project-output-indicators/?output=${outputId}`);
            const indicators = response.data;
            
            const indicatorsWithValues = await Promise.all(
                indicators.map(async (indicator: any) => {
                    try {
                        const valuesResponse = await api.get(`/projects/indicator-disaggregated-values/?output_indicator=${indicator.id}`);
                        return {
                            ...indicator,
                            disaggregated_values: valuesResponse.data
                        };
                    } catch (err) {
                        console.error(`Error fetching disaggregated values for indicator ${indicator.id}:`, err);
                        return {
                            ...indicator,
                            disaggregated_values: []
                        };
                    }
                })
            );
            
            setOutputIndicators(prev => ({
                ...prev,
                [outputId]: indicatorsWithValues
            }));
        } catch (err) {
            console.error(`Error fetching indicators for output ${outputId}:`, err);
            toast({
                title: "Error",
                description: "Failed to load output indicators",
                variant: "destructive",
            });
        } finally {
            setLoadingIndicators(prev => ({ ...prev, [outputId]: false }));
        }
    };

    const handleTaskExpand = (taskId: number, outputId?: number) => {
        if (expandedTaskId === taskId) {
            setExpandedTaskId(null);
        } else {
            setExpandedTaskId(taskId);
            if (outputId) {
                fetchOutputIndicators(outputId);
            }
        }
    };

    useEffect(() => {
        if (projectId && autoFetch) {
            fetchTasks();
        }
    }, [projectId, autoFetch]);

    useEffect(() => {
        const handleTaskUpdate = (event: CustomEvent) => {
            if (event.detail?.projectId === projectId) {
                fetchTasks();
            }
        };

        window.addEventListener('taskUpdated', handleTaskUpdate as EventListener);
        
        return () => {
            window.removeEventListener('taskUpdated', handleTaskUpdate as EventListener);
        };
    }, [projectId]);

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

    const formatCurrency = (amount?: number) => {
        if (!amount && amount !== 0) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: projectCurrency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(0);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: projectCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatNumber = (value?: number | null) => {
        if (value === null || value === undefined) return '-';
        return value.toLocaleString();
    };

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
            const total = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
            return Math.min(100, total);
        }
        
        if (task.updates && task.updates.length > 0) {
            const completeUpdates = task.updates.filter(u => u.isComplete).length;
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

    const getProgressColor = (task: Task, daysRemaining: number | null) => {
        if (daysRemaining !== null && daysRemaining < 0) return 'bg-destructive';
        if (daysRemaining !== null && daysRemaining <= 7) return 'bg-amber-500';
        return 'bg-primary';
    };

    const getStatusBadge = (task: Task) => {
        const daysRemaining = getDaysRemaining(task.end_date);
        const hasUpdates = task.updates && task.updates.length > 0;
        
        if (daysRemaining !== null && daysRemaining < 0) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            {Math.abs(daysRemaining)} days overdue
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        if (daysRemaining !== null && daysRemaining <= 7) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="default" className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-200 gap-1 whitespace-nowrap">
                                <AlertCircle className="w-3 h-3" />
                                Due Soon
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            {daysRemaining} days remaining
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        if (hasUpdates) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="text-green-600 border-green-200 gap-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3" />
                                In Progress
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            {task.updates?.length} update(s) submitted
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-blue-600 border-blue-200 gap-1 whitespace-nowrap">
                            <Circle className="w-3 h-3 fill-current text-blue-600" />
                            Not Started
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        No updates yet
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };

    const getBudgetUtilization = (task: Task) => {
        if (!task.budget || task.budget === 0) return 0;
        const spent = task.cumulative_spent || 0;
        return Math.round((spent / task.budget) * 100);
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        const aDays = getDaysRemaining(a.end_date);
        const bDays = getDaysRemaining(b.end_date);
        
        if (aDays !== null && aDays < 0 && (bDays === null || bDays >= 0)) return -1;
        if (bDays !== null && bDays < 0 && (aDays === null || aDays >= 0)) return 1;
        
        if (aDays !== null && aDays <= 7 && (bDays === null || bDays > 7)) return -1;
        if (bDays !== null && bDays <= 7 && (aDays === null || aDays > 7)) return 1;
        
        if (aDays === null && bDays === null) return 0;
        if (aDays === null) return 1;
        if (bDays === null) return -1;
        return aDays - bDays;
    });

    // Pagination calculations
    const totalPages = Math.ceil(sortedTasks.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTasks = sortedTasks.slice(startIndex, endIndex);

    // Reset page when tasks change
    useEffect(() => {
        setCurrentPage(1);
    }, [sortedTasks.length]);

    // Group tasks by indicators
    const groupedByIndicators = () => {
        const groups: Record<string, Task[]> = {};
        const ungroupedTasks: Task[] = [];

        sortedTasks.forEach(task => {
            if (task.indicator_progress && task.indicator_progress.length > 0) {
                task.indicator_progress.forEach(indicator => {
                    const key = `${indicator.output_indicator}-${indicator.indicator_name}`;
                    if (!groups[key]) {
                        groups[key] = [];
                    }
                    // Avoid duplicates
                    if (!groups[key].find(t => t.id === task.id)) {
                        groups[key].push(task);
                    }
                });
            } else {
                ungroupedTasks.push(task);
            }
        });

        // Add ungrouped tasks at the end
        if (ungroupedTasks.length > 0) {
            groups['No Indicators Linked'] = ungroupedTasks;
        }

        return groups;
    };

    const indicatorGroups = groupByIndicators ? groupedByIndicators() : null;

    const handleRefresh = () => {
        fetchTasks();
        toast({
            title: "Refreshing tasks",
            description: "Fetching latest task data...",
        });
    };

    if (loading) {
        return (
            <Card className="border shadow-sm">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-16 flex-1" />
                                <Skeleton className="h-16 w-24" />
                                <Skeleton className="h-16 w-24" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error && tasks.length === 0) {
        return (
            <Card className="border shadow-sm border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Error Loading Tasks
                    </CardTitle>
                    <CardDescription>
                        {error}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleRefresh} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3'>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Tasks & Output Indicators</CardTitle>
                        {autoFetch && projectId && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 ml-1" 
                                onClick={handleRefresh}
                                disabled={loading}
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        )}
                    </div>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                        <span>Track tasks and their linked output indicators</span>
                        <Badge variant="secondary" className="text-xs">
                            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                        </Badge>
                        {sortedTasks.some(t => {
                            const days = getDaysRemaining(t.end_date);
                            return days !== null && days < 0;
                        }) && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Overdue
                            </Badge>
                        )}
                        {lastRefreshed && (
                            <span className="text-xs text-muted-foreground">
                                Updated {lastRefreshed.toLocaleTimeString()}
                            </span>
                        )}
                    </CardDescription>
                </div>
                {/* <Button 
                    onClick={onAdd} 
                    className="gap-2 shadow-sm hover:shadow"
                    size="sm"
                >
                    <PlusCircle className="h-4 w-4" />
                    Add Task
                </Button> */}
            </CardHeader>
            
            <CardContent className="px-2 sm:px-6">
                {sortedTasks.length > 0 ? (
                    <>
                        {/* Page Size Selector and Grouping Toggle */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-3">
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
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={groupByIndicators ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => { setGroupByIndicators(!groupByIndicators); setCurrentPage(1); }}
                                    className="gap-2 h-8"
                                >
                                    <Layers className="h-4 w-4" />
                                    {groupByIndicators ? "Grouped by Indicators" : "Sort by Priority"}
                                </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {groupByIndicators 
                                    ? `${Object.keys(indicatorGroups || {}).length} indicator groups`
                                    : `Showing ${startIndex + 1} to ${Math.min(endIndex, sortedTasks.length)} of ${sortedTasks.length} tasks`
                                }
                            </div>
                        </div>

                        <div className="space-y-4">
                        {groupByIndicators ? (
                          // Grouped by Indicators View
                          Object.entries(indicatorGroups || {}).map(([indicatorName, groupTasks]) => (
                            <div key={indicatorName} className="mb-6">
                              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4 text-primary" />
                                  {indicatorName}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {groupTasks.length} {groupTasks.length === 1 ? "task" : "tasks"}
                                </p>
                              </div>
                              <div className="space-y-4">
                                {groupTasks.map((task) => {
                                                            const progress = getProgressPercentage(task);
                                                            const daysRemaining = getDaysRemaining(task.end_date);
                                                            const progressColor = getProgressColor(task, daysRemaining);
                                                            const isOverdue = daysRemaining !== null && daysRemaining < 0;
                                                            const budgetUtilization = getBudgetUtilization(task);
                                                            const isExpanded = expandedTaskId === task.id;
                                                            
                                                            const locations = task.location_details || task.location || [];
                                                            const outputId = task.output;
                                                            const hasIndicators = outputId && outputIndicators[outputId]?.length > 0;
                                                            const isLoadingIndicators = outputId ? loadingIndicators[outputId] : false;
                                                            
                                                            return (
                                                                <div 
                                                                    key={task.id} 
                                                                    className={`rounded-lg border transition-all ${
                                                                        isOverdue 
                                                                            ? 'border-destructive/30 bg-destructive/5' 
                                                                            : 'border-gray-200 hover:border-primary/20'
                                                                    }`}
                                                                >
                                                                    {/* Task Header */}
                                                                    <div 
                                                                        className={`p-4 cursor-pointer transition-colors ${
                                                                            isExpanded ? 'border-b bg-muted/20' : ''
                                                                        }`}
                                                                        onClick={() => handleTaskExpand(task.id, outputId)}
                                                                    >
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    {isExpanded ? (
                                                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                                                    ) : (
                                                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                                    )}
                                                                                    <span className={`font-semibold ${
                                                                                        isOverdue ? 'text-destructive' : ''
                                                                                    }`}>
                                                                                        {task.title}
                                                                                    </span>
                                                                                    {getStatusBadge(task)}
                                                                                </div>
                                                                                
                                                                                {task.description && (
                                                                                    <p className="text-sm text-muted-foreground mb-3 ml-6">
                                                                                        {task.description}
                                                                                    </p>
                                                                                )}
                                                                                
                                                                                {/* Task Summary */}
                                                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ml-6 mt-2">
                                                                                    <div className="space-y-1">
                                                                                        <span className="text-xs text-muted-foreground">Activity</span>
                                                                                        <p className="text-sm font-medium">
                                                                                            {task.activity_name || 'Not linked'}
                                                                                        </p>
                                                                                    </div>
                                                                                    
                                                                                    <div className="space-y-1">
                                                                                        <span className="text-xs text-muted-foreground">Timeline</span>
                                                                                        <div className="flex items-center gap-1 text-sm">
                                                                                            <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                                                                            <span>
                                                                                                {formatDate(task.start_date)} - {formatDate(task.end_date)}
                                                                                            </span>
                                                                                        </div>
                                                                                        {daysRemaining !== null && (
                                                                                            <p className={`text-xs ${
                                                                                                daysRemaining < 0 
                                                                                                    ? 'text-destructive' 
                                                                                                    : daysRemaining <= 7 
                                                                                                        ? 'text-amber-600' 
                                                                                                        : 'text-muted-foreground'
                                                                                            }`}>
                                                                                                {daysRemaining < 0 
                                                                                                    ? `${Math.abs(daysRemaining)} days overdue` 
                                                                                                    : `${daysRemaining} days remaining`
                                                                                                }
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    
                                                                                    <div className="space-y-1">
                                                                                        <span className="text-xs text-muted-foreground">Budget</span>
                                                                                        <p className="text-sm font-medium">
                                                                                            {formatCurrency(task.budget)}
                                                                                        </p>
                                                                                        {task.cumulative_spent ? (
                                                                                            <div className="flex items-center gap-1 text-xs">
                                                                                                <span>Spent: {formatCurrency(task.cumulative_spent)}</span>
                                                                                                <span className="text-muted-foreground">
                                                                                                    ({budgetUtilization}%)
                                                                                                </span>
                                                                                            </div>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    
                                                                                    <div className="space-y-1">
                                                                                        <span className="text-xs text-muted-foreground">Progress</span>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Progress value={progress} className={`h-1.5 flex-1 ${progressColor}`} />
                                                                                            <span className="text-sm font-medium">{progress}%</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center gap-1 ml-4">
                                                                                {perms.canEditData && (
                                                                                    <>
                                                                                        <TooltipProvider>
                                                                                            <Tooltip>
                                                                                                <TooltipTrigger asChild>
                                                                                                    <Button 
                                                                                                        variant="ghost" 
                                                                                                        size="icon" 
                                                                                                        className="h-8 w-8"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            onEdit(task);
                                                                                                        }}
                                                                                                    >
                                                                                                        <Edit className="h-3.5 w-3.5" />
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
                                                                                                        size="icon" 
                                                                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            onDelete(task);
                                                                                                        }}
                                                                                                    >
                                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                                    </Button>
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent>Delete task</TooltipContent>
                                                                                            </Tooltip>
                                                                                        </TooltipProvider>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* Expanded Content - Output Indicators */}
                                                                    {isExpanded && (
                                                                        <div className="p-4 bg-muted/5 border-t">
                                                                            <div className="ml-6 space-y-4">
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <BarChart3 className="h-4 w-4 text-primary" />
                                                                                        <h4 className="font-medium">Indicators Tracked by This Task</h4>
                                                                                    </div>
                                                                                    {task.output && (
                                                                                        <TaskIndicatorLinker 
                                                                                            taskId={task.id} 
                                                                                            onLinked={() => {
                                                                                                const refreshTaskIndicators = async () => {
                                                                                                    try {
                                                                                                        const response = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                                                                                                        setLocalTasks(prevTasks => 
                                                                                                            prevTasks.map(t => 
                                                                                                                t.id === task.id 
                                                                                                                    ? { ...t, indicator_progress: response.data }
                                                                                                                    : t
                                                                                                            )
                                                                                                        );
                                                                                                    } catch (error) {
                                                                                                        console.error('Error refreshing indicators:', error);
                                                                                                    }
                                                                                                };
                                                                                                refreshTaskIndicators();
                                                                                            }} 
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                {isLoadingIndicators ? (
                                                                                    <div className="space-y-2">
                                                                                        <Skeleton className="h-20 w-full" />
                                                                                        <Skeleton className="h-20 w-full" />
                                                                                    </div>
                                                                                ) : task.indicator_progress && task.indicator_progress.length > 0 ? (
                                                                                    <div className="space-y-4">
                                                                                        {task.indicator_progress.map((progress) => (
                                                                                            
                                                                                            <div key={progress.id} className="bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow">
                                                                                                <div className="flex items-start justify-between mb-2">
                                                                                                    <div className="flex-1">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className="font-medium text-sm">
                                                                                                                {progress.indicator_name}
                                                                                                            </span>
                                                                                                            {progress.notes && (
                                                                                                                <TooltipProvider>
                                                                                                                    <Tooltip>
                                                                                                                        <TooltipTrigger>
                                                                                                                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                                                                                                                        </TooltipTrigger>
                                                                                                                        <TooltipContent>
                                                                                                                            {progress.notes}
                                                                                                                        </TooltipContent>
                                                                                                                    </Tooltip>
                                                                                                                </TooltipProvider>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        {progress.indicator_description && (
                                                                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                                                                {progress.indicator_description}
                                                                                                            </p>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <Badge variant="outline" className="text-xs ml-2 whitespace-nowrap">
                                                                                                        Target: {formatNumber(progress.target_contribution)} | 
                                                                                                        Actual: {formatNumber(progress.actual_contribution)}
                                                                                                    </Badge>
                                                                                                </div>
                                                                                                
                                                                                                {/* Task-specific disaggregated values */}
                                                                                                {progress.disaggregators && progress.disaggregators.length > 0 && (
                                                                                                    <div className="mt-3 pl-2 border-l-2 border-primary/20">
                                                                                                        <div className="text-xs font-medium text-muted-foreground mb-2">
                                                                                                            Disaggregated Values
                                                                                                        </div>
                                                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                                                            {progress.disaggregators.map((value, idx) => (
                                                                                                                <div 
                                                                                                                    key={`${progress.id}-${value.disaggregator_id}`}
                                                                                                                    className="text-xs bg-muted/30 rounded p-2 hover:bg-muted/50 transition-colors"
                                                                                                                >
                                                                                                                    <span className="font-medium block mb-1">{value.disaggregator_name}</span>
                                                                                                                    <div className="flex justify-between text-muted-foreground">
                                                                                                                        <span>Target: {formatNumber(value.target)}</span>
                                                                                                                        <span>Actual: {formatNumber(value.actual)}</span>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                {/* Progress towards task contribution */}
                                                                                                {progress.target_contribution && progress.target_contribution > 0 && (
                                                                                                    <div className="mt-3">
                                                                                                        <div className="flex justify-between text-xs mb-1">
                                                                                                            <span className="text-muted-foreground">Progress towards target</span>
                                                                                                            <span className="font-medium">
                                                                                                                {Math.min(100, Math.round((progress.actual_contribution / progress.target_contribution) * 100))}%
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <Progress 
                                                                                                            value={Math.min(100, (progress.actual_contribution / progress.target_contribution) * 100)}
                                                                                                            className="h-1.5"
                                                                                                            indicatorClassName={
                                                                                                                (progress.actual_contribution / progress.target_contribution) >= 1 
                                                                                                                    ? "bg-green-500" 
                                                                                                                    : (progress.actual_contribution / progress.target_contribution) >= 0.7 
                                                                                                                        ? "bg-primary" 
                                                                                                                        : "bg-amber-500"
                                                                                                            }
                                                                                                        />
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                <div className="mt-2 flex justify-end">
                                                                                                    <TaskIndicatorValueUpdater
                                                                                                        taskId={task.id}
                                                                                                        indicatorProgressId={progress.id}
                                                                                                        indicatorName={progress.indicator_name}
                                                                                                        disaggregators={progress.disaggregators}
                                                                                                        onUpdated={() => {
                                                                                                            const refreshTaskIndicators = async () => {
                                                                                                                try {
                                                                                                                    const response = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                                                                                                                    setLocalTasks(prevTasks => 
                                                                                                                        prevTasks.map(t => 
                                                                                                                            t.id === task.id 
                                                                                                                                ? { ...t, indicator_progress: response.data }
                                                                                                                                : t
                                                                                                                        )
                                                                                                                    );
                                                                                                                } catch (error) {
                                                                                                                    console.error('Error refreshing indicators:', error);
                                                                                                                }
                                                                                                            };
                                                                                                            refreshTaskIndicators();
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-center py-8 px-4">
                                                                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                                                                                            <BarChart3 className="h-6 w-6 text-muted-foreground" />
                                                                                        </div>
                                                                                        <p className="text-muted-foreground text-sm mb-3">
                                                                                            {task.output 
                                                                                                ? "No indicators are being tracked by this task yet." 
                                                                                                : "This task needs to be linked to an output first before you can track indicators."
                                                                                            }
                                                                                        </p>
                                                                                        {task.output ? (
                                                                                            perms.canEditData ? (
                                                                                                <TaskIndicatorLinker 
                                                                                                    taskId={task.id} 
                                                                                                    onLinked={() => {
                                                                                                        const refreshTaskIndicators = async () => {
                                                                                                            try {
                                                                                                                const response = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                                                                                                                setLocalTasks(prevTasks => 
                                                                                                                    prevTasks.map(t => 
                                                                                                                        t.id === task.id 
                                                                                                                            ? { ...t, indicator_progress: response.data }
                                                                                                                            : t
                                                                                                                    )
                                                                                                                );
                                                                                                            } catch (error) {
                                                                                                                console.error('Error refreshing indicators:', error);
                                                                                                            }
                                                                                                        };
                                                                                                        refreshTaskIndicators();
                                                                                                    }} 
                                                                                                />
                                                                                            ) : null
                                                                                        ) : (
                                                                                            perms.canEditData ? (
                                                                                                <Button 
                                                                                                    variant="outline" 
                                                                                                    size="sm" 
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        onEdit(task);
                                                                                                    }}
                                                                                                >
                                                                                                    Link to Output
                                                                                                </Button>
                                                                                            ) : null
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                
                                                                                {isLoadingIndicators && task.indicator_progress && task.indicator_progress.length > 0 && (
                                                                                    <div className="flex justify-center py-2">
                                                                                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          // Priority Sort View
                          paginatedTasks.map((task) => {
                            const progress = getProgressPercentage(task);
                            const daysRemaining = getDaysRemaining(task.end_date);
                            const progressColor = getProgressColor(task, daysRemaining);
                            const isOverdue = daysRemaining !== null && daysRemaining < 0;
                            const budgetUtilization = getBudgetUtilization(task);
                            const isExpanded = expandedTaskId === task.id;
                            
                            const locations = task.location_details || task.location || [];
                            const outputId = task.output;
                            const hasIndicators = outputId && outputIndicators[outputId]?.length > 0;
                            const isLoadingIndicators = outputId ? loadingIndicators[outputId] : false;
                            
                            return (
                                <div 
                                    key={task.id} 
                                    className={`rounded-lg border transition-all ${
                                        isOverdue 
                                            ? 'border-destructive/30 bg-destructive/5' 
                                            : 'border-gray-200 hover:border-primary/20'
                                    }`}
                                >
                                    {/* Task Header */}
                                    <div 
                                        className={`p-4 cursor-pointer transition-colors ${
                                            isExpanded ? 'border-b bg-muted/20' : ''
                                        }`}
                                        onClick={() => handleTaskExpand(task.id, outputId)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <span className={`font-semibold ${
                                                        isOverdue ? 'text-destructive' : ''
                                                    }`}>
                                                        {task.title}
                                                    </span>
                                                    {getStatusBadge(task)}
                                                </div>
                                                
                                                {task.description && (
                                                    <p className="text-sm text-muted-foreground mb-3 ml-6">
                                                        {task.description}
                                                    </p>
                                                )}
                                                
                                                {/* Task Summary */}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ml-6 mt-2">
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-muted-foreground">Activity</span>
                                                        <p className="text-sm font-medium">
                                                            {task.activity_name || 'Not linked'}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-muted-foreground">Timeline</span>
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                                            <span>
                                                                {formatDate(task.start_date)} - {formatDate(task.end_date)}
                                                            </span>
                                                        </div>
                                                        {daysRemaining !== null && (
                                                            <p className={`text-xs ${
                                                                daysRemaining < 0 
                                                                    ? 'text-destructive' 
                                                                    : daysRemaining <= 7 
                                                                        ? 'text-amber-600' 
                                                                        : 'text-muted-foreground'
                                                            }`}>
                                                                {daysRemaining < 0 
                                                                    ? `${Math.abs(daysRemaining)} days overdue` 
                                                                    : `${daysRemaining} days remaining`
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-muted-foreground">Budget</span>
                                                        <p className="text-sm font-medium">
                                                            {formatCurrency(task.budget)}
                                                        </p>
                                                        {task.cumulative_spent ? (
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <span>Spent: {formatCurrency(task.cumulative_spent)}</span>
                                                                <span className="text-muted-foreground">
                                                                    ({budgetUtilization}%)
                                                                </span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <span className="text-xs text-muted-foreground">Progress</span>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={progress} className={`h-1.5 flex-1 ${progressColor}`} />
                                                            <span className="text-sm font-medium">{progress}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 ml-4">
                                                {perms.canEditData && (
                                                    <>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onEdit(task);
                                                                        }}
                                                                    >
                                                                        <Edit className="h-3.5 w-3.5" />
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
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onDelete(task);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Delete task</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expanded Content - Output Indicators */}
                                    {isExpanded && (
                                        <div className="p-4 bg-muted/5 border-t">
                                            <div className="ml-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <BarChart3 className="h-4 w-4 text-primary" />
                                                        <h4 className="font-medium">Indicators Tracked by This Task</h4>
                                                    </div>
                                                    {task.output && (
                                                        <TaskIndicatorLinker 
                                                            taskId={task.id} 
                                                            onLinked={() => {
                                                                const refreshTaskIndicators = async () => {
                                                                    try {
                                                                        const response = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                                                                        setLocalTasks(prevTasks => 
                                                                            prevTasks.map(t => 
                                                                                t.id === task.id 
                                                                                    ? { ...t, indicator_progress: response.data }
                                                                                    : t
                                                                            )
                                                                        );
                                                                    } catch (error) {
                                                                        console.error('Error refreshing indicators:', error);
                                                                    }
                                                                };
                                                                refreshTaskIndicators();
                                                            }} 
                                                        />
                                                    )}
                                                </div>
                                                
                                                {isLoadingIndicators ? (
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-20 w-full" />
                                                        <Skeleton className="h-20 w-full" />
                                                    </div>
                                                ) : task.indicator_progress && task.indicator_progress.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {task.indicator_progress.map((progress) => (
                                                            
                                                            <div key={progress.id} className="bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium text-sm">
                                                                                {progress.indicator_name}
                                                                            </span>
                                                                            {progress.notes && (
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger>
                                                                                            <AlertCircle className="h-3 w-3 text-muted-foreground" />
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            {progress.notes}
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            )}
                                                                        </div>
                                                                        {progress.indicator_description && (
                                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                                {progress.indicator_description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <Badge variant="outline" className="text-xs ml-2 whitespace-nowrap">
                                                                        Target: {formatNumber(progress.target_contribution)} | 
                                                                        Actual: {formatNumber(progress.actual_contribution)}
                                                                    </Badge>
                                                                </div>
                                                                
                                                                {/* Task-specific disaggregated values */}
                                                                {progress.disaggregators && progress.disaggregators.length > 0 && (
                                                                    <div className="mt-3 pl-2 border-l-2 border-primary/20">
                                                                        <div className="text-xs font-medium text-muted-foreground mb-2">
                                                                            Disaggregated Values
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                            {progress.disaggregators.map((value, idx) => (
                                                                                <div 
                                                                                    key={`${progress.id}-${value.disaggregator_id}`}
                                                                                    className="text-xs bg-muted/30 rounded p-2 hover:bg-muted/50 transition-colors"
                                                                                >
                                                                                    <span className="font-medium block mb-1">{value.disaggregator_name}</span>
                                                                                    <div className="flex justify-between text-muted-foreground">
                                                                                        <span>Target: {formatNumber(value.target)}</span>
                                                                                        <span>Actual: {formatNumber(value.actual)}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Progress towards task contribution */}
                                                                {progress.target_contribution && progress.target_contribution > 0 && (
                                                                    <div className="mt-3">
                                                                        <div className="flex justify-between text-xs mb-1">
                                                                            <span className="text-muted-foreground">Progress towards target</span>
                                                                            <span className="font-medium">
                                                                                {Math.min(100, Math.round((progress.actual_contribution / progress.target_contribution) * 100))}%
                                                                            </span>
                                                                        </div>
                                                                        <Progress 
                                                                            value={Math.min(100, (progress.actual_contribution / progress.target_contribution) * 100)}
                                                                            className="h-1.5"
                                                                            indicatorClassName={
                                                                                (progress.actual_contribution / progress.target_contribution) >= 1 
                                                                                    ? "bg-green-500" 
                                                                                    : (progress.actual_contribution / progress.target_contribution) >= 0.7 
                                                                                        ? "bg-primary" 
                                                                                        : "bg-amber-500"
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="mt-2 flex justify-end">
                                                                    <TaskIndicatorValueUpdater
                                                                        taskId={task.id}
                                                                        indicatorProgressId={progress.id}
                                                                        indicatorName={progress.indicator_name}
                                                                        disaggregators={progress.disaggregators}
                                                                        onUpdated={() => {
                                                                            const refreshTaskIndicators = async () => {
                                                                                try {
                                                                                    const response = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                                                                                    setLocalTasks(prevTasks => 
                                                                                        prevTasks.map(t => 
                                                                                            t.id === task.id 
                                                                                                ? { ...t, indicator_progress: response.data }
                                                                                                : t
                                                                                        )
                                                                                    );
                                                                                } catch (error) {
                                                                                    console.error('Error refreshing indicators:', error);
                                                                                }
                                                                            };
                                                                            refreshTaskIndicators();
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 px-4">
                                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                                                            <BarChart3 className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                        <p className="text-muted-foreground text-sm mb-3">
                                                            {task.output 
                                                                ? "No indicators are being tracked by this task yet." 
                                                                : "This task needs to be linked to an output first before you can track indicators."
                                                            }
                                                        </p>
                                                        {task.output ? (
                                                            perms.canEditData ? (
                                                                <TaskIndicatorLinker 
                                                                    taskId={task.id} 
                                                                    onLinked={() => {
                                                                        const refreshTaskIndicators = async () => {
                                                                            try {
                                                                                const response = await api.get(`/tasks/task-indicator-progress/?task=${task.id}`);
                                                                                setLocalTasks(prevTasks => 
                                                                                    prevTasks.map(t => 
                                                                                        t.id === task.id 
                                                                                            ? { ...t, indicator_progress: response.data }
                                                                                            : t
                                                                                    )
                                                                                );
                                                                            } catch (error) {
                                                                                console.error('Error refreshing indicators:', error);
                                                                            }
                                                                        };
                                                                        refreshTaskIndicators();
                                                                    }} 
                                                                />
                                                            ) : null
                                                        ) : (
                                                            perms.canEditData ? (
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onEdit(task);
                                                                    }}
                                                                >
                                                                    Link to Output
                                                                </Button>
                                                            ) : null
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {isLoadingIndicators && task.indicator_progress && task.indicator_progress.length > 0 && (
                                                    <div className="flex justify-center py-2">
                                                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                          })
                        )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <div className="text-xs text-muted-foreground">
                                    Page {currentPage} of {totalPages}
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
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                            <Target className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No tasks defined</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                            Start tracking your project progress by adding tasks and assigning them to team members.
                        </p>
                        {/* <Button 
                            onClick={onAdd} 
                            className="gap-2"
                            size="lg"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create Your First Task
                        </Button> */}
                    </div>
                )}
                
                {sortedTasks.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span>On Track</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Due Soon</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-destructive" />
                                <span>Overdue</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <div>
                                Showing {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
                            </div>
                            {sortedTasks.some(t => {
                                const days = getDaysRemaining(t.end_date);
                                return days !== null && days < 0;
                            }) && (
                                <div className="flex items-center gap-1 text-destructive">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>
                                        {sortedTasks.filter(t => {
                                            const days = getDaysRemaining(t.end_date);
                                            return days !== null && days < 0;
                                        }).length} overdue
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}