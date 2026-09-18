import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ObjectivePerformanceEditor({ performance, planYears, isOpen, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        year: '',
        target: 0,
        actual: 0,
        comments: '',
    });

    const getYearId = (performance: any) => {
        if (!performance) return '';
        
        if (performance.year && typeof performance.year === 'number') {
            return performance.year.toString();
        }
        if (performance.year && typeof performance.year === 'string') {
            return performance.year;
        }
        
        if (performance.year_detail && performance.year_detail.id) {
            return performance.year_detail.id.toString();
        }
        
        if (performance.year && performance.year.id) {
            return performance.year.id.toString();
        }
        
        return '';
    };

    useEffect(() => {
        if (performance) {
            const yearId = getYearId(performance);
            
            setFormData({
                year: yearId,
                target: performance.target || 0,
                actual: performance.actual || 0,
                comments: performance.comments || '',
            });
        }
    }, [performance]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...performance, ...formData });
    };

    const selectedYear = planYears.find((y: any) => 
        y.id === parseInt(formData.year) || y.id.toString() === formData.year
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {performance?.id ? 'Edit Performance' : 'Add Performance'} 
                        {selectedYear && ` for ${selectedYear.year}`}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="year">Year</Label>
                        <Select
                            value={formData.year}
                            onValueChange={(value) => setFormData({ ...formData, year: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select year">
                                    {selectedYear ? `Year ${selectedYear.year}` : "Select year"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {planYears.map((year: any) => (
                                    <SelectItem key={year.id} value={year.id.toString()}>
                                        {year.year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="target">Target</Label>
                            <Input
                                id="target"
                                type="number"
                                step="0.01"
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="actual">Actual</Label>
                            <Input
                                id="actual"
                                type="number"
                                step="0.01"
                                value={formData.actual}
                                onChange={(e) => setFormData({ ...formData, actual: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="comments">Comments</Label>
                        <Textarea
                            id="comments"
                            value={formData.comments}
                            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {performance?.id ? 'Update' : 'Add'} Performance
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}