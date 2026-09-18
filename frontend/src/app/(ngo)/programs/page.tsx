'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  PlusCircle, 
  Trash2, 
  Target, 
  BarChart3, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  Layers,
  RefreshCw,
  X,
  Download,
  Eye,
  TrendingUp,
  Users,
  Calendar,
  FileText,
  Hash
} from "lucide-react";
import { ProgramEditor } from "@/components/programs/program-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProgramResultsFramework } from "@/components/programs/results-framework";
import api from "@/lib/api";
import { toast } from "sonner";
import { IndicatorManager } from "@/components/programs/indicator-manager";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [isProgramEditorOpen, setIsProgramEditorOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [deletingProgram, setDeletingProgram] = useState<any>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'project_count'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);
  const [selectedProgramForIndicators, setSelectedProgramForIndicators] = useState<any>(null);
  const [strategicObjectives, setStrategicObjectives] = useState<any[]>([]);  

  const selectedProgram = useMemo(() => 
    programs.find((p) => p.id === Number(selectedProgramId)),
    [programs, selectedProgramId]
  );

  const stats = useMemo(() => {
    const total = programs.length;
    const active = programs.filter(p => p.is_active !== false).length;
    const totalProjects = programs.reduce((sum, p) => sum + (p.project_count || 0), 0);
    const totalIndicators = programs.reduce((sum, p) => sum + (p.indicator_count || 0), 0);
    
    return {
      total,
      active,
      totalProjects,
      totalIndicators,
    };
  }, [programs]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    
    try {
      const [programsRes, objectivesRes] = await Promise.all([
        api.get("/programs/"),
        api.get("/strategic/strategic-objectives/")
      ]);

      const programsData = programsRes.data?.results || programsRes.data || [];
      if (Array.isArray(programsData)) {
        setPrograms(programsData);
      } else {
        console.warn("Unexpected response structure for programs:", programsRes.data);
        setPrograms([]);
      }

      const objectivesData = objectivesRes.data?.results || objectivesRes.data || [];
      if (Array.isArray(objectivesData)) {
        setStrategicObjectives(objectivesData);
      } else {
        console.warn("Unexpected response structure for strategic objectives:", objectivesRes.data);
        setStrategicObjectives([]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load programs data");
      setPrograms([]);
      setStrategicObjectives([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processedPrograms = useMemo(() => {
    let filtered = [...programs];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(program => 
        program.name.toLowerCase().includes(query) ||
        program.code?.toLowerCase().includes(query) ||
        program.description?.toLowerCase().includes(query) ||
        program.strategic_objective?.name?.toLowerCase().includes(query) ||
        program.linked_objectives?.some((obj: any) => 
          obj.name.toLowerCase().includes(query)
        )
      );
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'project_count':
          aValue = a.project_count || 0;
          bValue = b.project_count || 0;
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
  }, [programs, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(processedPrograms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrograms = processedPrograms.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const handleSaveProgram = async (programToSave: any) => {
    try {
      if (editingProgram) {
        const res = await api.put(`/programs/${programToSave.id}/`, programToSave);
        setPrograms(programs.map((p) => (p.id === res.data.id ? res.data : p)));
        toast.success("Program updated successfully!");
      } else {
        const res = await api.post(`/programs/`, programToSave);
        setPrograms([...programs, res.data]);
        toast.success("Program created successfully!");
      }
      setIsProgramEditorOpen(false);
      setTimeout(() => {
        setEditingProgram(null);
        fetchData(false);
      }, 150);
    } catch (err: any) {
      console.error("Error saving program:", err);
      toast.error(err.response?.data?.message || "Failed to save program.");
    }
  };

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;
    try {
      await api.delete(`/programs/${deletingProgram.id}/`);
      setPrograms(programs.filter((p) => p.id !== deletingProgram.id));
      toast.success("Program deleted successfully!");
      fetchData(false);
    } catch (err) {
      console.error("Error deleting program:", err);
      toast.error("Failed to delete program.");
    } finally {
      setTimeout(() => setDeletingProgram(null), 150);
    }
  };

  const handleUpdateProgram = (updatedProgram: any) => {
    setPrograms(programs.map((p) => (p.id === updatedProgram.id ? updatedProgram : p)));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('name');
    setSortOrder('asc');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const handleExportPrograms = () => {
    try {
      const exportData = processedPrograms.map(program => ({
        'Program Name': program.name,
        'Program Code': program.code || '-',
        'Description': program.description || '-',
        'Strategic Objectives': program.linked_objectives?.map((obj: any) => obj.name).join(', ') || '-',
        'Status': program.is_active ? 'Active' : 'Inactive',
        'Created Date': formatDate(program.created_at),
        'Projects Count': program.project_count || 0,
        'Indicators Count': program.indicator_count || 0,
      }));

      if (exportData.length === 0) {
        toast.error('No programs to export');
        return;
      }

      const headers = Object.keys(exportData[0] || {});
      const csv = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => JSON.stringify((row as any)[h] ?? '')).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `programs-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${exportData.length} programs`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export programs');
    }
  };

  const getStrategicObjectiveDisplay = (program: any) => {
    if (program.strategic_objective) {
      return program.strategic_objective.name;
    }
    if (program.linked_objectives?.length > 0) {
      return program.linked_objectives[0].name;
    }
    return '-';
  };

  const getStrategicObjectiveDetails = (program: any) => {
    if (program.strategic_objective) {
      return program.strategic_objective;
    }
    if (program.linked_objectives?.length > 0) {
      return program.linked_objectives[0];
    }
    return null;
  };

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Programs</h2>
            <p className="text-muted-foreground mt-2">
              Manage organizational programs and their results frameworks
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
            {/* <Button 
              variant="outline" 
              onClick={handleExportPrograms}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button> */}
            <Button
              onClick={() => {
                setEditingProgram(null);
                setIsProgramEditorOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              New Program
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Programs</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <Progress 
                value={stats.total ? (stats.active / stats.total) * 100 : 0} 
                className="mt-3 h-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalProjects}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Indicators</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalIndicators}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="list">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="list">Programs List</TabsTrigger>
            <TabsTrigger value="framework">Results Framework</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6 space-y-6">
            {/* Filter Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Filters & Search</CardTitle>
                    <CardDescription>
                      Search programs by name, code, or description
                    </CardDescription>
                  </div>
                  
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="mr-2 h-3 w-3" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
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
                {searchQuery && (
                  <div className="mt-4">
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      Search: "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Programs Table */}
            <Card>
              <CardHeader>
                <CardTitle>Program List</CardTitle>
                <CardDescription>
                  Showing {paginatedPrograms.length} of {processedPrograms.length} programs
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {loading ? (
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
                            <TableHead className="w-[25%]">Program</TableHead>
                            <TableHead className="w-[20%]">Strategic Objective</TableHead>
                            <TableHead className="w-[15%]">Projects</TableHead>
                            <TableHead className="w-[15%]">Indicators</TableHead>
                            <TableHead className="w-[15%]">Status</TableHead>
                            <TableHead className="text-right w-[15%]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                          {paginatedPrograms.length > 0 ? (
                            paginatedPrograms.map((program) => (
                              <TableRow key={program.id} className="hover:bg-muted/50">
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div className="font-medium">{program.name}</div>
                                    {program.code && (
                                      <div className="text-sm text-muted-foreground">
                                        <code className="bg-muted px-2 py-1 rounded text-xs">{program.code}</code>
                                      </div>
                                    )}
                                    {program.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-1">
                                        {program.description}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div className="text-sm font-medium">
                                      {getStrategicObjectiveDisplay(program)}
                                    </div>
                                    {program.linked_objectives?.length > 1 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{program.linked_objectives.length - 1} more
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{program.project_count || 0}</span>
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{program.indicator_count || 0}</span>
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={`${
                                      program.is_active !== false 
                                        ? "bg-green-100 text-green-800 border-green-200" 
                                        : "bg-gray-100 text-gray-800 border-gray-200"
                                    }`}
                                  >
                                    {program.is_active !== false ? 'Active' : 'Inactive'}
                                  </Badge>
                                  {program.created_at && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Created: {formatDate(program.created_at)}
                                    </div>
                                  )}
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedProgramForIndicators(program);
                                              setIsIndicatorModalOpen(true);
                                            }}
                                          >
                                            <BarChart3 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Manage Indicators ({program.indicator_count || 0})</p>
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
                                        <DropdownMenuItem onClick={() => {
                                          setEditingProgram(program);
                                          setIsProgramEditorOpen(true);
                                        }}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Program
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                          setSelectedProgramForIndicators(program);
                                          setIsIndicatorModalOpen(true);
                                        }}>
                                          <BarChart3 className="mr-2 h-4 w-4" />
                                          Manage Indicators ({program.indicator_count || 0})
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          className="text-destructive focus:text-destructive cursor-pointer"
                                          onClick={() => setDeletingProgram(program)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete Program
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8">
                                <div className="flex flex-col items-center gap-3">
                                  <Layers className="h-12 w-12 text-gray-300" />
                                  <div>
                                    <h3 className="font-semibold text-lg">No programs found</h3>
                                    <p className="text-muted-foreground mt-1">
                                      {programs.length === 0 
                                        ? "Start by creating your first program."
                                        : "Try adjusting your search terms."}
                                    </p>
                                  </div>
                                  {searchQuery && (
                                    <Button variant="outline" onClick={clearFilters}>
                                      Clear Search
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
                          Showing {startIndex + 1} to {Math.min(endIndex, processedPrograms.length)} of {processedPrograms.length} programs
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
          </TabsContent>

          <TabsContent value="framework" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Program-Level Results Framework</CardTitle>
                <CardDescription>
                  Link a program to a strategic objective and define its outcomes and outputs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    onValueChange={setSelectedProgramId}
                    value={selectedProgramId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program to configure..." />
                    </SelectTrigger>
                    <SelectContent>
                      {processedPrograms.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                          {p.code && ` (${p.code})`}
                          {getStrategicObjectiveDisplay(p) !== '-' && ` - ${getStrategicObjectiveDisplay(p)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedProgram && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProgramForIndicators(selectedProgram);
                          setIsIndicatorModalOpen(true);
                        }}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Manage Indicators ({selectedProgram.indicator_count || 0})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingProgram(selectedProgram);
                          setIsProgramEditorOpen(true);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Program
                      </Button>
                    </div>
                  )}
                </div>
                
                {selectedProgram ? (
                  <>
                    {getStrategicObjectiveDetails(selectedProgram) && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-primary">Linked Strategic Objective</h3>
                        </div>
                        <div className="text-sm text-foreground">
                          <p className="font-medium">{getStrategicObjectiveDetails(selectedProgram).name}</p>
                          {getStrategicObjectiveDetails(selectedProgram).code && (
                            <p className="mt-1 text-muted-foreground">Code: {getStrategicObjectiveDetails(selectedProgram).code}</p>
                          )}
                          {getStrategicObjectiveDetails(selectedProgram).description && (
                            <p className="mt-1 text-muted-foreground">{getStrategicObjectiveDetails(selectedProgram).description}</p>
                          )}
                          {selectedProgram.linked_objectives?.length > 1 && (
                            <p className="mt-1 text-primary/80">
                              +{selectedProgram.linked_objectives.length - 1} more objectives linked
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <ProgramResultsFramework
                      program={selectedProgram}
                      setProgram={handleUpdateProgram}
                      strategicObjectives={strategicObjectives}
                    />
                  </>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Target className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Select a Program</h3>
                    <p className="text-muted-foreground mb-4">
                      Choose a program from the dropdown above to configure its results framework
                    </p>
                    <Button
                      onClick={() => {
                        setEditingProgram(null);
                        setIsProgramEditorOpen(true);
                      }}
                      variant="outline"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Program
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Program Editor Modal — always mounted; Radix controls visibility via isOpen */}
        <ProgramEditor
          program={editingProgram}
          isOpen={isProgramEditorOpen}
          onClose={() => {
            setIsProgramEditorOpen(false);
            // Defer clearing so Radix finishes portal/focus-trap cleanup
            // before the prop change triggers a re-render.
            setTimeout(() => setEditingProgram(null), 150);
          }}
          onSave={handleSaveProgram}
        />

        {/* Indicator Manager Modal — always mounted so Radix can finish its
            focus-trap / pointer-events cleanup before the component unmounts.
            We pass a fallback empty object when no program is selected so the
            component stays in the tree; isOpen=false keeps it hidden. */}
        <IndicatorManager
          program={selectedProgramForIndicators ?? {}}
          isOpen={isIndicatorModalOpen}
          onClose={() => {
            setIsIndicatorModalOpen(false);
            setTimeout(() => {
              setSelectedProgramForIndicators(null);
              fetchData(false);
            }, 300);
          }}
          strategicObjectives={strategicObjectives}
        />

        {/* Delete Program Dialog — always mounted; open prop controls visibility */}
        <AlertDialog
          open={!!deletingProgram}
          onOpenChange={(open) => {
            if (!open) setTimeout(() => setDeletingProgram(null), 150);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Program</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{deletingProgram ? ` the program "${deletingProgram.name}"` : " this program"}?
                This action cannot be undone. All associated indicators and framework data will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProgram}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Program
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </AppLayout>
  );
}