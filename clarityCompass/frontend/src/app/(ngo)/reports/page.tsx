'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Upload, PlusCircle, Edit, Trash2, Filter, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ReportUploader } from '@/components/shared/report-uploader';
import { ScheduleEditor } from '@/components/shared/schedule-editor';
import SubmissionReviewModal from '@/components/shared/submission-review-modal';
import SubmissionHistoryDialog from '@/components/shared/submission-history-modal';
import SubmissionEditModal from '@/components/shared/submission-edit-modal';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import api from '@/lib/api';

const reportRecipients = ["Donor", "Internal M&E", "Board"];
const reportFrequencies = ["Daily", "Weekly", "Monthly", "Quarterly", "Bi-Annually", "Annually"];
const submissionStatuses = ["All", "Pending Review", "Accepted", "Returned for Amendments", "Rejected"];

const ITEMS_PER_PAGE = 10;
const PAGINATION_OPTIONS = [5, 10, 20, 50];

export default function ReportsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [uploadingFor, setUploadingFor] = useState<any>(null);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [deletingSchedule, setDeletingSchedule] = useState<any>(null);

    const [pagination, setPagination] = useState<Record<string, { page: number; itemsPerPage: number }>>({});
    
    const [filters, setFilters] = useState<Record<string, {
        search: string;
        status: string;
        sortBy: 'date' | 'title' | 'status';
        sortOrder: 'asc' | 'desc';
    }>>({});

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects/');
                const data = res.data;

                const normalized = data.map((p: any) => ({
                    ...p,
                    reporting: {
                        schedules: p.reporting?.schedules || [],
                        submissions: p.reporting?.submissions || [],
                    },
                }));

                setProjects(normalized);
                
                const initialPagination: typeof pagination = {};
                const initialFilters: typeof filters = {};
                
                normalized.forEach((project: any) => {
                    project.reporting.schedules.forEach((schedule: any) => {
                        const scheduleKey = `${project.id}-${schedule.id}`;
                        initialPagination[scheduleKey] = { page: 1, itemsPerPage: ITEMS_PER_PAGE };
                        initialFilters[scheduleKey] = {
                            search: '',
                            status: 'All',
                            sortBy: 'date',
                            sortOrder: 'desc'
                        };
                    });
                });
                
                setPagination(initialPagination);
                setFilters(initialFilters);
            } catch (err) {
                console.error('Failed to load projects:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Accepted': return 'default';
            case 'Returned for Amendments': return 'secondary';
            case 'Rejected': return 'destructive';
            case 'Pending Review': return 'outline';
            default: return 'outline';
        }
    };

    const frequencyMap: Record<string, string> = {
        "Daily": "DAILY",
        "Weekly": "WEEKLY",
        "Monthly": "MONTHLY",
        "Quarterly": "QUARTERLY",
        "Bi-Annually": "BI-ANNUALLY",
        "Annually": "ANNUALLY",
    };
    
    const frequencyMapReverse: Record<string, string> = {
        DAILY: "Daily",
        WEEKLY: "Weekly",
        MONTHLY: "Monthly",
        QUARTERLY: "Quarterly",
        "BI-ANNUALLY": "Bi-Annually",
        ANNUALLY: "Annually",
    };

    const handleSaveSchedule = async (scheduleDetails: { id?: string; name: string; recipient: string; frequency: string }) => {
        if (!editingSchedule) return;

        const { projectId } = editingSchedule;

        try {
            const payload = {
                ...scheduleDetails,
                frequency: frequencyMap[scheduleDetails.frequency]
            };

            let response;
            if (scheduleDetails.id) {
                response = await api.patch(`/projects/${projectId}/schedules/${scheduleDetails.id}/`, payload);
            } else {
                response = await api.post(`/projects/${projectId}/schedules/`, payload);
            }

            const updatedSchedule = response.data;

            setProjects(prev =>
                prev.map(p => {
                    if (p.id !== projectId) return p;

                    const updatedReporting = { ...p.reporting };
                    updatedReporting.schedules = updatedReporting.schedules.filter((s: any) =>
                        s.id !== updatedSchedule.id
                    );
                    updatedReporting.schedules.push(updatedSchedule);
                    
                    return { ...p, reporting: updatedReporting };
                })
            );
        } catch (err) {
            console.error("Failed to save schedule:", err);
        } finally {
            setEditingSchedule(null);
        }
    };

    const handleDeleteSchedule = async () => {
        if (!deletingSchedule) return;

        const { projectId, scheduleId } = deletingSchedule;

        try {
            await api.delete(`/projects/${projectId}/schedules/${scheduleId}/`);

            setProjects(prev =>
                prev.map(p =>
                    p.id === projectId
                        ? {
                            ...p,
                            reporting: {
                                ...p.reporting,
                                schedules: p.reporting.schedules.filter((s: any) => s.id !== scheduleId)
                            }
                        }
                        : p
                )
            );
        } catch (err) {
            console.error("Failed to delete schedule:", err);
        } finally {
            setDeletingSchedule(null);
        }
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_URL;

    const handleUploadReport = async (reportDetails: { title: string; file: File; notes: string; scheduleId: string }) => {
        if (!uploadingFor) return;

        const { projectId } = uploadingFor;
        const { scheduleId, title, file, notes } = reportDetails;

        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", file);
        formData.append("notes", notes);
        formData.append("schedule", scheduleId);

        try {
            const response = await api.post(`/projects/${projectId}/schedules/${scheduleId}/submissions/`, formData);

            const newSubmission = {
                ...response.data,
                url: `${API_BASE}${response.data.url}`
            };

            setProjects(prev =>
                prev.map(p =>
                    p.id === projectId
                        ? {
                            ...p,
                            reporting: {
                                ...p.reporting,
                                schedules: p.reporting.schedules.map((s: any) =>
                                    s.id === scheduleId
                                        ? {
                                            ...s,
                                            submissions: [newSubmission, ...(s.submissions || [])]
                                        }
                                        : s
                                )
                            }
                        }
                        : p
                )
            );
        } catch (err) {
            console.error("Failed to upload report:", err);
        } finally {
            setUploadingFor(null);
        }
    };

    const handleDownload = async (submissionId: string, projectId: string, scheduleId: string, title: string) => {
        try {
            const response = await api.get(
                `/projects/${projectId}/schedules/${scheduleId}/submissions/${submissionId}/download/`,
                { responseType: 'blob' }
            );

            const contentType = response.headers['content-type'] || 'application/octet-stream';

            const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', title);
            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const [reviewingSubmission, setReviewingSubmission] = useState<{
        projectId: number;
        scheduleId: number;
        submission: any;
    } | null>(null);

    const [viewingHistory, setViewingHistory] = useState<any>(null);
    const [editingSubmission, setEditingSubmission] = useState<any | null>(null);

    const getProcessedSubmissions = (projectId: number, scheduleId: number, submissions: any[]) => {
        const scheduleKey = `${projectId}-${scheduleId}`;
        const filter = filters[scheduleKey] || {
            search: '',
            status: 'All',
            sortBy: 'date',
            sortOrder: 'desc'
        };
        const paginationState = pagination[scheduleKey] || { page: 1, itemsPerPage: ITEMS_PER_PAGE };

        let filtered = submissions.filter(sub => {
            const matchesSearch = filter.search === '' || 
                sub.title.toLowerCase().includes(filter.search.toLowerCase()) ||
                sub.notes?.toLowerCase().includes(filter.search.toLowerCase());
            
            const matchesStatus = filter.status === 'All' || sub.status === filter.status;
            
            return matchesSearch && matchesStatus;
        });

        filtered.sort((a, b) => {
            const order = filter.sortOrder === 'asc' ? 1 : -1;
            
            if (filter.sortBy === 'date') {
                return order * (new Date(a.date).getTime() - new Date(b.date).getTime());
            } else if (filter.sortBy === 'title') {
                return order * a.title.localeCompare(b.title);
            } else if (filter.sortBy === 'status') {
                return order * a.status.localeCompare(b.status);
            }
            return 0;
        });

        const startIndex = (paginationState.page - 1) * paginationState.itemsPerPage;
        const endIndex = startIndex + paginationState.itemsPerPage;
        const paginated = filtered.slice(startIndex, endIndex);

        return {
            filtered,
            paginated,
            total: filtered.length,
            page: paginationState.page,
            itemsPerPage: paginationState.itemsPerPage,
            totalPages: Math.ceil(filtered.length / paginationState.itemsPerPage)
        };
    };

    const updatePagination = (scheduleKey: string, updates: Partial<{ page: number; itemsPerPage: number }>) => {
        setPagination(prev => ({
            ...prev,
            [scheduleKey]: {
                ...(prev[scheduleKey] || { page: 1, itemsPerPage: ITEMS_PER_PAGE }),
                ...updates
            }
        }));
    };

    const updateFilters = (scheduleKey: string, updates: Partial<typeof filters[string]>) => {
        setFilters(prev => ({
            ...prev,
            [scheduleKey]: {
                ...(prev[scheduleKey] || {
                    search: '',
                    status: 'All',
                    sortBy: 'date',
                    sortOrder: 'desc'
                }),
                ...updates
            }
        }));
        updatePagination(scheduleKey, { page: 1 });
    };

    const clearFilters = (scheduleKey: string) => {
        updateFilters(scheduleKey, {
            search: '',
            status: 'All',
            sortBy: 'date',
            sortOrder: 'desc'
        });
    };

    const renderPagination = (scheduleKey: string, processed: any) => {
        if (processed.totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                    Showing {((processed.page - 1) * processed.itemsPerPage) + 1} to{' '}
                    {Math.min(processed.page * processed.itemsPerPage, processed.total)} of {processed.total} submissions
                </div>
                <div className="flex items-center space-x-2">
                    <Select
                        value={processed.itemsPerPage.toString()}
                        onValueChange={(value) => updatePagination(scheduleKey, { 
                            itemsPerPage: parseInt(value),
                            page: 1 
                        })}
                    >
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGINATION_OPTIONS.map(option => (
                                <SelectItem key={option} value={option.toString()}>
                                    {option} per page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updatePagination(scheduleKey, { page: processed.page - 1 })}
                        disabled={processed.page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm">
                        Page {processed.page} of {processed.totalPages}
                    </span>
                    
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updatePagination(scheduleKey, { page: processed.page + 1 })}
                        disabled={processed.page === processed.totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };

    const renderFilters = (scheduleKey: string, processed: any) => {
        const currentFilters = filters[scheduleKey];
        if (!currentFilters) return null;

        return (
            <div className="bg-muted/50 p-4 rounded-md mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4" />
                        <h4 className="font-medium">Filters</h4>
                    </div>
                    {(currentFilters.search || currentFilters.status !== 'All') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearFilters(scheduleKey)}
                        >
                            <X className="mr-1 h-3 w-3" />
                            Clear
                        </Button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search submissions..."
                            value={currentFilters.search}
                            onChange={(e) => updateFilters(scheduleKey, { search: e.target.value })}
                            className="pl-9"
                        />
                    </div>
                    
                    <Select
                        value={currentFilters.status}
                        onValueChange={(value) => updateFilters(scheduleKey, { status: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            {submissionStatuses.map(status => (
                                <SelectItem key={status} value={status}>
                                    {status}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <div className="flex items-center space-x-2">
                        <Select
                            value={currentFilters.sortBy}
                            onValueChange={(value: any) => updateFilters(scheduleKey, { sortBy: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="title">Title</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateFilters(scheduleKey, { 
                                sortOrder: currentFilters.sortOrder === 'asc' ? 'desc' : 'asc' 
                            })}
                        >
                            {currentFilters.sortOrder === 'asc' ? '↑' : '↓'}
                        </Button>
                    </div>
                </div>
                
                {processed.total !== processed.filtered.length && (
                    <div className="mt-2 text-sm text-muted-foreground">
                        Filtered from {processed.filtered.length} submissions
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppLayout platform="ngo">
            <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Project Reporting</h2>
                    <div className="text-sm text-muted-foreground">
                        {projects.reduce((total, project) => 
                            total + project.reporting.schedules.reduce((scheduleTotal: number, schedule: any) => 
                                scheduleTotal + (schedule.submissions?.length || 0), 0
                            ), 0
                        )} total submissions across all projects
                    </div>
                </div>

                {loading ? (
                    <p className="text-muted-foreground">Loading projects...</p>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Reporting Schedules & Submissions</CardTitle>
                            <CardDescription>
                                Manage reporting requirements and submit reports. Use filters and pagination to navigate large datasets.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Accordion type="multiple" className="w-full space-y-4">
                                {projects.map(project => (
                                    <AccordionItem key={project.id} value={project.id}>
                                        <Card>
                                            <AccordionTrigger className="p-6 hover:no-underline">
                                                <div className="flex flex-col items-start">
                                                    <span className="text-xl font-semibold">{project.title}</span>
                                                    <span className="text-sm text-muted-foreground mt-1">
                                                        {project.reporting.schedules.reduce((total: number, s: any) => 
                                                            total + (s.submissions?.length || 0), 0
                                                        )} submissions
                                                    </span>
                                                </div>
                                            </AccordionTrigger>

                                            <AccordionContent className="px-6 pb-6 space-y-6">
                                                <div className="flex justify-end">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() =>
                                                            setEditingSchedule({ projectId: project.id })
                                                        }
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Define Schedule
                                                    </Button>
                                                </div>

                                                {project.reporting.schedules.length > 0 ? (
                                                    project.reporting.schedules.map((schedule: any, index: number) => {
                                                        const scheduleKey = `${project.id}-${schedule.id}`;
                                                        const submissions = schedule.submissions || [];
                                                        const processed = getProcessedSubmissions(project.id, schedule.id, submissions);

                                                        return (
                                                            <Card key={`${project.id}-${schedule.id ?? 'new'}-${index}`} className="overflow-hidden">
                                                                <CardHeader className="bg-muted/50">
                                                                    <div className="flex justify-between items-center">
                                                                        <div>
                                                                            <CardTitle className="text-lg">
                                                                                {schedule.name}
                                                                            </CardTitle>
                                                                            <CardDescription className="mt-1">
                                                                                {submissions.length} submissions • Recipient: {schedule.recipient} • Frequency: {schedule.frequency}
                                                                            </CardDescription>
                                                                        </div>

                                                                        <div className="flex items-center space-x-2">
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    setEditingSchedule({
                                                                                        projectId: project.id,
                                                                                        schedule: {
                                                                                            ...schedule,
                                                                                            frequency: frequencyMapReverse[schedule.frequency] || schedule.frequency
                                                                                        }
                                                                                    })
                                                                                }
                                                                            >
                                                                                <Edit className="mr-2 h-4 w-4" />
                                                                                Edit
                                                                            </Button>

                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    setUploadingFor({
                                                                                        projectId: project.id,
                                                                                        scheduleId: schedule.id,
                                                                                        projectName: project.title,
                                                                                        schedules: project.reporting.schedules
                                                                                    })
                                                                                }
                                                                            >
                                                                                <Upload className="mr-2 h-4 w-4" />
                                                                                Upload Report
                                                                            </Button>

                                                                            <Button
                                                                                variant="destructive"
                                                                                size="icon"
                                                                                className="h-9 w-9"
                                                                                onClick={() =>
                                                                                    setDeletingSchedule({
                                                                                        projectId: project.id,
                                                                                        scheduleId: schedule.id,
                                                                                        scheduleName: schedule.name
                                                                                    })
                                                                                }
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </CardHeader>

                                                                <CardContent className="p-4">
                                                                    {/* Filters */}
                                                                    {renderFilters(scheduleKey, processed)}

                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Report Title</TableHead>
                                                                                <TableHead>Date Created</TableHead>
                                                                                <TableHead>Status</TableHead>
                                                                                <TableHead className="text-right">
                                                                                    Actions
                                                                                </TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>

                                                                        <TableBody>
                                                                            {processed.paginated.map((report: any) => {
                                                                                return (
                                                                                    <TableRow key={report.id} className="hover:bg-muted/50">
                                                                                        <TableCell className="font-medium">
                                                                                            <div className="flex flex-col">
                                                                                                <span>{report.title}</span>
                                                                                                {report.notes && (
                                                                                                    <span className="text-xs text-muted-foreground truncate max-w-xs">
                                                                                                        {report.notes}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell>{report.date}</TableCell>

                                                                                        <TableCell>
                                                                                            <Badge variant={getStatusBadgeVariant(report.status)}>
                                                                                                {report.status}
                                                                                            </Badge>
                                                                                        </TableCell>

                                                                                        <TableCell className="text-right">
                                                                                            <div className="flex justify-end space-x-2">
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="outline"
                                                                                                    onClick={() =>
                                                                                                        setEditingSubmission({
                                                                                                            projectId: project.id,
                                                                                                            scheduleId: schedule.id,
                                                                                                            submission: report
                                                                                                        })
                                                                                                    }
                                                                                                >
                                                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                                                    Edit
                                                                                                </Button>

                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="outline"
                                                                                                    onClick={() =>
                                                                                                        setReviewingSubmission({
                                                                                                            projectId: project.id,
                                                                                                            scheduleId: schedule.id,
                                                                                                            submission: report
                                                                                                        })
                                                                                                    }
                                                                                                >
                                                                                                    Review
                                                                                                </Button>

                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="outline"
                                                                                                    onClick={() =>
                                                                                                        handleDownload(
                                                                                                            report.id,
                                                                                                            project.id,
                                                                                                            schedule.id,
                                                                                                            report.title
                                                                                                        )
                                                                                                    }
                                                                                                >
                                                                                                    <Download className="mr-2 h-4 w-4" />
                                                                                                    Download
                                                                                                </Button>
                                                                                                
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="outline"
                                                                                                    onClick={() => setViewingHistory({
                                                                                                        projectId: project.id,
                                                                                                        scheduleId: schedule.id,
                                                                                                        submissionId: report.id
                                                                                                    })}
                                                                                                >
                                                                                                    History
                                                                                                </Button>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
                                                                        </TableBody>
                                                                    </Table>

                                                                    {processed.paginated.length === 0 && (
                                                                        <div className="text-center py-8">
                                                                            <p className="text-muted-foreground">
                                                                                {submissions.length === 0 
                                                                                    ? "No submissions yet." 
                                                                                    : "No submissions match your filters."}
                                                                            </p>
                                                                            {(filters[scheduleKey]?.search || filters[scheduleKey]?.status !== 'All') && (
                                                                                <Button
                                                                                    variant="link"
                                                                                    onClick={() => clearFilters(scheduleKey)}
                                                                                    className="mt-2"
                                                                                >
                                                                                    Clear filters
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Pagination */}
                                                                    {renderPagination(scheduleKey, processed)}
                                                                </CardContent>
                                                            </Card>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="text-center py-12">
                                                        <p className="text-muted-foreground mb-4">
                                                            No schedules defined for this project.
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setEditingSchedule({ projectId: project.id })}
                                                        >
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Create First Schedule
                                                        </Button>
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </Card>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* MODALS*/}
            {uploadingFor && (
                <ReportUploader
                    isOpen={!!uploadingFor}
                    onClose={() => setUploadingFor(null)}
                    onUpload={handleUploadReport}
                    projectName={uploadingFor.projectName}
                    schedules={uploadingFor.schedules}
                    scheduleId={uploadingFor.scheduleId}
                />
            )}

            {editingSchedule && (
                <ScheduleEditor
                    isOpen={!!editingSchedule}
                    onClose={() => setEditingSchedule(null)}
                    onSave={handleSaveSchedule}
                    schedule={editingSchedule.schedule}
                    availableRecipients={reportRecipients}
                    availableFrequencies={reportFrequencies}
                />
            )}

            {deletingSchedule && (
                <AlertDialog open={!!deletingSchedule} onOpenChange={() => setDeletingSchedule(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete "{deletingSchedule.scheduleName}" and all its submissions.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteSchedule}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {reviewingSubmission && (
                <SubmissionReviewModal
                    isOpen={!!reviewingSubmission}
                    onClose={() => setReviewingSubmission(null)}
                    submissionData={reviewingSubmission}
                    onUpdated={updated => {
                        setProjects(prev =>
                            prev.map(p =>
                                p.id === reviewingSubmission.projectId
                                    ? {
                                        ...p,
                                        reporting: {
                                            ...p.reporting,
                                            schedules: p.reporting.schedules.map((s: any) =>
                                                s.id === reviewingSubmission.scheduleId
                                                    ? {
                                                        ...s,
                                                        submissions: s.submissions.map((sub: any) =>
                                                            sub.id === updated.id ? updated : sub
                                                        )
                                                    }
                                                    : s
                                            )
                                        }
                                    }
                                    : p
                            )
                        );
                    }}
                />
            )}

            {viewingHistory && (
                <SubmissionHistoryDialog
                    isOpen={!!viewingHistory}
                    onClose={() => setViewingHistory(null)}
                    submissionData={viewingHistory}
                />
            )}

            {editingSubmission && (
                <SubmissionEditModal
                    isOpen={!!editingSubmission}
                    onClose={() => setEditingSubmission(null)}
                    submissionData={editingSubmission}
                    onUpdated={(updated: any) => {
                        setProjects(prev =>
                            prev.map(p =>
                                p.id === editingSubmission.projectId
                                    ? {
                                        ...p,
                                        reporting: {
                                            ...p.reporting,
                                            schedules: p.reporting.schedules.map((s: any) =>
                                                s.id === editingSubmission.scheduleId
                                                    ? {
                                                        ...s,
                                                        submissions: s.submissions.map((sub: any) =>
                                                            sub.id === updated.id ? updated : sub
                                                        )
                                                    }
                                                    : s
                                            )
                                        }
                                    }
                                    : p
                            )
                        );
                    }}
                    handleDownload={handleDownload}
                />
            )}
        </AppLayout>
    );
}