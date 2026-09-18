
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface ReportingScheduleProps {
    schedules: any[];
    submissions: any[];
    onUpload: (schedule: any) => void;
}

export function ReportingSchedule({ schedules, submissions, onUpload }: ReportingScheduleProps) {
    
     const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Accepted': return 'default';
            case 'Returned for Amendments': return 'secondary';
            case 'Rejected': return 'destructive';
            case 'Pending Review': return 'outline';
            default: return 'outline';
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Reporting Schedule</CardTitle>
                <CardDescription>
                    Manage and submit reports based on the project's reporting requirements.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4">
                    {schedules.map(schedule => {
                        const scheduleSubmissions = submissions.filter(sub => sub.scheduleId === schedule.id);
                        return (
                            <AccordionItem key={schedule.id} value={schedule.id} className="border-b-0">
                                <Card>
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className='flex justify-between items-center w-full'>
                                            <div className="text-left">
                                                <p className="font-semibold">{schedule.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Recipient: {schedule.recipient} &bull; Frequency: {schedule.frequency}
                                                </p>
                                            </div>
                                            <Badge variant="secondary">{scheduleSubmissions.length} Submission(s)</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={() => onUpload(schedule)}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Report
                                            </Button>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Report Title</TableHead>
                                                    <TableHead>Submission Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {scheduleSubmissions.map(sub => (
                                                    <TableRow key={sub.id}>
                                                        <TableCell className="font-medium">{sub.title}</TableCell>
                                                        <TableCell>{sub.date}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {scheduleSubmissions.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                            No submissions for this schedule yet.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
                {schedules.length === 0 && (
                     <p className="text-center text-muted-foreground py-8">No reporting schedules have been set for this project.</p>
                )}
            </CardContent>
        </Card>
    );
}
