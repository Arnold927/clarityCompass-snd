'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, getQuarter } from "date-fns";
import { Input } from '../ui/input';
import { useDebounce } from "use-debounce";
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';

interface TaskQaProps {
    tasks: any[];
    indicators: any[];
    activities: any[];
    targets: any[];
    reports: any[];
    onAdjust: (qaItem: any) => void;
    onDelete: (qaItem: any) => void;
}

export function TaskQa({ tasks, indicators, activities, targets, reports, onAdjust, onDelete }: TaskQaProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
    const qaData = useMemo(() => {
        const grouped: { [key: string]: any } = {};

        tasks.forEach(task => {
            const activity = activities.find(a => a.id === task.activityId);

            indicators.forEach(indicator => {
                if (task.linkedIndicatorId !== indicator.id) return;

                const groupKey = `${task.id}-${indicator.id}`;
                if (!grouped[groupKey]) {
                    const taskDate = new Date(task.startDate);
                    const taskYear = taskDate.getFullYear();
                    const taskQuarter = `Q${getQuarter(taskDate)}`;
                    const target = targets.find(t =>
                        t.project_indicator === indicator.id &&
                        t.financial_year === taskYear &&
                        t.quarter === taskQuarter
                    );

                    grouped[groupKey] = {
                        taskId: task.id,
                        taskTitle: task.title,
                        focalPersonName: task.focal_person?.member_name || task.focal_person?.user?.username || 'N/A',
                        startDate: task.startDate,
                        endDate: task.endDate,
                        indicatorId: indicator.id,
                        indicatorName: indicator.name,
                        disaggregators: [],
                        target: target ? target.value : null,
                        hasAdjustments: false,
                        totalFinalValue: 0,
                        performance: null,
                    };
                }

                const disaggKeys = indicator.disaggregators.length > 0 ? indicator.disaggregators : ['value'];

                disaggKeys.forEach((d: any) => {
                    const report = reports.find(r => r.task === task.id && r.indicator === indicator.id);

                    const reportedValue = report?.reported_data?.[d] ?? 0;

                    const adjustment = task.qaAdjustments?.[indicator.id]?.[d] || { value: 0, justification: '' };
                    const finalValue = reportedValue + Number(adjustment.value);

                    grouped[groupKey].disaggregators.push({
                        name: d,
                        reportedValue,
                        adjustment,
                        finalValue,
                    });

                    grouped[groupKey].totalFinalValue += finalValue;
                    if (adjustment.value !== 0 || adjustment.justification) grouped[groupKey].hasAdjustments = true;
                });

                if (grouped[groupKey].target !== null) {
                    grouped[groupKey].performance = grouped[groupKey].target > 0
                        ? (grouped[groupKey].totalFinalValue / grouped[groupKey].target) * 100
                        : 0;
                }
            });
        });

        return Object.values(grouped);
    }, [tasks, indicators, activities, targets, reports]);

    const filteredQaData = useMemo(() => {
        if (!qaData || !Array.isArray(qaData)) return [];
        const term = debouncedSearchTerm.toLowerCase();
        return qaData.filter(item =>
            (item.taskTitle || '').toLowerCase().includes(term) ||
            (item.indicatorName || '').toLowerCase().includes(term) ||
            (item.focalPersonName || '').toLowerCase().includes(term)
        );
    }, [qaData, debouncedSearchTerm]);

    return (
        <Card>
            <CardHeader>
                <div className='flex-row items-start justify-between'>
                    <CardTitle>Task Quality Assurance</CardTitle>
                    <CardDescription>Review and adjust reported indicator data from tasks.</CardDescription>
                </div>
                <div className="mt-4">
                    <Input
                        placeholder="Search by task, indicator, or focal person..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[20%]">Task</TableHead>
                            <TableHead className="w-[20%]">Indicator</TableHead>
                            <TableHead>Reported</TableHead>
                            <TableHead>Adj.</TableHead>
                            <TableHead>Final</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="w-[15%]">Performance</TableHead>
                            <TableHead className="text-right w-[10%]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredQaData.map(item => (
                            <TableRow key={`${item.taskId}-${item.indicatorId}`}>
                                <TableCell>
                                    <p className="font-medium">{item.taskTitle}</p>
                                    <p className="text-sm text-muted-foreground">{item.focalPersonName}</p>
                                </TableCell>
                                <TableCell>
                                    <p className="font-medium">{item.indicatorName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(item.startDate), 'MMM d, yyyy')}
                                    </p>
                                </TableCell>
                                <TableCell className="space-y-2 text-muted-foreground">
                                    {item.disaggregators.map((d: any) => (
                                        <div key={d.name} className="flex items-center">{d.reportedValue}</div>
                                    ))}
                                </TableCell>
                                <TableCell className="space-y-2">
                                    {item.disaggregators.map((d:any) => (
                                        <div key={d.name} className="flex items-center" title={d.adjustment.justification}>
                                            <p className={d.adjustment.value > 0 ? 'text-green-600' : d.adjustment.value < 0 ? 'text-red-600' : ''}>
                                                {d.adjustment.value !== 0 ? d.adjustment.value : '-'}
                                            </p>
                                        </div>
                                    ))}
                                </TableCell>
                                <TableCell className="space-y-2 font-semibold">
                                    {item.disaggregators.map((d:any) => (
                                        <div key={d.name} className="flex items-center">{d.finalValue}</div>
                                    ))}
                                </TableCell>
                                <TableCell>
                                    {item.target !== null ? item.target : <span className="text-muted-foreground text-xs">N/A</span>}
                                </TableCell>
                                <TableCell>
                                    {item.performance !== null ? (
                                        <div className="flex items-center gap-2">
                                            <Progress value={item.performance} className="h-2 w-full" />
                                            <span className="text-xs font-medium text-muted-foreground">{item.performance.toFixed(0)}%</span>
                                        </div>
                                    ) : <span className="text-muted-foreground text-xs">No target set</span>}
                                </TableCell>
                                <TableCell className="text-right space-x-1 align-top">
                                    <Button variant="outline" size="sm" onClick={() => onAdjust(item)}>
                                        {item.hasAdjustments ? 'Edit' : 'Adjust'}
                                    </Button>
                                    {item.hasAdjustments && (
                                        <Button variant="destructive" size="icon" className='h-9 w-9' onClick={() => onDelete(item)}>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {filteredQaData.length === 0 && (
                    <p className="text-center text-muted-foreground mt-4">
                        {qaData.length === 0 ? "No indicator data has been reported for any tasks yet." : "No results found for your search."}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
