'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, PlusCircle, Trash2, Edit, BarChart, Search, Filter, ChevronLeft, ChevronRight, X, Download, MoreVertical } from "lucide-react";
import Link from "next/link";
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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import api from '@/lib/api';
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 20;

export default function DataCollectionPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingForm, setDeletingForm] = useState<any>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'title' | 'created_at' | 'project'>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    const [totalForms, setTotalForms] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [formsRes, projectsRes] = await Promise.all([
                    api.get('/data-collection/forms/'),
                    api.get('/projects/')
                ]);

                setForms(formsRes.data);
                setProjects(projectsRes.data);
                setTotalForms(formsRes.data.length);
            } catch (err: any) {
                console.error("Error loading data collection forms:", err.response?.status, err.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const processedForms = useMemo(() => {
        let filtered = [...forms];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(form => 
                form.title.toLowerCase().includes(query) ||
                form.description?.toLowerCase().includes(query)
            );
        }

        if (selectedProject !== 'all') {
            const projectId = parseInt(selectedProject);
            filtered = filtered.filter(form => 
                form.projects?.includes(projectId)
            );
        }

        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'created_at':
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;
                case 'project':
                    aValue = a.projects?.[0] || 0;
                    bValue = b.projects?.[0] || 0;
                    break;
                default:
                    return 0;
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [forms, searchQuery, selectedProject, sortBy, sortOrder]);

    const totalPages = Math.ceil(processedForms.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedForms = processedForms.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedProject, itemsPerPage]);

    const getProjectName = useCallback((projectId: number) => {
        const project = projects.find((p: any) => p.id === projectId);
        return project ? project.title : "Unknown Project";
    }, [projects]);

    const getProjectBadges = useCallback((projectIds: number[]) => {
        return projectIds?.map(pid => {
            const project = projects.find((p: any) => p.id === pid);
            return {
                id: pid,
                name: project?.title || 'Unknown',
            };
        }) || [];
    }, [projects]);

    const handleDelete = async () => {
        if (!deletingForm) return;

        try {
            await api.delete(`/data-collection/forms/${deletingForm.id}/`);
            setForms(forms.filter(form => form.id !== deletingForm.id));
            setTotalForms(prev => prev - 1);
        } catch (err) {
            console.error("Failed to delete form", err);
        }

        setDeletingForm(null);
    };

    const handleExportData = async () => {
        try {
            const response = await api.get('/data-collection/export/', {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `data-collection-forms-${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export data", err);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedProject('all');
        setSortBy('created_at');
        setSortOrder('desc');
    };

    if (loading && forms.length === 0) {
        return (
            <AppLayout platform="ngo">
                <div className="p-8 space-y-4">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout platform="ngo">
            <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Data Collection</h2>
                        <p className="text-muted-foreground mt-2">
                            {totalForms} form{totalForms !== 1 ? 's' : ''} • {processedForms.length} match current filters
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                        {/* <Button variant="outline" onClick={handleExportData}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button> */}
                        <Button asChild>
                            <Link href="/data-collection/forms/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New Form
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Filter Section */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle>Filters & Search</CardTitle>
                                <CardDescription>
                                    Narrow down forms by project, title, or sort order
                                </CardDescription>
                            </div>
                            
                            {(searchQuery || selectedProject !== 'all') && (
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    <X className="mr-2 h-3 w-3" />
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search forms..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="created_at">Creation Date</SelectItem>
                                    <SelectItem value="title">Form Title</SelectItem>
                                    <SelectItem value="project">Project</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <div className="flex items-center gap-2">
                                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                                    setItemsPerPage(parseInt(value));
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Items per page" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                            <SelectItem key={option} value={option.toString()}>
                                                {option} per page
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                >
                                    {sortOrder === 'asc' ? '↑' : '↓'}
                                </Button>
                            </div>
                        </div>
                        
                        {/* Active filters indicator */}
                        {(searchQuery || selectedProject !== 'all') && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {searchQuery && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        Search: "{searchQuery}"
                                        <button onClick={() => setSearchQuery('')} className="ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {selectedProject !== 'all' && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        Project: {projects.find(p => p.id.toString() === selectedProject)?.title}
                                        <button onClick={() => setSelectedProject('all')} className="ml-1">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Forms Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Data Collection Forms</CardTitle>
                        <CardDescription>
                            Manage and access all data collection forms
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <TooltipProvider>
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-48" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Skeleton className="h-9 w-9 rounded-md" />
                                                <Skeleton className="h-9 w-9 rounded-md" />
                                                <Skeleton className="h-9 w-9 rounded-md" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Form Details</TableHead>
                                                    <TableHead>Projects</TableHead>
                                                    <TableHead>Created</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {paginatedForms.map((form) => {
                                                    const projectBadges = getProjectBadges(form.projects || []);
                                                    
                                                    return (
                                                        <TableRow key={form.id} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="font-medium">{form.title}</div>
                                                                    {form.description && (
                                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                                            {form.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                                    {projectBadges.length > 0 ? (
                                                                        projectBadges.slice(0, 2).map((project) => (
                                                                            <Badge 
                                                                                key={project.id} 
                                                                                variant="secondary"
                                                                                className="truncate max-w-[120px]"
                                                                            >
                                                                                {project.name}
                                                                            </Badge>
                                                                        ))
                                                                    ) : (
                                                                        <Badge variant="outline">No Project</Badge>
                                                                    )}
                                                                    {projectBadges.length > 2 && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <Badge variant="outline">
                                                                                    +{projectBadges.length - 2} more
                                                                                </Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                {projectBadges.slice(2).map(p => p.name).join(', ')}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm">
                                                                        {format(new Date(form.created_at), 'MMM dd, yyyy')}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {format(new Date(form.created_at), 'hh:mm a')}
                                                                    </span>
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <div className="flex gap-2">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button asChild size="sm" className="bg-primary/90 hover:bg-primary">
                                                                                <Link href={`/data-collection/entry/${form.id}`}>
                                                                                    <FileText className="mr-2 h-4 w-4" />
                                                                                    Enter Data
                                                                                </Link>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Start data entry</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            </TableCell>

                                                            <TableCell>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-48">
                                                                        <DropdownMenuLabel>Form Actions</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem asChild>
                                                                            <Link href={`/data-collection/submissions/${form.id}`} className="cursor-pointer">
                                                                                <BarChart className="mr-2 h-4 w-4" />
                                                                                View Submissions
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem asChild>
                                                                            <Link href={`/data-collection/forms/${form.id}`} className="cursor-pointer">
                                                                                <Edit className="mr-2 h-4 w-4" />
                                                                                Edit Form Settings
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem 
                                                                            className="text-destructive focus:text-destructive cursor-pointer"
                                                                            onClick={() => setDeletingForm(form)}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete Form
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {paginatedForms.length === 0 && (
                                        <div className="text-center py-12 space-y-4">
                                            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">No forms found</h3>
                                                <p className="text-muted-foreground mt-1">
                                                    {forms.length === 0 
                                                        ? "Start by creating your first data collection form."
                                                        : "Try adjusting your filters or search terms."}
                                                </p>
                                            </div>
                                            {(searchQuery || selectedProject !== 'all') && (
                                                <Button variant="outline" onClick={clearFilters}>
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 px-2">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {startIndex + 1} to {Math.min(endIndex, processedForms.length)} of {processedForms.length} forms
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        let pageNum;
                                                        if (totalPages <= 5) {
                                                            pageNum = i + 1;
                                                        } else if (currentPage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (currentPage >= totalPages - 2) {
                                                            pageNum = totalPages - 4 + i;
                                                        } else {
                                                            pageNum = currentPage - 2 + i;
                                                        }
                                                        
                                                        return (
                                                            <Button
                                                                key={pageNum}
                                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                                size="sm"
                                                                className="h-9 w-9"
                                                                onClick={() => setCurrentPage(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                                
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </TooltipProvider>
                    </CardContent>
                </Card>
            </main>

            {/* Delete Confirmation Dialog */}
            {deletingForm && (
                <AlertDialog open={!!deletingForm} onOpenChange={() => setDeletingForm(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Form "{deletingForm.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the form and all associated data submissions.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Delete Form
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </AppLayout>
    );
}