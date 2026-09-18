'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import api from '@/lib/api';

interface IndicatorTargetsProps {
    indicators: any[];
    targets: any[];
    onSetTargets: (targets: any[]) => void;
    projectId?: string | number;
}

export function IndicatorTargets({ indicators, targets, onSetTargets, projectId }: IndicatorTargetsProps) {
    const [indicatorId, setIndicatorId] = useState('');
    const [year, setYear] = useState('');
    const [quarter, setQuarter] = useState('');
    const [value, setValue] = useState('');
    const [editingTarget, setEditingTarget] = useState<any>(null);
    const [deletingTarget, setDeletingTarget] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const projectIndicators = indicators.filter(indicator => 
        indicator.project == projectId ||
        indicator.project_id == projectId
    );

    const getIndicatorName = (id: string) => {
        return projectIndicators.find(i => i.id === id)?.name || 'Unknown Indicator';
    };

    const resetForm = () => {
        setIndicatorId('');
        setYear('');
        setQuarter('');
        setValue('');
        setEditingTarget(null);
    };

    useEffect(() => {
        const fetchTargets = async () => {
            try {
                if (!projectId) {
                    console.warn('No project ID provided');
                    setLoading(false);
                    return;
                }
                const res = await api.get('/projects/project-indicator-targets/');
                
                const projectTargets = res.data.filter((target: any) => {
                    const indicator = indicators.find(i => i.id === target.project_indicator);
                    return indicator && (indicator.project == projectId || indicator.project_id == projectId);
                }).map((t: any) => ({
                    id: t.id,
                    indicatorId: t.project_indicator,
                    year: t.financial_year,
                    quarter: t.quarter,
                    value: t.value,
                }));
                
                onSetTargets(projectTargets);
            } catch (err) {
                console.error('Failed to fetch targets', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTargets();
    }, [onSetTargets, projectId, indicators]);

    const handleSaveTarget = async () => {
        if (!indicatorId || !year || !quarter || !value) return;

        const payload = {
            project_indicator: indicatorId,
            financial_year: Number(year),
            quarter,
            value: Number(value),
        };

        try {
            if (editingTarget) {
                const res = await api.patch(`/projects/project-indicator-targets/${editingTarget.id}/`, payload);
                const updatedTarget = {
                    id: res.data.id,
                    indicatorId: res.data.project_indicator,
                    year: res.data.financial_year,
                    quarter: res.data.quarter,
                    value: res.data.value,
                };
                onSetTargets(targets.map(t => t.id === editingTarget.id ? updatedTarget : t));
            } else {
                const res = await api.post('/projects/project-indicator-targets/', payload);
                const newTarget = {
                    id: res.data.id,
                    indicatorId: res.data.project_indicator,
                    year: res.data.financial_year,
                    quarter: res.data.quarter,
                    value: res.data.value,
                };
                onSetTargets([...targets, newTarget]);
            }
            resetForm();
        } catch (err) {
            console.error("Failed to save target", err);
        }
    };

    const handleEditTarget = (target: any) => {
        setEditingTarget(target);
        setIndicatorId(target.indicatorId);
        setYear(target.year.toString());
        setQuarter(target.quarter);
        setValue(target.value.toString());
    };

    const handleDeleteTarget = async () => {
        if (!deletingTarget) return;

        try {
            await api.delete(`/projects/project-indicator-targets/${deletingTarget.id}/`);
            onSetTargets(targets.filter(t => t.id !== deletingTarget.id));
            setDeletingTarget(null);
        } catch (err) {
            console.error("Failed to delete target", err);
        }
    };

    if (loading) {
        return <div>Loading targets...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>{editingTarget ? 'Edit Target' : 'Set New Target'}</CardTitle>
                        <CardDescription>
                            {editingTarget ? 'Update the quarterly target for a project indicator.' : 'Define a new quarterly target for a project indicator.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="indicator">Indicator</Label>
                            <Select onValueChange={setIndicatorId} value={indicatorId}>
                                <SelectTrigger id="indicator">
                                    <SelectValue placeholder="Select an indicator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projectIndicators.map(ind => (
                                        <SelectItem key={ind.id} value={ind.id}>{ind.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Financial Year</Label>
                            <Input id="year" placeholder="e.g., 2025" value={year} onChange={e => setYear(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quarter">Quarter</Label>
                            <Select onValueChange={setQuarter} value={quarter}>
                                <SelectTrigger id="quarter">
                                    <SelectValue placeholder="Select a quarter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Q1">Q1 (Jan - Mar)</SelectItem>
                                    <SelectItem value="Q2">Q2 (Apr - Jun)</SelectItem>
                                    <SelectItem value="Q3">Q3 (Jul - Sep)</SelectItem>
                                    <SelectItem value="Q4">Q4 (Oct - Dec)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="value">Target Value</Label>
                            <Input id="value" type="number" placeholder="Enter target value" value={value} onChange={e => setValue(e.target.value)} />
                        </div>
                        <Button onClick={handleSaveTarget} className="w-full" disabled={!indicatorId}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {editingTarget ? 'Update Target' : 'Add Target'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Existing Targets</CardTitle>
                        <CardDescription>A list of all defined targets for this project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Indicator</TableHead>
                                    <TableHead>Year</TableHead>
                                    <TableHead>Quarter</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {targets.map(target => (
                                    <TableRow key={target.id}>
                                        <TableCell>{getIndicatorName(target.indicatorId)}</TableCell>
                                        <TableCell>{target.year}</TableCell>
                                        <TableCell>{target.quarter}</TableCell>
                                        <TableCell>{target.value}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditTarget(target)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setDeletingTarget(target)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {targets.length === 0 && <p className="text-center text-muted-foreground pt-8">No targets set for this project yet.</p>}
                    </CardContent>
                </Card>
            </div>

            {deletingTarget && (
                <AlertDialog open={!!deletingTarget} onOpenChange={() => setDeletingTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the target of "{deletingTarget.value}" for {getIndicatorName(deletingTarget.indicatorId)} for {deletingTarget.quarter}, {deletingTarget.year}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTarget} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}