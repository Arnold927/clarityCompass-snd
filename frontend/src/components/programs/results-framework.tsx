'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    PlusCircle, Edit, Trash2, ChevronDown, ChevronRight, Target, Link as LinkIcon, BarChart3,
    CalendarDays, Gauge, MessageSquare 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LinkObjectiveEditor } from './link-objective-editor';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ReportingQuarterSelector } from './reporting-quarter-selector';
import { IndicatorPerformanceEditor } from './indicator-performance-editor';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useAppPermissions } from '@/hooks/use-app-permissions';

export function ProgramResultsFramework({
    program,
    setProgram,
    strategicObjectives,
}: {
    program: any;
    setProgram: Function;
    strategicObjectives: any[];
}) {
    const [openObjectives, setOpenObjectives] = useState<string[]>([]);
    const [openOutcomes, setOpenOutcomes] = useState<string[]>([]);
    const [openIndicators, setOpenIndicators] = useState<string[]>([]);
    const [programOutcomes, setProgramOutcomes] = useState<any[]>([]);
    const [outcomeIndicators, setOutcomeIndicators] = useState<Record<string, any[]>>({});
    const [loadingOutcomes, setLoadingOutcomes] = useState(false);
    const [loadingIndicators, setLoadingIndicators] = useState<Record<string, boolean>>({});

    const [editingOutcome, setEditingOutcome] = useState<any>(null);
    const [editingIndicator, setEditingIndicator] = useState<any>(null);
    const [isLinkerOpen, setIsLinkerOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<any>(null);
    
    const [indicatorModalOpen, setIndicatorModalOpen] = useState(false);
    const [indicatorParent, setIndicatorParent] = useState<{ parent: any; type: "outcome" } | null>(null);

    const [selectedQuarter, setSelectedQuarter] = useState<any>(null);
    const [indicatorPerformances, setIndicatorPerformances] = useState<Record<string, any>>({});
    const [outcomePerformances, setOutcomePerformances] = useState<Record<string, any>>({});
    const [objectivePerformances, setObjectivePerformances] = useState<Record<string, any>>({});
    const [editingPerformance, setEditingPerformance] = useState<{
        indicator: any;
        performance: any | null;
    } | null>(null);
    const [editingOutcomePerformance, setEditingOutcomePerformance] = useState<{
        outcome: any;
        performance: any | null;
    } | null>(null);

    const currentQuarterRef = useRef<any>(null);
    const fetchInProgressRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const perms = useAppPermissions();
    const linkedObjectives: any[] = program?.linked_objectives ?? [];

    const getPerformanceColor = (actual: number, target: number) => {
        if (target === 0) return 'text-gray-600';
        const percentage = (actual / target) * 100;
        if (percentage >= 100) return 'text-green-600';
        if (percentage >= 75) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-green-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const formatNumber = (value: number) => {
        if (value === undefined || value === null) return '—';
        const num = Number(value);
        if (isNaN(num)) return '—';
        return num.toFixed(2).replace(/\.00$/, '');
    };

    useEffect(() => {
        if (program?.id) {
            fetchProgramOutcomes();
        }
    }, [program?.id]);

    const fetchIndicatorCounts = async (outcomes: any[]) => {
        try {
            const counts: Record<string, number> = {};
            
            await Promise.all(outcomes.map(async (outcome) => {
                try {
                    const response = await api.get(`/programs/program-outcome-indicators/?outcome=${outcome.id}&page_size=1`);
                    const data = response.data;
                    const count = data.count ?? (Array.isArray(data) ? data.length : 0);
                    counts[outcome.id] = count;
                } catch (error) {
                    console.error(`Failed to fetch indicator count for outcome ${outcome.id}:`, error);
                    counts[outcome.id] = 0;
                }
            }));
            
            setProgramOutcomes(prev => prev.map(outcome => ({
                ...outcome,
                indicator_count: counts[outcome.id] || 0
            })));
        } catch (error) {
            console.error('Failed to fetch indicator counts:', error);
        }
    };

    const fetchProgramOutcomes = async () => {
        try {
            setLoadingOutcomes(true);
            const response = await api.get(`/programs/program-outcomes/?program=${program.id}`);
            const data = response.data?.results || response.data || [];
            const outcomesArray = Array.isArray(data) ? data : [];
            setProgramOutcomes(outcomesArray);
            
            if (outcomesArray.length > 0) {
                await fetchIndicatorCounts(outcomesArray);
            }
        } catch (error) {
            console.error('Failed to fetch program outcomes:', error);
            toast.error('Failed to load program outcomes');
            setProgramOutcomes([]);
        } finally {
            setLoadingOutcomes(false);
        }
    };

    const fetchOutcomePerformance = async (outcomeId: string) => {
        if (!selectedQuarter) return null;
        
        try {
            const response = await api.get('/programs/program-outcome-performance/', {
                params: {
                    outcome: outcomeId,
                    quarter: selectedQuarter.id,
                },
            });
            const data = response.data?.results || response.data || [];
            const performance = data.length > 0 ? data[0] : null;
            
            return performance;
        } catch (error) {
            console.error(`Failed to fetch outcome performance:`, error);
            return null;
        }
    };

    const fetchOutcomeIndicators = async (outcomeId: string) => {
        try {
            setLoadingIndicators(prev => ({ ...prev, [outcomeId]: true }));
            const response = await api.get(`/programs/program-outcome-indicators/?outcome=${outcomeId}`);
            const data = response.data?.results || response.data || [];
            const indicators = Array.isArray(data) ? data : [];
            
            
            setOutcomeIndicators(prev => ({
                ...prev,
                [outcomeId]: indicators
            }));
            
            return indicators;
        } catch (error) {
            console.error(`Failed to fetch indicators for outcome ${outcomeId}:`, error);
            toast.error('Failed to load indicators');
            setOutcomeIndicators(prev => ({
                ...prev,
                [outcomeId]: []
            }));
            return [];
        } finally {
            setLoadingIndicators(prev => ({ ...prev, [outcomeId]: false }));
        }
    };

    useEffect(() => {
    if (selectedQuarter?.id) {        
        const quarterId = selectedQuarter.id;
        currentQuarterRef.current = quarterId;
        setIsLoading(true);
        
        const fetchInitialData = async () => {
        try {
            const response = await api.get('/programs/program-outcome-indicator-performance/', {
            params: {
                quarter: quarterId,
                page_size: 1000
            },
            });
            
            if (currentQuarterRef.current !== quarterId) return;
            
            const performances = response.data?.results || response.data || [];
            
            const performanceMap: Record<string, any> = {};
            performances.forEach((perf: any) => {
            if (perf && perf.indicator) {
                performanceMap[perf.indicator] = perf;
            }
            });
            
            setIndicatorPerformances(performanceMap);
        } catch (error) {
            console.error('Failed to fetch initial performances:', error);
        } finally {
            setIsLoading(false);
        }
        };
        
        fetchInitialData();
    }
    }, [selectedQuarter?.id]);

    useEffect(() => {
    if (programOutcomes.length > 0 && selectedQuarter?.id && Object.keys(indicatorPerformances).length === 0 && !isLoading) {
        const quarterId = selectedQuarter.id;
        
        const fetchMissingData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/programs/program-outcome-indicator-performance/', {
            params: {
                quarter: quarterId,
                page_size: 1000
            },
            });
            
            const performances = response.data?.results || response.data || [];
            const performanceMap: Record<string, any> = {};
            performances.forEach((perf: any) => {
            if (perf && perf.indicator) {
                performanceMap[perf.indicator] = perf;
            }
            });
            
            setIndicatorPerformances(performanceMap);
        } catch (error) {
            console.error('Failed to fetch missing performances:', error);
        } finally {
            setIsLoading(false);
        }
        };
        
        fetchMissingData();
    }
    }, [programOutcomes, selectedQuarter?.id, isLoading]);

    useEffect(() => {
        const fetchAllIndicators = async () => {
            if (programOutcomes.length === 0) return;
            const newOutcomeIndicators: Record<string, any[]> = {};
            
            await Promise.all(programOutcomes.map(async (outcome) => {
                try {
                    setLoadingIndicators(prev => ({ ...prev, [outcome.id]: true }));
                    const response = await api.get(`/programs/program-outcome-indicators/?outcome=${outcome.id}`);
                    const data = response.data?.results || response.data || [];
                    newOutcomeIndicators[outcome.id] = Array.isArray(data) ? data : [];
                    console.log(`Fetched ${newOutcomeIndicators[outcome.id].length} indicators for outcome ${outcome.id}`);
                } catch (error) {
                    console.error(`Failed to fetch indicators for outcome ${outcome.id}:`, error);
                    newOutcomeIndicators[outcome.id] = [];
                } finally {
                    setLoadingIndicators(prev => ({ ...prev, [outcome.id]: false }));
                }
            }));
            
            setOutcomeIndicators(newOutcomeIndicators);
        };
        
        fetchAllIndicators();
    }, [programOutcomes]);

    useEffect(() => {
    if (!selectedQuarter?.id) return;
    
    const quarterId = selectedQuarter.id;
    currentQuarterRef.current = quarterId;
    
    setIsLoading(true);
    
    const fetchDataForQuarter = async () => {
        try {        
        const indicatorResponse = await api.get('/programs/program-outcome-indicator-performance/', {
            params: {
            quarter: quarterId,
            page_size: 1000
            },
        });
        
        if (currentQuarterRef.current !== quarterId) {
            setIsLoading(false);
            return;
        }
        
        const performances = indicatorResponse.data?.results || indicatorResponse.data || [];        
        const performanceMap: Record<string, any> = {};
        performances.forEach((perf: any) => {
            if (perf && perf.indicator && perf.quarter === quarterId) {
            performanceMap[perf.indicator] = perf;
            }
        });        
        setIndicatorPerformances(performanceMap);
        
        } catch (error) {
        console.error(`Failed to fetch performances for quarter ${quarterId}:`, error);
        toast.error('Failed to load performance data for selected quarter');
        
        if (currentQuarterRef.current === quarterId) {
            setIndicatorPerformances({});
        }
        } finally {
        setIsLoading(false);
        }
    };
    
    fetchDataForQuarter();
    
    }, [selectedQuarter?.id]);

    useEffect(() => {
    if (!selectedQuarter?.id) return;
    
    const quarterId = selectedQuarter.id;
    
    Object.entries(outcomeIndicators).forEach(([outcomeId, indicators]) => {
        console.log(`Outcome ${outcomeId} has indicators:`, indicators.map(i => i.id));
    });
    
    const newOutcomePerformances: Record<string, any> = {};
    
    for (const outcome of programOutcomes) {
        const outcomeInds = outcomeIndicators[outcome.id] || [];
        console.log(`Processing outcome ${outcome.id} (${outcome.name}) with ${outcomeInds.length} indicators:`, 
        outcomeInds.map(i => i.id));
        
        let totalTarget = 0;
        let totalActual = 0;
        let hasData = false;
        
        outcomeInds.forEach(ind => {
        const perf = indicatorPerformances[ind.id];
        
        if (perf && perf.quarter === quarterId) {
            totalTarget += Number(perf.target) || 0;
            totalActual += Number(perf.actual) || 0;
            hasData = true;
        }
        });
        
        if (hasData) {
        newOutcomePerformances[outcome.id] = {
            target: totalTarget,
            actual: totalActual,
            progress: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0,
            quarter: quarterId
        };
        console.log(`  Outcome ${outcome.id} calculated:`, newOutcomePerformances[outcome.id]);
        } else {
        console.log(`  Outcome ${outcome.id} has no data for quarter ${quarterId}`);
        }
    }
    
    setOutcomePerformances(newOutcomePerformances);
    
    const newObjectivePerformances: Record<string, any> = {};
    
    linkedObjectives.forEach(objective => {
        const objectiveOutcomes = programOutcomes.filter(outcome => {
        const linkedId = typeof outcome.linked_objective === 'object' 
            ? outcome.linked_objective?.id 
            : outcome.linked_objective;
        return linkedId === objective.id;
        });
        
        if (objectiveOutcomes.length === 0) return;
        
        let totalTarget = 0;
        let totalActual = 0;
        let hasData = false;
        
        objectiveOutcomes.forEach(outcome => {
        const performance = newOutcomePerformances[outcome.id];
        if (performance) {
            totalTarget += Number(performance.target) || 0;
            totalActual += Number(performance.actual) || 0;
            hasData = true;
        }
        });
        
        if (hasData) {
        newObjectivePerformances[objective.id] = {
            target: totalTarget,
            actual: totalActual,
            progress: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0
        };
        }
    });
    
    setObjectivePerformances(newObjectivePerformances);
    
    }, [programOutcomes, outcomeIndicators, indicatorPerformances, selectedQuarter?.id, linkedObjectives]);

    const toggleOutcome = async (id: string) => {
        const isOpening = !openOutcomes.includes(id);
        if (isOpening) {
            if (!outcomeIndicators[id] || outcomeIndicators[id].length === 0) {
                await fetchOutcomeIndicators(id);
            }
            setOpenOutcomes(prev => [...prev, id]);
        } else {
            setOpenOutcomes(prev => prev.filter(i => i !== id));
        }
    };

    const toggleIndicator = (id: string) => {
        setOpenIndicators(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const unlinkedObjectives = strategicObjectives?.filter(
        (so: any) => !program.linked_objectives?.some((lo: any) => lo.number === so.number)
    ) || [];

    const toggleObjective = (id: string) => {
        setOpenObjectives(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleLinkObjective = async (objectiveToLink: any) => {
        if (!objectiveToLink) return;

        setProgram((prev: any) => ({
            ...prev,
            linked_objectives: [...(prev.linked_objectives || []), objectiveToLink],
        }));

        try {
            await api.post(`/programs/${program.id}/link-objective/`, {
                objective_id: objectiveToLink.id,
            });

            const res = await api.get(`/programs/${program.id}/`);
            setProgram(res.data);
            toast.success("Objective linked successfully");
        } catch (err) {
            console.error("Failed to link objective:", err);
            toast.error("Failed to link objective");
            setProgram((prev: any) => ({
                ...prev,
                linked_objectives: prev.linked_objectives.filter(
                    (o: any) => o.id !== objectiveToLink.id
                ),
            }));
        } finally {
            setIsLinkerOpen(false);
        }
    };

    const handleUnlinkObjective = async (objectiveToUnlink: any) => {
        if (!objectiveToUnlink) return;

        setProgram((prev: any) => ({
            ...prev,
            linked_objectives: (prev.linked_objectives || []).filter(
                (o: any) => o.id !== objectiveToUnlink.id
            ),
        }));

        setOpenObjectives(prev => prev.filter(id => id !== objectiveToUnlink.id));

        try {
            await api.post(`/programs/${program.id}/unlink-objective/`, {
                objective_id: objectiveToUnlink.id,
            });

            const res = await api.get(`/programs/${program.id}/`);
            setProgram(res.data);
            toast.success("Objective unlinked successfully");

            setObjectivePerformances(prev => {
                const newPerf = { ...prev };
                delete newPerf[objectiveToUnlink.id];
                return newPerf;
            });

        } catch (err) {
            console.error("Failed to unlink objective:", err);
            toast.error("Failed to unlink objective");

            try {
                const res = await api.get(`/programs/${program.id}/`);
                setProgram(res.data);
            } catch (fetchErr) {
                console.error("Failed to fetch program after unlink failure:", fetchErr);
            }
        }
    };

    const handleSaveOutcome = async (outcomeToSave: any) => {
        try {
            const isNew = !outcomeToSave.id;
            const method = isNew ? api.post : api.put;
            const endpoint = isNew 
                ? `/programs/program-outcomes/`
                : `/programs/program-outcomes/${outcomeToSave.id}/`;

            const payload = {
                program: program.id,
                name: outcomeToSave.name,
                description: outcomeToSave.description || '',
                linked_objective: outcomeToSave.linked_objective || null,
            };

            const response = await method(endpoint, payload);
            
            if (isNew) {
                setProgramOutcomes(prev => [...prev, response.data]);
            } else {
                setProgramOutcomes(prev => 
                    prev.map(outcome => outcome.id === response.data.id ? response.data : outcome)
                );
            }

            toast.success(isNew ? "Outcome created successfully" : "Outcome updated successfully");
            setEditingOutcome(null);
        } catch (error: any) {
            console.error("Failed to save outcome:", error);
            toast.error(error.response?.data?.message || "Failed to save outcome");
        }
    };

    const handleDeleteOutcome = async (outcomeId: string) => {
        try {
            await api.delete(`/programs/program-outcomes/${outcomeId}/`);
            setProgramOutcomes(prev => prev.filter(outcome => outcome.id !== outcomeId));
            setOutcomeIndicators(prev => {
                const newIndicators = { ...prev };
                delete newIndicators[outcomeId];
                return newIndicators;
            });
            setOutcomePerformances(prev => {
                const newPerf = { ...prev };
                delete newPerf[outcomeId];
                return newPerf;
            });
            toast.success("Outcome deleted successfully");
        } catch (error) {
            console.error("Failed to delete outcome:", error);
            toast.error("Failed to delete outcome");
        }
    };

    const handleSaveIndicator = async (indicatorToSave: any) => {
        if (!indicatorParent) return;

        try {
            const isNew = !indicatorToSave.id;
            const method = isNew ? api.post : api.put;
            const endpoint = isNew
                ? `/programs/program-outcome-indicators/`
                : `/programs/program-outcome-indicators/${indicatorToSave.id}/`;

            const payload = {
                outcome: indicatorParent.parent.id,
                name_override: indicatorToSave.name,
                description_override: indicatorToSave.description || '',
                corporate_indicator: indicatorToSave.corporate_indicator || null,
            };

            await method(endpoint, payload);

            await fetchOutcomeIndicators(indicatorParent.parent.id);
            
            toast.success(isNew ? "Indicator added successfully" : "Indicator updated successfully");
            setIndicatorModalOpen(false);
            setIndicatorParent(null);
            setEditingIndicator(null);
        } catch (error: any) {
            console.error("Failed to save indicator:", error);
            toast.error(error.response?.data?.message || "Failed to save indicator");
        }
    };

    const handleSaveIndicatorPerformance = async (indicator: any, performanceData: any) => {
        try {
            const existingPerformance = indicatorPerformances[indicator.id];
            
            const payload = {
                indicator: indicator.id,
                quarter: selectedQuarter.id,
                target: Number(performanceData.target),
                actual: Number(performanceData.actual),
                comments: performanceData.comments || '',
            };
                        
            if (existingPerformance && existingPerformance.id) {
                await api.put(`/programs/program-outcome-indicator-performance/${existingPerformance.id}/`, payload);
                toast.success("Indicator performance updated successfully");
            } else {
                const response = await api.post('/programs/program-outcome-indicator-performance/', payload);
                toast.success("Indicator performance saved successfully");
            }
            
            await refreshAllData();
            setEditingPerformance(null);
        } catch (error: any) {
            console.error("Failed to save indicator performance:", error);
            toast.error(error.response?.data?.message || "Failed to save indicator performance");
        }
    };

    const refreshAllData = async () => {
        if (!selectedQuarter) return;

        const quarterId = selectedQuarter.id;
        currentQuarterRef.current = quarterId;
        
        try {
            const indicatorResponse = await api.get('/programs/program-outcome-indicator-performance/', {
                params: {
                    quarter: quarterId,
                    page_size: 1000
                },
            });

            if (currentQuarterRef.current !== quarterId) return;
            
            const performances = indicatorResponse.data?.results || indicatorResponse.data || [];
            const performanceMap: Record<string, any> = {};
            performances.forEach((perf: any) => {
                if (perf && perf.indicator) {
                    performanceMap[perf.indicator] = perf;
                }
            });
            
            setIndicatorPerformances(performanceMap);
            
            const newOutcomePerformances: Record<string, any> = {};
            
            for (const outcome of programOutcomes) {
                const outcomeInds = outcomeIndicators[outcome.id] || [];
                
                let totalTarget = 0;
                let totalActual = 0;
                let hasData = false;
                
                outcomeInds.forEach(ind => {
                    const perf = performanceMap[ind.id];
                    if (perf) {
                        totalTarget += Number(perf.target) || 0;
                        totalActual += Number(perf.actual) || 0;
                        hasData = true;
                    }
                });
                
                if (hasData) {
                    newOutcomePerformances[outcome.id] = {
                        target: totalTarget,
                        actual: totalActual,
                        progress: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0,
                        quarter: quarterId
                    };
                }
            }
            
            setOutcomePerformances(newOutcomePerformances);
            
        } catch (error) {
            console.error('Failed to refresh data:', error);
        }
    };

    const handleDeleteIndicator = async (indicatorId: string, outcomeId: string) => {
        try {
            await api.delete(`/programs/program-outcome-indicators/${indicatorId}/`);
            
            await fetchOutcomeIndicators(outcomeId);
            
            setIndicatorPerformances(prev => {
                const newPerf = { ...prev };
                delete newPerf[indicatorId];
                return newPerf;
            });
            
            toast.success("Indicator deleted successfully");
        } catch (error) {
            console.error("Failed to delete indicator:", error);
            toast.error("Failed to delete indicator");
        }
    };

    const handleSaveOutcomePerformance = async (outcome: any, performanceData: any) => {
        try {
            const existingPerformance = outcomePerformances[outcome.id];
            
            const payload = {
                outcome: outcome.id,
                quarter: selectedQuarter.id,
                target: Number(performanceData.target),
                actual: Number(performanceData.actual),
            };
                        
            if (existingPerformance && existingPerformance.id) {
                await api.put(`/programs/program-outcome-performance/${existingPerformance.id}/`, payload);
                toast.success("Outcome performance updated successfully");
            } else {
                const response = await api.post('/programs/program-outcome-performance/', payload);
                toast.success("Outcome performance saved successfully");
            }
            
            await refreshAllData();
            setEditingOutcomePerformance(null);
        } catch (error: any) {
            console.error("Failed to save outcome performance:", error);
            console.error("Error response:", error.response?.data);
            toast.error(error.response?.data?.message || "Failed to save outcome performance");
        }
    };

    const confirmDelete = async () => {
        if (!deletingItem) return;

        try {
            if (deletingItem.type === 'objective') {
                await handleUnlinkObjective(deletingItem);
            } else if (deletingItem.type === 'outcome') {
                await handleDeleteOutcome(deletingItem.id);
            } else if (deletingItem.type === 'indicator') {
                await handleDeleteIndicator(deletingItem.id, deletingItem.outcomeId);
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            toast.error("Failed to delete item");
        } finally {
            setDeletingItem(null);
        }
    };

    const getOutcomesByObjective = (objectiveId: string | number) => {
        return programOutcomes.filter(outcome => {
            const linkedId = typeof outcome.linked_objective === 'object' 
                ? outcome.linked_objective?.id 
                : outcome.linked_objective;
            return linkedId === objectiveId;
        });
    };

    return (
        <>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Program Outcomes Framework</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage outcomes and indicators for {program?.name}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-4">
                    <ReportingQuarterSelector
                        key={`quarter-selector-${selectedQuarter?.id || 'none'}`}
                        selectedQuarter={selectedQuarter}
                        onQuarterChange={(quarter) => {
                            console.log('Quarter changed to:', quarter);
                            setSelectedQuarter(quarter);
                        }}
                    />
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => router.push('/dashboard/admin/quarters')}
                            className="flex items-center gap-2"
                        >
                            <CalendarDays className="h-4 w-4" />
                            Manage Quarters
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setEditingOutcome({})}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Outcome
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsLinkerOpen(true)} 
                            disabled={unlinkedObjectives.length === 0 && strategicObjectives.length > 0}
                        >
                            <LinkIcon className="mr-2 h-4 w-4" /> 
                            Link Strategic Objective
                        </Button>
                    </div>
                </div>
            </div>

            {loadingOutcomes ? (
                <div className="text-center py-8">Loading outcomes...</div>
            ) : (
                <>
                    {!selectedQuarter && (
                        <div className="mb-4 flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm text-orange-800">
                            <BarChart3 className="h-4 w-4 shrink-0" />
                            Select a reporting quarter above to view and edit targets &amp; actuals.
                        </div>
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[30%]">Objective / Outcome / Indicator</TableHead>
                                <TableHead className="w-[10%]">Type</TableHead>
                                <TableHead className="w-[12%] text-center">Target</TableHead>
                                <TableHead className="w-[12%] text-center">Actual</TableHead>
                                <TableHead className="w-[15%] text-center">Progress</TableHead>
                                <TableHead className="w-[21%] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        
                        
                        <TableBody>
                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                        <span>Loading performance data for {selectedQuarter?.year} Q{selectedQuarter?.quarter}...</span>
                                    </div>
                                    </TableCell>
                                </TableRow>
                                )}
                            {linkedObjectives.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <Target className="h-12 w-12 text-gray-300" />
                                            <p className="text-muted-foreground">No strategic objectives linked</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setIsLinkerOpen(true)}
                                            >
                                                Link an Objective
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                linkedObjectives.map((objective: any) => {
                                    const objectiveOutcomes = getOutcomesByObjective(objective.id);
                                    const hasOutcomes = objectiveOutcomes.length > 0;
                                    const objectivePerformance = objectivePerformances[objective.id];
                                    const hasObjectivePerformance = !!objectivePerformance;

                                    return (
                                        <React.Fragment key={objective.id}>
                                            {/* Strategic Objective Row */}
                                            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
                                                <TableCell className="py-3 font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7"
                                                            onClick={() => toggleObjective(objective.id)}
                                                        >
                                                            {openObjectives.includes(objective.id) ? 
                                                                <ChevronDown className="h-5 w-5" /> : 
                                                                <ChevronRight className="h-5 w-5" />
                                                            }
                                                        </Button>
                                                        <Target className="h-5 w-5 text-accent-foreground" />
                                                        <Badge variant="secondary">{objective.number}</Badge>
                                                        <span>{objective.name}</span>
                                                        {hasOutcomes && (
                                                            <Badge variant="outline" className="ml-2">
                                                                {objectiveOutcomes.length} outcome(s)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">Objective</Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {selectedQuarter && hasObjectivePerformance ? 
                                                        formatNumber(objectivePerformance.target) : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {selectedQuarter && hasObjectivePerformance ? 
                                                        <span className={getPerformanceColor(objectivePerformance.actual, objectivePerformance.target)}>
                                                            {formatNumber(objectivePerformance.actual)}
                                                        </span> : '—'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {selectedQuarter && hasObjectivePerformance ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`text-sm font-medium ${
                                                                objectivePerformance.progress >= 100 ? 'text-green-600' : 
                                                                objectivePerformance.progress >= 75 ? 'text-yellow-600' : 
                                                                'text-red-600'
                                                            }`}>
                                                                {objectivePerformance.progress.toFixed(0)}%
                                                            </span>
                                                            <Progress 
                                                                value={Math.min(objectivePerformance.progress, 100)} 
                                                                className="h-1.5 w-20"
                                                            />
                                                        </div>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => setDeletingItem({ 
                                                            type: 'objective', 
                                                            name: objective.name, 
                                                            id: objective.id 
                                                        })}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> 
                                                        Unlink
                                                    </Button>
                                                </TableCell>
                                            </TableRow>

                                            {/* Outcomes and Indicators */}
                                            {openObjectives.includes(objective.id) && (
                                                <>
                                                    {objectiveOutcomes.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="pl-16 py-8 text-center">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <p className="text-muted-foreground">No outcomes for this objective</p>
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm"
                                                                        onClick={() => setEditingOutcome({
                                                                            linked_objective: objective.id
                                                                        })}
                                                                    >
                                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                                        Add Outcome
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        objectiveOutcomes.map((outcome: any) => {
                                                            const indicators = outcomeIndicators[outcome.id] || [];
                                                            const isLoading = loadingIndicators[outcome.id];
                                                            const outcomePerformance = outcomePerformances[outcome.id];
                                                            const hasOutcomePerformance = !!outcomePerformance;
                                                            const outcomeProgress = outcomePerformance?.progress ?? 
                                                                (outcomePerformance?.target > 0 
                                                                    ? (outcomePerformance?.actual / outcomePerformance?.target) * 100 
                                                                    : 0);

                                                            return (
                                                                <React.Fragment key={outcome.id}>
                                                                    {/* Outcome Row */}
                                                                    <TableRow className="hover:bg-green-50/20 border-t border-green-100/30">
                                                                        <TableCell className="pl-16 py-2.5">
                                                                            <div className="flex items-start gap-2">
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="icon" 
                                                                                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                                                                                    onClick={() => toggleOutcome(outcome.id)}
                                                                                >
                                                                                    {openOutcomes.includes(outcome.id) ? 
                                                                                        <ChevronDown className="h-4 w-4" /> : 
                                                                                        <ChevronRight className="h-4 w-4" />
                                                                                    }
                                                                                </Button>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="p-1 rounded bg-green-100">
                                                                                            <MessageSquare className="h-3 w-3 text-green-600" />
                                                                                        </div>
                                                                                        <span className="text-sm font-medium">{outcome.name}</span>
                                                                                        {outcome.description && (
                                                                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                                                                {outcome.description}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {outcome.indicator_count > 0 && (
                                                                                            <Badge variant="outline" className="ml-2">
                                                                                                {outcome.indicator_count} indicator(s)
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge variant="outline" className="text-xs">Outcome</Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {selectedQuarter && hasOutcomePerformance ? 
                                                                                formatNumber(outcomePerformance.target) : '—'}
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {selectedQuarter && hasOutcomePerformance ? 
                                                                                <span className={`text-sm font-medium ${getPerformanceColor(outcomePerformance.actual, outcomePerformance.target)}`}>
                                                                                    {formatNumber(outcomePerformance.actual)}
                                                                                </span> : '—'}
                                                                        </TableCell>
                                                                        <TableCell className="text-center py-2">
                                                                            {selectedQuarter && hasOutcomePerformance ? (
                                                                                <div className="space-y-1">
                                                                                    <div className={`text-sm font-medium ${
                                                                                        outcomeProgress >= 100 ? 'text-green-600' : 
                                                                                        outcomeProgress >= 75 ? 'text-yellow-600' : 
                                                                                        'text-red-600'
                                                                                    }`}>
                                                                                        {outcomeProgress.toFixed(0)}%
                                                                                    </div>
                                                                                    <Progress 
                                                                                        value={Math.min(outcomeProgress, 100)} 
                                                                                        className="h-1.5 w-20 mx-auto"
                                                                                    />
                                                                                </div>
                                                                            ) : '—'}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <div className="flex justify-end gap-1">
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-7 w-7 p-0"
                                                                                                onClick={() => setEditingOutcome(outcome)}
                                                                                            >
                                                                                                <Edit className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p className="text-xs">Edit outcome</p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                                <TooltipProvider>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="sm"
                                                                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                                                                onClick={() => setDeletingItem({ 
                                                                                                    type: 'outcome', 
                                                                                                    name: outcome.name, 
                                                                                                    id: outcome.id 
                                                                                                })}
                                                                                            >
                                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                            </Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p className="text-xs">Delete outcome</p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>

                                                                    {/* Indicator Rows */}
                                                                    {openOutcomes.includes(outcome.id) && (
                                                                        <>
                                                                            {isLoading ? (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={6} className="pl-28 py-4 text-center">
                                                                                        <div className="flex items-center justify-center gap-2">
                                                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                                                                            <span className="text-sm text-muted-foreground">Loading indicators...</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ) : (
                                                                                <>
                                                                                    {indicators.length > 0 ? (
                                                                                        indicators.map((indicator: any) => {
                                                                                            const performance = indicatorPerformances[indicator.id]?.quarter === selectedQuarter?.id 
                                                                                                ? indicatorPerformances[indicator.id] 
                                                                                                : null;
                                                                                            const hasPerformance = !!performance;
                                                                                            const target = hasPerformance ? Number(performance?.target) || 0 : 0;
                                                                                            const actual = hasPerformance ? Number(performance?.actual) || 0 : 0;
                                                                                            const progressPercentage = target > 0 ? (actual / target) * 100 : 0;
                                                                                                                            
                                                                                            return (
                                                                                                <React.Fragment key={indicator.id}>
                                                                                                    <TableRow className="hover:bg-blue-50/10 border-t border-blue-100/20">
                                                                                                        <TableCell className="pl-24 py-2">
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
                                                                                                                        <span className="text-sm font-medium truncate">
                                                                                                                            {indicator.name_override || indicator.corporate_indicator?.name}
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                    {(indicator.description_override || indicator.corporate_indicator?.description) && (
                                                                                                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                                                                                                            {indicator.description_override || indicator.corporate_indicator?.description}
                                                                                                                        </p>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </TableCell>
                                                                                                        <TableCell>
                                                                                                            <Badge variant="ghost" className="text-xs">Indicator</Badge>
                                                                                                        </TableCell>
                                                                                                        <TableCell className="text-center py-2">
                                                                                                            {selectedQuarter ? (
                                                                                                                <div className="space-y-1">
                                                                                                                    <div className="text-sm font-medium">
                                                                                                                        {hasPerformance ? formatNumber(target) : <span className="text-muted-foreground">—</span>}
                                                                                                                    </div>
                                                                                                                    {perms.canUpdateIndicatorValues ? (
                                                                                                                        <Button
                                                                                                                            variant={hasPerformance ? "ghost" : "outline"}
                                                                                                                            size="sm"
                                                                                                                            className={`text-xs h-6 px-2 ${!hasPerformance ? 'border-dashed' : ''}`}
                                                                                                                            onClick={() => setEditingPerformance({
                                                                                                                                indicator,
                                                                                                                                performance: indicatorPerformances[indicator.id]?.quarter === selectedQuarter.id
                                                                                                                                    ? indicatorPerformances[indicator.id] : null,
                                                                                                                            })}
                                                                                                                        >
                                                                                                                            {hasPerformance ? 'Edit' : 'Set'}
                                                                                                                        </Button>
                                                                                                                    ) : !hasPerformance && (
                                                                                                                        <TooltipProvider>
                                                                                                                            <Tooltip>
                                                                                                                                <TooltipTrigger asChild>
                                                                                                                                    <span className="text-xs text-muted-foreground/60 cursor-help italic">Pending M&E</span>
                                                                                                                                </TooltipTrigger>
                                                                                                                                <TooltipContent>
                                                                                                                                    <p className="text-xs">Targets and actuals are set by the M&E team</p>
                                                                                                                                </TooltipContent>
                                                                                                                            </Tooltip>
                                                                                                                        </TooltipProvider>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                                            )}
                                                                                                        </TableCell>
                                                                                                        <TableCell className="text-center py-2">
                                                                                                            {selectedQuarter ? (
                                                                                                                <div className="space-y-1">
                                                                                                                    <div className={`text-sm font-medium ${hasPerformance ? getPerformanceColor(actual, target) : ''}`}>
                                                                                                                        {hasPerformance ? formatNumber(actual) : <span className="text-muted-foreground">—</span>}
                                                                                                                    </div>
                                                                                                                    {perms.canUpdateIndicatorValues ? (
                                                                                                                        <Button
                                                                                                                            variant={hasPerformance ? "ghost" : "outline"}
                                                                                                                            size="sm"
                                                                                                                            className={`text-xs h-6 px-2 ${!hasPerformance ? 'border-dashed' : ''}`}
                                                                                                                            onClick={() => setEditingPerformance({
                                                                                                                                indicator,
                                                                                                                                performance: indicatorPerformances[indicator.id]?.quarter === selectedQuarter.id
                                                                                                                                    ? indicatorPerformances[indicator.id] : null,
                                                                                                                            })}
                                                                                                                        >
                                                                                                                            {hasPerformance ? 'Edit' : 'Set'}
                                                                                                                        </Button>
                                                                                                                    ) : !hasPerformance && (
                                                                                                                        <TooltipProvider>
                                                                                                                            <Tooltip>
                                                                                                                                <TooltipTrigger asChild>
                                                                                                                                    <span className="text-xs text-muted-foreground/60 cursor-help italic">Pending M&E</span>
                                                                                                                                </TooltipTrigger>
                                                                                                                                <TooltipContent>
                                                                                                                                    <p className="text-xs">Targets and actuals are set by the M&E team</p>
                                                                                                                                </TooltipContent>
                                                                                                            </Tooltip>
                                                                                                                        </TooltipProvider>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                                            )}
                                                                                                        </TableCell>
                                                                                                        <TableCell className="text-center py-2">
                                                                                                            {selectedQuarter && hasPerformance ? (
                                                                                                                <div className="space-y-1">
                                                                                                                    <div className={`text-sm font-medium ${
                                                                                                                        progressPercentage >= 100 ? 'text-green-600' : 
                                                                                                                        progressPercentage >= 75 ? 'text-yellow-600' : 
                                                                                                                        'text-red-600'
                                                                                                                    }`}>
                                                                                                                        {progressPercentage.toFixed(0)}%
                                                                                                                    </div>
                                                                                                                    <Progress 
                                                                                                                        value={Math.min(progressPercentage, 100)} 
                                                                                                                        className="h-1.5 w-20 mx-auto"
                                                                                                                    />
                                                                                                                </div>
                                                                                                            ) : selectedQuarter ? (
                                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                                            ) : (
                                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                                            )}
                                                                                                        </TableCell>
                                                                                                        <TableCell className="text-right py-2">
                                                                                                            <div className="flex justify-end gap-1">
                                                                                                                <TooltipProvider>
                                                                                                                    <Tooltip>
                                                                                                                        <TooltipTrigger asChild>
                                                                                                                            <Button
                                                                                                                                variant="ghost"
                                                                                                                                size="sm"
                                                                                                                                className="h-7 w-7 p-0"
                                                                                                                                onClick={() => {
                                                                                                                                    setIndicatorParent({ parent: outcome, type: "outcome" });
                                                                                                                                    setEditingIndicator(indicator);
                                                                                                                                    setIndicatorModalOpen(true);
                                                                                                                                }}
                                                                                                                            >
                                                                                                                                <Edit className="h-3.5 w-3.5" />
                                                                                                                            </Button>
                                                                                                                        </TooltipTrigger>
                                                                                                                        <TooltipContent>
                                                                                                                            <p className="text-xs">Edit indicator</p>
                                                                                                                        </TooltipContent>
                                                                                                                    </Tooltip>
                                                                                                                </TooltipProvider>
                                                                                                                <TooltipProvider>
                                                                                                                    <Tooltip>
                                                                                                                        <TooltipTrigger asChild>
                                                                                                                            <Button
                                                                                                                                variant="ghost"
                                                                                                                                size="sm"
                                                                                                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                                                                                                onClick={() => setDeletingItem({ 
                                                                                                                                    type: 'indicator', 
                                                                                                                                    name: indicator.name_override || indicator.corporate_indicator?.name, 
                                                                                                                                    id: indicator.id,
                                                                                                                                    outcomeId: outcome.id
                                                                                                                                })}
                                                                                                                            >
                                                                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                                                            </Button>
                                                                                                                        </TooltipTrigger>
                                                                                                                        <TooltipContent>
                                                                                                                            <p className="text-xs">Delete indicator</p>
                                                                                                                        </TooltipContent>
                                                                                                                    </Tooltip>
                                                                                                                </TooltipProvider>
                                                                                                            </div>
                                                                                                        </TableCell>
                                                                                                    </TableRow>
                                                                                                    
                                                                                                    {/* Expanded Indicator Details */}
                                                                                                    {openIndicators.includes(indicator.id) && (
                                                                                                        <TableRow className="bg-blue-50/20 border-t border-blue-100/30">
                                                                                                            <TableCell colSpan={6} className="pl-28 pr-4 py-3">
                                                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                                                    <div>
                                                                                                                        <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                                                                                                                            <Gauge className="h-3.5 w-3.5" />
                                                                                                                            Indicator Details
                                                                                                                        </h4>
                                                                                                                        <div className="space-y-1.5 text-sm">
                                                                                                                            <p>
                                                                                                                                <span className="font-medium">Name:</span> {indicator.name_override || indicator.corporate_indicator?.name}
                                                                                                                            </p>
                                                                                                                            {(indicator.description_override || indicator.corporate_indicator?.description) && (
                                                                                                                                <p>
                                                                                                                                    <span className="font-medium">Description:</span> {indicator.description_override || indicator.corporate_indicator?.description}
                                                                                                                                </p>
                                                                                                                            )}
                                                                                                                            <p>
                                                                                                                                <span className="font-medium">Baseline:</span> {indicator.baseline || 'Not set'}
                                                                                                                            </p>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    <div>
                                                                                                                        <h4 className="text-xs font-semibold mb-2">Performance Summary</h4>
                                                                                                                        {selectedQuarter && hasPerformance ? (
                                                                                                                            <div className="space-y-1.5">
                                                                                                                                <div className="flex justify-between items-center text-sm p-1.5 bg-white rounded border">
                                                                                                                                    <span className="font-medium">Target:</span>
                                                                                                                                    <span>{formatNumber(target)}</span>
                                                                                                                                </div>
                                                                                                                                <div className="flex justify-between items-center text-sm p-1.5 bg-white rounded border">
                                                                                                                                    <span className="font-medium">Actual:</span>
                                                                                                                                    <span className={getPerformanceColor(actual, target)}>
                                                                                                                                        {formatNumber(actual)}
                                                                                                                                    </span>
                                                                                                                                </div>
                                                                                                                                <div className="flex justify-between items-center text-sm p-1.5 bg-white rounded border">
                                                                                                                                    <span className="font-medium">Progress:</span>
                                                                                                                                    <span className={
                                                                                                                                        progressPercentage >= 100 ? 'text-green-600' : 
                                                                                                                                        progressPercentage >= 75 ? 'text-yellow-600' : 
                                                                                                                                        'text-red-600'
                                                                                                                                    }>
                                                                                                                                        {progressPercentage.toFixed(1)}%
                                                                                                                                    </span>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        ) : (
                                                                                                                            <p className="text-sm text-muted-foreground">No performance data for selected quarter</p>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </TableCell>
                                                                                                        </TableRow>
                                                                                                    )}
                                                                                                </React.Fragment>
                                                                                            );
                                                                                        })
                                                                                    ) : (
                                                                                        <TableRow>
                                                                                            <TableCell colSpan={6} className="pl-28 py-4 text-center">
                                                                                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                                                                    <Gauge className="h-6 w-6 mb-1 opacity-50" />
                                                                                                    <p className="text-sm font-medium">No indicators for this outcome</p>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    )}
                                                                                    
                                                                                    {/* Always show Add Indicator button */}
                                                                                    <TableRow>
                                                                                        <TableCell colSpan={6} className="pl-28 py-2">
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="h-7 text-xs"
                                                                                                onClick={() => {
                                                                                                    setIndicatorParent({ parent: outcome, type: "outcome" });
                                                                                                    setEditingIndicator(null);
                                                                                                    setIndicatorModalOpen(true);
                                                                                                }}
                                                                                            >
                                                                                                <PlusCircle className="mr-1 h-3 w-3" />
                                                                                                Add Indicator
                                                                                            </Button>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })
                                                    )}
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}

                            {/* Unlinked Outcomes Section */}
                            {programOutcomes.filter(outcome => !outcome.linked_objective).length > 0 && (
                                <>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableCell colSpan={6} className="py-2 font-bold">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">Unlinked</Badge>
                                                <span>Outcomes not linked to strategic objectives</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {programOutcomes
                                        .filter(outcome => !outcome.linked_objective)
                                        .map((outcome: any) => {
                                            const indicators = outcomeIndicators[outcome.id] || [];
                                            const isLoading = loadingIndicators[outcome.id];
                                            const outcomePerformance = outcomePerformances[outcome.id];
                                            const hasOutcomePerformance = !!outcomePerformance;

                                            return (
                                                <React.Fragment key={outcome.id}>
                                                    {/* Unlinked Outcome Row */}
                                                    <TableRow className="hover:bg-green-50/20 border-t border-green-100/30">
                                                        <TableCell className="pl-8 py-2.5">
                                                            <div className="flex items-start gap-2">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-5 w-5 mt-0.5 flex-shrink-0"
                                                                    onClick={() => toggleOutcome(outcome.id)}
                                                                >
                                                                    {openOutcomes.includes(outcome.id) ? 
                                                                        <ChevronDown className="h-4 w-4" /> : 
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    }
                                                                </Button>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className="p-1 rounded bg-green-100">
                                                                            <MessageSquare className="h-3 w-3 text-green-600" />
                                                                        </div>
                                                                        <span className="text-sm font-medium">{outcome.name}</span>
                                                                        {outcome.description && (
                                                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                                                {outcome.description}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {indicators.length} indicators
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-xs">Outcome</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center py-2">
                                                            {selectedQuarter && hasOutcomePerformance ? 
                                                                formatNumber(outcomePerformance.target) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-center py-2">
                                                            {selectedQuarter && hasOutcomePerformance ? 
                                                                <span className={`text-sm font-medium ${getPerformanceColor(outcomePerformance.actual, outcomePerformance.target)}`}>
                                                                    {formatNumber(outcomePerformance.actual)}
                                                                </span> : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-center py-2">
                                                            {selectedQuarter && hasOutcomePerformance ? (
                                                                <div className="space-y-1">
                                                                    <div className={`text-sm font-medium ${
                                                                        (outcomePerformance.progress ?? 0) >= 100 ? 'text-green-600' : 
                                                                        (outcomePerformance.progress ?? 0) >= 75 ? 'text-yellow-600' : 
                                                                        'text-red-600'
                                                                    }`}>
                                                                        {(outcomePerformance.progress ?? 0).toFixed(0)}%
                                                                    </div>
                                                                    <Progress 
                                                                        value={Math.min(outcomePerformance.progress ?? 0, 100)} 
                                                                        className="h-1.5 w-20 mx-auto"
                                                                    />
                                                                </div>
                                                            ) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 w-7 p-0"
                                                                                onClick={() => setEditingOutcome(outcome)}
                                                                            >
                                                                                <Edit className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p className="text-xs">Edit outcome</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                                                onClick={() => setDeletingItem({ 
                                                                                    type: 'outcome', 
                                                                                    name: outcome.name, 
                                                                                    id: outcome.id 
                                                                                })}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p className="text-xs">Delete outcome</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Unlinked Outcome Indicators */}
                                                    {openOutcomes.includes(outcome.id) && (
                                                        <>
                                                            {isLoading ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} className="pl-16 py-4 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                                                            <span className="text-sm text-muted-foreground">Loading indicators...</span>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                <>
                                                                    {indicators.length > 0 ? (
                                                                        indicators.map((indicator: any) => {
                                                                            const performance = indicatorPerformances[indicator.id]?.quarter === selectedQuarter?.id 
                                                                                ? indicatorPerformances[indicator.id] 
                                                                                : null;
                                                                            const hasPerformance = !!performance;
                                                                            const target = hasPerformance ? Number(performance?.target) || 0 : 0;
                                                                            const actual = hasPerformance ? Number(performance?.actual) || 0 : 0;
                                                                            const progressPercentage = target > 0 ? (actual / target) * 100 : 0;
                                                                            return (
                                                                                <React.Fragment key={indicator.id}>
                                                                                    <TableRow className="hover:bg-blue-50/10 border-t border-blue-100/20">
                                                                                        <TableCell className="pl-16 py-2">
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
                                                                                                        <span className="text-sm font-medium truncate">
                                                                                                            {indicator.name_override || indicator.corporate_indicator?.name}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell>
                                                                                            <Badge variant="ghost" className="text-xs">Indicator</Badge>
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-2">
                                                                                            {selectedQuarter ? (
                                                                                                <div className="space-y-1">
                                                                                                    <div className="text-sm font-medium">
                                                                                                        {hasPerformance ? formatNumber(target) : <span className="text-muted-foreground">—</span>}
                                                                                                    </div>
                                                                                                    {perms.canUpdateIndicatorValues && (
                                                                                                        <Button
                                                                                                            variant={hasPerformance ? "ghost" : "outline"}
                                                                                                            size="sm"
                                                                                                            className={`text-xs h-6 px-2 ${!hasPerformance ? 'border-dashed' : ''}`}
                                                                                                            onClick={() => setEditingPerformance({
                                                                                                                indicator,
                                                                                                                performance: indicatorPerformances[indicator.id]?.quarter === selectedQuarter.id
                                                                                                                    ? indicatorPerformances[indicator.id] : null,
                                                                                                            })}
                                                                                                        >
                                                                                                            {hasPerformance ? 'Edit' : 'Set'}
                                                                                                        </Button>
                                                                                                    )}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-2">
                                                                                            {selectedQuarter ? (
                                                                                                <div className="space-y-1">
                                                                                                    <div className={`text-sm font-medium ${hasPerformance ? getPerformanceColor(actual, target) : ''}`}>
                                                                                                        {hasPerformance ? formatNumber(actual) : <span className="text-muted-foreground">—</span>}
                                                                                                    </div>
                                                                                                    {perms.canUpdateIndicatorValues && (
                                                                                                        <Button
                                                                                                            variant={hasPerformance ? "ghost" : "outline"}
                                                                                                            size="sm"
                                                                                                            className={`text-xs h-6 px-2 ${!hasPerformance ? 'border-dashed' : ''}`}
                                                                                                            onClick={() => setEditingPerformance({
                                                                                                                indicator,
                                                                                                                performance: indicatorPerformances[indicator.id]?.quarter === selectedQuarter.id
                                                                                                                    ? indicatorPerformances[indicator.id] : null,
                                                                                                            })}
                                                                                                        >
                                                                                                            {hasPerformance ? 'Edit' : 'Set'}
                                                                                                        </Button>
                                                                                                    )}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-center py-2">
                                                                                            {selectedQuarter && hasPerformance ? (
                                                                                                <div className="space-y-1">
                                                                                                    <div className={`text-sm font-medium ${
                                                                                                        progressPercentage >= 100 ? 'text-green-600' : 
                                                                                                        progressPercentage >= 75 ? 'text-yellow-600' : 
                                                                                                        'text-red-600'
                                                                                                    }`}>
                                                                                                        {progressPercentage.toFixed(0)}%
                                                                                                    </div>
                                                                                                    <Progress 
                                                                                                        value={Math.min(progressPercentage, 100)} 
                                                                                                        className="h-1.5 w-20 mx-auto"
                                                                                                    />
                                                                                                </div>
                                                                                            ) : selectedQuarter ? (
                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                            ) : (
                                                                                                <span className="text-xs text-muted-foreground">—</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="text-right py-2">
                                                                                            <div className="flex justify-end gap-1">
                                                                                                <TooltipProvider>
                                                                                                    <Tooltip>
                                                                                                        <TooltipTrigger asChild>
                                                                                                            <Button
                                                                                                                variant="ghost"
                                                                                                                size="sm"
                                                                                                                className="h-7 w-7 p-0"
                                                                                                                onClick={() => {
                                                                                                                    setIndicatorParent({ parent: outcome, type: "outcome" });
                                                                                                                    setEditingIndicator(indicator);
                                                                                                                    setIndicatorModalOpen(true);
                                                                                                                }}
                                                                                                            >
                                                                                                                <Edit className="h-3.5 w-3.5" />
                                                                                                            </Button>
                                                                                                        </TooltipTrigger>
                                                                                                        <TooltipContent>
                                                                                                            <p className="text-xs">Edit indicator</p>
                                                                                                        </TooltipContent>
                                                                                                    </Tooltip>
                                                                                                </TooltipProvider>
                                                                                                <TooltipProvider>
                                                                                                    <Tooltip>
                                                                                                        <TooltipTrigger asChild>
                                                                                                            <Button
                                                                                                                variant="ghost"
                                                                                                                size="sm"
                                                                                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                                                                                onClick={() => setDeletingItem({ 
                                                                                                                    type: 'indicator', 
                                                                                                                    name: indicator.name_override || indicator.corporate_indicator?.name, 
                                                                                                                    id: indicator.id,
                                                                                                                    outcomeId: outcome.id
                                                                                                                })}
                                                                                                            >
                                                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                                            </Button>
                                                                                                        </TooltipTrigger>
                                                                                                        <TooltipContent>
                                                                                                            <p className="text-xs">Delete indicator</p>
                                                                                                        </TooltipContent>
                                                                                                    </Tooltip>
                                                                                                </TooltipProvider>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                </React.Fragment>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <TableRow>
                                                                            <TableCell colSpan={6} className="pl-16 py-4 text-center">
                                                                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                                                    <Gauge className="h-6 w-6 mb-1 opacity-50" />
                                                                                    <p className="text-sm font-medium">No indicators for this outcome</p>
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}
                                                                    
                                                                    {/* Always show Add Indicator button for unlinked outcomes */}
                                                                    <TableRow>
                                                                        <TableCell colSpan={6} className="pl-16 py-2">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-7 text-xs"
                                                                                onClick={() => {
                                                                                    setIndicatorParent({ parent: outcome, type: "outcome" });
                                                                                    setEditingIndicator(null);
                                                                                    setIndicatorModalOpen(true);
                                                                                }}
                                                                            >
                                                                                <PlusCircle className="mr-1 h-3 w-3" />
                                                                                Add Indicator
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    }
                                </>
                            )}
                        </TableBody>
                    </Table>
                </>
            )}

            {/* Outcome Editor Modal */}
            {editingOutcome && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingOutcome.id ? 'Edit Outcome' : 'Add Outcome'}
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            const outcomeData = {
                                ...editingOutcome,
                                name: formData.get('name'),
                                description: formData.get('description'),
                                linked_objective: formData.get('linked_objective') || null,
                            };
                            handleSaveOutcome(outcomeData);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Outcome Name *
                                    </label>
                                    <input
                                        name="name"
                                        defaultValue={editingOutcome.name}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        defaultValue={editingOutcome.description}
                                        className="w-full border rounded-md px-3 py-2"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Link to Strategic Objective
                                    </label>
                                    <select
                                        name="linked_objective"
                                        defaultValue={editingOutcome.linked_objective}
                                        className="w-full border rounded-md px-3 py-2"
                                    >
                                        <option value="">Not linked</option>
                                        {linkedObjectives.map((objective: any) => (
                                            <option key={objective.id} value={objective.id}>
                                                {objective.number} - {objective.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingOutcome(null)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingOutcome.id ? 'Update' : 'Create'} Outcome
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Indicator Editor Modal */}
            {indicatorModalOpen && indicatorParent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingIndicator?.id ? 'Edit Indicator' : 'Add Indicator'}
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            const indicatorData = {
                                ...editingIndicator,
                                name: formData.get('name'),
                                description: formData.get('description'),
                                corporate_indicator: formData.get('corporate_indicator') || null,
                            };
                            handleSaveIndicator(indicatorData);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Indicator Name *
                                    </label>
                                    <input
                                        name="name"
                                        defaultValue={editingIndicator?.name_override || editingIndicator?.name}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        defaultValue={editingIndicator?.description_override || editingIndicator?.description}
                                        className="w-full border rounded-md px-3 py-2"
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIndicatorModalOpen(false);
                                        setIndicatorParent(null);
                                        setEditingIndicator(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingIndicator?.id ? 'Update' : 'Add'} Indicator
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Link Objective Modal */}
            {isLinkerOpen && (
                <LinkObjectiveEditor
                    isOpen={isLinkerOpen}
                    onClose={() => setIsLinkerOpen(false)}
                    onLink={handleLinkObjective}
                    availableObjectives={unlinkedObjectives}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deletingItem && (
                <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {deletingItem.type === 'objective' ? 'Unlink Objective' : `Delete ${deletingItem.type}`}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {deletingItem.type === 'objective' 
                                    ? `Are you sure you want to unlink the objective "${deletingItem.name}" from this program?`
                                    : `Are you sure you want to delete this ${deletingItem.type} "${deletingItem.name}"? This action cannot be undone.`
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeletingItem(null)}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90"
                                onClick={confirmDelete}
                            >
                                {deletingItem.type === 'objective' ? 'Unlink' : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {editingPerformance && selectedQuarter && (
                <IndicatorPerformanceEditor
                    key={`indicator-performance-${selectedQuarter.id}-${editingPerformance.indicator.id}-${editingPerformance.performance?.id || 'new'}`}
                    indicator={editingPerformance.indicator}
                    quarter={selectedQuarter}
                    performance={editingPerformance.performance}
                    onSave={async () => {
                        if (selectedQuarter) {
                            setIsLoading(true);
                            try {
                                const response = await api.get('/programs/program-outcome-indicator-performance/', {
                                    params: {
                                        quarter: selectedQuarter.id,
                                        page_size: 1000
                                    },
                                });
                                
                                const performances = response.data?.results || response.data || [];
                                const performanceMap: Record<string, any> = {};
                                performances.forEach((perf: any) => {
                                    if (perf && perf.indicator) {
                                        performanceMap[perf.indicator] = perf;
                                    }
                                });
                                
                                setIndicatorPerformances(performanceMap);
                            } catch (error) {
                                console.error('Failed to refresh data:', error);
                            } finally {
                                setIsLoading(false);
                            }
                        }
                        setEditingPerformance(null);
                    }}
                    onClose={() => setEditingPerformance(null)}
                />
            )}

            {editingOutcomePerformance && selectedQuarter && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingOutcomePerformance.performance ? 'Edit Outcome Performance' : 'Set Outcome Performance'}
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target as HTMLFormElement);
                            const performanceData = {
                                target: parseFloat(formData.get('target') as string) || 0,
                                actual: parseFloat(formData.get('actual') as string) || 0,
                            };
                            handleSaveOutcomePerformance(editingOutcomePerformance.outcome, performanceData);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Target *
                                    </label>
                                    <input
                                        name="target"
                                        type="number"
                                        step="any"
                                        defaultValue={editingOutcomePerformance.performance?.target}
                                        className="w-full border rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Actual *
                                    </label>
                                    <input
                                        name="actual"
                                        type="number"
                                        step="any"
                                        defaultValue={editingOutcomePerformance.performance?.actual}
                                        className="w-full border rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingOutcomePerformance(null)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingOutcomePerformance.performance ? 'Update' : 'Save'} Performance
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}