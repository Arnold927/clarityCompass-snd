import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Disaggregator {
    id: number;
    name: string;
}

interface Indicator {
    id: number;
    name: string;
    description?: string;
    disaggregators: Disaggregator[];
}

interface TaskIndicatorLinkerProps {
    taskId: number;
    onLinked: () => void;
}

export function TaskIndicatorLinker({ taskId, onLinked }: TaskIndicatorLinkerProps) {
    const [open, setOpen] = useState(false);
    const [availableIndicators, setAvailableIndicators] = useState<Indicator[]>([]);
    const [selectedIndicator, setSelectedIndicator] = useState('');
    const [selectedIndicatorData, setSelectedIndicatorData] = useState<Indicator | null>(null);
    const [targetContribution, setTargetContribution] = useState('');
    const [disaggregatorTargets, setDisaggregatorTargets] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchAvailableIndicators();
        }
    }, [open]);

    useEffect(() => {
        if (selectedIndicator && availableIndicators.length > 0) {
            const indicator = availableIndicators.find(i => i.id.toString() === selectedIndicator);
            setSelectedIndicatorData(indicator || null);
            
            if (indicator?.disaggregators) {
                const initialTargets: Record<number, string> = {};
                indicator.disaggregators.forEach(d => {
                    initialTargets[d.id] = '';
                });
                setDisaggregatorTargets(initialTargets);
            }
        }
    }, [selectedIndicator, availableIndicators]);

    const fetchAvailableIndicators = async () => {
        try {
            const response = await api.get(`/tasks/tasks/${taskId}/available_indicators/`);
            setAvailableIndicators(response.data);
        } catch (error) {
            console.error('Error fetching indicators:', error);
            toast({
                title: "Error",
                description: "Failed to fetch available indicators",
                variant: "destructive",
            });
        }
    };

    const handleDisaggregatorTargetChange = (disaggregatorId: number, value: string) => {
        setDisaggregatorTargets(prev => ({
            ...prev,
            [disaggregatorId]: value
        }));
    };

    const handleLink = async () => {
    if (!selectedIndicator) {
        toast({
            title: "Error",
            description: "Please select an indicator",
            variant: "destructive",
        });
        return;
    }

    setLoading(true);
    try {
        const response = await api.post(`/tasks/tasks/${taskId}/link_indicator/`, {
            indicator_id: parseInt(selectedIndicator),
            target_contribution: parseFloat(targetContribution) || 0
        });

        const progressId = response.data.id;

        if (selectedIndicatorData?.disaggregators && selectedIndicatorData.disaggregators.length > 0) {
            const disaggregatorValues = Object.entries(disaggregatorTargets)
                .filter(([_, target]) => target)
                .map(([disaggregatorId, target]) => ({
                    disaggregator_id: parseInt(disaggregatorId),
                    target: parseFloat(target) || 0,
                    actual: 0
                }));

            if (disaggregatorValues.length > 0) {
                await api.post(
                    `/tasks/tasks/${taskId}/indicators/${progressId}/bulk-disaggregate/`,
                    { values: disaggregatorValues }
                );
            }
        }

        toast({
            title: "Success",
            description: selectedIndicatorData?.disaggregators?.length 
                ? "Indicator and disaggregators linked successfully" 
                : "Indicator linked successfully",
        });

        setOpen(false);
        onLinked();
    } catch (error: any) {
        console.error('Error linking indicator:', error);
        toast({
            title: "Error",
            description: error.response?.data?.error || "Failed to link indicator",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
};

    const handleSkipDisaggregators = async () => {
        if (!selectedIndicator) {
            toast({
                title: "Error",
                description: "Please select an indicator",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            await api.post(`/tasks/tasks/${taskId}/link_indicator/`, {
                indicator_id: parseInt(selectedIndicator),
                target_contribution: parseFloat(targetContribution) || 0
            });

            toast({
                title: "Success",
                description: "Indicator linked successfully (disaggregators can be set later)",
            });

            setOpen(false);
            onLinked();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to link indicator",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Link Indicator
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Link Output Indicator to Task</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    {/* Indicator Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="indicator">Select Indicator</Label>
                        <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                            <SelectTrigger id="indicator">
                                <SelectValue placeholder="Choose an indicator" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableIndicators.map((indicator) => (
                                    <SelectItem key={indicator.id} value={indicator.id.toString()}>
                                        <div className="flex flex-col">
                                            <span>{indicator.name}</span>
                                            {indicator.description && (
                                                <span className="text-xs text-muted-foreground">
                                                    {indicator.description}
                                                </span>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Main Target Contribution */}
                    <div className="space-y-2">
                        <Label htmlFor="target">Overall Target Contribution</Label>
                        <Input
                            id="target"
                            type="number"
                            step="0.01"
                            value={targetContribution}
                            onChange={(e) => setTargetContribution(e.target.value)}
                            placeholder="Enter overall target value"
                        />
                        <p className="text-xs text-muted-foreground">
                            This is the total target contribution of this indicator to the task
                        </p>
                    </div>

                    {/* Disaggregator Targets - Show only if indicator has disaggregators */}
                    {selectedIndicatorData?.disaggregators && selectedIndicatorData.disaggregators.length > 0 && (
                        <div className="space-y-3 border-t pt-4 mt-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Disaggregator Targets</Label>
                                <span className="text-xs text-muted-foreground">
                                    
                                </span>
                            </div>
                            
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {selectedIndicatorData.disaggregators.map((disaggregator) => (
                                    <div key={disaggregator.id} className="space-y-1">
                                        <Label htmlFor={`disagg-${disaggregator.id}`} className="text-sm">
                                            {disaggregator.name}
                                        </Label>
                                        <Input
                                            id={`disagg-${disaggregator.id}`}
                                            type="number"
                                            step="0.01"
                                            value={disaggregatorTargets[disaggregator.id] || ''}
                                            onChange={(e) => handleDisaggregatorTargetChange(disaggregator.id, e.target.value)}
                                            placeholder={`Target for ${disaggregator.name}`}
                                            className="w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-4">
                        <Button 
                            onClick={handleLink} 
                            disabled={loading || !selectedIndicator}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Linking...
                                </>
                            ) : (
                                'Link Indicator'
                            )}
                        </Button>

                        {selectedIndicatorData?.disaggregators && selectedIndicatorData.disaggregators.length > 0 && (
                            <Button
                                variant="outline"
                                onClick={handleSkipDisaggregators}
                                disabled={loading}
                                className="w-full"
                            >
                                Link Without Disaggregator Targets
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}