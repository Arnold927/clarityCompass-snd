'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  FileText, 
  Target, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  User,
  DollarSign,
  Info,
  ClipboardList,
  Hash,
  Lock,
  Unlock,
  Save,
  Edit,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  History,
  Eye,
  Download,
  CalendarDays,
  User as UserIcon
} from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Disaggregator {
  id: number;
  name: string;
  baseline_value?: number | null;
  target_value?: number | null;
  reported_value?: number | null;
  description?: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget?: string;
  cumulative_spent?: number;
  focal_person?: {
    name: string;
    email?: string;
  };
  activityName?: string;
  updates?: any[];
  linkedIndicatorId: number;
  linkedIndicatorName: string;
  taskReportId?: number;
  disaggregators: Disaggregator[];
}

interface TaskReport {
  id: number;
  task: number;
  indicator: number;
  baseline_value?: number | null;
  target_value?: number | null;
  main_indicator_value?: number | null;
  reported_data: { [key: number]: number };
  is_baseline_set: boolean;
  submitted_at: string;
  submitted_by?: {
    id: number;
    name: string;
    email: string;
  };
}

interface ReportHistoryItem {
  id: number;
  main_indicator_value: number | null;
  reported_data: { [key: number]: number };
  submitted_at: string;
  submitted_by?: {
    id: number;
    name: string;
    email: string;
  };
  notes?: string;
}

export default function TaskReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBaselines, setSavingBaselines] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [baselinesSet, setBaselinesSet] = useState(false);
  
  const [viewMode, setViewMode] = useState<'report' | 'setup' | 'history'>('report');
  
  const [mainIndicatorValue, setMainIndicatorValue] = useState<number | ''>('');
  const [baselineValue, setBaselineValue] = useState<number | ''>('');
  const [targetValue, setTargetValue] = useState<number | ''>('');
  
  const [editableBaseline, setEditableBaseline] = useState<number | ''>('');
  const [editableTarget, setEditableTarget] = useState<number | ''>('');
  
  const [disagBaselines, setDisagBaselines] = useState<{ [key: number]: number | '' }>({});
  const [disagTargets, setDisagTargets] = useState<{ [key: number]: number | '' }>({});
  const [reportedValues, setReportedValues] = useState<{ [key: number]: number }>({});
  
  const [editableDisagBaselines, setEditableDisagBaselines] = useState<{ [key: number]: number | '' }>({});
  const [editableDisagTargets, setEditableDisagTargets] = useState<{ [key: number]: number | '' }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const reportDataRes = await api.get(`/tasks/task-report-data/${id}/`);
        const reportData = reportDataRes.data;
        
        
        const taskData: Task = {
          id: reportData.task.id,
          title: reportData.task.title,
          startDate: reportData.task.start_date || '',
          endDate: reportData.task.end_date || '',
          linkedIndicatorId: reportData.project_indicator_id,
          linkedIndicatorName: reportData.indicator_name || 'Unnamed Indicator',
          disaggregators: reportData.disaggregators.map((disagg: any) => ({
            id: disagg.id,
            name: disagg.name,
            baseline_value: disagg.baseline,
            target_value: disagg.target,
            reported_value: reportData.reported_data?.[disagg.id] || null
          }))
        };
        
        
        setTask(taskData);
        
        setBaselinesSet(reportData.baselines_set);
        
        if (reportData.baselines_set) {
          setViewMode('report');
          setBaselineValue(reportData.main_indicator.baseline || '');
          setTargetValue(reportData.main_indicator.target || '');
          setMainIndicatorValue(reportData.main_indicator.reported_value || '');
          
          setEditableBaseline(reportData.main_indicator.baseline || '');
          setEditableTarget(reportData.main_indicator.target || '');
          
          const disagBaselinesMap: { [key: number]: number | '' } = {};
          const disagTargetsMap: { [key: number]: number | '' } = {};
          const editableBaselinesMap: { [key: number]: number | '' } = {};
          const editableTargetsMap: { [key: number]: number | '' } = {};
          const reportedValuesMap: { [key: number]: number } = {};
          
          reportData.disaggregators.forEach((disagg: any) => {
            disagBaselinesMap[disagg.id] = disagg.baseline || '';
            disagTargetsMap[disagg.id] = disagg.target || '';
            editableBaselinesMap[disagg.id] = disagg.baseline || '';
            editableTargetsMap[disagg.id] = disagg.target || '';
            
            if (reportData.reported_data?.[disagg.id] !== undefined) {
              reportedValuesMap[disagg.id] = reportData.reported_data[disagg.id];
            }
          });
          
          setDisagBaselines(disagBaselinesMap);
          setDisagTargets(disagTargetsMap);
          setEditableDisagBaselines(editableBaselinesMap);
          setEditableDisagTargets(editableTargetsMap);
          setReportedValues(reportedValuesMap);
          
        } else {
          setViewMode('setup');
          
          const disagBaselinesMap: { [key: number]: number | '' } = {};
          const disagTargetsMap: { [key: number]: number | '' } = {};
          const editableBaselinesMap: { [key: number]: number | '' } = {};
          const editableTargetsMap: { [key: number]: number | '' } = {};
          
          reportData.disaggregators.forEach((disagg: any) => {
            disagBaselinesMap[disagg.id] = '';
            disagTargetsMap[disagg.id] = '';
            editableBaselinesMap[disagg.id] = '';
            editableTargetsMap[disagg.id] = '';
          });
          
          setDisagBaselines(disagBaselinesMap);
          setDisagTargets(disagTargetsMap);
          setEditableDisagBaselines(editableBaselinesMap);
          setEditableDisagTargets(editableTargetsMap);
        }
        
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchReportHistory = async () => {
      if (viewMode === 'history' && task?.linkedIndicatorId) {
        try {
          setHistoryLoading(true);
          const response = await api.get(`/tasks/task-reports-history/`, {
            params: {
              task_id: task.id,
              indicator_id: task.linkedIndicatorId
            }
          });
          setReportHistory(response.data);
        } catch (err) {
          console.error('Error fetching report history:', err);
        } finally {
          setHistoryLoading(false);
        }
      }
    };

    fetchReportHistory();
  }, [viewMode, task]);

  const handleMainIndicatorChange = (value: string) => {
    const numValue = value === '' ? '' : Number(value);
    setMainIndicatorValue(numValue as number | '');
  };

  const handleBaselineChange = (value: string) => {
    const numValue = value === '' ? '' : Number(value);
    setEditableBaseline(numValue as number | '');
  };

  const handleTargetChange = (value: string) => {
    const numValue = value === '' ? '' : Number(value);
    setEditableTarget(numValue as number | '');
  };

  const handleDisaggregatorChange = (disaggId: number, value: number) => {
    setReportedValues(prev => ({ ...prev, [disaggId]: value }));
  };

  const handleDisagBaselineChange = (disaggId: number, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    setEditableDisagBaselines(prev => ({ ...prev, [disaggId]: numValue as number | '' }));
  };

  const handleDisagTargetChange = (disaggId: number, value: string) => {
    const numValue = value === '' ? '' : Number(value);
    setEditableDisagTargets(prev => ({ ...prev, [disaggId]: numValue as number | '' }));
  };

  const handleSaveBaselines = async () => {
    if (!task) return;

    if (editableBaseline === '') {
      alert('Please enter a baseline value for the main indicator');
      return;
    }
    
    if (editableTarget === '') {
      alert('Please enter a target value for the main indicator');
      return;
    }
    
    for (const disagg of task.disaggregators) {
      if (editableDisagBaselines[disagg.id] === '') {
        alert(`Please enter a baseline value for ${disagg.name}`);
        return;
      }
      if (editableDisagTargets[disagg.id] === '') {
        alert(`Please enter a target value for ${disagg.name}`);
        return;
      }
    }

    try {
      setSavingBaselines(true);
      
      const payload = {
        indicator_id: task.linkedIndicatorId,
        task_id: task.id,
        main_baseline: editableBaseline,
        main_target: editableTarget,
        ...(task.disaggregators.length > 0 && {
          disaggregator_updates: task.disaggregators.map(disagg => ({
            id: disagg.id,
            baseline_value: editableDisagBaselines[disagg.id] || 0,
            target_value: editableDisagTargets[disagg.id] || 0
          }))
        })
      };
      
      
      const response = await api.post('/tasks/save-baselines-targets/', payload);
      
      if (response.data.success) {
        setBaselineValue(editableBaseline);
        setTargetValue(editableTarget);
        
        const updatedBaselines: { [key: number]: number | '' } = {};
        const updatedTargets: { [key: number]: number | '' } = {};
        
        task.disaggregators.forEach(disagg => {
          updatedBaselines[disagg.id] = editableDisagBaselines[disagg.id];
          updatedTargets[disagg.id] = editableDisagTargets[disagg.id];
        });
        
        setDisagBaselines(updatedBaselines);
        setDisagTargets(updatedTargets);
        
        setBaselinesSet(true);
        
        setViewMode('report');
        
        alert('Baselines and targets saved successfully! You can now report values.');
      }
      
    } catch (err: any) {
      console.error(err);
      alert('Failed to save baselines and targets. Please try again.');
    } finally {
      setSavingBaselines(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!task) return;

    if (mainIndicatorValue === '' || mainIndicatorValue < 0) {
      alert('Please enter a valid main indicator value');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        main_indicator_value: mainIndicatorValue,
        reported_data: reportedValues,
      };
      
      
      let response;
      if (task.taskReportId) {
        response = await api.patch(`/tasks/task-reports/${task.taskReportId}/`, payload);
        alert('Report updated successfully!');
      } else {
        const createPayload = {
          ...payload,
          task: task.id,
          indicator: task.linkedIndicatorId,
        };
        response = await api.post('/tasks/task-reports/', createPayload);
        alert('Report submitted successfully!');
      }
      
      window.location.reload();
      
    } catch (err: any) {
      console.error('Submission error:', err);
      if (err.response?.data) {
        alert(`Failed to submit report: ${JSON.stringify(err.response.data)}`);
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReport = (report: ReportHistoryItem) => {
    const headers = ['Disaggregator', 'Reported Value'];
    const rows = [];
    
    rows.push(['Main Indicator', report.main_indicator_value || '']);
    
    if (task) {
      Object.entries(report.reported_data).forEach(([disaggId, value]) => {
        const disagg = task.disaggregators.find(d => d.id === Number(disaggId));
        rows.push([disagg?.name || `Disaggregator ${disaggId}`, value]);
      });
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.id}-${format(new Date(report.submitted_at), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCompletionPercentage = (baseline: number = 0, target: number = 0, current: number = 0) => {
    if (target <= baseline) return 0;
    const progress = Math.max(0, current - baseline);
    const totalNeeded = target - baseline;
    return totalNeeded > 0 ? Math.min(100, (progress / totalNeeded) * 100) : 0;
  };

  const currentBaseline = baselineValue === '' ? 0 : baselineValue as number;
  const currentTarget = targetValue === '' ? 0 : targetValue as number;
  const currentMainValue = mainIndicatorValue === '' ? 0 : mainIndicatorValue;
  const mainCompletionPercentage = getCompletionPercentage(currentBaseline, currentTarget, currentMainValue);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Task Not Found</h2>
            <p className="text-muted-foreground mb-6">The task you're trying to report on doesn't exist or you don't have access to it.</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Indicator Reporting</h1>
              {baselinesSet && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Baselines Set
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Task: {task.title}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="hidden md:flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Task
          </Button>
        </div>
      </div>

      {/* Task Context Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-orange-700" />
                Task Details
              </CardTitle>
              <CardDescription>
                Indicator: {task.linkedIndicatorName}
              </CardDescription>
            </div>
            <Badge variant={baselinesSet ? "default" : "outline"}>
              {baselinesSet ? 'Baselines Set' : 'Baselines Not Set'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              <span>
                {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : 'No start date'} - 
                {task.endDate ? format(new Date(task.endDate), 'MMM d, yyyy') : 'No end date'}
              </span>
            </div>
            {task.activityName && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-500" />
                <span>Activity: {task.activityName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span>{task.disaggregators.length} Disaggregators</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="space-y-6">
        <div className="flex justify-center">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="report" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Report Values
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              View/Edit Baselines
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Report History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* REPORT VALUES TAB */}
        <TabsContent value="report" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-green-50 border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-green-800">
                <BarChart3 className="h-5 w-5" />
                Report Current Values
              </CardTitle>
              <CardDescription className="text-green-700">
                Enter current achievement values. Baselines and targets are locked.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 pt-6">
              {baselinesSet ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Ready to Report</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Baselines and targets are set. Enter current values and submit your report.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Baselines Not Set</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Please set baselines and targets first before reporting values.
                  </AlertDescription>
                </Alert>
              )}

              {/* MAIN INDICATOR REPORT */}
              <div className="p-4 border rounded-lg space-y-4">
                <div>
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Main Indicator
                    {baselinesSet && (
                      <Badge variant="outline" className="text-xs ml-2">
                        <Lock className="h-3 w-3 mr-1" />
                        Baselines Set
                      </Badge>
                    )}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* BASELINE - READ ONLY */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Baseline
                      {baselinesSet && <Lock className="h-3 w-3 text-gray-400" />}
                    </label>
                    <Input 
                      type="number" 
                      value={baselineValue} 
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Locked</p>
                  </div>
                  
                  {/* TARGET - READ ONLY */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Target
                      {baselinesSet && <Lock className="h-3 w-3 text-gray-400" />}
                    </label>
                    <Input 
                      type="number" 
                      value={targetValue} 
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Locked</p>
                  </div>
                  
                  {/* CURRENT VALUE - EDITABLE */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Current Value *
                      <Unlock className="h-3 w-3 text-green-500" />
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={mainIndicatorValue}
                      onChange={e => handleMainIndicatorChange(e.target.value)}
                      placeholder="Enter current value"
                      className="bg-white border-green-300"
                      disabled={!baselinesSet}
                    />
                    <p className="text-xs text-gray-500">
                      {baselinesSet ? "Enter current achievement" : "Set baselines first"}
                    </p>
                  </div>
                </div>

                {baselinesSet && currentTarget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Progress towards target</span>
                      <span className="font-semibold">{mainCompletionPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={mainCompletionPercentage} className="h-2" />
                  </div>
                )}
              </div>

              {/* DISAGGREGATORS REPORT */}
              {task.disaggregators.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Disaggregated Data</h3>
                    <Badge variant="outline" className="text-xs">
                      {task.disaggregators.length} breakdowns
                    </Badge>
                  </div>
                  
                  {task.disaggregators.map(disagg => {
                    const baseline = disagBaselines[disagg.id] === '' ? 0 : disagBaselines[disagg.id] as number;
                    const target = disagTargets[disagg.id] === '' ? 0 : disagTargets[disagg.id] as number;
                    const current = reportedValues[disagg.id] || 0;
                    const percentage = getCompletionPercentage(baseline, target, current);
                    
                    return (
                      <div key={disagg.id} className="p-4 border rounded-lg space-y-4">
                        <div>
                          <h4 className="font-semibold text-lg flex items-center gap-2">
                            {disagg.name}
                            {baselinesSet && (
                              <Badge variant="outline" className="text-xs ml-2">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </Badge>
                            )}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Baseline</label>
                            <Input 
                              type="number" 
                              value={baseline} 
                              readOnly
                              className="bg-gray-50 cursor-not-allowed"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Target</label>
                            <Input 
                              type="number" 
                              value={target} 
                              readOnly
                              className="bg-gray-50 cursor-not-allowed"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Current Value</label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={reportedValues[disagg.id] || ''}
                              onChange={e => handleDisaggregatorChange(disagg.id, Number(e.target.value))}
                              placeholder="Enter current value"
                              disabled={!baselinesSet}
                            />
                          </div>
                        </div>

                        {baselinesSet && target > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Progress towards target</span>
                              <span className="font-semibold">{percentage.toFixed(1)}%</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="border-t pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                <div className="text-sm text-muted-foreground">
                  {baselinesSet ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>You can submit multiple reports over time.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span>Set baselines first before reporting values.</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {!baselinesSet ? (
                    <Button
                      onClick={() => setViewMode('setup')}
                      className="flex items-center gap-2"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Setup Baselines First
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      
                      <Button
                        onClick={handleSubmitReport}
                        disabled={submitting || mainIndicatorValue === ''}
                        className="flex items-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Submit Report
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* VIEW/EDIT BASELINES TAB */}
        <TabsContent value="setup" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className={cn(
              "border-b",
              baselinesSet ? "bg-gray-50" : "bg-orange-50"
            )}>
              <CardTitle className="text-xl flex items-center gap-2">
                {baselinesSet ? (
                  <>
                    <Lock className="h-5 w-5" />
                    View Baselines & Targets
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5" />
                    Setup Baselines & Targets
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {baselinesSet 
                  ? 'Baselines and targets are set. You can only report values.' 
                  : 'Set baseline and target values before reporting.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 pt-6">
              {baselinesSet ? (
                <Alert className="bg-gray-50 border-gray-200">
                  <Lock className="h-4 w-4 text-gray-600" />
                  <AlertTitle className="text-gray-800">Baselines & Targets Locked</AlertTitle>
                  <AlertDescription className="text-gray-700">
                    These values are set and cannot be changed. Switch to "Report Values" to enter current values.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-orange-50 border-orange-200">
                  <Shield className="h-4 w-4 text-orange-700" />
                  <AlertTitle className="text-orange-900">Setup Required</AlertTitle>
                  <AlertDescription className="text-orange-800">
                    Set baseline (starting point) and target (goal) values. These will be locked after saving.
                  </AlertDescription>
                </Alert>
              )}

              {/* MAIN INDICATOR */}
              <div className="p-4 border rounded-lg space-y-4">
                <div>
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Main Indicator
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Baseline *
                      {baselinesSet && <Lock className="h-3 w-3 text-gray-400" />}
                    </label>
                    <Input 
                      type="number" 
                      value={baselinesSet ? baselineValue : editableBaseline}
                      onChange={baselinesSet ? undefined : (e) => handleBaselineChange(e.target.value)}
                      readOnly={baselinesSet}
                      placeholder="Enter baseline value"
                      required
                      className={cn(
                        baselinesSet ? "bg-gray-50 cursor-not-allowed" : "bg-white"
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      {baselinesSet ? "Locked" : "Required. Starting value before intervention."}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Target *
                      {baselinesSet && <Lock className="h-3 w-3 text-gray-400" />}
                    </label>
                    <Input 
                      type="number" 
                      value={baselinesSet ? targetValue : editableTarget}
                      onChange={baselinesSet ? undefined : (e) => handleTargetChange(e.target.value)}
                      readOnly={baselinesSet}
                      placeholder="Enter target value"
                      required
                      className={cn(
                        baselinesSet ? "bg-gray-50 cursor-not-allowed" : "bg-white"
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      {baselinesSet ? "Locked" : "Required. Goal to achieve by end of period."}
                    </p>
                  </div>
                </div>
              </div>

              {/* DISAGGREGATORS */}
              {task.disaggregators.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Disaggregated Baselines & Targets</h3>
                    <Badge variant="outline" className="text-xs">
                      {task.disaggregators.length} breakdowns
                    </Badge>
                  </div>
                  
                  {task.disaggregators.map(disagg => (
                    <div key={disagg.id} className="p-4 border rounded-lg space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg">{disagg.name}</h4>
                        {disagg.description && (
                          <p className="text-sm text-muted-foreground mt-1">{disagg.description}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Baseline *</label>
                          <Input 
                            type="number" 
                            value={baselinesSet ? disagBaselines[disagg.id] : editableDisagBaselines[disagg.id] || ''}
                            onChange={baselinesSet ? undefined : (e) => handleDisagBaselineChange(disagg.id, e.target.value)}
                            readOnly={baselinesSet}
                            placeholder="Enter baseline value"
                            required
                            className={cn(
                              baselinesSet ? "bg-gray-50 cursor-not-allowed" : "bg-white"
                            )}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Target *</label>
                          <Input 
                            type="number" 
                            value={baselinesSet ? disagTargets[disagg.id] : editableDisagTargets[disagg.id] || ''}
                            onChange={baselinesSet ? undefined : (e) => handleDisagTargetChange(disagg.id, e.target.value)}
                            readOnly={baselinesSet}
                            placeholder="Enter target value"
                            required
                            className={cn(
                              baselinesSet ? "bg-gray-50 cursor-not-allowed" : "bg-white"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            {!baselinesSet && (
              <CardFooter className="border-t pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span>All values are required. They will be locked after saving.</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setViewMode('report')}
                      disabled={savingBaselines}
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      onClick={handleSaveBaselines}
                      disabled={savingBaselines}
                      className="flex items-center gap-2"
                    >
                      {savingBaselines ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Save & Lock Baselines
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* REPORT HISTORY TAB */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-orange-900">
                <History className="h-5 w-5" />
                Report History
              </CardTitle>
              <CardDescription className="text-orange-800">
                View all submitted reports for this task and indicator.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              {historyLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading report history...</p>
                </div>
              ) : reportHistory.length === 0 ? (
                <Alert className="bg-gray-50">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                  <AlertTitle>No Reports Found</AlertTitle>
                  <AlertDescription>
                    No reports have been submitted for this task yet.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500 mb-4">
                    Showing {reportHistory.length} report{reportHistory.length !== 1 ? 's' : ''}
                  </div>
                  
                  {reportHistory.map((report, index) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              Report #{reportHistory.length - index} 
                              {index === 0 && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Latest
                                </Badge>
                              )}
                            </h4>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(report.submitted_at), 'MMM d, yyyy h:mm a')}
                            </div>
                            {report.submitted_by && (
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                {report.submitted_by.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadReport(report)}
                          className="h-8"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Main Indicator</p>
                            <p className="text-lg font-semibold">
                              {report.main_indicator_value !== null ? report.main_indicator_value : 'N/A'}
                            </p>
                            {baselineValue !== '' && targetValue !== '' && report.main_indicator_value !== null && (
                              <div className="text-xs text-gray-500">
                                {getCompletionPercentage(
                                  baselineValue as number, 
                                  targetValue as number, 
                                  report.main_indicator_value
                                ).toFixed(1)}% progress
                              </div>
                            )}
                          </div>
                          
                          {task.disaggregators.length > 0 && (
                            <div className="md:col-span-2">
                              <p className="text-sm font-medium mb-2">Disaggregated Values</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {task.disaggregators.map(disagg => {
                                  const value = report.reported_data[disagg.id];
                                  return (
                                    <div key={disagg.id} className="flex justify-between items-center border rounded p-2 text-sm">
                                      <span className="font-medium">{disagg.name}</span>
                                      <span className={value !== undefined ? "font-semibold" : "text-gray-400"}>
                                        {value !== undefined ? value : 'Not reported'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {report.notes && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Notes</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{report.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="border-t pt-6">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Reports are stored permanently and cannot be deleted.</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewMode('report')}
                  >
                    Back to Reporting
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}