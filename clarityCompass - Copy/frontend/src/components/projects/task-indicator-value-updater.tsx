import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface DisaggregatedValue {
    disaggregator_id: number;
    disaggregator_name: string;
    target: number | null;
    actual: number;
}

interface TaskIndicatorValueUpdaterProps {
    taskId: number;
    indicatorProgressId: number;
    indicatorName: string;
    disaggregators: DisaggregatedValue[];
    onUpdated: () => void;
}

export function TaskIndicatorValueUpdater({ 
    taskId, 
    indicatorProgressId, 
    indicatorName,
    disaggregators, 
    onUpdated 
}: TaskIndicatorValueUpdaterProps) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        if (open) {
            const initialValues: Record<number, string> = {};
            disaggregators.forEach(d => {
                initialValues[d.disaggregator_id] = d.actual?.toString() || '';
            });
            setValues(initialValues);
        }
    }, [open, disaggregators]);

    const handleValueChange = (disaggregatorId: number, value: string) => {
        setValues(prev => ({
            ...prev,
            [disaggregatorId]: value
        }));
    };

    const handleSave = async () => {
    setLoading(true);
    try {
        const valuesToUpdate = Object.entries(values).map(([disaggregatorId, value]) => {
            const disaggregator = disaggregators.find(d => d.disaggregator_id === parseInt(disaggregatorId));
            return {
                disaggregator_id: parseInt(disaggregatorId),
                actual: value === '' ? 0 : parseFloat(value),
                target: disaggregator?.target || 0
            };
        });

        await api.post(
            `/tasks/tasks/${taskId}/indicators/${indicatorProgressId}/bulk-update-actuals/`,
            { values: valuesToUpdate }
        );

        toast({
            title: "Success",
            description: "Actual values updated successfully",
        });

        setOpen(false);
        onUpdated();
    } catch (error: any) {
        console.error('Error updating values:', error);
        toast({
            title: "Error",
            description: error.response?.data?.error || "Failed to update values",
            variant: "destructive",
        });
    } finally {
        setLoading(false);
    }
};

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <Edit className="h-3 w-3" />
                    Update Actuals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Actual Values</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Update actual values for <span className="font-medium text-foreground">{indicatorName}</span>
                    </p>
                    
                    <div className="space-y-3">
                        {disaggregators.map((d) => (
                            <div key={d.disaggregator_id} className="space-y-1">
                                <Label htmlFor={`disagg-${d.disaggregator_id}`} className="text-sm font-medium">
                                    {d.disaggregator_name}
                                    {d.target !== null && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            Target: {d.target}
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    id={`disagg-${d.disaggregator_id}`}
                                    type="number"
                                    step="0.01"
                                    value={values[d.disaggregator_id] || ''}
                                    onChange={(e) => handleValueChange(d.disaggregator_id, e.target.value)}
                                    placeholder="Enter actual value"
                                    className="w-full"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="gap-2">
                            <Save className="h-4 w-4" />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}