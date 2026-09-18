import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

export function IndicatorPerformanceEditor({
  indicator,
  quarter,
  performance,
  onSave,
  onClose,
}: {
  indicator: any;
  quarter: any;
  performance: any | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    target: '',
    actual: '',
    comments: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (performance && performance.quarter !== quarter?.id) {
      console.log('Performance belongs to different quarter, treating as new');
      setFormData({
        target: '',
        actual: '',
        comments: '',
      });
    } else if (performance) {
      setFormData({
        target: performance.target?.toString() || '',
        actual: performance.actual?.toString() || '',
        comments: performance.comments || '',
      });
    } else {
      setFormData({
        target: '',
        actual: '',
        comments: '',
      });
    }
  }, [performance, indicator?.id, quarter?.id]);
  
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!indicator?.id || !quarter?.id) {
    toast.error('Indicator or quarter not selected');
    return;
  }

  if (performance?.id && performance.quarter !== quarter.id) {
    toast.error('Performance data mismatch. Please try again.');
    return;
  }

  try {
    setSaving(true);
    
    const targetValue = formData.target === '' ? 0 : parseFloat(formData.target);
    const actualValue = formData.actual === '' ? 0 : parseFloat(formData.actual);
    
    const payload = {
      indicator: indicator.id,
      quarter: quarter.id,
      target: isNaN(targetValue) ? 0 : targetValue,
      actual: isNaN(actualValue) ? 0 : actualValue,
      comments: formData.comments || '',
    };

    if (performance?.id && performance.quarter === quarter.id) {
      await api.put(`/programs/program-outcome-indicator-performance/${performance.id}/`, payload);
      toast.success('Performance updated successfully');
    } else {
      await api.post('/programs/program-outcome-indicator-performance/', payload);
      toast.success('Performance saved successfully');
    }
    
    onSave();
    onClose();
  } catch (error: any) {
    console.error('Failed to save performance:', error);
    toast.error(error.response?.data?.message || 'Failed to save performance');
  } finally {
    setSaving(false);
  }
};

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {performance?.id ? 'Edit Performance' : `Add Performance for Q${quarter?.quarter} ${quarter?.year}`}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Indicator</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {indicator?.name_override || indicator?.corporate_indicator?.name}
            </p>
          </div>

          <div>
            <Label>Quarter</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {quarter?.year} Q{quarter?.quarter}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target">Target</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                // required
                placeholder="Enter target"
              />
            </div>
            <div>
              <Label htmlFor="actual">Actual</Label>
              <Input
                id="actual"
                type="number"
                step="0.01"
                value={formData.actual}
                onChange={(e) => setFormData({ ...formData, actual: e.target.value })}
                placeholder="Enter actual"
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
              placeholder="Add any comments about this performance..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Performance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}