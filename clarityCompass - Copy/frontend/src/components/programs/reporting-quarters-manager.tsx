'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

export function ReportingQuartersManager() {
  const [quarters, setQuarters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingQuarter, setEditingQuarter] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchQuarters();
  }, []);

  const fetchQuarters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reporting-quarters/');
      const data = response.data?.results || response.data || [];
      setQuarters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch reporting quarters:', error);
      toast.error('Failed to load reporting quarters');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuarter = async (formData: any) => {
    try {
      const payload = {
        year: parseInt(formData.year),
        quarter: parseInt(formData.quarter),
        start_date: formData.start_date,
        end_date: formData.end_date,
      };

      if (editingQuarter?.id) {
        await api.put(`/reporting-quarters/${editingQuarter.id}/`, payload);
        toast.success('Quarter updated successfully');
      } else {
        await api.post('/reporting-quarters/', payload);
        toast.success('Quarter created successfully');
      }

      fetchQuarters();
      setIsDialogOpen(false);
      setEditingQuarter(null);
    } catch (error: any) {
      console.error('Failed to save quarter:', error);
      toast.error(error.response?.data?.message || 'Failed to save quarter');
    }
  };

  const handleDeleteQuarter = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quarter? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/reporting-quarters/${id}/`);
      toast.success('Quarter deleted successfully');
      fetchQuarters();
    } catch (error: any) {
      console.error('Failed to delete quarter:', error);
      toast.error(error.response?.data?.message || 'Failed to delete quarter');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporting Quarters Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={() => {
            setEditingQuarter(null);
            setIsDialogOpen(true);
          }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Quarter
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Quarter</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : quarters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No reporting quarters defined
                </TableCell>
              </TableRow>
            ) : (
              quarters.map((quarter) => (
                <TableRow key={quarter.id}>
                  <TableCell>{quarter.year}</TableCell>
                  <TableCell>Q{quarter.quarter}</TableCell>
                  <TableCell>{new Date(quarter.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(quarter.end_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingQuarter(quarter);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeleteQuarter(quarter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingQuarter ? 'Edit Quarter' : 'Add Quarter'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleSaveQuarter(Object.fromEntries(formData.entries()));
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    defaultValue={editingQuarter?.year || new Date().getFullYear()}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quarter">Quarter</Label>
                  <Select
                    name="quarter"
                    defaultValue={editingQuarter?.quarter?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={editingQuarter?.start_date?.split('T')[0] || ''}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={editingQuarter?.end_date?.split('T')[0] || ''}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingQuarter(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingQuarter ? 'Update' : 'Create'} Quarter
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}