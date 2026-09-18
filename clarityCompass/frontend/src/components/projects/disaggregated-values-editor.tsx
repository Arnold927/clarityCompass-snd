'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { Trash2 } from 'lucide-react';

interface DisaggregatedValue {
  id?: number;
  disaggregator: number;
  disaggregator_name: string;
  target?: number | null;
  actual?: number | null;
}

interface Disaggregator {
  id: number;
  name: string;
}

interface DisaggregatedValuesEditorProps {
  indicatorId: number;
  indicatorName: string;
  type: 'outcome' | 'output';
  disaggregators: Disaggregator[];
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function DisaggregatedValuesEditor({
  indicatorId,
  indicatorName,
  type,
  disaggregators,
  isOpen,
  onClose,
  onSave,
}: DisaggregatedValuesEditorProps) {
  const [values, setValues] = useState<DisaggregatedValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('targets');

  // Actuals tab is only accessible when at least one target has been saved (has an id) with a value > 0
  const hasAnySavedTarget = values.some(v => v.id != null && v.target != null && Number(v.target) > 0);

  useEffect(() => {
    if (isOpen && indicatorId) {
      fetchDisaggregatedValues();
    }
  }, [isOpen, indicatorId]);

  const fetchDisaggregatedValues = async () => {
    setLoading(true);
    try {
      const params = type === 'outcome' 
        ? { outcome_indicator: indicatorId }
        : { output_indicator: indicatorId };
      
      const response = await api.get('/projects/indicator-disaggregated-values/', { params });
      
      if (response.data.length > 0) {
        setValues(response.data);
      } else {
        const initialValues = disaggregators.map(d => ({
          disaggregator: d.id,
          disaggregator_name: d.name,
          target: null,
          actual: null,
        }));
        setValues(initialValues);
      }
    } catch (error) {
      console.error('Failed to fetch disaggregated values:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDisaggregator = (disaggregatorId: number) => {
    setValues(values.filter(v => v.disaggregator !== disaggregatorId));
  };

  const handleValueChange = (
    disaggregatorId: number,
    field: 'target' | 'actual',
    value: string
  ) => {
    setValues(prevValues => 
      prevValues.map(v => 
        v.disaggregator === disaggregatorId
          ? { 
              ...v, 
              [field]: value === '' ? null : Number(parseFloat(value).toFixed(2))
            }
          : v
      )
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const value of values) {
        const payload: any = {
          disaggregator: value.disaggregator,
          target: value.target !== null ? Number(value.target) : null,
          actual: value.actual !== null ? Number(value.actual) : null,
        };

        if (type === 'outcome') {
          payload.outcome_indicator = indicatorId;
        } else {
          payload.output_indicator = indicatorId;
        }

        if (value.id) {
          await api.put(`/projects/indicator-disaggregated-values/${value.id}/`, payload);
        } else {
          await api.post('/projects/indicator-disaggregated-values/', payload);
        }
      }

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save disaggregated values:', error);
      alert('Failed to save values');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Disaggregated Values - {indicatorName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(tab) => {
          // Prevent switching to actuals if no targets have been saved yet
          if (tab === 'actuals' && !hasAnySavedTarget) return;
          setActiveTab(tab);
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger
              value="actuals"
              disabled={!hasAnySavedTarget}
              title={!hasAnySavedTarget ? 'Save targets first before entering actuals' : undefined}
              className={!hasAnySavedTarget ? 'cursor-not-allowed opacity-50' : ''}
            >
              Actuals
            </TabsTrigger>
          </TabsList>

          {!hasAnySavedTarget && (
            <p className="text-sm text-muted-foreground mt-2 px-1">
              Save your targets first before entering actuals.
            </p>
          )}

          <TabsContent value="targets" className="space-y-6">
            {values.length > 0 ? (
              <div className="border rounded-lg p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disaggregator</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {values.map((value) => (
                      <TableRow key={value.disaggregator}>
                        <TableCell className="font-medium">{value.disaggregator_name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={value.target ?? ''}
                            onChange={(e) => handleValueChange(value.disaggregator, 'target', e.target.value)}
                            className="w-32 ml-auto"
                            placeholder="Enter target"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleRemoveDisaggregator(value.disaggregator)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No disaggregators defined for this indicator.
              </p>
            )}
          </TabsContent>

          <TabsContent value="actuals" className="space-y-6">
            {values.length > 0 ? (
              <div className="border rounded-lg p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disaggregator</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {values.map((value) => {
                      const progress = value.target && value.actual
                        ? Math.min(100, Math.round((Number(value.actual) / Number(value.target)) * 100))
                        : 0;
                      
                      return (
                        <TableRow key={value.disaggregator}>
                          <TableCell className="font-medium">{value.disaggregator_name}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              value={value.actual ?? ''}
                              onChange={(e) => handleValueChange(value.disaggregator, 'actual', e.target.value)}
                              className={`w-32 ml-auto ${!value.target ? 'cursor-not-allowed opacity-50' : ''}`}
                              placeholder={value.target ? "Enter actual" : "No target set"}
                              disabled={!value.target}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {value.target?.toLocaleString() || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary rounded-full h-2" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10">
                                {progress}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No disaggregators defined for this indicator.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}