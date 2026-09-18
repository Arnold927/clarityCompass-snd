'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { FileText, Link as LinkIcon, PlusCircle, MoreVertical, Eye, List, Edit, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ProjectDataCollectionTabProps {
  project: { id: number; title?: string };
}

export function ProjectDataCollectionTab({ project }: ProjectDataCollectionTabProps) {
  const [linkedForms, setLinkedForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinkedForms = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    
    try {
      const allFormsRes = await api.get('/data-collection/forms/');
      const allForms = allFormsRes.data;
      
      const projectIdNum = Number(project.id);
      const projectIdStr = String(project.id);
      
      const formsLinkedToProject = allForms.filter((form: any) => {
        const checks = {
          projectField: form.project == projectIdNum || form.project === projectIdStr,
          projectIdField: form.project_id == projectIdNum || form.project_id === projectIdStr,
          projectsArray: Array.isArray(form.projects) && (
            form.projects.includes(projectIdNum) || 
            form.projects.includes(projectIdStr) ||
            form.projects.some((p: any) => 
              p?.id == projectIdNum || 
              p?.id === projectIdStr ||
              p == projectIdNum ||
              p === projectIdStr
            )
          ),
          projectsObjects: Array.isArray(form.projects) && form.projects.some(
            (p: any) => p && (p.id == projectIdNum || p.id === projectIdStr)
          ),
        };
        
        const isLinked = 
          checks.projectField || 
          checks.projectIdField || 
          checks.projectsArray || 
          checks.projectsObjects;
        
        return isLinked;
      });
      
      if (formsLinkedToProject.length > 0) {
        const formsWithProjectSubmissions = await Promise.all(
          formsLinkedToProject.map(async (form: any) => {
            try {
              const submissionsRes = await api.get(
                `/data-collection/submissions/?form=${form.id}&project=${project.id}`
              );
              return {
                ...form,
                submission_count: submissionsRes.data.count || submissionsRes.data.length || 0
              };
            } catch (err) {
              console.error(`Failed to fetch submissions for form ${form.id}:`, err);
              return { ...form, submission_count: 0 };
            }
          })
        );
        
        setLinkedForms(formsWithProjectSubmissions);
      } else {
        setLinkedForms([]);
      }
      
    } catch (err) {
      console.error('Failed to fetch linked forms:', err);
      setLinkedForms([]);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    fetchLinkedForms();
  }, [fetchLinkedForms]);

  const handleEnterData = useCallback((formId: number) => {
    const timer = setTimeout(() => {
      fetchLinkedForms();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [fetchLinkedForms]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Collection Forms</CardTitle>
          <CardDescription>Loading forms linked to this project...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Data Collection Forms</CardTitle>
          <CardDescription>
            Forms linked to this project for data collection.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={fetchLinkedForms}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/data-collection?action=link&projectId=${project.id}`}>
              Link Form
            </Link>
           </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/data-collection/forms/new?projectId=${project.id}`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Form
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {linkedForms.length === 0 ? (
          <div className="text-center py-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <LinkIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-muted-foreground mb-2">No data collection forms are linked to this project yet.</p>
                <p className="text-sm text-gray-500 mb-4">Link a form to start collecting data for this project.</p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link href={`/data-collection?action=link&projectId=${project.id}`}>
                    Link Existing Form
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/data-collection/forms/new?projectId=${project.id}`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Form
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="font-medium">Linked Forms ({linkedForms.length})</h3>
              <p className="text-sm text-gray-500">Forms that are connected to this project</p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Project Submissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {form.title}
                        {form.is_active ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{form.description || 'No description'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{form.submission_count}</span>
                        <span className="text-sm text-gray-500">submissions</span>
                        {form.submission_count > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            This Project
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/data-collection/forms/${form.id}`} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" />
                                View/Edit Form
                              </Link>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem asChild>
                              <Link 
                                href={`/data-collection/submissions/${form.id}?project=${project.id}`} 
                                className="cursor-pointer"
                              >
                                <List className="mr-2 h-4 w-4" />
                                View Project Submissions ({form.submission_count})
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem asChild>
                              <Link 
                                href={`/data-collection/entry/${form.id}?project=${project.id}`} 
                                className="cursor-pointer"
                                onClick={() => handleEnterData(form.id)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Enter New Data
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            
          </>
        )}
      </CardContent>
    </Card>
  );
}