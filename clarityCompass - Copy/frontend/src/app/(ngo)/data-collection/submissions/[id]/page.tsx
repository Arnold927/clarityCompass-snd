'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Layers
} from "lucide-react";
import { useParams } from "next/navigation";
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSearchParams } from "next/navigation";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function downloadCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0] || {});
  const csv = [
    headers.join(','), 
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ColumnVisibility {
  [key: string]: boolean;
}

function DynamicSubmissionRenderer({ submission }: { submission: { data: Record<string, any> } }) {
  const { data } = submission;
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderField = useCallback((key: string, value: any, depth: number = 0, path: string = ''): React.ReactNode => {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (value && typeof value === 'object' && 'id' in value && 'value' in value) {
      return renderField(key, value.value, depth, path);
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-3">
          {value.map((item, index) => (
            <Card key={index} className="bg-gray-50/50 border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">Entry {index + 1}</div>
                  {typeof item === 'object' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(`${fullPath}[${index}]`)}
                      className="h-6 px-2"
                    >
                      {collapsedSections[`${fullPath}[${index}]`] ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronUp className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                
                {!collapsedSections[`${fullPath}[${index}]`] && (
                  <div className="space-y-2">
                    {typeof item === 'object' ? (
                      <div className="space-y-2">
                        {Object.entries(item).map(([subKey, subValue]) => (
                          <div key={subKey} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Label className="text-sm font-medium text-gray-600 sm:col-span-1">{subKey}:</Label>
                            <div className="sm:col-span-2">{renderField(subKey, subValue, depth + 1, `${fullPath}[${index}]`)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-800">{formatValue(item)}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (value && typeof value === 'object') {
      const isCollapsed = collapsedSections[fullPath];
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection(fullPath)}
              className="h-7 px-2 -ml-2"
            >
              {isCollapsed ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronUp className="h-3 w-3 mr-1" />
              )}
              <span className="text-xs font-medium">Toggle Section</span>
            </Button>
          </div>
          
          {!isCollapsed && (
            <div className="pl-4 space-y-2">
              {Object.entries(value).map(([subKey, subValue]) => (
                <div key={subKey} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Label className="text-sm font-medium text-gray-600 sm:col-span-1">{subKey}:</Label>
                  <div className="sm:col-span-2">{renderField(subKey, subValue, depth + 1, fullPath)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-gray-800">{formatValue(value)}</span>;
  }, [collapsedSections]);

  const formatValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return '—';
    
    if (typeof value === 'string') {
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}T/,
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{2}\/\d{2}\/\d{4}$/,
        /^\d{4}\/\d{2}\/\d{2}$/
      ];
      
      const isDateString = datePatterns.some(pattern => pattern.test(value));
      
      if (isDateString) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-gray-500" />
                {format(date, 'PPP')}
              </div>
            );
          }
        } catch (e) {
          
        }
      }
    }
    
    if (value instanceof Date) {
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-gray-500" />
          {format(value, 'PPP')}
        </div>
      );
    }
    
    return String(value);
  };

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([fieldName, fieldValue]) => (
        <div key={fieldName} className="space-y-2 p-3 bg-gray-50/30 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-gray-900 capitalize">
              {fieldName.replace(/_/g, ' ')}
            </Label>
            {typeof fieldValue === 'object' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection(fieldName)}
                className="h-6 px-2 text-xs"
              >
                {collapsedSections[fieldName] ? 'Expand' : 'Collapse'}
              </Button>
            )}
          </div>
          
          {!collapsedSections[fieldName] && (
            <div className="pl-2">
              {renderField(fieldName, fieldValue, 0, fieldName)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface Submission {
  id?: number | string;
  localId?: string;
  local_id?: string;
  data: Record<string, any>;
  submitted_at?: string | number;
  synced?: boolean;
  syncFailed?: boolean;
  project?: { title?: string; code?: string } | null;
  submitted_by?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    username?: string;
    role?: string;
  };
  user_role?: string;
}

interface SubmissionsViewerProps {
  form: any;
  submissions: Submission[];
  onRetrySync?: (submission: Submission) => void;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function SubmissionsViewer({ 
  form, 
  submissions, 
  onRetrySync,
  pagination,
  onPageChange,
  onPageSizeChange
}: SubmissionsViewerProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showRaw, setShowRaw] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    id: true,
    date: true,
    user: true,
    project: true,
    status: true,
    completion: true,
    actions: true,
  });
  
  const toggleExpanded = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRaw = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowRaw(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const rowVirtualizer = useVirtualizer({
    count: submissions?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const s = submissions[index];
      const isExpanded = expanded[String(s?.id ?? s?.localId ?? index)];
      return isExpanded ? 400 : 60;
    },
    overscan: 5,
  });

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, pagination.total);

  const handleRetrySync = async (submission: Submission) => {
    if (onRetrySync) {
      onRetrySync(submission);
    }
  };

  const hasNoSubmissions = !submissions || submissions.length === 0;

  return (
    <div className="space-y-4">
      {/* Table Header with Column Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Show Columns:</span>
          <div className="flex flex-wrap gap-2">
            {Object.keys(columnVisibility).map((col) => (
              <div key={col} className="flex items-center gap-1">
                <Switch
                  checked={columnVisibility[col]}
                  onCheckedChange={(checked) => 
                    setColumnVisibility(prev => ({ ...prev, [col]: checked }))
                  }
                  className="scale-75"
                />
                <Label className="text-xs capitalize">{col}</Label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{endIndex} of {pagination.total}
        </div>
      </div>

      <div ref={parentRef} className="h-[60vh] overflow-auto w-full rounded-lg border">
        {hasNoSubmissions ? (
          <div className="flex flex-col items-center justify-center h-full p-12 border-2 border-dashed border-gray-200 rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <div className="text-gray-500 mb-2">No submissions yet</div>
            <p className="text-sm text-gray-400 text-center max-w-md">
              Start collecting data by entering new submissions for this form.
            </p>
          </div>
        ) : (
          <>
            {/* Table Headers */}
            <div className="sticky top-0 z-10 bg-white border-b">
              <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-gray-600">
                {columnVisibility.id && <div className="col-span-2">ID</div>}
                {columnVisibility.date && <div className="col-span-2">Date</div>}
                {columnVisibility.user && <div className="col-span-2">Submitted By</div>}
                {columnVisibility.project && <div className="col-span-2">Project</div>}
                {columnVisibility.status && <div className="col-span-1">Status</div>}
                {columnVisibility.completion && <div className="col-span-2">Completion</div>}
                {columnVisibility.actions && <div className="col-span-1">Actions</div>}
              </div>
            </div>

            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const s = submissions[virtualRow.index];
                const subKey = String(s.id ?? s.localId ?? virtualRow.index);
                const isExpanded = expanded[subKey];
                const isRawVisible = showRaw[subKey];
                const completion = calculateCompletionRate(form?.form_fields || [], s.data || {});
                const filledFields = countFilledFields(form.form_fields, s.data || {});
                
                return (
                  <div
                    key={subKey}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <Card className={`mx-2 mb-2 ${isExpanded ? "shadow-lg border-primary/20" : "shadow-sm hover:shadow-md"}`}>
                      {/* Collapsed Row View */}
                      <div
                        className={`cursor-pointer ${isExpanded ? "bg-primary/5" : "hover:bg-gray-50"}`}
                        onClick={() => toggleExpanded(subKey)}
                      >
                        <div className="grid grid-cols-12 gap-4 p-4 items-center">
                          {columnVisibility.id && (
                            <div className="col-span-2">
                              <div className="text-sm font-medium truncate">
                                {s.id || s.local_id || s.localId || `Local #${virtualRow.index + 1}`}
                              </div>
                            </div>
                          )}
                          
                          {columnVisibility.date && (
                            <div className="col-span-2">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(s.submitted_at || Date.now()), "MMM dd")}
                              </div>
                              <div className="text-xs text-gray-400">
                                {format(new Date(s.submitted_at || Date.now()), "hh:mm a")}
                              </div>
                            </div>
                          )}
                          
                          {columnVisibility.user && (
                            <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-sm truncate">
                                  {s.submitted_by
                                    ? `${s.submitted_by.first_name || ""} ${s.submitted_by.last_name || ""}`.trim() || s.submitted_by.email
                                    : "-"}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {columnVisibility.project && (
                            <div className="col-span-2">
                              <Badge variant="outline" className="truncate max-w-full">
                                {s.project?.code || s.project?.title || "No Project"}
                              </Badge>
                            </div>
                          )}
                          
                          {columnVisibility.status && (
                            <div className="col-span-1">
                              {s.synced ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Synced</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : s.syncFailed ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <XCircle className="h-4 w-4 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Sync Failed</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Clock className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Pending Sync</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          )}
                          
                          {columnVisibility.completion && (
                            <div className="col-span-2">
                              <div className="flex items-center gap-2">
                                <Progress value={completion} className="h-2 flex-1" />
                                <span className="text-xs font-medium min-w-[40px]">{completion}%</span>
                              </div>
                            </div>
                          )}
                          
                          {columnVisibility.actions && (
                            <div className="col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(subKey);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && (
                        <div className="p-6 space-y-6 border-t">
                          <div className="space-y-4">
                            <DynamicSubmissionRenderer submission={s} />
                          </div>

                          <div className="flex flex-wrap gap-3 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => toggleRaw(subKey, e)}
                              className="flex items-center gap-2"
                            >
                              {isRawVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              {isRawVisible ? "Hide Raw" : "Show Raw"}
                            </Button>

                            {!s.synced && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRetrySync(s)}
                                className="flex items-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Retry Sync
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(s.data, null, 2));
                                }}>
                                  Copy Data
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* <DropdownMenuItem className="text-red-600">
                                  Delete Submission
                                </DropdownMenuItem> */}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Raw Data */}
                          {isRawVisible && (
                            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium">Raw Data</Label>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => toggleRaw(subKey, e)}
                                  className="h-6 px-2 text-xs"
                                >
                                  Hide
                                </Button>
                              </div>
                              <pre className="text-xs overflow-auto p-4 rounded-lg bg-gray-900 text-gray-100 max-h-64 font-mono">
                                {JSON.stringify(s.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination Controls */}
      {!hasNoSubmissions && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function findFieldValue(data: any, field: any): any {
  const fieldLabel = field.label || field.name || field.id;
  let value = data[fieldLabel];
  
  if (value === undefined) {
    const possibleKeys = [field.label, field.name, field.id];
    for (const key of possibleKeys) {
      if (key && data[key] !== undefined) {
        value = data[key];
        break;
      }
    }
  }
  
  if (value && typeof value === 'object' && 'value' in value) {
    value = value.value;
  }
  
  return value;
}

function calculateCompletionRate(formFields: any[], data: any): number {
  if (!Array.isArray(formFields) || formFields.length === 0) {
    return 0;
  }

  let filledCount = 0;
  let totalCount = 0;

  for (const field of formFields) {
    const fieldType = field.field_type || field.type;
    const isRequired = field.required === true;
    const hasCondition = field.condition !== null && field.condition !== undefined;
    
    if (!isRequired) {
      continue;
    }

    if (hasCondition) {
      const condition = field.condition;
      const dependsOnField = formFields.find(f => f.id === condition.fieldId);
      if (dependsOnField) {
        const dependsOnValue = findFieldValue(data, dependsOnField);
        const conditionMet = checkCondition(dependsOnValue, condition.operator, condition.value);
        if (!conditionMet) {
          continue;
        }
      }
    }

    if (fieldType === 'field_group' || fieldType === 'group') {
      const value = findFieldValue(data, field);
      const nestedFields = field.nested_subfields || field.fields || [];
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          let hasFilledInstance = false;
          for (const instance of value) {
            if (isGroupFilled(nestedFields, instance)) {
              hasFilledInstance = true;
              break;
            }
          }
          totalCount += 1;
          if (hasFilledInstance) {
            filledCount += 1;
          }
        } else {
          totalCount += 1;
        }
      } else if (value && typeof value === 'object') {
        totalCount += 1;
        if (isGroupFilled(nestedFields, value)) {
          filledCount += 1;
        }
      } else {
        totalCount += 1;
      }
    } else {
      const value = findFieldValue(data, field);
      totalCount += 1;
      if (isFieldFilled(value, fieldType)) {
        filledCount += 1;
      }
    }
  }

  if (totalCount === 0) {
    return 100;
  }

  return Math.round((filledCount / totalCount) * 100);
}

function isFieldFilled(value: any, fieldType: string): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0 && value.some(item => item !== null && item !== undefined && item !== '');
  }

  if (typeof value === 'object') {
    if ('value' in value) {
      return isFieldFilled(value.value, fieldType);
    }
    return Object.values(value).some(val => val !== null && val !== undefined && val !== '');
  }

  return true;
}

function isGroupFilled(nestedFields: any[], data: any): boolean {
  if (!Array.isArray(nestedFields) || nestedFields.length === 0) {
    return true;
  }

  for (const field of nestedFields) {
    if (field.required === true) {
      const value = findFieldValue(data, field);
      if (!isFieldFilled(value, field.field_type || field.type)) {
        return false;
      }
    }
  }

  return true;
}

function checkCondition(value: any, operator: string, expectedValue: any): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  const actualValue = value && typeof value === 'object' && 'value' in value ? value.value : value;

  switch (operator.toLowerCase()) {
    case 'equals':
    case '===':
    case '==':
      return String(actualValue) === String(expectedValue);
    case 'notequals':
    case '!==':
    case '!=':
      return String(actualValue) !== String(expectedValue);
    case 'greaterthan':
    case '>':
      return Number(actualValue) > Number(expectedValue);
    case 'lessthan':
    case '<':
      return Number(actualValue) < Number(expectedValue);
    case 'contains':
      return String(actualValue).includes(String(expectedValue));
    default:
      return false;
  }
}

function countTotalFields(fields: any[] | undefined): number {
  if (!Array.isArray(fields) || fields.length === 0) return 0;

  let count = 0;
  
  for (const field of fields) {
    const fieldType = field.field_type || field.type;
    const isRequired = field.required === true;
    
    if (!isRequired) continue;
    
    if (fieldType === 'field_group' || fieldType === 'group') {
      count += 1;
    } else {
      count += 1;
    }
  }
  
  return count;
}

function countFilledFields(fields: any[] | undefined, data: any): number {
  if (!Array.isArray(fields) || fields.length === 0) return 0;

  let count = 0;
  
  for (const field of fields) {
    const fieldType = field.field_type || field.type;
    const isRequired = field.required === true;
    
    if (!isRequired) continue;
    
    const value = findFieldValue(data, field);
    
    if (fieldType === 'field_group' || fieldType === 'group') {
      const nestedFields = field.nested_subfields || field.fields || [];
      
      if (Array.isArray(value)) {
        if (value.length > 0) {
          for (const instance of value) {
            if (isGroupFilled(nestedFields, instance)) {
              count += 1;
              break;
            }
          }
        }
      } else if (value && typeof value === 'object') {
        if (isGroupFilled(nestedFields, value)) {
          count += 1;
        }
      }
    } else if (isFieldFilled(value, fieldType)) {
      count += 1;
    }
  }
  
  return count;
}

const STORAGE_KEY = 'clarity-submissions';

function readLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (e) {
    console.warn('Failed to parse local submissions storage', e);
    return {};
  }
}

function writeLocalStorage(obj: Record<string, any[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

export default function SubmissionsPage() {
  const params = useParams();
  const rawId = params?.id;
  const formId: string = Array.isArray(rawId) ? rawId[0] : rawId || "";
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  
  if (!formId) throw new Error("Missing formId in route params.");

  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all'|'synced'|'unsynced'|'failed'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'completion' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
  });

  useEffect(() => {
    if (!formId) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const formRes = await api.get(`/data-collection/forms/${formId}/`);
        if (cancelled) return;
        setForm(formRes.data);

        let backendSubmissions: Submission[] = [];
        try {
          let query = `/data-collection/submissions/?form=${formId}`;
          if (projectId) query += `&project=${projectId}`;

          const backendRes = await api.get(query);
          backendSubmissions = (backendRes.data || []).map((s: any) => ({ 
            ...s, 
            synced: true, 
            syncFailed: false, 
            localId: null,
            user_role: s.user_role
          }));
        } catch (err) {
          console.warn('No backend submissions or failed to fetch:', err);
        }

        const stored = readLocalStorage();
        const localList: Submission[] = (stored[formId] || []).map((s: any) => ({
          ...s,
          synced: false,
          syncFailed: !!s.syncFailed,
          id: null,
          localId: s.localId ?? `local-${crypto.randomUUID()}`,
        }));

        const allSubmissions = [...backendSubmissions, ...localList];
        if (!cancelled) {
          setSubmissions(allSubmissions);
          setPagination(prev => ({ ...prev, total: allSubmissions.length }));
        }
      } catch (err) {
        console.error('Failed to fetch form or submissions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [formId, projectId]);

  const filtered = useMemo(() => {
    let filteredSubmissions = submissions.filter((s) => {
      if (filter === 'synced' && !s.synced) return false;
      if (filter === 'unsynced' && s.synced) return false;
      if (filter === 'failed' && !s.syncFailed) return false;
      if (!search) return true;
      const hay = JSON.stringify(s.data) + (s.project?.title ?? '') + (s.submitted_by?.email ?? '');
      return hay.toLowerCase().includes(search.toLowerCase());
    });

    filteredSubmissions.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.submitted_at || Date.now()).getTime();
          bValue = new Date(b.submitted_at || Date.now()).getTime();
          break;
        case 'completion':
          aValue = calculateCompletionRate(form?.form_fields || [], a.data || {});
          bValue = calculateCompletionRate(form?.form_fields || [], b.data || {});
          break;
        case 'name':
          aValue = (a.submitted_by?.first_name || a.submitted_by?.email || '').toLowerCase();
          bValue = (b.submitted_by?.first_name || b.submitted_by?.email || '').toLowerCase();
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

    setPagination(prev => ({ ...prev, total: filteredSubmissions.length }));

    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredSubmissions.slice(startIndex, endIndex);
  }, [submissions, filter, search, sortBy, sortOrder, pagination.page, pagination.pageSize, form]);

  const handleSyncAll = async () => {
    if (!form || !formId) return;

    const stored = readLocalStorage();
    const unsynced = stored[formId] || [];

    if (unsynced.length === 0) {
      alert('No unsynced submissions to sync.');
      return;
    }

    setSyncing(true);

    const successfullySynced: string[] = [];

    for (const submission of unsynced) {
      const projectId = submission.project || form.projects?.[0];
      if (!projectId) {
        console.error('Submission missing project ID:', submission);
        continue;
      }

      try {
        const res = await api.post('/data-collection/submissions/', {
          form: form.id,
          project: projectId,
          data: submission.data,
        });

        setSubmissions((prev) => prev.map((s) => {
          if (s.localId === submission.localId) {
            return { ...res.data, synced: true, syncFailed: false, localId: null };
          }
          return s;
        }));

        successfullySynced.push(submission.localId);
      } catch (err) {
        console.error('Failed to sync submission:', submission, err);
        setSubmissions((prev) => prev.map((s) => s.localId === submission.localId ? { ...s, syncFailed: true } : s));
      }
    }

    const remaining = (stored[formId] || []).filter((s: any) => !successfullySynced.includes(s.localId));
    stored[formId] = remaining;
    writeLocalStorage(stored);

    setSyncing(false);
    alert(`Synced ${successfullySynced.length} submissions successfully!`);
  };

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  if (loading) {
    return (
      <AppLayout platform="ngo">
        <div className="p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {form ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href="/data-collection">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
                  <p className="text-muted-foreground mt-1">
                    <span className="font-semibold text-primary">{form.title}</span>
                    {form.description && <span className="ml-2 text-sm">• {form.description}</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="mr-2 h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/data-collection/forms/${formId}`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Form
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/data-collection/entry/${formId}${projectId ? `?project=${projectId}` : ''}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Enter New Data
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSyncAll} disabled={syncing}>
                      <Upload className="mr-2 h-4 w-4" />
                      {syncing ? 'Syncing...' : 'Upload All Pending'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold mt-1">{submissions.length}</p>
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
                      <p className="text-sm font-medium text-muted-foreground">Synced</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {submissions.filter(s => s.synced).length}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {submissions.filter(s => !s.synced && !s.syncFailed).length}
                      </p>
                    </div>
                    <div className="p-2 bg-amber-100 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        {submissions.filter(s => s.syncFailed).length}
                      </p>
                    </div>
                    <div className="p-2 bg-red-100 rounded-full">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Controls Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search in submissions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="completion">Completion</SelectItem>
                          <SelectItem value="name">Submitter</SelectItem>
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

                    <Tabs defaultValue="all" value={filter} onValueChange={(v) => setFilter(v as any)}>
                      <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="synced">Synced</TabsTrigger>
                        <TabsTrigger value="unsynced">Pending</TabsTrigger>
                        <TabsTrigger value="failed">Failed</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (!form) return;
                  
                  // Simplified export logic
                  const csvData = filtered.map((s, index) => {
                    const completion = calculateCompletionRate(form.form_fields, s.data);
                    const filledFields = countFilledFields(form.form_fields, s.data);
                    const totalFields = countTotalFields(form.form_fields);

                    return {
                      'Submission ID': s.id || s.local_id || s.localId || `local-${index}`,
                      'Project': s.project?.title || '-',
                      'Submitted Date': format(new Date(s.submitted_at || Date.now()), 'yyyy-MM-dd'),
                      'Submitted Time': format(new Date(s.submitted_at || Date.now()), 'HH:mm:ss'),
                      'Submitter': s.submitted_by
                        ? `${s.submitted_by.first_name || ''} ${s.submitted_by.last_name || ''}`.trim()
                        : '-',
                      'Email': s.submitted_by?.email || '-',
                      'Role': s.user_role || s.submitted_by?.role || '-',
                      'Status': s.synced ? 'Synced' : s.syncFailed ? 'Failed' : 'Pending',
                      'Completion Rate': `${completion}%`,
                      'Filled Fields': filledFields,
                      'Total Fields': totalFields,
                      'Raw Data': JSON.stringify(s.data)
                    };
                  });
                  
                  if (csvData.length > 0) {
                    const filename = `${form.title.replace(/\s+/g, '-')}-submissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                    downloadCSV(csvData, filename);
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Current View
              </Button>
            </div>

            {/* Submissions Viewer */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Submission List
                </CardTitle>
                <CardDescription>
                  Showing {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} submissions
                  {search && ` • Filtered by: "${search}"`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SubmissionsViewer 
                  form={form} 
                  submissions={filtered} 
                  onRetrySync={(submission) => {
                    // Implement retry sync logic here
                    console.log('Retry sync for:', submission);
                  }}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <FileText className="h-12 w-12 mx-auto text-gray-300" />
                <h3 className="text-xl font-semibold">Form not found</h3>
                <p className="text-muted-foreground">The form you're looking for doesn't exist or you don't have access to it.</p>
                <Button asChild variant="outline">
                  <Link href="/data-collection">Return to Forms</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </AppLayout>
  );
}



