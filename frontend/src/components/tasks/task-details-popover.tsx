'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, MapPin, PencilRuler } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, isValid, parseISO } from 'date-fns';
import Link from 'next/link';
import { TaskUpdateEditor } from './task-update-editor';
import { cn } from '@/lib/utils'

export function TaskDetailsPopover({ 
  task, 
  locations, 
  onEditTask, 
  projectCurrency, 
  onOpenUpdateEditor 
}: { 
  task: any, 
  locations: any[], 
  onEditTask: (task: any) => void, 
  projectCurrency: string, 
  onOpenUpdateEditor?: () => void 
}) {
  
  const latestUpdate = task.updates?.[task.updates.length - 1];
  const totalSpent = task.updates?.reduce((sum: number, u: any) => sum + (Number(u.amountSpent || u.amount_spent) || 0), 0) || 0;
  
  const taskLocations = locations?.filter(l => 
    task.locationIds && Array.isArray(task.locationIds) 
      ? task.locationIds.includes(l.id) 
      : (task.location && Array.isArray(task.location) 
          ? task.location.includes(l.id) 
          : false)
  ).map(l => l.name) || [];

  // const [showUpdateEditor, setShowUpdateEditor] = useState(false);
  
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
  
  const getStatusColor = () => {
    if (!latestUpdate) return 'bg-gray-400';
    switch (latestUpdate.status) {
      case 'red': return 'bg-red-500';
      case 'amber': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const handleUpdateStatus = () => {
  if (onOpenUpdateEditor) {
    onOpenUpdateEditor();
  }
};

  const handleUpdateSaved = (update: any) => {
    console.log("Update saved:", update);
    // setShowUpdateEditor(false);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-bold">{task.title}</h4>
            <p className="text-sm text-muted-foreground">{task.activityName || task.activity?.name || 'No activity'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditTask(task)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Link
            href={`/tasks/${task.id}/report`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Report Indicator
          </Link>
        </div>
        
        <Separator />
        <p className="text-sm">{task.description || "No description provided."}</p>
        
        {taskLocations.length > 0 && (
          <div className="flex items-start">
            <MapPin className="mr-1.5 h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {taskLocations.map(loc => (
                <Badge key={loc} variant="secondary" className="font-normal">{loc}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm space-y-1">
          <p><strong>Focal Person:</strong> {task.focal_person?.name || "Unassigned"}</p>
          <p><strong>Dates:</strong> {safeTaskStartDate} - {safeTaskEndDate}</p>
          <div className="text-sm space-y-1">
            <p><strong>Budget:</strong> {projectCurrency} {task.budget ? new Intl.NumberFormat().format(Number(task.budget)) : '0'}</p>
            
            {task.budget && Number(task.budget) > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Budget Utilization</span>
                  <span>{((totalSpent / Number(task.budget)) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      (totalSpent / Number(task.budget)) > 1 ? "bg-red-500" :
                      (totalSpent / Number(task.budget)) > 0.8 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${Math.min((totalSpent / Number(task.budget)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Spent: {projectCurrency} {totalSpent.toLocaleString()} 
                  <> / Budget: {projectCurrency} {Number(task.budget).toLocaleString()}</>
                </p>
              </div>
            )}
            
            <p><strong>Amount Spent:</strong> {projectCurrency} {totalSpent.toLocaleString()}</p>
          </div>
        </div>
        
        {latestUpdate && (
          <div className="text-sm space-y-1">
            <p><strong>Last Update:</strong> {safeLatestUpdateDate}</p>
            <div className="flex items-center gap-2">
              <Badge className={`capitalize text-white ${getStatusColor()}`}>{latestUpdate.status}</Badge>
              <p className="text-xs text-muted-foreground italic">
                {latestUpdate.statusJustification || latestUpdate.status_justification || 'No justification provided'}
              </p>
            </div>
          </div>
        )}
        
        {latestUpdate?.isComplete && <Badge variant="secondary">Completed</Badge>}
        
        <Separator />

        <Button
          className="w-full"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleUpdateStatus();
          }}
          onPointerDown={(e) => e.preventDefault()}
        >
          <PencilRuler className="mr-2 h-4 w-4" />
          Update Status
        </Button>

        
      </div>
      
      {/* <TaskUpdateEditor
        task={task}
        isOpen={showUpdateEditor}
        onClose={() => setShowUpdateEditor(false)}
        onSave={handleUpdateSaved}
        projectCurrency={projectCurrency}
        latestUpdate={latestUpdate}
      /> */}
    </>
  );
}