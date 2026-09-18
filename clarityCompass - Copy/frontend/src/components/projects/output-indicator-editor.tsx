'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DisaggregatorManager } from '@/components/strategic-plan/disaggregator-manager';
import api from '@/lib/api';

interface Indicator {
  id?: number | null;
  name: string;
  description?: string;
  disaggregators?: string[];
}

interface OutputIndicatorEditorProps {
  indicator: Indicator;
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicator: Indicator) => void;
  title?: string;
}

export function OutputIndicatorEditor({
  indicator,
  isOpen,
  onClose,
  onSave,
  title = 'Output Indicator',
}: OutputIndicatorEditorProps) {
  const [name, setName] = useState(indicator.name || '');
  const [description, setDescription] = useState(indicator.description || '');
  const [disaggregators, setDisaggregators] = useState<string[]>(indicator.disaggregators || []);
  const [showDisaggregatorManager, setShowDisaggregatorManager] = useState(false);
  const [availableDisaggregators, setAvailableDisaggregators] = useState<any[]>([]);

  useEffect(() => {
    if (indicator) {
      setName(indicator.name || '');
      setDescription(indicator.description || '');
      setDisaggregators(indicator.disaggregators || []);
    }
  }, [indicator]);

  useEffect(() => {
    const fetchDisaggregators = async () => {
      try {
        const response = await api.get('/strategic/disaggregators/');
        setAvailableDisaggregators(response.data);
      } catch (error) {
        console.error('Failed to fetch disaggregators:', error);
      }
    };

    if (isOpen) {
      fetchDisaggregators();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...indicator,
      name,
      description,
      disaggregators,
    });
  };

  const handleAddDisaggregator = (newDisaggregator: string) => {
    console.log('Add new disaggregator:', newDisaggregator);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Indicator Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter indicator name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter indicator description"
                  rows={3}
                />
              </div>
              
              {/* Disaggregators Section */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Disaggregators</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisaggregatorManager(true)}
                  >
                    Manage Disaggregators
                  </Button>
                </div>
                {disaggregators.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {disaggregators.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No disaggregators selected</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DisaggregatorManager
        isOpen={showDisaggregatorManager}
        onClose={() => setShowDisaggregatorManager(false)}
        onSave={(selected) => {
          setDisaggregators(selected);
          setShowDisaggregatorManager(false);
        }}
        onAddNew={handleAddDisaggregator}
        availableDisaggregators={availableDisaggregators}
        selectedDisaggregators={disaggregators}
        indicatorName={name || 'this indicator'}
      />
    </>
  );
}