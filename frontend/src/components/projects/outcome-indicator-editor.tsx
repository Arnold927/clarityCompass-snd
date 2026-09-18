'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DisaggregatorManager } from '@/components/strategic-plan/disaggregator-manager';
import api from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Disaggregator {
  id: number;
  name: string;
  description?: string;
}

interface Indicator {
  id?: number | null;
  name: string;
  description?: string;
  disaggregators?: Disaggregator[];
  disaggregator_ids?: number[];
}

interface OutcomeIndicatorEditorProps {
  indicator: Indicator;
  isOpen: boolean;
  onClose: () => void;
  onSave: (indicator: Indicator) => void;
  title?: string;
}

export function OutcomeIndicatorEditor({
  indicator,
  isOpen,
  onClose,
  onSave,
  title = 'Outcome Indicator',
}: OutcomeIndicatorEditorProps) {
  const [name, setName] = useState(indicator.name || '');
  const [description, setDescription] = useState(indicator.description || '');
  const [selectedDisaggregatorIds, setSelectedDisaggregatorIds] = useState<number[]>([]);
  const [showDisaggregatorManager, setShowDisaggregatorManager] = useState(false);
  const [availableDisaggregators, setAvailableDisaggregators] = useState<Disaggregator[]>([]);

  // Initialize selected disaggregator IDs from the indicator
  useEffect(() => {
    if (indicator && isOpen) {
      setName(indicator.name || '');
      setDescription(indicator.description || '');
      
      // Extract IDs from disaggregators
      if (indicator.disaggregators && Array.isArray(indicator.disaggregators)) {
        const ids = indicator.disaggregators
          .map(d => d?.id)
          .filter(id => id && !isNaN(id));
        setSelectedDisaggregatorIds(ids);
      } else if (indicator.disaggregator_ids && Array.isArray(indicator.disaggregator_ids)) {
        const ids = indicator.disaggregator_ids.filter(id => id && !isNaN(id));
        setSelectedDisaggregatorIds(ids);
      } else {
        setSelectedDisaggregatorIds([]);
      }
    }
  }, [indicator, isOpen]);

  // Fetch available disaggregators when dialog opens
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
    
    // Filter out NaN or invalid IDs
    const validIds = selectedDisaggregatorIds.filter(id => id && !isNaN(id));
    
    const indicatorToSave: Indicator = {
      id: indicator.id,
      name,
      description,
      disaggregators: validIds.map(id => {
        const found = availableDisaggregators.find(d => d.id === id);
        return found || { id, name: '' };
      }),
      disaggregator_ids: validIds,
    };
    
    onSave(indicatorToSave);
  };

  const handleToggleDisaggregator = (disaggregatorId: number) => {
    if (!disaggregatorId || isNaN(disaggregatorId)) return;
    
    setSelectedDisaggregatorIds(prev => {
      if (prev.includes(disaggregatorId)) {
        return prev.filter(id => id !== disaggregatorId);
      } else {
        return [...prev, disaggregatorId];
      }
    });
  };

  const handleAddNewDisaggregator = async (newDisaggregatorName: string) => {
    try {
      const response = await api.post('/strategic/disaggregators/', {
        name: newDisaggregatorName,
      });
      const newDisaggregator = response.data;
      setAvailableDisaggregators(prev => [...prev, newDisaggregator]);
      setSelectedDisaggregatorIds(prev => [...prev, newDisaggregator.id]);
      return newDisaggregator;
    } catch (error) {
      console.error('Failed to create disaggregator:', error);
      throw error;
    }
  };

  const getDisaggregatorName = (id: number) => {
    if (!id || isNaN(id)) return 'Invalid ID';
    const disaggregator = availableDisaggregators.find(d => d.id === id);
    return disaggregator?.name || `Loading...`;
  };

  // Convert selected IDs to string NAMES for DisaggregatorManager
  const selectedDisaggregatorNames = selectedDisaggregatorIds
    .map(id => {
      const d = availableDisaggregators.find(d => d.id === id);
      return d?.name;
    })
    .filter((name): name is string => !!name);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
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
                
                {availableDisaggregators.length > 0 && (
                  <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                    {availableDisaggregators.map((disaggregator) => (
                      <div key={disaggregator.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`disaggregator-${disaggregator.id}`}
                          checked={selectedDisaggregatorIds.includes(disaggregator.id)}
                          onCheckedChange={() => handleToggleDisaggregator(disaggregator.id)}
                        />
                        <Label
                          htmlFor={`disaggregator-${disaggregator.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {disaggregator.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedDisaggregatorIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDisaggregatorIds.map((id) => (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {getDisaggregatorName(id)}
                        <button
                          type="button"
                          onClick={() => handleToggleDisaggregator(id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
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
        onSave={(selectedNames: string[]) => {
          // Convert selected NAMES back to IDs
          const selectedIds = selectedNames
            .map(name => {
              const disaggregator = availableDisaggregators.find(d => d.name === name);
              return disaggregator?.id;
            })
            .filter((id): id is number => !!id && !isNaN(id));
          
          setSelectedDisaggregatorIds(selectedIds);
          setShowDisaggregatorManager(false);
        }}
        onAddNew={handleAddNewDisaggregator}
        availableDisaggregators={availableDisaggregators}
        selectedDisaggregators={selectedDisaggregatorNames}
        indicatorName={name || 'this indicator'}
      />
    </>
  );
}