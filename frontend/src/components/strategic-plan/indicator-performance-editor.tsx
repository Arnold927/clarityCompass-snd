'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface IndicatorPerformanceEditorProps {
    performance: any;
    planYears: any[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (performance: any) => void;
}

export function IndicatorPerformanceEditor({
    performance,
    planYears,
    isOpen,
    onClose,
    onSave,
}: IndicatorPerformanceEditorProps) {
    const [formData, setFormData] = useState({
        year: '',
        target: '0',
        actual: '0',
        comments: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (performance) {
            setFormData({
                year: performance.year?.toString() || performance.year_detail?.id?.toString() || '',
                target: performance.target?.toString() || '0',
                actual: performance.actual?.toString() || '0',
                comments: performance.comments || '',
            });
        }
    }, [performance]);

    const targetIsSet = parseFloat(formData.target) > 0;

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.year) {
            newErrors.year = 'Please select a year';
        }
        
        const targetNum = parseFloat(formData.target);
        if (isNaN(targetNum) || targetNum < 0) {
            newErrors.target = 'Target must be a valid non-negative number';
        }

        if (!targetIsSet) {
            newErrors.actual = 'A target must be set before entering an actual value';
        } else {
            const actualNum = parseFloat(formData.actual);
            if (isNaN(actualNum) || actualNum < 0) {
                newErrors.actual = 'Actual must be a valid non-negative number';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        
        onSave({
            ...performance,
            id: performance?.id,
            indicator: performance?.indicator,
            year: formData.year,
            target: parseFloat(formData.target),
            actual: parseFloat(formData.actual),
            comments: formData.comments,
        });
        
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {performance?.id ? 'Edit' : 'Add'} Indicator Performance
                    </DialogTitle>
                    <DialogDescription>
                        Enter performance data for this corporate indicator
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="year">Year *</Label>
                        <Select
                            value={formData.year}
                            onValueChange={(value) => setFormData({ ...formData, year: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a year" />
                            </SelectTrigger>
                            <SelectContent>
                                {planYears.map((year) => (
                                    <SelectItem key={year.id} value={year.id.toString()}>
                                        {year.year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.year && (
                            <p className="text-sm text-destructive">{errors.year}</p>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="target">Target *</Label>
                            <Input
                                id="target"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                            />
                            {errors.target && (
                                <p className="text-sm text-destructive">{errors.target}</p>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="actual" className={!targetIsSet ? 'text-muted-foreground' : ''}>
                                Actual *
                            </Label>
                            <Input
                                id="actual"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.actual}
                                onChange={(e) => setFormData({ ...formData, actual: e.target.value })}
                                disabled={!targetIsSet}
                                className={!targetIsSet ? 'cursor-not-allowed opacity-50' : ''}
                            />
                            {!targetIsSet ? (
                                <p className="text-sm text-muted-foreground">Set and save a target greater than 0 first</p>
                            ) : errors.actual ? (
                                <p className="text-sm text-destructive">{errors.actual}</p>
                            ) : null}
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="comments">Comments</Label>
                        <Textarea
                            id="comments"
                            value={formData.comments}
                            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                            placeholder="Add any notes or context for this performance..."
                            rows={3}
                        />
                    </div>
                    
                    {/* Preview */}
                    {formData.target && formData.actual && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Preview</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Target</p>
                                    <p className="font-semibold">{parseFloat(formData.target).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Actual</p>
                                    <p className="font-semibold">{parseFloat(formData.actual).toLocaleString()}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-muted-foreground">Achievement</p>
                                    <p className={`font-bold ${
                                        parseFloat(formData.actual) >= parseFloat(formData.target) 
                                            ? 'text-green-600' 
                                            : parseFloat(formData.actual) >= parseFloat(formData.target) * 0.8 
                                            ? 'text-yellow-600' 
                                            : 'text-red-600'
                                    }`}>
                                        {parseFloat(formData.target) > 0 
                                            ? ((parseFloat(formData.actual) / parseFloat(formData.target)) * 100).toFixed(1)
                                            : 0
                                        }%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        {performance?.id ? 'Update' : 'Save'} Performance
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}