'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowRight, 
  Edit, 
  PlusCircle, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Eye,
  Download,
  RefreshCw,
  X
} from "lucide-react";
import Link from "next/link";
import { ProjectEditor } from '@/components/projects/project-editor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import api from "@/lib/api";
import { toast } from "sonner";
import { TeamMember } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 25;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingProject, setDeletingProject] = useState<any>(null);
  const [availableDonors, setAvailableDonors] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedProjectForTeam, setSelectedProjectForTeam] = useState<any>(null);
  const [addingMember, setAddingMember] = useState<Partial<TeamMember> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [selectedHealthStatus, setSelectedHealthStatus] = useState<string>('all');
  const [selectedLifecycle, setSelectedLifecycle] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'start_date' | 'budget' | 'health_status'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    planned: 0,
    onTrack: 0,
    atRisk: 0,
    offTrack: 0,
    totalBudget: 0,
  });

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      const [projectsRes, donorsRes, programsRes, membersRes] = await Promise.all([
        api.get("/projects/"),
        api.get("/donors/"),
        api.get("/programs/"),
        api.get("/users/")
      ]);

      const projectsData = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.results || [];
      setProjects(projectsData);
      setAvailableDonors(Array.isArray(donorsRes.data) ? donorsRes.data : donorsRes.data.results || []);
      setPrograms(programsRes.data?.map((p: any) => ({ id: p.id, name: p.name })) || []);
      setTeamMembers(membersRes.data?.results || membersRes.data || []);
      
      calculateStats(projectsData);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load projects data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateStats = (projectsData: any[]) => {
    const stats = {
      total: projectsData.length,
      active: projectsData.filter(p => p.lifecycle_status === 'ACTIVE').length,
      completed: projectsData.filter(p => p.lifecycle_status === 'COMPLETED').length,
      planned: projectsData.filter(p => p.lifecycle_status === 'PLANNED').length,
      onTrack: projectsData.filter(p => p.health_status === 'ON_TRACK').length,
      atRisk: projectsData.filter(p => p.health_status === 'AT_RISK').length,
      offTrack: projectsData.filter(p => p.health_status === 'OFF_TRACK').length,
      totalBudget: projectsData.reduce((sum, p) => sum + (p.budget || 0), 0)
    };
    setStats(stats);
  };

  const processedProjects = useMemo(() => {
    let filtered = [...projects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(query) ||
        project.code.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }

    if (selectedProgram !== 'all') {
      const programId = parseInt(selectedProgram);
      filtered = filtered.filter(project => project.program === programId);
    }

    if (selectedHealthStatus !== 'all') {
      filtered = filtered.filter(project => project.health_status === selectedHealthStatus);
    }

    if (selectedLifecycle !== 'all') {
      filtered = filtered.filter(project => project.lifecycle_status === selectedLifecycle);
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'start_date':
          aValue = new Date(a.start_date || 0).getTime();
          bValue = new Date(b.start_date || 0).getTime();
          break;
        case 'budget':
          aValue = a.budget || 0;
          bValue = b.budget || 0;
          break;
        case 'health_status':
          aValue = a.health_status;
          bValue = b.health_status;
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
  }, [projects, searchQuery, selectedProgram, selectedHealthStatus, selectedLifecycle, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = processedProjects.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProgram, selectedHealthStatus, selectedLifecycle, itemsPerPage]);

  const normalizeProjectPayload = (p: any) => ({
    program: typeof p.program === "object" ? p.program.id : Number(p.program),
    code: p.code || "",
    title: p.title || "",
    manager: typeof p.manager === "object" ? p.manager.id : Number(p.manager),
    start_date: p.start_date || p.startDate || null,
    end_date: p.end_date || p.endDate || null,
    budget: p.budget,
    currency: p.currency || "USD",
    lifecycle_status: p.lifecycle_status || "PLANNED",
    health_status: p.health_status || "ON_TRACK",
    donor_ids: (p.donor_ids || p.localDonors || []).map((id: any) => Number(id)),
  });

  const handleSaveProject = async (project: any) => {
    const payload = normalizeProjectPayload(project);
    try {
      if (editingProject) {
        const res = await api.patch(`/projects/${editingProject.id}/`, payload);
        setProjects(prev => prev.map(p => (p.id === editingProject.id ? res.data : p)));
        toast.success("Project updated successfully");
      } else {
        const res = await api.post("/projects/", payload);
        setProjects(prev => [...prev, res.data]);
        toast.success("Project created successfully");
      }
      setIsEditorOpen(false);
      setEditingProject(null);
      fetchData(false);
    } catch (err: any) {
      console.error("Error saving project:", err.response?.data || err.message);
      toast.error("Failed to save project");
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      await api.delete(`/projects/${deletingProject.id}/`);
      setProjects(projects.filter(p => p.id !== deletingProject.id));
      toast.success("Project deleted successfully");
      fetchData(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete project");
    } finally {
      setDeletingProject(null);
    }
  };

  const handleOpenEditor = (project: any = null) => {
    if (project) {
      const normalizedProject = {
        ...project,
        start_date: project.start_date ? project.start_date.split("T")[0] : "",
        end_date: project.end_date ? project.end_date.split("T")[0] : "",
      };
      setEditingProject(normalizedProject);
    } else {
      setEditingProject(null);
    }
    setIsEditorOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProgram('all');
    setSelectedHealthStatus('all');
    setSelectedLifecycle('all');
    setSortBy('start_date');
    setSortOrder('desc');
  };

  const formatCurrency = (
    amount: number,
    currency: string = 'KES'
  ) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'AT_RISK':
        return <Minus className="h-4 w-4 text-amber-500" />;
      case 'OFF_TRACK':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return "bg-green-100 text-green-800 border-green-200";
      case 'AT_RISK':
        return "bg-amber-100 text-amber-800 border-amber-200";
      case 'OFF_TRACK':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLifecycleStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'ACTIVE':
        return "bg-green-100 text-green-800 border-green-200";
      case 'COMPLETED':
        return "bg-gray-100 text-gray-800 border-gray-200";
      case 'CANCELLED':
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleExportProjects = () => {
    try {
      const exportData = processedProjects.map(project => {
        const program = programs.find(p => p.id === project.program);
        const manager = teamMembers.find(m => m.id === project.manager);
        
        return {
          'Project Code': project.code,
          'Project Title': project.title,
          'Program': program?.name || '-',
          'Start Date': formatDate(project.start_date),
          'End Date': formatDate(project.end_date),
          'Budget': formatCurrency(project.budget || 0, project.currency),
          'Health Status': project.health_status || '-',
          'Lifecycle Status': project.lifecycle_status || '-',
          'Manager': manager?.name || '-',
          'Description': project.description || '-',
        };
      });

      if (exportData.length === 0) {
        toast.error('No projects to export');
        return;
      }

      const headers = Object.keys(exportData[0] || {});
      const csv = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => {
          const value = (row as any)[h];
          return JSON.stringify(value ?? '');
        }).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${exportData.length} projects`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export projects');
    }
  };

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground mt-2">
              Manage and track all your organization's projects
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRefreshing(true);
                fetchData();
              }}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportProjects}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => handleOpenEditor()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalBudget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">On Track</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.onTrack}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="p-2 bg-green-100 rounded-full mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <Progress value={stats.total ? (stats.onTrack / stats.total) * 100 : 0} className="w-24 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Filters & Search</CardTitle>
                <CardDescription>
                  Narrow down projects by program, status, or search
                </CardDescription>
              </div>
              
              {(searchQuery || selectedProgram !== 'all' || selectedHealthStatus !== 'all' || selectedLifecycle !== 'all') && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-3 w-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id.toString()}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedHealthStatus} onValueChange={setSelectedHealthStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Health Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health Status</SelectItem>
                  <SelectItem value="ON_TRACK">On Track</SelectItem>
                  <SelectItem value="AT_RISK">At Risk</SelectItem>
                  <SelectItem value="OFF_TRACK">Off Track</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedLifecycle} onValueChange={setSelectedLifecycle}>
                <SelectTrigger>
                  <SelectValue placeholder="Lifecycle Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rows per page" />
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
            {(searchQuery || selectedProgram !== 'all' || selectedHealthStatus !== 'all' || selectedLifecycle !== 'all') && (
              <div className="mt-4 flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedProgram !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Program: {programs.find(p => p.id.toString() === selectedProgram)?.name}
                    <button onClick={() => setSelectedProgram('all')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedHealthStatus !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Health: {selectedHealthStatus.replace('_', ' ')}
                    <button onClick={() => setSelectedHealthStatus('all')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedLifecycle !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {selectedLifecycle}
                    <button onClick={() => setSelectedLifecycle('all')} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Project List</CardTitle>
            <CardDescription>
              Showing {paginatedProjects.length} of {processedProjects.length} projects
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
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
                        <TableHead className="w-[25%]">Project</TableHead>
                        <TableHead className="w-[15%]">Program</TableHead>
                        <TableHead className="w-[15%]">Timeline</TableHead>
                        <TableHead className="w-[15%]">Budget</TableHead>
                        <TableHead className="w-[15%]">Status</TableHead>
                        <TableHead className="text-right w-[15%]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    
                    <TableBody>
                      {paginatedProjects.length > 0 ? (
                        paginatedProjects.map(project => {
                          const program = programs.find(p => p.id === project.program);
                          const manager = teamMembers.find(m => m.id === project.manager);
                          
                          return (
                            <TableRow key={project.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium">{project.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    <code className="bg-muted px-2 py-1 rounded text-xs">{project.code}</code>
                                  </div>
                                  {project.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {project.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <div className="text-sm">
                                  {program?.name || '-'}
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <div className="flex flex-col gap-1 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    {formatDate(project.start_date)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    {formatDate(project.end_date)}
                                  </div>
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {formatCurrency(project.budget || 0, project.currency)}
                                  </span>
                                </div>
                                {manager && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Manager: {manager.name}
                                  </div>
                                )}
                              </TableCell>
                              
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`flex items-center gap-1 w-fit ${getHealthStatusColor(project.health_status)}`}
                                  >
                                    {getHealthStatusIcon(project.health_status)}
                                    {project.health_status === 'ON_TRACK' && 'On Track'}
                                    {project.health_status === 'AT_RISK' && 'At Risk'}
                                    {project.health_status === 'OFF_TRACK' && 'Off Track'}
                                  </Badge>
                                  
                                  <Badge 
                                    variant="outline" 
                                    className={`w-fit ${getLifecycleStatusColor(project.lifecycle_status)}`}
                                  >
                                    {project.lifecycle_status}
                                  </Badge>
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button asChild size="sm" variant="outline">
                                          <Link href={`/projects/${project.id}`}>
                                            <Eye className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View Details</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/projects/${project.id}`} className="cursor-pointer">
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Details
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenEditor(project)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Project
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setSelectedProjectForTeam(project)}>
                                        <Users className="mr-2 h-4 w-4" />
                                        Add Team Member
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                        onClick={() => setDeletingProject(project)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Project
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center gap-3">
                              <FileText className="h-12 w-12 text-gray-300" />
                              <div>
                                <h3 className="font-semibold text-lg">No projects found</h3>
                                <p className="text-muted-foreground mt-1">
                                  {projects.length === 0 
                                    ? "Start by creating your first project."
                                    : "Try adjusting your filters or search terms."}
                                </p>
                              </div>
                              {(searchQuery || selectedProgram !== 'all' || selectedHealthStatus !== 'all' || selectedLifecycle !== 'all') && (
                                <Button variant="outline" onClick={clearFilters}>
                                  Clear Filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 px-2">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {Math.min(endIndex, processedProjects.length)} of {processedProjects.length} projects
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
          </CardContent>
        </Card>
      </main>

      {/* Project Editor Modal */}
      {(isEditorOpen || editingProject) && (
        <ProjectEditor
          isOpen={isEditorOpen}
          onClose={() => { setIsEditorOpen(false); setEditingProject(null); }}
          onSave={handleSaveProject}
          project={editingProject}
          availablePrograms={programs}
          availableTeamMembers={teamMembers}
          availableDonors={availableDonors}
        />
      )}

      {/* Add Member Dialog */}
      {selectedProjectForTeam && (
        <AlertDialog
          open={!!selectedProjectForTeam}
          onOpenChange={() => setSelectedProjectForTeam(null)}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Add Team Member to {selectedProjectForTeam.title}
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Existing User</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={addingMember?.id || ""}
                  onChange={(e) => {
                    const selected = teamMembers.find(
                      (m) => Number(m.id) === Number(e.target.value)
                    );
                    setAddingMember(selected || null);
                  }}
                >
                  <option value="">— None —</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-semibold text-gray-600 mb-2">
                  Or add external team member
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="border rounded px-2 py-1 col-span-2"
                    onChange={(e) =>
                      setAddingMember((prev) => ({ ...prev, member_name: e.target.value }))
                    }
                  />
                  <select
                    value={addingMember?.role || ''}
                    onChange={(e) =>
                      setAddingMember(prev => ({
                        ...prev,
                        role: e.target.value as TeamMember['role']
                      }))
                    }
                  >
                    <option value="">— Select Role —</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                    <option value="M_E_OFFICER">M&E Officer</option>
                    <option value="FINANCE_OFFICER">Finance Officer</option>
                    <option value="FIELD_OFFICER">Field Officer</option>
                    <option value="DATA_ENTRY_CLERK">Data Entry Clerk</option>
                    <option value="DRIVER">Driver</option>
                    <option value="SECURITY_GUARD">Security Guard</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="INTERN">INTERN</option>
                  </select>

                  <input
                    type="email"
                    placeholder="Email"
                    className="border rounded px-2 py-1"
                    onChange={(e) =>
                      setAddingMember((prev) => ({ ...prev, email: e.target.value }))
                    }
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    className="border rounded px-2 py-1"
                    onChange={(e) =>
                      setAddingMember((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!selectedProjectForTeam) return;
                  try {
                    const payload = addingMember?.id
                      ? { user_id: addingMember.id }
                      : {
                          member_name: addingMember?.member_name,
                          role: addingMember?.role,
                          email: addingMember?.email,
                          phone: addingMember?.phone,
                        };

                    await api.post(
                      `/projects/${selectedProjectForTeam.id}/team-members/`,
                      payload
                    );

                    toast.success("Team member added successfully");
                    setSelectedProjectForTeam(null);
                    setAddingMember(null);
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to add team member");
                  }
                }}
                className="bg-primary hover:bg-primary/90"
              >
                Add Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Project Dialog */}
      {deletingProject && (
        <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the project "{deletingProject.title}"?
                This action cannot be undone. All associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProject} 
                className='bg-destructive hover:bg-destructive/90'
              >
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AppLayout>
  );
}

const CheckCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);