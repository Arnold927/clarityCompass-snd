'use client';

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Target, 
  BarChart,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  Layers,
  FileText,
  BarChart3,
  PieChart,
  Target as TargetIcon
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { OutcomeIndicatorEditor } from '../outcome-indicator-editor';
import { OutputIndicatorEditor } from '../output-indicator-editor';
import { IndicatorTargetEditor } from '../indicator-target-editor';
import api from '@/lib/api';
import { DisaggregatedValuesEditor } from '../disaggregated-values-editor';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

interface OutcomeIndicator {
  id: number;
  name: string;
  description?: string;
  target?: number | null;
  actual?: number | null;
  outcome?: number;
  disaggregators?: Disaggregator[]; 
}

interface OutputIndicator {
  id: number;
  name: string;
  description?: string;
  target?: number | null;
  actual?: number | null;
  output?: number;
}

interface Output {
  id: number;
  name: string;
  description?: string;
  indicators: OutputIndicator[];
}

interface Outcome {
  id: number;
  name: string;
  description?: string;
  indicators: OutcomeIndicator[];
  outputs: Output[];
}

interface Objective {
  id: number;
  name: string;
  number?: string;
  outcomes: Outcome[];
}

interface Project {
  id: number;
  objectives: Objective[];
}

interface Disaggregator {
  id: number;
  name: string;
  description?: string;
}

interface OutcomeOutputIndicatorsTabProps {
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
}

export function OutcomeOutputIndicatorsTab({ project, setProject }: OutcomeOutputIndicatorsTabProps) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<number>>(new Set());
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<number>>(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<number>>(new Set());
  
  const [editingDisaggregatedValues, setEditingDisaggregatedValues] = useState<{
    indicatorId: number;
    indicatorName: string;
    type: 'outcome' | 'output';
    disaggregators: Disaggregator[];
    currentValues?: any[];
  } | null>(null);

  const [editingOutcomeIndicator, setEditingOutcomeIndicator] = useState<{
    indicator?: OutcomeIndicator;
    outcomeId: number;
    objectiveId: number;
  } | null>(null);

  const [editingOutputIndicator, setEditingOutputIndicator] = useState<{
    indicator?: OutputIndicator;
    outputId: number;
    outcomeId: number;
    objectiveId: number;
  } | null>(null);

  const [editingTarget, setEditingTarget] = useState<{
    indicator: OutcomeIndicator | OutputIndicator;
    type: 'outcome' | 'output';
  } | null>(null);

  const [deletingIndicator, setDeletingIndicator] = useState<{
    id: number;
    name: string;
    type: 'outcome' | 'output';
  } | null>(null);

  const [availableDisaggregators, setAvailableDisaggregators] = useState<Disaggregator[]>([]);

  useEffect(() => {
    fetchAvailableDisaggregators();
  }, []);

  const fetchAvailableDisaggregators = async () => {
    try {
      console.log('Fetching available disaggregators...');
      const response = await api.get('/strategic/disaggregators/');
      console.log('Available disaggregators response:', response.data);
      setAvailableDisaggregators(response.data);
    } catch (error) {
      console.error('Failed to fetch disaggregators:', error);
    }
  };

  useEffect(() => {
    if (project?.id) {
      fetchIndicators();
    }
  }, [project?.id]);

  const fetchIndicators = async () => {
    setLoading(true);
    try {
      const objectivesResponse = await api.get(
        `/projects/project-objectives/?project=${project.id}`
      );
      const objectives = objectivesResponse.data;
      const outcomeIndicatorsResponse = await api.get(
        `/projects/project-outcome-indicators/?project=${project.id}`
      );

      const outputIndicatorsResponse = await api.get(
        `/projects/project-output-indicators/?project=${project.id}`
      );

      const disaggregatedValuesResponse = await api.get(
        `/projects/indicator-disaggregated-values/?project=${project.id}`
      );
      const disaggregatedValues = disaggregatedValuesResponse.data;
      const calculateTotals = (indicatorId: number, type: 'outcome' | 'output') => {
        const indicatorValues = disaggregatedValues.filter(
          (v: any) => type === 'outcome' 
            ? v.outcome_indicator === indicatorId
            : v.output_indicator === indicatorId
        );
        
        const totalTarget = indicatorValues.reduce((sum: number, v: any) => sum + (Number(v.target) || 0), 0);
        const totalActual = indicatorValues.reduce((sum: number, v: any) => sum + (Number(v.actual) || 0), 0);
        
        return {
          target: totalTarget || null,
          actual: totalActual || null
        };
      };

      const objectivesWithData = await Promise.all(
        objectives.map(async (objective: any) => {
          const outcomesResponse = await api.get(
            `/projects/project-outcomes/?project_objective=${objective.id}`
          );
          const outcomes = outcomesResponse.data;

          const outcomesWithData = await Promise.all(
            outcomes.map(async (outcome: any) => {
              const outputsResponse = await api.get(
                `/projects/project-outputs/?project_outcome=${outcome.id}`
              );
              const outputs = outputsResponse.data;

              const outputsWithIndicators = outputs.map((output: any) => ({
                ...output,
                indicators: outputIndicatorsResponse.data
                  .filter((ind: any) => ind.output === output.id)
                  .map((ind: any) => {
                    const totals = calculateTotals(ind.id, 'output');
                    return {
                      ...ind,
                      target: totals.target !== null ? Number(totals.target) : null,
                      actual: totals.actual !== null ? Number(totals.actual) : null,
                      disaggregators: ind.disaggregators || []
                    };
                  })
              }));

              return {
                ...outcome,
                indicators: outcomeIndicatorsResponse.data
                  .filter((ind: any) => ind.outcome === outcome.id)
                  .map((ind: any) => {
                    const totals = calculateTotals(ind.id, 'outcome');
                    return {
                      ...ind,
                      target: totals.target !== null ? Number(totals.target) : null,
                      actual: totals.actual !== null ? Number(totals.actual) : null,
                      disaggregators: ind.disaggregators || []
                    };
                  }),
                outputs: outputsWithIndicators
              };
            })
          );

          return {
            ...objective,
            outcomes: outcomesWithData
          };
        })
      );

      setObjectives(objectivesWithData);
    } catch (error) {
      console.error('Failed to fetch indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicatorDisaggregators = async (indicatorId: number, type: 'outcome' | 'output') => {
    try {
      const endpoint = type === 'outcome'
        ? `/projects/project-outcome-indicators/${indicatorId}/`
        : `/projects/project-output-indicators/${indicatorId}/`;
      
      const response = await api.get(endpoint);
      const indicatorDisaggregators = response.data.disaggregators || [];
      
      return indicatorDisaggregators;
    } catch (error) {
      console.error('Failed to fetch indicator disaggregators:', error);
      return [];
    }
  };

  const handleSaveOutcomeIndicator = async (indicator: { 
    name: string; 
    description?: string;
    disaggregator_ids?: number[];  // Add this
  }) => {
    if (!editingOutcomeIndicator) return;

    const { indicator: existingIndicator, outcomeId, objectiveId } = editingOutcomeIndicator;

    try {
      const payload = {
        name: indicator.name,
        description: indicator.description || "",
        outcome: outcomeId,
        disaggregator_ids: indicator.disaggregator_ids || []  // Include disaggregators
      };

      if (existingIndicator?.id) {
        const response = await api.put(`/projects/project-outcome-indicators/${existingIndicator.id}/`, payload);
        
        setObjectives(prev => prev.map(obj => 
          obj.id === objectiveId
            ? {
                ...obj,
                outcomes: obj.outcomes.map(outcome =>
                  outcome.id === outcomeId
                    ? {
                        ...outcome,
                        indicators: outcome.indicators.map(ind =>
                          ind.id === existingIndicator.id ? response.data : ind
                        )
                      }
                    : outcome
                )
              }
            : obj
        ));
      } else {
        const response = await api.post('/projects/project-outcome-indicators/', payload);
        
        setObjectives(prev => prev.map(obj => 
          obj.id === objectiveId
            ? {
                ...obj,
                outcomes: obj.outcomes.map(outcome =>
                  outcome.id === outcomeId
                    ? {
                        ...outcome,
                        indicators: [...(outcome.indicators || []), response.data]
                      }
                    : outcome
                )
              }
            : obj
        ));
      }

      setEditingOutcomeIndicator(null);
      toast.success('Outcome indicator saved successfully');
    } catch (error) {
      console.error('Failed to save outcome indicator:', error);
      toast.error('Failed to save indicator');
    }
  };

  const handleSaveOutputIndicator = async (indicator: { name: string; description?: string }) => {
    if (!editingOutputIndicator) return;

    const { indicator: existingIndicator, outputId, outcomeId, objectiveId } = editingOutputIndicator;

    try {
      if (existingIndicator?.id) {
        const response = await api.put(`/projects/project-output-indicators/${existingIndicator.id}/`, {
          ...indicator,
          output: outputId,
        });
        
        setObjectives(prev => prev.map(obj => 
          obj.id === objectiveId
            ? {
                ...obj,
                outcomes: obj.outcomes.map(outcome =>
                  outcome.id === outcomeId
                    ? {
                        ...outcome,
                        outputs: outcome.outputs?.map(output =>
                          output.id === outputId
                            ? {
                                ...output,
                                indicators: output.indicators.map(ind =>
                                  ind.id === existingIndicator.id ? response.data : ind
                                )
                              }
                            : output
                        )
                      }
                    : outcome
                )
              }
            : obj
        ));
      } else {
        const response = await api.post('/projects/project-output-indicators/', {
          ...indicator,
          output: outputId,
        });
        
        setObjectives(prev => prev.map(obj => 
          obj.id === objectiveId
            ? {
                ...obj,
                outcomes: obj.outcomes.map(outcome =>
                  outcome.id === outcomeId
                    ? {
                        ...outcome,
                        outputs: outcome.outputs?.map(output =>
                          output.id === outputId
                            ? {
                                ...output,
                                indicators: [...(output.indicators || []), response.data]
                              }
                            : output
                        )
                      }
                    : outcome
                )
              }
            : obj
        ));
      }

      setEditingOutputIndicator(null);
    } catch (error) {
      console.error('Failed to save output indicator:', error);
      alert('Failed to save indicator');
    }
  };

  const handleSaveTarget = async (data: { target?: number; actual?: number }) => {
    if (!editingTarget) return;

    const { indicator, type } = editingTarget;
    const endpoint = type === 'outcome' 
      ? `/projects/project-outcome-indicators/${indicator.id}/`
      : `/projects/project-output-indicators/${indicator.id}/`;

    try {
      const response = await api.patch(endpoint, data);
      
      if (type === 'outcome') {
        setObjectives(prev => prev.map(obj => ({
          ...obj,
          outcomes: obj.outcomes.map(outcome => ({
            ...outcome,
            indicators: outcome.indicators.map(ind =>
              ind.id === indicator.id ? response.data : ind
            )
          }))
        })));
      } else {
        setObjectives(prev => prev.map(obj => ({
          ...obj,
          outcomes: obj.outcomes.map(outcome => ({
            ...outcome,
            outputs: outcome.outputs?.map(output => ({
              ...output,
              indicators: output.indicators.map(ind =>
                ind.id === indicator.id ? response.data : ind
              )
            }))
          }))
        })));
      }

      setEditingTarget(null);
    } catch (error) {
      console.error('Failed to update target/actual:', error);
      alert('Failed to update values');
    }
  };

  const handleDeleteIndicator = async () => {
    if (!deletingIndicator) return;

    const { id, type } = deletingIndicator;
    const endpoint = type === 'outcome'
      ? `/projects/project-outcome-indicators/${id}/`
      : `/projects/project-output-indicators/${id}/`;

    try {
      await api.delete(endpoint);
      
      await fetchIndicators();
      setDeletingIndicator(null);
    } catch (error) {
      console.error('Failed to delete indicator:', error);
      alert('Failed to delete indicator');
    }
  };

  const handleSaveDisaggregatedValues = async (
    indicatorId: number,
    type: 'outcome' | 'output',
    values: any[]
  ) => {
    try {
      const endpoint = type === 'outcome'
        ? `/projects/indicator-disaggregated-values/?outcome_indicator=${indicatorId}`
        : `/projects/indicator-disaggregated-values/?output_indicator=${indicatorId}`;
      
      // You'll need to adjust this based on your API expectations
      // This assumes you're bulk updating or creating disaggregated values
      for (const value of values) {
        if (value.id) {
          await api.put(`/projects/indicator-disaggregated-values/${value.id}/`, value);
        } else {
          await api.post('/projects/indicator-disaggregated-values/', {
            ...value,
            outcome_indicator: type === 'outcome' ? indicatorId : undefined,
            output_indicator: type === 'output' ? indicatorId : undefined,
          });
        }
      }
      
      await fetchIndicators();
      setEditingDisaggregatedValues(null);
      toast.success('Disaggregated values saved successfully');
    } catch (error) {
      console.error('Failed to save disaggregated values:', error);
      toast.error('Failed to save disaggregated values');
    }
  };

  const fetchDisaggregatedValues = async (indicatorId: number, type: 'outcome' | 'output') => {
    try {
      const endpoint = type === 'outcome'
        ? `/projects/indicator-disaggregated-values/?outcome_indicator=${indicatorId}`
        : `/projects/indicator-disaggregated-values/?output_indicator=${indicatorId}`;
      
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch disaggregated values:', error);
      return [];
    }
  };

  const getProgressPercentage = (target?: number | null, actual?: number | null) => {
    if (!target || !actual) return 0;
    return Math.min(100, Math.round((actual / target) * 100));
  };

  const getProgressStatus = (target?: number | null, actual?: number | null) => {
    if (!target || !actual) return 'neutral';
    const percentage = (actual / target) * 100;
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'warning';
    if (percentage >= 50) return 'info';
    return 'danger';
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'danger': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getProgressIcon = (status: string) => {
    switch (status) {
      case 'success': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'warning': return <TrendingUp className="h-3 w-3 text-yellow-500" />;
      case 'info': return <TrendingUp className="h-3 w-3 text-blue-500" />;
      case 'danger': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const toggleObjective = (objectiveId: number) => {
    setExpandedObjectives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectiveId)) {
        newSet.delete(objectiveId);
      } else {
        newSet.add(objectiveId);
      }
      return newSet;
    });
  };

  const toggleOutcome = (outcomeId: number) => {
    setExpandedOutcomes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outcomeId)) {
        newSet.delete(outcomeId);
      } else {
        newSet.add(outcomeId);
      }
      return newSet;
    });
  };

  const toggleOutput = (outputId: number) => {
    setExpandedOutputs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outputId)) {
        newSet.delete(outputId);
      } else {
        newSet.add(outputId);
      }
      return newSet;
    });
  };

  const calculateObjectiveProgress = (objective: Objective) => {
    let totalTarget = 0;
    let totalActual = 0;
    let indicatorCount = 0;

    objective.outcomes.forEach(outcome => {
      outcome.indicators.forEach(indicator => {
        if (indicator.target && indicator.actual) {
          totalTarget += indicator.target;
          totalActual += indicator.actual;
          indicatorCount++;
        }
      });
      outcome.outputs?.forEach(output => {
        output.indicators.forEach(indicator => {
          if (indicator.target && indicator.actual) {
            totalTarget += indicator.target;
            totalActual += indicator.actual;
            indicatorCount++;
          }
        });
      });
    });

    if (indicatorCount === 0) return null;
    const percentage = (totalActual / totalTarget) * 100;
    return Math.min(100, Math.round(percentage));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading indicators...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Stats */}
        {objectives.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Objectives</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{objectives.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outcomes</CardTitle>
                <TargetIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {objectives.reduce((acc, obj) => acc + obj.outcomes.length, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outputs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {objectives.reduce((acc, obj) => 
                    acc + obj.outcomes.reduce((sum, outcome) => 
                      sum + (outcome.outputs?.length || 0), 0
                    ), 0
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-t-lg border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Outcome & Output Indicators
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Track indicators, targets, and actuals for outcomes and outputs across your project's results framework.
                </CardDescription>
              </div>
              <Badge variant="outline" className="px-3 py-1 text-sm bg-background/50 backdrop-blur-sm">
                <BarChart3 className="mr-2 h-3 w-3" />
                Results Framework
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {objectives.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="bg-muted/30 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Objectives Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Please set up your results framework first by adding objectives, outcomes, and outputs before defining indicators.
                </p>
                <Button className="mt-6" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Set Up Results Framework
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {objectives.map((objective) => {
                  const objectiveProgress = calculateObjectiveProgress(objective);
                  
                  return (
                    <Collapsible
                      key={objective.id}
                      open={expandedObjectives.has(objective.id)}
                      onOpenChange={() => toggleObjective(objective.id)}
                      className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
                    >
                      <div className={cn(
                        "px-6 py-4 flex items-center justify-between cursor-pointer",
                        "bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50",
                        expandedObjectives.has(objective.id) && "border-b"
                      )}>
                        <div className="flex items-center gap-3 flex-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              {expandedObjectives.has(objective.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                Objective {objective.number}
                              </Badge>
                              <h3 className="text-lg font-semibold">{objective.name}</h3>
                            </div>
                            {objectiveProgress !== null && (
                              <div className="mt-2 flex items-center gap-2">
                                <Progress 
                                  value={objectiveProgress} 
                                  className={cn(
                                    "h-2 w-48",
                                    getProgressColor(getProgressStatus(objectiveProgress, 100))
                                  )} 
                                />
                                <span className="text-sm font-medium">{objectiveProgress}% Complete</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-4">
                          {objective.outcomes.length} {objective.outcomes.length === 1 ? 'Outcome' : 'Outcomes'}
                        </Badge>
                      </div>

                      <CollapsibleContent>
                        <div className="p-6 space-y-6">
                          {objective.outcomes.map((outcome) => (
                            <Collapsible
                              key={outcome.id}
                              open={expandedOutcomes.has(outcome.id)}
                              onOpenChange={() => toggleOutcome(outcome.id)}
                              className="border rounded-lg overflow-hidden bg-card"
                            >
                              <div className={cn(
                                "px-4 py-3 flex items-center justify-between cursor-pointer",
                                "bg-muted/30",
                                expandedOutcomes.has(outcome.id) && "border-b"
                              )}>
                                <div className="flex items-center gap-2 flex-1">
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      {expandedOutcomes.has(outcome.id) ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <div className="flex items-center gap-2 flex-1">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                                      Outcome
                                    </Badge>
                                    <h4 className="font-medium">{outcome.name}</h4>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {outcome.indicators?.length || 0} Indicators
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {outcome.outputs?.length || 0} Outputs
                                  </Badge>
                                </div>
                              </div>

                              <CollapsibleContent>
                                <div className="p-4 space-y-4">
                                  {/* Outcome Indicators Section */}
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <TargetIcon className="h-4 w-4" />
                                        Outcome Indicators
                                      </h5>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => setEditingOutcomeIndicator({ 
                                              outcomeId: outcome.id, 
                                              objectiveId: objective.id 
                                            })}
                                          >
                                            <PlusCircle className="mr-2 h-3 w-3" /> Add Indicator
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Add a new outcome indicator</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>

                                    <div className="rounded-lg border overflow-hidden">
                                      <Table>
                                        <TableHeader className="bg-muted/50">
                                          <TableRow>
                                            <TableHead className="w-[30%]">Indicator</TableHead>
                                            <TableHead className="w-[25%]">Description</TableHead>
                                            <TableHead className="text-right w-[10%]">Target</TableHead>
                                            <TableHead className="text-right w-[10%]">Actual</TableHead>
                                            <TableHead className="text-center w-[15%]">Progress</TableHead>
                                            <TableHead className="text-right w-[10%]">Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {outcome.indicators?.map((indicator) => {
                                            const progress = getProgressPercentage(indicator.target, indicator.actual);
                                            const status = getProgressStatus(indicator.target, indicator.actual);
                                            return (
                                              <TableRow key={indicator.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="font-medium">
                                                  <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-1.5">
                                                      O
                                                    </Badge>
                                                    {indicator.name}
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                  {indicator.description || (
                                                    <span className="text-muted-foreground/50 italic">No description</span>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                  {indicator.target?.toLocaleString() || '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                  {indicator.actual?.toLocaleString() || '-'}
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                      <Progress 
                                                        value={progress} 
                                                        className={cn("h-2", getProgressColor(status))} 
                                                      />
                                                    </div>
                                                    <div className="flex items-center gap-1 min-w-[45px]">
                                                      {getProgressIcon(status)}
                                                      <span className="text-xs font-medium">{progress}%</span>
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center justify-end gap-1">
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-8 w-8"
                                                          onClick={async () => {
                                                            const disaggregators = await fetchIndicatorDisaggregators(indicator.id, 'outcome');
                                                            if (disaggregators.length > 0) {
                                                              setEditingDisaggregatedValues({
                                                                indicatorId: indicator.id,
                                                                indicatorName: indicator.name,
                                                                type: 'outcome',
                                                                disaggregators: disaggregators,
                                                                currentValues: disaggregators
                                                              });
                                                            } else {
                                                              setEditingTarget({ indicator, type: 'outcome' });
                                                            }
                                                          }}
                                                        >
                                                          <BarChart className="h-4 w-4" />
                                                        </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p>Add targets and actuals</p>
                                                      </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-8 w-8"
                                                          onClick={() => setEditingOutcomeIndicator({ 
                                                            indicator, 
                                                            outcomeId: outcome.id, 
                                                            objectiveId: objective.id 
                                                          })}
                                                        >
                                                          <Edit className="h-4 w-4" />
                                                        </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p>Edit indicator</p>
                                                      </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                                          onClick={() => setDeletingIndicator({ 
                                                            id: indicator.id, 
                                                            name: indicator.name, 
                                                            type: 'outcome' 
                                                          })}
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p>Delete indicator</p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                          {(!outcome.indicators || outcome.indicators.length === 0) && (
                                            <TableRow>
                                              <TableCell colSpan={6} className="text-center py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                  <TargetIcon className="h-8 w-8 text-muted-foreground/30" />
                                                  <p className="text-muted-foreground">No outcome indicators defined yet.</p>
                                                  <Button
                                                    variant="link"
                                                    size="sm"
                                                    onClick={() => setEditingOutcomeIndicator({ 
                                                      outcomeId: outcome.id, 
                                                      objectiveId: objective.id 
                                                    })}
                                                  >
                                                    Add your first indicator
                                                  </Button>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          )}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  {/* Outputs Section */}
                                  {outcome.outputs && outcome.outputs.length > 0 && (
                                    <div className="space-y-4 mt-6">
                                      <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Outputs
                                      </h5>
                                      {outcome.outputs.map((output) => (
                                        <Collapsible
                                          key={output.id}
                                          open={expandedOutputs.has(output.id)}
                                          onOpenChange={() => toggleOutput(output.id)}
                                          className="border rounded-lg overflow-hidden bg-card ml-4"
                                        >
                                          <div className={cn(
                                            "px-4 py-2 flex items-center justify-between cursor-pointer",
                                            "bg-muted/20",
                                            expandedOutputs.has(output.id) && "border-b"
                                          )}>
                                            <div className="flex items-center gap-2 flex-1">
                                              <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                  {expandedOutputs.has(output.id) ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )}
                                                </Button>
                                              </CollapsibleTrigger>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-muted text-xs">
                                                  Output
                                                </Badge>
                                                <h6 className="text-sm font-medium">{output.name}</h6>
                                              </div>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                              {output.indicators?.length || 0} Indicators
                                            </Badge>
                                          </div>

                                          <CollapsibleContent>
                                            <div className="p-3">
                                              <div className="flex items-center justify-between mb-3">
                                                <h6 className="text-xs font-medium text-muted-foreground">
                                                  Output Indicators
                                                </h6>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7"
                                                      onClick={() => setEditingOutputIndicator({ 
                                                        outputId: output.id, 
                                                        outcomeId: outcome.id, 
                                                        objectiveId: objective.id 
                                                      })}
                                                    >
                                                      <PlusCircle className="mr-2 h-3 w-3" /> Add Indicator
                                                    </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Add a new output indicator</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </div>

                                              <div className="rounded-lg border overflow-hidden">
                                                <Table>
                                                  <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                      <TableHead className="w-[30%]">Indicator</TableHead>
                                                      <TableHead className="w-[25%]">Description</TableHead>
                                                      <TableHead className="text-right w-[10%]">Target</TableHead>
                                                      <TableHead className="text-right w-[10%]">Actual</TableHead>
                                                      <TableHead className="text-center w-[15%]">Progress</TableHead>
                                                      <TableHead className="text-right w-[10%]">Actions</TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {output.indicators?.map((indicator) => {
                                                      const progress = getProgressPercentage(indicator.target, indicator.actual);
                                                      const status = getProgressStatus(indicator.target, indicator.actual);
                                                      return (
                                                        <TableRow key={indicator.id} className="hover:bg-muted/50 transition-colors">
                                                          <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                              <Badge variant="outline" className="bg-muted text-muted-foreground text-xs px-1.5">
                                                                OP
                                                              </Badge>
                                                              {indicator.name}
                                                            </div>
                                                          </TableCell>
                                                          <TableCell className="text-muted-foreground">
                                                            {indicator.description || (
                                                              <span className="text-muted-foreground/50 italic">No description</span>
                                                            )}
                                                          </TableCell>
                                                          <TableCell className="text-right font-medium">
                                                            {indicator.target?.toLocaleString() || '-'}
                                                          </TableCell>
                                                          <TableCell className="text-right font-medium">
                                                            {indicator.actual?.toLocaleString() || '-'}
                                                          </TableCell>
                                                          <TableCell>
                                                            <div className="flex items-center gap-2">
                                                              <div className="flex-1">
                                                                <Progress 
                                                                  value={progress} 
                                                                  className={cn("h-2", getProgressColor(status))} 
                                                                />
                                                              </div>
                                                              <div className="flex items-center gap-1 min-w-[45px]">
                                                                {getProgressIcon(status)}
                                                                <span className="text-xs font-medium">{progress}%</span>
                                                              </div>
                                                            </div>
                                                          </TableCell>
                                                          <TableCell>
                                                            <div className="flex items-center justify-end gap-1">
                                                              <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={async () => {
                                                                      const disaggregators = await fetchIndicatorDisaggregators(indicator.id, 'output');
                                                                      if (disaggregators.length > 0) {
                                                                        setEditingDisaggregatedValues({
                                                                          indicatorId: indicator.id,
                                                                          indicatorName: indicator.name,
                                                                          type: 'output',
                                                                          disaggregators: disaggregators
                                                                        });
                                                                      } else {
                                                                        setEditingTarget({ indicator, type: 'output' });
                                                                      }
                                                                    }}
                                                                  >
                                                                    <BarChart className="h-4 w-4" />
                                                                  </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                  <p>Add targets and actuals</p>
                                                                </TooltipContent>
                                                              </Tooltip>

                                                              <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => setEditingOutputIndicator({ 
                                                                      indicator, 
                                                                      outputId: output.id, 
                                                                      outcomeId: outcome.id, 
                                                                      objectiveId: objective.id 
                                                                    })}
                                                                  >
                                                                    <Edit className="h-4 w-4" />
                                                                  </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                  <p>Edit indicator</p>
                                                                </TooltipContent>
                                                              </Tooltip>

                                                              <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                  <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                                    onClick={() => setDeletingIndicator({ 
                                                                      id: indicator.id, 
                                                                      name: indicator.name, 
                                                                      type: 'output' 
                                                                    })}
                                                                  >
                                                                    <Trash2 className="h-4 w-4" />
                                                                  </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                  <p>Delete indicator</p>
                                                                </TooltipContent>
                                                              </Tooltip>
                                                            </div>
                                                          </TableCell>
                                                        </TableRow>
                                                      );
                                                    })}
                                                    {(!output.indicators || output.indicators.length === 0) && (
                                                      <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-6">
                                                          <div className="flex flex-col items-center gap-2">
                                                            <TargetIcon className="h-6 w-6 text-muted-foreground/30" />
                                                            <p className="text-sm text-muted-foreground">No output indicators defined yet.</p>
                                                            <Button
                                                              variant="link"
                                                              size="sm"
                                                              onClick={() => setEditingOutputIndicator({ 
                                                                outputId: output.id, 
                                                                outcomeId: outcome.id, 
                                                                objectiveId: objective.id 
                                                              })}
                                                            >
                                                              Add your first indicator
                                                            </Button>
                                                          </div>
                                                        </TableCell>
                                                      </TableRow>
                                                    )}
                                                  </TableBody>
                                                </Table>
                                              </div>
                                            </div>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editors */}
        {editingOutcomeIndicator && editingOutcomeIndicator.indicator && (
          <OutcomeIndicatorEditor
            // indicator={{
            //   ...editingOutcomeIndicator.indicator,
            //   disaggregators: editingOutcomeIndicator.indicator.disaggregators?.map(d => d.name) || []
            // }}
            indicator={editingOutcomeIndicator.indicator} 
            isOpen={!!editingOutcomeIndicator}
            onClose={() => setEditingOutcomeIndicator(null)}
            onSave={handleSaveOutcomeIndicator}
            title="Outcome Indicator"
          />
        )}

        {editingOutputIndicator && editingOutputIndicator.indicator && (
          <OutputIndicatorEditor
            indicator={editingOutputIndicator.indicator}
            isOpen={!!editingOutputIndicator}
            onClose={() => setEditingOutputIndicator(null)}
            onSave={handleSaveOutputIndicator}
            title="Output Indicator"
          />
        )}

        {editingTarget && (
          <IndicatorTargetEditor
            indicator={editingTarget.indicator}
            type={editingTarget.type}
            isOpen={!!editingTarget}
            onClose={() => setEditingTarget(null)}
            onSave={handleSaveTarget}
          />
        )}

        {editingDisaggregatedValues && (
          <DisaggregatedValuesEditor
            isOpen={!!editingDisaggregatedValues}
            onClose={() => setEditingDisaggregatedValues(null)}
            onSave={() => {
              fetchIndicators();
              setEditingDisaggregatedValues(null);
              toast.success('Disaggregated values saved successfully');
            }}
            indicatorId={editingDisaggregatedValues.indicatorId}
            indicatorName={editingDisaggregatedValues.indicatorName}
            type={editingDisaggregatedValues.type}
            disaggregators={editingDisaggregatedValues.disaggregators}
          />
        )}

        {/* Delete Confirmation */}
        {deletingIndicator && (
          <AlertDialog open={!!deletingIndicator} onOpenChange={() => setDeletingIndicator(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Delete Indicator
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the indicator: <span className="font-semibold">"{deletingIndicator.name}"</span> and all associated data including targets and actuals.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteIndicator} 
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </TooltipProvider>
  );
}