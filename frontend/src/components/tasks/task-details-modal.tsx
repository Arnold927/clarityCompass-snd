'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  MapPin, 
  PencilRuler, 
  X, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { format, isValid, parseISO } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TaskDetailsModalProps {
  task: any;
  locations: any[];
  onEditTask: (task: any) => void;
  projectCurrency: string;
  onOpenUpdateEditor: () => void;
  onClose: () => void;
}

export function TaskDetailsModal({ 
  task, 
  locations, 
  onEditTask, 
  projectCurrency, 
  onOpenUpdateEditor,
  onClose 
}: TaskDetailsModalProps) {


  const latestUpdate = task.updates?.[task.updates.length - 1];
  const totalSpent = task.updates?.reduce((sum: number, u: any) => 
    sum + (Number(u.amountSpent || u.amount_spent) || 0), 0) || 0;
  
  const taskLocations = locations?.filter(l => 
    task.locationIds && Array.isArray(task.locationIds) 
      ? task.locationIds.includes(l.id) 
      : (task.location && Array.isArray(task.location) 
          ? task.location.includes(l.id) 
          : false)
  ).map(l => l.name) || [];

  const safeFormatDate = (dateString: string | null | undefined, fallback: string = 'N/A') => {
    if (!dateString) return fallback;
    
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
      
      const dateObj = new Date(dateString);
      if (isValid(dateObj)) {
        return format(dateObj, 'MMM d, yyyy');
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    
    return fallback;
  };

  const safeTaskStartDate = safeFormatDate(task.startDate || task.start_date, 'Not set');
  const safeTaskEndDate = safeFormatDate(task.endDate || task.end_date, 'Not set');
  const safeLatestUpdateDate = safeFormatDate(latestUpdate?.statusDate || latestUpdate?.status_date, 'N/A');
  
  const getStatusConfig = () => {
    if (!latestUpdate) return { 
      color: 'bg-gray-500', 
      icon: Clock,
      label: 'No Status',
      bgColor: 'bg-gray-50 border-gray-200',
      textColor: 'text-gray-700'
    };
    
    switch (latestUpdate.status) {
      case 'red': 
        return { 
          color: 'bg-red-500', 
          icon: AlertCircle,
          label: 'At Risk',
          bgColor: 'bg-red-50 border-red-100',
          textColor: 'text-red-700'
        };
      case 'amber': 
        return { 
          color: 'bg-yellow-500', 
          icon: AlertCircle,
          label: 'Needs Attention',
          bgColor: 'bg-yellow-50 border-yellow-100',
          textColor: 'text-yellow-700'
        };
      case 'green': 
        return { 
          color: 'bg-green-500', 
          icon: CheckCircle2,
          label: 'On Track',
          bgColor: 'bg-green-50 border-green-100',
          textColor: 'text-green-700'
        };
      default: 
        return { 
          color: 'bg-gray-500', 
          icon: Clock,
          label: 'No Status',
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-700'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  const budgetUtilization = task.budget && Number(task.budget) > 0 
    ? (totalSpent / Number(task.budget)) * 100 
    : 0;
  
  const getBudgetColor = () => {
    if (budgetUtilization > 100) return "bg-red-500";
    if (budgetUtilization > 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header Section with Status */}
        <div className={cn("p-6 border-b", statusConfig.bgColor)}>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-5 w-5", statusConfig.textColor)} />
                <Badge className={cn("font-semibold", statusConfig.color, statusConfig.textColor)}>
                  {statusConfig.label}
                </Badge>
                {latestUpdate?.isComplete && (
                  <Badge variant="outline" className="bg-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold">{task.title}</DialogTitle>
              <DialogDescription className="text-base">
                {task.activityName || task.activity?.name || 'No activity specified'}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                onEditTask(task);
                onClose();
              }}
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                onOpenUpdateEditor();
                onClose();
              }}
            >
              <PencilRuler className="h-4 w-4" />
              Update Status
            </Button>
            <Link
              href={`/tasks/${task.id}/report`}
              className="flex-1"
            >
              <Button className="w-full gap-2 bg-orange-600 hover:bg-orange-700">
                <FileText className="h-4 w-4" />
                Report
              </Button>
            </Link>
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Dates Card */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Timeline</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Start - End</p>
                <p className="font-medium">{safeTaskStartDate} - {safeTaskEndDate}</p>
                {latestUpdate && (
                  <>
                    <p className="text-sm text-muted-foreground mt-3 mb-1">Last Update</p>
                    <p className="font-medium">{safeLatestUpdateDate}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Focal Person Card */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Responsibility</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Focal Person</p>
                <p className={cn(
                  "font-medium",
                  task.focal_person?.name ? "text-foreground" : "text-muted-foreground italic"
                )}>
                  {task.focal_person?.name || "Unassigned"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Description Card */}
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-3">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {task.description || "No description provided for this task."}
              </p>
            </CardContent>
          </Card>

          {/* Locations Card */}
          {taskLocations.length > 0 && (
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Locations</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {taskLocations.map(loc => (
                    <Badge 
                      key={loc} 
                      variant="secondary" 
                      className="bg-orange-50 text-orange-700 hover:bg-orange-50 border-orange-200"
                    >
                      {loc}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Card */}
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">Budget Overview</h4>
                </div>
                <Badge variant="outline" className="font-normal">
                  {projectCurrency}
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Budget Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Allocated Budget</p>
                    <p className="text-xl font-semibold">
                      {task.budget ? new Intl.NumberFormat().format(Number(task.budget)) : '0'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Amount Spent</p>
                    <p className="text-xl font-semibold">
                      {totalSpent.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                {task.budget && Number(task.budget) > 0 && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Budget Utilization</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                            "text-sm font-semibold",
                            budgetUtilization > 100 ? "text-red-600" :
                            budgetUtilization > 80 ? "text-yellow-600" : "text-green-600"
                            )}>
                            {budgetUtilization.toFixed(1)}%
                            </span>
                            {budgetUtilization > 100 && (
                            <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                            )}
                        </div>
                        </div>
                        
                        {/* Custom Progress Bar */}
                        <div className="space-y-2">
                        <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                            className={cn(
                                "absolute h-full rounded-full transition-all duration-500",
                                budgetUtilization > 100 ? "bg-gradient-to-r from-red-500 to-red-600" :
                                budgetUtilization > 80 ? "bg-gradient-to-r from-yellow-500 to-yellow-600" : 
                                "bg-gradient-to-r from-green-500 to-green-600"
                            )}
                            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                            />
                            
                            {/* Milestone indicators */}
                            {budgetUtilization > 100 && (
                            <div 
                                className="absolute top-0 h-full w-px bg-red-700"
                                style={{ left: '100%' }}
                            />
                            )}
                        </div>
                        
                        {/* Budget marks */}
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                            {budgetUtilization > 100 && <span className="text-red-600">{budgetUtilization.toFixed(0)}%</span>}
                        </div>
                        
                        {/* Amounts */}
                        <div className="flex justify-between text-sm">
                            <div className="text-left">
                            <p className="text-xs text-muted-foreground">Spent</p>
                            <p className="font-medium">{projectCurrency} {totalSpent.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                            <p className="text-xs text-muted-foreground">Budget</p>
                            <p className="font-medium">{projectCurrency} {Number(task.budget).toLocaleString()}</p>
                            </div>
                        </div>
                        
                        {/* Budget Status Message */}
                        {budgetUtilization > 100 && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <p className="text-sm text-red-700">
                                This task has exceeded its budget by {(budgetUtilization - 100).toFixed(1)}%
                            </p>
                            </div>
                        )}
                        {budgetUtilization > 80 && budgetUtilization <= 100 && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <p className="text-sm text-yellow-700">
                                Budget utilization is high. Consider reviewing expenses.
                            </p>
                            </div>
                        )}
                        {budgetUtilization <= 80 && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <p className="text-sm text-green-700">
                                Budget is within acceptable limits.
                            </p>
                            </div>
                        )}
                        </div>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Latest Update Card */}
          {latestUpdate && (
            <Card className={cn("border shadow-sm", statusConfig.bgColor)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon className={cn("h-4 w-4", statusConfig.textColor)} />
                  <h4 className={cn("text-sm font-medium", statusConfig.textColor)}>Latest Status Update</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Update Date</p>
                      <p className="font-medium">{safeLatestUpdateDate}</p>
                    </div>
                    <Badge className={cn("text-white font-semibold px-3 py-1", statusConfig.color)}>
                      {latestUpdate.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Justification</p>
                    <div className={cn(
                      "p-3 rounded-lg text-sm leading-relaxed",
                      statusConfig.textColor
                    )}>
                      {latestUpdate.statusJustification || latestUpdate.status_justification || 'No justification provided for this status update.'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom Actions */}
          <Separator />
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => {
                onOpenUpdateEditor();
                onClose();
              }}
            >
              <PencilRuler className="mr-2 h-4 w-4" />
              Update Task Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}