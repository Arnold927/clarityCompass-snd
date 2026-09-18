'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Target, Calendar, TrendingUp, BarChart3,
    Gauge, Eye, EyeOff, MessageSquare, Hash, FolderTree, Sparkles, Filter
 } 
from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StrategicObjectiveEditor } from './strategic-objective-editor';
import { StrategicPlanYearEditor } from './strategic-plan-year-editor';
import { ObjectivePerformanceEditor } from './objective-performance-editor';
import { StrategicStatementEditor } from './strategic-statement-editor';
import api from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndicatorPerformanceEditor } from './indicator-performance-editor';
import { IndicatorEditor } from './indicator-editor';
import { Separator } from '@/components/ui/separator';


export function StrategicResultsFramework({ plan, setPlan }: { plan: any, setPlan: Function }) {
    const [openObjectives, setOpenObjectives] = useState<string[]>(plan.strategicObjectives?.map((o: any) => o.id) || []);
    const [openStatements, setOpenStatements] = useState<string[]>([]);
    const [openIndicators, setOpenIndicators] = useState<string[]>([]);
    
    const [editingObjective, setEditingObjective] = useState<any>(null);
    const [editingYear, setEditingYear] = useState<any>(null);
    const [editingPerformance, setEditingPerformance] = useState<any>(null);
    const [editingStatement, setEditingStatement] = useState<any>(null);
    const [addingStatementForObjective, setAddingStatementForObjective] = useState<string | null>(null);
    const [editingIndicator, setEditingIndicator] = useState<any>(null);
    const [addingIndicatorForStatement, setAddingIndicatorForStatement] = useState<number | null>(null);
    const [projectIndicators, setProjectIndicators] = useState<{id: number; name: string; linked_corporate_indicator_name?: string | null}[]>([]);
    
    const [formError, setFormError] = useState<string | null>(null);
    const [deletingItem, setDeletingItem] = useState<any>(null);

    const [showIndicatorDetails, setShowIndicatorDetails] = useState(true);
    const [showAggregatedView, setShowAggregatedView] = useState(false);
    const router = useRouter();

    useEffect(() => {
        console.log('showIndicatorDetails:', showIndicatorDetails);
        console.log('showAggregatedView:', showAggregatedView);
    }, [showIndicatorDetails, showAggregatedView]);

    useEffect(() => {
        const fetchProjectIndicators = async () => {
            try {
                const res = await api.get("/projects/project-indicators/");
                setProjectIndicators(res.data);
            } catch (error) {
                console.error("Failed to fetch project indicators:", error);
            }
        };
        fetchProjectIndicators();
    }, []);

    useEffect(() => {
        const fetchFullPlanData = async () => {
            if (!plan?.id) return;
            
            try {
                const response = await api.get(`/strategic/strategic-plan/${plan.id}/`);
                
                const updatedPlan = {
                    ...response.data,
                    strategicObjectives: response.data.strategicObjectives?.map((objective: any) => ({
                        ...objective,
                        statements: objective.statements?.map((statement: any) => ({
                            ...statement,
                            corporateIndicators: statement.corporateIndicators || []
                        })) || []
                    })) || [],
                    years: response.data.years || []
                };
                
                setPlan(updatedPlan);
            } catch (error) {
                console.error('Error fetching full plan data:', error);
            }
        };
        
        if (plan?.id && (!plan.strategicObjectives || plan.strategicObjectives.length === 0)) {
            fetchFullPlanData();
        }
    }, [plan?.id]);

    const toggleObjective = (id: string) => {
        setOpenObjectives(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleStatement = (id: string) => {
        setOpenStatements(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleIndicator = (id: string) => {
        setOpenIndicators(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSaveIndicator = async (value: {
        name: string;
        description?: string;
        project_indicator?: any;
        statements?: number[];
    }) => {
        try {
            if (!addingIndicatorForStatement && (!value.statements || value.statements.length === 0)) {
                alert("Please select at least one statement for this indicator.");
                return;
            }

            const statementIds = value.statements || [addingIndicatorForStatement].filter(Boolean);

            let updatedIndicator;
            
            if (editingIndicator) {
                const indicatorId = editingIndicator.id;
                const res = await api.put(`/strategic/indicators/${indicatorId}/`, {
                    name: value.name,
                    description: value.description,
                    statement_ids: statementIds,
                });
                updatedIndicator = res.data;
            } else {
                const res = await api.post(`/strategic/indicators/`, {
                    name: value.name,
                    description: value.description,
                    statement_ids: statementIds,
                });
                updatedIndicator = res.data;
            }

            if (value.project_indicator?.id) {
                await api.patch(`/projects/project-indicators/${value.project_indicator.id}/`, {
                    corporate_indicator: updatedIndicator.id,
                });
            }

            setPlan((prevPlan: any) => ({
                ...prevPlan,
                strategicObjectives: prevPlan.strategicObjectives.map((obj: any) => {
                    const updatedStatements = obj.statements?.map((stmt: any) => {
                        if (statementIds.includes(stmt.id)) {
                            const existingIndicators = stmt.corporateIndicators || [];
                            const existingIndex = existingIndicators.findIndex((ind: any) => ind.id === updatedIndicator.id);
                            
                            if (existingIndex === -1) {
                                return {
                                    ...stmt,
                                    corporateIndicators: [...existingIndicators, updatedIndicator]
                                };
                            } else {
                                const updatedIndicators = [...existingIndicators];
                                updatedIndicators[existingIndex] = updatedIndicator;
                                return {
                                    ...stmt,
                                    corporateIndicators: updatedIndicators
                                };
                            }
                        }
                        return stmt;
                    }) || [];
                    
                    return {
                        ...obj,
                        statements: updatedStatements
                    };
                })
            }));

            setEditingIndicator(null);
            setAddingIndicatorForStatement(null);
        } catch (error: any) {
            console.error('Error saving indicator:', error);
            setFormError(error.response?.data?.detail || "Failed to save indicator.");
        }
    };

    const handleDeleteIndicator = async (indicatorId: string) => {
        try {
            await api.delete(`/strategic/indicators/${indicatorId}/`);
            
            setPlan((prevPlan: any) => ({
                ...prevPlan,
                strategicObjectives: prevPlan.strategicObjectives.map((obj: any) => ({
                    ...obj,
                    statements: obj.statements?.map((stmt: any) => ({
                        ...stmt,
                        corporateIndicators: stmt.corporateIndicators?.filter((ind: any) => ind.id !== indicatorId)
                    }))
                }))
            }));
        } catch (error) {
            console.error('Error deleting indicator:', error);
        }
    };

    const getObjectiveStatements = () => {
        const allStatements: any[] = [];
        plan.strategicObjectives?.forEach((objective: any) => {
            objective.statements?.forEach((statement: any) => {
                allStatements.push({
                    ...statement,
                    objective: {
                        id: objective.id,
                        name: objective.name,
                        number: objective.number
                    }
                });
            });
        });
        return allStatements;
    };

    const handleSaveObjective = async (objectiveToSave: any) => {
        try {
            setFormError(null);

            const isEditing = Boolean(objectiveToSave.id);
            const url = isEditing
                ? `/strategic/strategic-objectives/${objectiveToSave.id}/`
                : `/strategic/strategic-objectives/`;

            const payload = {
                plan: plan.id,
                name: objectiveToSave.name,
                description: objectiveToSave.description,
                number: isEditing
                    ? objectiveToSave.number
                    : `SO${plan.strategicObjectives.length + 1}`,
            };

            const response = isEditing
                ? await api.put(url, payload)
                : await api.post(url, payload);

            const savedObjective = {
                ...response.data,
                statements: isEditing ? objectiveToSave.statements : []
            };

            setPlan((prevPlan: any) => ({
                ...prevPlan,
                strategicObjectives: isEditing
                    ? prevPlan.strategicObjectives.map((obj: any) =>
                        obj.id === savedObjective.id ? savedObjective : obj
                    )
                    : [...prevPlan.strategicObjectives, savedObjective],
            }));

            setEditingObjective(null);
        } catch (error: any) {
            if (error.response?.data) {
                const firstError = Object.values(error.response.data)[0];
                setFormError(Array.isArray(firstError) ? firstError[0] : firstError);
            } else {
                setFormError("Failed to save strategic objective.");
            }
        }
    };

    const handleSaveStatement = async (statementToSave: any, objectiveId?: string) => {
        try {
            const isEditing = Boolean(statementToSave.id);
            
            if (!isEditing && !objectiveId) {
            throw new Error('Objective ID is required for new statements');
            }

            const url = isEditing
            ? `/strategic/statements/${statementToSave.id}/`
            : `/strategic/statements/`;
            
            const payload = isEditing
            ? {
                text: statementToSave.text,
                }
            : {
                objective: objectiveId,
                text: statementToSave.text,
                };

            const response = isEditing
            ? await api.put(url, payload)
            : await api.post(url, payload);

            setPlan((prevPlan: any) => ({
            ...prevPlan,
            strategicObjectives: prevPlan.strategicObjectives.map((obj: any) => {
                if (isEditing) {
                const hasStatement = obj.statements?.some((stmt: any) => 
                    stmt.id === statementToSave.id
                );
                
                if (!hasStatement) return obj;
                
                return {
                    ...obj,
                    statements: obj.statements.map((stmt: any) =>
                    stmt.id === statementToSave.id ? response.data : stmt
                    )
                };
                } else {
                if (obj.id !== objectiveId) return obj;
                
                return {
                    ...obj,
                    statements: [...(obj.statements || []), response.data]
                };
                }
            }),
            }));

            setEditingStatement(null);
            setAddingStatementForObjective(null);
        } catch (error: any) {
            console.error('Error saving statement:', error);
            setFormError(error.response?.data?.text?.[0] || "Failed to save statement.");
        }
    };

    const handleSaveYear = async (yearToSave: any) => {
        try {
            const isEditing = Boolean(yearToSave.id);
            const url = isEditing
                ? `/strategic/plan-years/${yearToSave.id}/`
                : `/strategic/plan-years/`;

            const payload = {
                plan: plan.id,
                year: yearToSave.year,
            };

            const response = isEditing
                ? await api.put(url, payload)
                : await api.post(url, payload);

            setPlan((prevPlan: any) => ({
                ...prevPlan,
                years: isEditing
                    ? prevPlan.years.map((y: any) => y.id === response.data.id ? response.data : y)
                    : [...(prevPlan.years || []), response.data]
            }));

            setEditingYear(null);
        } catch (error: any) {
            console.error('Error saving plan year:', error);
        }
    };

    const handleSavePerformance = async (performanceToSave: any, indicator: any) => {
        try {
            const isEditing = Boolean(performanceToSave.id);
            const url = isEditing
                ? `/strategic/corporate-indicator-performances/${performanceToSave.id}/`
                : `/strategic/corporate-indicator-performances/`;

            const payload = {
                indicator: indicator.id,
                year: performanceToSave.year,
                target: performanceToSave.target,
                actual: performanceToSave.actual,
                comments: performanceToSave.comments,
            };

            const response = isEditing
                ? await api.put(url, payload)
                : await api.post(url, payload);

            setPlan((prevPlan: any) => ({
                ...prevPlan,
                strategicObjectives: prevPlan.strategicObjectives.map((obj: any) => {
                    const hasIndicator = obj.statements?.some((stmt: any) => 
                        stmt.corporateIndicators?.some((ind: any) => ind.id === indicator.id)
                    );
                    
                    if (!hasIndicator) return obj;

                    return {
                        ...obj,
                        statements: obj.statements.map((stmt: any) => {
                            const indicatorIndex = stmt.corporateIndicators?.findIndex((ind: any) => ind.id === indicator.id);
                            if (indicatorIndex === -1 || indicatorIndex === undefined) return stmt;

                            const updatedIndicators = [...stmt.corporateIndicators];
                            const indicatorToUpdate = { ...updatedIndicators[indicatorIndex] };
                            
                            const performances = indicatorToUpdate.performances || [];
                            const updatedPerformances = isEditing
                                ? performances.map((p: any) => p.id === response.data.id ? response.data : p)
                                : [...performances, response.data];
                            
                            indicatorToUpdate.performances = updatedPerformances;
                            updatedIndicators[indicatorIndex] = indicatorToUpdate;

                            return {
                                ...stmt,
                                corporateIndicators: updatedIndicators
                            };
                        })
                    };
                }),
            }));

            setEditingPerformance(null);
        } catch (error: any) {
            console.error('Error saving performance:', error);
        }
    };

    const getPerformanceForIndicator = (indicator: any, year: any) => {
        return indicator.performances?.find((p: any) => {
            if (p.year === year.id) return true;
            if (p.year_detail?.id === year.id) return true;
            if (p.year && typeof p.year === 'object' && p.year.id === year.id) return true;
            return false;
        });
    };

    const calculateObjectivePerformance = (objective: any, year: any) => {
        if (!objective.statements || objective.statements.length === 0) {
            return null;
        }

        let totalActual = 0;
        let totalTarget = 0;
        let indicatorsWithData = 0;
        let totalIndicators = 0;

        objective.statements.forEach((statement: any) => {
            statement.corporateIndicators?.forEach((indicator: any) => {
                totalIndicators++;
                const performance = getPerformanceForIndicator(indicator, year);
                if (performance) {
                    totalActual += parseFloat(performance.actual) || 0;
                    totalTarget += parseFloat(performance.target) || 0;
                    indicatorsWithData++;
                }
            });
        });

        if (indicatorsWithData === 0) return null;

        return {
            actual: totalActual,
            target: totalTarget,
            percentage: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0,
            totalIndicators,
            indicatorsWithData
        };
    };

    const calculateStatementPerformance = (statement: any, year: any) => {
        if (!statement.corporateIndicators || statement.corporateIndicators.length === 0) {
            return null;
        }

        let totalActual = 0;
        let totalTarget = 0;
        let indicatorsWithData = 0;

        statement.corporateIndicators.forEach((indicator: any) => {
            const performance = getPerformanceForIndicator(indicator, year);
            if (performance) {
                totalActual += parseFloat(performance.actual) || 0;
                totalTarget += parseFloat(performance.target) || 0;
                indicatorsWithData++;
            }
        });

        if (indicatorsWithData === 0) return null;

        return {
            actual: totalActual,
            target: totalTarget,
            percentage: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0,
            indicatorsCount: statement.corporateIndicators.length,
            indicatorsWithData
        };
    };

    const calculatePercentage = (actual: number, target: number) => {
        if (target === 0) return 0;
        return (actual / target) * 100;
    };

    const getPerformanceColor = (actual: number, target: number) => {
        const percentage = calculatePercentage(actual, target);
        if (percentage >= 100) return 'text-green-600';
        if (percentage >= 80) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const formatNumber = (num: number) => {
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;

        const { type, id, parentId, objectiveId } = deletingItem;

        try {
            if (type === 'objective') {
                await api.delete(`/strategic/strategic-objectives/${id}/`);
                setPlan((prevPlan: any) => ({
                    ...prevPlan,
                    strategicObjectives: prevPlan.strategicObjectives.filter((so: any) => so.id !== id),
                }));
            } else if (type === 'year') {
                await api.delete(`/strategic/plan-years/${id}/`);
                setPlan((prevPlan: any) => ({
                    ...prevPlan,
                    years: prevPlan.years.filter((y: any) => y.id !== id),
                }));
            } else if (type === 'performance') {
                await api.delete(`/strategic/corporate-indicator-performances/${id}/`);
                setPlan((prevPlan: any) => ({
                    ...prevPlan,
                    strategicObjectives: prevPlan.strategicObjectives.map((obj: any) => {
                        return {
                            ...obj,
                            statements: obj.statements?.map((stmt: any) => ({
                                ...stmt,
                                corporateIndicators: stmt.corporateIndicators?.map((ind: any) => ({
                                    ...ind,
                                    performances: ind.performances?.filter((p: any) => p.id !== id)
                                }))
                            }))
                        };
                    }),
                }));
            } else if (type === 'indicator') {
                await api.delete(`/strategic/indicators/${id}/`);
                setPlan((prevPlan: any) => ({
                    ...prevPlan,
                    strategicObjectives: prevPlan.strategicObjectives.map((obj: any) => ({
                        ...obj,
                        statements: obj.statements?.map((stmt: any) => ({
                            ...stmt,
                            corporateIndicators: stmt.corporateIndicators?.filter((ind: any) => ind.id !== id)
                        }))
                    }))
                }));
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        } finally {
            setDeletingItem(null);
        }
    };

    const AddStatementModal = () => {
    return (
        <StrategicStatementEditor
        statement={null}
        isOpen={!!addingStatementForObjective}
        onClose={() => setAddingStatementForObjective(null)}
        onSave={(statementData) => {
            if (addingStatementForObjective) {
            handleSaveStatement(statementData, addingStatementForObjective);
            }
        }}
        formError={formError}
        />
    );
    };

    return (
        <>
            <Card className="border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <FolderTree className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle>Strategic Performance Framework</CardTitle>
                            </div>
                            <CardDescription className="flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Track performance through objectives, statements, and indicators
                            </CardDescription>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="show-indicators"
                                        checked={showIndicatorDetails}
                                        onCheckedChange={setShowIndicatorDetails}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="show-indicators" className="flex items-center gap-2 text-sm cursor-pointer">
                                        {showIndicatorDetails ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        Indicators
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="aggregated-view"
                                        checked={showAggregatedView}
                                        onCheckedChange={setShowAggregatedView}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="aggregated-view" className="flex items-center gap-2 text-sm cursor-pointer">
                                        <BarChart3 className="h-4 w-4" />
                                        Aggregated
                                    </Label>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingYear({})} className="gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Add Year
                                </Button>
                                <Button size="sm" onClick={() => setEditingObjective({})} className="gap-1">
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    Add Objective
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                
                <Separator />
                
                <CardContent className="pt-6">
                    {/* Plan Years Header */}
                    {plan.years && plan.years.length > 0 && (
                        <div className="mb-6 p-3 bg-muted/20 rounded-lg border">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-medium">Plan Years</h3>
                                </div>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {plan.years.length} year{plan.years.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {plan.years.map((year: any) => (
                                    <TooltipProvider key={year.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="px-2.5 py-1 hover:bg-secondary/80 transition-colors cursor-pointer gap-1">
                                                    <Hash className="h-2.5 w-2.5" />
                                                    {year.year}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-4 w-4 ml-1 p-0 hover:bg-transparent hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingItem({
                                                                type: 'year',
                                                                id: year.id,
                                                                name: year.year,
                                                            });
                                                        }}
                                                    >
                                                        ×
                                                    </Button>
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">Click to delete year {year.year}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary Stats */}
                    {plan.strategicObjectives.length > 0 && plan.years && plan.years.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-medium">Overview</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-blue-700">Objectives</p>
                                            <p className="text-lg font-bold text-blue-900">{plan.strategicObjectives.length}</p>
                                        </div>
                                        <Target className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-green-700">Statements</p>
                                            <p className="text-lg font-bold text-green-900">
                                                {plan.strategicObjectives.reduce((acc: number, obj: any) => 
                                                    acc + (obj.statements?.length || 0), 0
                                                )}
                                            </p>
                                        </div>
                                        <MessageSquare className="h-5 w-5 text-green-600" />
                                    </div>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-orange-700">Indicators</p>
                                            <p className="text-lg font-bold text-orange-900">
                                                {plan.strategicObjectives.reduce((acc: number, obj: any) => 
                                                    acc + (obj.statements?.reduce((stmtAcc: number, stmt: any) => 
                                                        stmtAcc + (stmt.corporateIndicators?.length || 0), 0
                                                    ) || 0), 0
                                                )}
                                            </p>
                                        </div>
                                        <Gauge className="h-5 w-5 text-orange-600" />
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-purple-700">Data Points</p>
                                            <p className="text-lg font-bold text-purple-900">
                                                {plan.strategicObjectives.reduce((acc: number, obj: any) => 
                                                    acc + (obj.statements?.reduce((stmtAcc: number, stmt: any) => 
                                                        stmtAcc + (stmt.corporateIndicators?.reduce((indAcc: number, ind: any) => 
                                                            indAcc + (ind.performances?.length || 0), 0
                                                        ) || 0), 0
                                                    ) || 0), 0
                                                )}
                                            </p>
                                        </div>
                                        <TrendingUp className="h-5 w-5 text-purple-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Objectives Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="min-w-fit">
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="w-[320px] py-3">
                                            <div className="flex items-center gap-2">
                                                <FolderTree className="h-4 w-4" />
                                                <span>Strategic Framework</span>
                                            </div>
                                        </TableHead>
                                        {plan.years?.map((year: any) => (
                                            <TableHead key={year.id} className="text-center py-3">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-semibold">{year.year}</span>
                                                    <span className="text-xs text-muted-foreground">Performance</span>
                                                </div>
                                            </TableHead>
                                        )) || []}
                                        <TableHead className="text-right py-3 w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plan.strategicObjectives.map((objective: any) => {
                                        const aggregatedPerformance = plan.years?.map((year: any) => 
                                            calculateObjectivePerformance(objective, year)
                                        ) || [];
                                        
                                        return (
                                            <React.Fragment key={objective.id}>
                                                {/* Objective Row */}
                                                <TableRow className="border-b hover:bg-muted/20 group">
                                                    <TableCell className="py-3">
                                                        <div className="flex items-start gap-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 mt-0.5 flex-shrink-0" 
                                                                onClick={() => toggleObjective(objective.id)}
                                                            >
                                                                {openObjectives.includes(objective.id) ? 
                                                                    <ChevronDown className="h-4 w-4" /> : 
                                                                    <ChevronRight className="h-4 w-4" />
                                                                }
                                                            </Button>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                                        {objective.number}
                                                                    </Badge>
                                                                    <span className="font-semibold text-sm truncate">{objective.name}</span>
                                                                </div>
                                                                {objective.description && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                                        {objective.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {objective.statements?.length || 0} statements
                                                                    </Badge>
                                                                    {objective.statements?.reduce((acc: number, stmt: any) => 
                                                                        acc + (stmt.corporateIndicators?.length || 0), 0
                                                                    ) > 0 && (
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {objective.statements?.reduce((acc: number, stmt: any) => 
                                                                                acc + (stmt.corporateIndicators?.length || 0), 0
                                                                            )} indicators
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    
                                                    {plan.years?.map((year: any, index: number) => {
                                                        const performance = aggregatedPerformance[index];
                                                        
                                                        return (
                                                            <TableCell key={year.id} className="text-center align-top py-3">
                                                                {performance ? (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="cursor-pointer space-y-1.5">
                                                                                    <div className={`text-base font-bold ${getPerformanceColor(performance.actual, performance.target)}`}>
                                                                                        {performance.percentage.toFixed(0)}%
                                                                                    </div>
                                                                                    <div>
                                                                                        <Progress 
                                                                                            value={Math.min(performance.percentage, 100)} 
                                                                                            className="h-1.5"
                                                                                            indicatorClassName={getProgressColor(performance.percentage)}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {performance.indicatorsWithData}/{performance.totalIndicators} ind.
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="w-64 p-3">
                                                                                <div className="space-y-2">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="font-medium">Aggregated:</span>
                                                                                        <span className={`font-bold ${getPerformanceColor(performance.actual, performance.target)}`}>
                                                                                            {performance.percentage.toFixed(1)}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                                                        <div className="space-y-1">
                                                                                            <div className="flex justify-between">
                                                                                                <span>Target:</span>
                                                                                                <span className="font-medium">{formatNumber(performance.target)}</span>
                                                                                            </div>
                                                                                            <div className="flex justify-between">
                                                                                                <span>Actual:</span>
                                                                                                <span className="font-medium">{formatNumber(performance.actual)}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="space-y-1">
                                                                                            <div className="flex justify-between">
                                                                                                <span>Indicators:</span>
                                                                                                <span className="font-medium">{performance.indicatorsWithData}/{performance.totalIndicators}</span>
                                                                                            </div>
                                                                                            <div className="flex justify-between">
                                                                                                <span>Average:</span>
                                                                                                <span className="font-medium">
                                                                                                    {performance.indicatorsWithData > 0 ? 
                                                                                                        formatNumber(performance.actual / performance.indicatorsWithData) : 0}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                ) : (
                                                                    <div className="text-muted-foreground">
                                                                        <div className="text-sm">No data</div>
                                                                        <div className="text-xs mt-1">
                                                                            {objective.statements?.reduce((acc: number, stmt: any) => 
                                                                                acc + (stmt.corporateIndicators?.length || 0), 0
                                                                            ) || 0} ind.
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    
                                                    <TableCell className="py-3">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="sm" onClick={() => setEditingObjective(objective)} className="h-7 w-7 p-0">
                                                                <Edit className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setDeletingItem({
                                                                        type: 'objective',
                                                                        name: objective.name,
                                                                        id: objective.id,
                                                                    })
                                                                }
                                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Aggregated View Message */}
                                                {openObjectives.includes(objective.id) && showAggregatedView && (
                                                    <TableRow className="bg-muted/10">
                                                        <TableCell colSpan={(plan.years?.length || 0) + 2} className="pl-12 py-3 text-center text-muted-foreground text-sm">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <BarChart3 className="h-4 w-4" />
                                                                <span>Aggregated view enabled - statements and indicators are hidden</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}

                                                {/* Statement Rows */}
                                                {openObjectives.includes(objective.id) && !showAggregatedView && objective.statements?.map((statement: any) => {
                                                    const statementPerformance = plan.years?.map((year: any) => 
                                                        calculateStatementPerformance(statement, year)
                                                    ) || [];
                                                    
                                                    return (
                                                        <React.Fragment key={statement.id}>
                                                            <TableRow className="hover:bg-green-50/20 border-t border-green-100/30">
                                                                <TableCell className="pl-12 py-2.5">
                                                                    <div className="flex items-start gap-2">
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-5 w-5 mt-0.5 flex-shrink-0"
                                                                            onClick={() => toggleStatement(statement.id)}
                                                                        >
                                                                            {openStatements.includes(statement.id) ? 
                                                                                <ChevronDown className="h-3 w-3" /> : 
                                                                                <ChevronRight className="h-3 w-3" />
                                                                            }
                                                                        </Button>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <div className="p-1 rounded bg-green-100">
                                                                                    <MessageSquare className="h-3 w-3 text-green-600" />
                                                                                </div>
                                                                                <span className="text-sm font-medium">Statement</span>
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    {statement.corporateIndicators?.length || 0} ind.
                                                                                </Badge>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-5 w-5 p-0 ml-auto"
                                                                                    onClick={() => {
                                                                                        setAddingIndicatorForStatement(statement.id);
                                                                                        setEditingIndicator(null);
                                                                                    }}
                                                                                    title="Add indicator"
                                                                                    disabled={!showIndicatorDetails}
                                                                                >
                                                                                    <PlusCircle className="h-2.5 w-2.5" />
                                                                                </Button>
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                                {statement.text}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                
                                                                {/* Statement Performance Cells */}
                                                                {plan.years?.map((year: any, index: number) => {
                                                                    const performance = statementPerformance[index];
                                                                    
                                                                    return (
                                                                        <TableCell key={year.id} className="text-center py-2.5">
                                                                            {performance ? (
                                                                                <div className="space-y-1">
                                                                                    <div className={`text-sm font-medium ${getPerformanceColor(performance.actual, performance.target)}`}>
                                                                                        {performance.percentage.toFixed(0)}%
                                                                                    </div>
                                                                                    <Progress 
                                                                                        value={Math.min(performance.percentage, 100)} 
                                                                                        className="h-1"
                                                                                        indicatorClassName={getProgressColor(performance.percentage)}
                                                                                    />
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        ({performance.indicatorsWithData}/{performance.indicatorsCount})
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-muted-foreground">
                                                                                    <div className="text-xs">No data</div>
                                                                                    <div className="text-xs">
                                                                                        {statement.corporateIndicators?.length || 0} ind.
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                                
                                                                <TableCell className="py-2.5">
                                                                    <div className="flex justify-end">
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 w-6 p-0"
                                                                                        onClick={() => {
                                                                                            setEditingStatement(statement);
                                                                                        }}
                                                                                    >
                                                                                        <Edit className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p className="text-xs">Edit statement</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>

                                                            {/* Indicator Rows */}
                                                            {openStatements.includes(statement.id) && showIndicatorDetails && statement.corporateIndicators?.map((indicator: any) => (
                                                                <React.Fragment key={indicator.id}>
                                                                    <TableRow className="hover:bg-blue-50/10 border-t border-blue-100/20">
                                                                        <TableCell className="pl-20 py-2">
                                                                            <div className="flex items-start gap-2">
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="icon" 
                                                                                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                                                                                    onClick={() => toggleIndicator(indicator.id)}
                                                                                >
                                                                                    {openIndicators.includes(indicator.id) ? 
                                                                                        <ChevronDown className="h-3 w-3" /> : 
                                                                                        <ChevronRight className="h-3 w-3" />
                                                                                    }
                                                                                </Button>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="flex items-center gap-2 mb-0.5">
                                                                                        <div className="p-1 rounded bg-blue-100">
                                                                                            <Gauge className="h-3 w-3 text-blue-600" />
                                                                                        </div>
                                                                                        <span className="text-sm font-medium truncate">{indicator.name}</span>
                                                                                        <div className="flex gap-0.5 ml-auto">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-5 w-5 p-0"
                                                                                                onClick={() => {
                                                                                                    setEditingIndicator(indicator);
                                                                                                    setAddingIndicatorForStatement(null);
                                                                                                }}
                                                                                                title="Edit"
                                                                                            >
                                                                                                <Edit className="h-2.5 w-2.5" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-5 w-5 p-0"
                                                                                                onClick={() => setDeletingItem({
                                                                                                    type: 'indicator',
                                                                                                    name: indicator.name,
                                                                                                    id: indicator.id,
                                                                                                })}
                                                                                                title="Delete"
                                                                                            >
                                                                                                <Trash2 className="h-2.5 w-2.5 text-red-500" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                    {indicator.description && (
                                                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                                                            {indicator.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        
                                                                        {/* Indicator Performance Cells */}
                                                                        {plan.years?.map((year: any) => {
                                                                            const performance = getPerformanceForIndicator(indicator, year);
                                                                            const percentage = performance ? calculatePercentage(
                                                                                parseFloat(performance.actual), 
                                                                                parseFloat(performance.target)
                                                                            ) : 0;
                                                                            
                                                                            return (
                                                                                <TableCell key={year.id} className="text-center py-2">
                                                                                    {performance ? (
                                                                                        <div className="space-y-1">
                                                                                            <div className={`text-sm font-medium ${getPerformanceColor(
                                                                                                parseFloat(performance.actual), 
                                                                                                parseFloat(performance.target)
                                                                                            )}`}>
                                                                                                {percentage.toFixed(0)}%
                                                                                            </div>
                                                                                            <Progress 
                                                                                                value={Math.min(percentage, 100)} 
                                                                                                className="h-1"
                                                                                                indicatorClassName={getProgressColor(percentage)}
                                                                                            />
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-5 text-xs mt-0.5"
                                                                                                onClick={() => setEditingPerformance({
                                                                                                    ...performance,
                                                                                                    indicator: indicator.id,
                                                                                                    year: year.id
                                                                                                })}
                                                                                            >
                                                                                                Edit
                                                                                            </Button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="border-dashed text-xs h-7 w-full"
                                                                                            onClick={() => setEditingPerformance({
                                                                                                indicator: indicator.id,
                                                                                                year: year.id,
                                                                                                target: 0,
                                                                                                actual: 0,
                                                                                            })}
                                                                                        >
                                                                                            Add Data
                                                                                        </Button>
                                                                                    )}
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                        
                                                                        <TableCell className="py-2">
                                                                            <div className="flex justify-end">
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-6 w-6 p-0"
                                                                                                onClick={() => {
                                                                                                    if (plan.years && plan.years.length > 0) {
                                                                                                        setEditingPerformance({
                                                                                                            indicator: indicator.id,
                                                                                                            year: plan.years[0].id,
                                                                                                            target: 0,
                                                                                                            actual: 0,
                                                                                                        });
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <PlusCircle className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p className="text-xs">Quick add performance</p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    
                                                                    {/* Indicator Details Row */}
                                                                    {openIndicators.includes(indicator.id) && showIndicatorDetails && (
                                                                        <TableRow className="bg-blue-50/20 border-t border-blue-100/30">
                                                                            <TableCell colSpan={(plan.years?.length || 0) + 2} className="pl-24 pr-4 py-3">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                    <div>
                                                                                        <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                                                                                            <Gauge className="h-3.5 w-3.5" />
                                                                                            Indicator Details
                                                                                        </h4>
                                                                                        <div className="space-y-1.5 text-sm">
                                                                                            <p><span className="font-medium">Name:</span> {indicator.name}</p>
                                                                                            {indicator.description && (
                                                                                                <p><span className="font-medium">Description:</span> {indicator.description}</p>
                                                                                            )}
                                                                                            <p>
                                                                                                <span className="font-medium">Disaggregators:</span>{" "}
                                                                                                {indicator.disaggregators?.length > 0 ? (
                                                                                                    <span className="text-muted-foreground">
                                                                                                        {indicator.disaggregators.map((d: any) => 
                                                                                                            typeof d === 'string' ? d : d.name
                                                                                                        ).join(', ')}
                                                                                                    </span>
                                                                                                ) : (
                                                                                                    <span className="text-muted-foreground italic">None</span>
                                                                                                )}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <h4 className="text-xs font-semibold mb-2">Performance by Year</h4>
                                                                                        {plan.years && plan.years.length > 0 ? (
                                                                                            <div className="space-y-1.5">
                                                                                                {plan.years.map((year: any) => {
                                                                                                    const perf = getPerformanceForIndicator(indicator, year);
                                                                                                    return perf ? (
                                                                                                        <div key={year.id} className="flex justify-between items-center text-sm p-1.5 bg-white rounded border">
                                                                                                            <span className="font-medium">{year.year}:</span>
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <span className={getPerformanceColor(
                                                                                                                    parseFloat(perf.actual),
                                                                                                                    parseFloat(perf.target)
                                                                                                                )}>
                                                                                                                    {calculatePercentage(
                                                                                                                        parseFloat(perf.actual),
                                                                                                                        parseFloat(perf.target)
                                                                                                                    ).toFixed(1)}%
                                                                                                                </span>
                                                                                                                <Button
                                                                                                                    variant="ghost"
                                                                                                                    size="sm"
                                                                                                                    className="h-5 w-5"
                                                                                                                    onClick={() => setEditingPerformance({
                                                                                                                        ...perf,
                                                                                                                        indicator: indicator.id,
                                                                                                                        year: year.id
                                                                                                                    })}
                                                                                                                >
                                                                                                                    <Edit className="h-2.5 w-2.5" />
                                                                                                                </Button>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ) : null;
                                                                                                }).filter(Boolean)}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <p className="text-sm text-muted-foreground">No plan years defined</p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}
                                                                </React.Fragment>
                                                            ))}
                                                            
                                                            {/* "No Indicators" Message for Statement */}
                                                            {openStatements.includes(statement.id) && showIndicatorDetails && 
                                                            (!statement.corporateIndicators || statement.corporateIndicators.length === 0) && (
                                                                <TableRow>
                                                                    <TableCell colSpan={(plan.years?.length || 0) + 2} className="pl-20 py-4 text-center">
                                                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                                            <Gauge className="h-6 w-6 mb-1 opacity-50" />
                                                                            <p className="text-sm font-medium">No indicators for this statement</p>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="mt-2 h-7 text-xs"
                                                                                onClick={() => {
                                                                                    setAddingIndicatorForStatement(statement.id);
                                                                                    setEditingIndicator(null);
                                                                                }}
                                                                            >
                                                                                <PlusCircle className="mr-1 h-3 w-3" />
                                                                                Add Indicator
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                                
                                                {/* "No Statements" empty-state — only when there are none */}
                                                {openObjectives.includes(objective.id) && !showAggregatedView &&
                                                (!objective.statements || objective.statements.length === 0) && (
                                                    <TableRow>
                                                        <TableCell colSpan={(plan.years?.length || 0) + 2} className="pl-12 py-4 text-center">
                                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                                <MessageSquare className="h-6 w-6 mb-1 opacity-50" />
                                                                <p className="text-sm font-medium">No statements for this objective</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}

                                                {/* "+ Add Statement" — always visible when objective is expanded */}
                                                {openObjectives.includes(objective.id) && !showAggregatedView && (
                                                    <TableRow className="hover:bg-orange-50/30 transition-colors">
                                                        <TableCell colSpan={(plan.years?.length || 0) + 2} className="pl-12 py-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs text-orange-700 hover:text-orange-800 hover:bg-orange-100 gap-1"
                                                                onClick={() => setAddingStatementForObjective(objective.id)}
                                                            >
                                                                <PlusCircle className="h-3 w-3" />
                                                                Add Statement
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {plan.strategicObjectives.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="mx-auto w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                                        <Target className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">No strategic objectives yet</h3>
                                    <p className="text-muted-foreground mb-4 max-w-sm mx-auto text-sm">
                                        Start by adding your strategic objectives, then add statements and indicators to track performance.
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingYear({})}
                                            className="h-9"
                                        >
                                            <Calendar className="mr-2 h-3.5 w-3.5" />
                                            Add Years First
                                        </Button>
                                        <Button 
                                            size="sm"
                                            onClick={() => setEditingObjective({})}
                                            className="h-9"
                                        >
                                            <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                            Add Objective
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Editor Modals */}
            {editingObjective !== null && (
                <StrategicObjectiveEditor
                    objective={editingObjective}
                    isOpen={editingObjective !== null}
                    onClose={() => setEditingObjective(null)}
                    onSave={handleSaveObjective}
                    formError={formError}
                />
            )}

            {editingYear !== null && (
                <StrategicPlanYearEditor
                    year={editingYear}
                    isOpen={editingYear !== null}
                    onClose={() => setEditingYear(null)}
                    onSave={handleSaveYear}
                />
            )}

            {editingPerformance !== null && (
                <ObjectivePerformanceEditor
                    performance={editingPerformance}
                    planYears={plan.years || []}
                    isOpen={editingPerformance !== null}
                    onClose={() => setEditingPerformance(null)}
                    onSave={(performance: any) => {
                        const indicator = plan.strategicObjectives.reduce((found: any, obj: any) => {
                            if (found) return found;
                            return obj.statements?.reduce((stmtFound: any, stmt: any) => {
                                if (stmtFound) return stmtFound;
                                return stmt.corporateIndicators?.find((ind: any) => ind.id === editingPerformance.indicator);
                            }, null);
                        }, null);
                        
                        if (indicator) {
                            handleSavePerformance(performance, indicator);
                        }
                    }}
                />
            )}

            <AddStatementModal />

            {deletingItem && (
                <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
                    <AlertDialogContent className="max-w-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-sm">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                                This will permanently delete {deletingItem.type} "{deletingItem.name}". This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="h-9">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 h-9">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {editingStatement !== null && (
            <StrategicStatementEditor
                statement={editingStatement}
                isOpen={editingStatement !== null}
                onClose={() => setEditingStatement(null)}
                onSave={(statementData) => handleSaveStatement(statementData)}
                formError={formError}
            />
            )}
            {(editingIndicator !== null || addingIndicatorForStatement !== null) && (
                <IndicatorEditor
                    isOpen={editingIndicator !== null || addingIndicatorForStatement !== null}
                    indicator={editingIndicator}
                    projectIndicators={projectIndicators}
                    objectiveStatements={getObjectiveStatements()}
                    parentStatementId={addingIndicatorForStatement || undefined}
                    onClose={() => {
                        setEditingIndicator(null);
                        setAddingIndicatorForStatement(null);
                    }}
                    onSave={handleSaveIndicator}
                    title={editingIndicator ? "Edit Indicator" : "Add Corporate Indicator"}
                />
            )}
        </>
    );
}