import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function StrategicPlanYearEditor({ year, isOpen, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        year: year?.year || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...year, ...formData });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{year?.id ? 'Edit Plan Year' : 'Add Plan Year'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="year">Year</Label>
                        <Input
                            id="year"
                            type="number"
                            min="2000"
                            max="2100"
                            value={formData.year}
                            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {year?.id ? 'Update' : 'Add'} Year
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}