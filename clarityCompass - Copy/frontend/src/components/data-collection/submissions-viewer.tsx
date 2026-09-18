

'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

export function SubmissionsViewer({ form, submissions }: { form: any, submissions: any[] }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!form || submissions.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <p>No submissions have been recorded for this form yet.</p>
            </div>
        );
    }
    
    const getDisplayValue = (field: any, value: any) => {
        if (value === null || value === undefined) return <span className="text-muted-foreground">N/A</span>;

        if (field.type === 'checkbox') {
            return Array.isArray(value) ? value.join(', ') : (value ? 'Checked' : 'Unchecked');
        }
        if (field.type === 'date' && value) {
            return isClient ? format(new Date(value), 'PPP') : <Skeleton className="h-4 w-24" />;
        }
        if (field.type === 'field_group') {
             if (!Array.isArray(value) || value.length === 0) return <span className="text-muted-foreground text-xs">No entries</span>;
             return (
                <div className="space-y-2">
                    {value.map((entry, index) => (
                        <div key={index} className="flex flex-wrap gap-x-4 gap-y-1 p-2 rounded-md bg-muted/50">
                            {field.fields.map((subField: any) => (
                                <div key={subField.id} className="flex items-baseline text-xs">
                                    <span className="font-semibold mr-1">{subField.label}:</span>
                                    <span>{entry[subField.id] ?? 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
             );
        }
        
        return String(value);
    }


    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Submitted Date</TableHead>
                        <TableHead>Submitted Time</TableHead>
                        {form.fields.map((field: any) => (
                            <TableHead key={field.id}>{field.label}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.map((submission: any) => (
                        <TableRow key={submission.id}>
                            <TableCell>{isClient ? format(new Date(submission.submittedAt), 'PPP') : <Skeleton className="h-4 w-24" />}</TableCell>
                            <TableCell>{isClient ? format(new Date(submission.submittedAt), 'p') : <Skeleton className="h-4 w-16" />}</TableCell>
                            {form.fields.map((field: any) => (
                                <TableCell key={field.id} className="align-top">
                                    {getDisplayValue(field, submission.data[field.id])}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
