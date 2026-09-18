'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityEditorProps {
  activity: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: any) => void;
  projectIndicators: any[];
}

const emptyActivity = { 
  id: null, 
  name: '', 
  description: '', 
  linked_project_indicator: '',
  start_date: '',
  end_date: '',
  is_completed: false 
};

export function ActivityEditor({
  activity,
  isOpen,
  onClose,
  onSave,
  projectIndicators,
}: ActivityEditorProps) {
  const [currentActivity, setCurrentActivity] = useState(activity || emptyActivity);

  useEffect(() => {
    setCurrentActivity(activity || emptyActivity);
  }, [activity, isOpen]);

  const handleChange = (field: string, value: string | boolean | Date) => {
    setCurrentActivity((prev: any) => ({ 
      ...prev, 
      [field]: value instanceof Date ? value.toISOString().split('T')[0] : value 
    }));
  };

  const handleIndicatorChange = (value: string) => {
    handleChange('linked_project_indicator', value);
  };

  const handleCheckboxChange = (checked: boolean) => {
    handleChange('is_completed', checked);
  };

  const handleDateChange = (field: 'start_date' | 'end_date', date: Date | undefined) => {
    if (date) {
      handleChange(field, date);
    } else {
      handleChange(field, '');
    }
  };

  const handleSave = () => {
    if (currentActivity.name && currentActivity.description && currentActivity.linked_project_indicator) {
        onSave(currentActivity);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  };

  const getSelectedIndicatorName = () => {
    const indicator = projectIndicators.find(
      ind => ind.id === currentActivity.linked_project_indicator
    );
    return indicator?.name || '';
  };

  const formatDateString = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const title = activity ? "Edit Activity" : "Create New Activity";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
              <DialogDescription className="mt-2">
                {activity ? "Update the details of your activity below." : "Fill in the details to create a new activity."}
              </DialogDescription>
            </div>
            {currentActivity.is_completed && (
              <Badge variant="default" className="h-8 px-3 bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Activity Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={currentActivity.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter activity name"
                  className="w-full"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedIndicatorId" className="text-sm font-medium">
                  Linked Indicator <span className="text-red-500">*</span>
                </Label>
                <Select 
                  onValueChange={handleIndicatorChange} 
                  value={currentActivity.linked_project_indicator}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an indicator">
                      {getSelectedIndicatorName() && (
                        <span className="truncate">{getSelectedIndicatorName()}</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projectIndicators.map((indicator) => (
                      <SelectItem 
                        key={indicator.id} 
                        value={indicator.id}
                        className="truncate"
                      >
                        {indicator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={currentActivity.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="min-h-[120px] resize-none"
                placeholder="Describe what this activity involves, its purpose, and expected outcomes..."
                required
              />
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Timeline
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Start Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={currentActivity.start_date || ''}
                    onChange={(e) => handleChange('start_date', e.target.value)}
                    className="w-full pl-10"
                  />
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {currentActivity.start_date && (
                  <p className="text-sm text-gray-600">
                    Selected: {formatDateString(currentActivity.start_date)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  End Date
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={currentActivity.end_date || ''}
                    onChange={(e) => handleChange('end_date', e.target.value)}
                    className="w-full pl-10"
                    min={currentActivity.start_date || undefined}
                  />
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {currentActivity.end_date && (
                  <p className="text-sm text-gray-600">
                    Selected: {formatDateString(currentActivity.end_date)}
                  </p>
                )}
              </div>
            </div>
            
            {currentActivity.start_date && currentActivity.end_date && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Duration:</span>{" "}
                  {formatDateString(currentActivity.start_date)} 
                  {" → "}
                  {formatDateString(currentActivity.end_date)}
                </p>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Status
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div>
                <h4 className="font-medium text-gray-900">Activity Status</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Mark as completed when the activity is finished
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_completed"
                      checked={currentActivity.is_completed}
                      onCheckedChange={handleCheckboxChange}
                      className="h-5 w-5 data-[state=checked]:bg-green-600"
                    />
                    <Label
                      htmlFor="is_completed"
                      className="text-base font-medium cursor-pointer"
                    >
                      {currentActivity.is_completed ? "Completed" : "In Progress"}
                    </Label>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {currentActivity.is_completed 
                      ? "Activity is marked as finished" 
                      : "Activity is currently active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {(currentActivity.name || currentActivity.description) && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Preview
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border">
                {currentActivity.name && (
                  <h4 className="font-semibold text-gray-900 mb-2">{currentActivity.name}</h4>
                )}
                {currentActivity.description && (
                  <p className="text-sm text-gray-600 mb-3">{currentActivity.description}</p>
                )}
                {(currentActivity.start_date || currentActivity.end_date) && (
                  <div className="flex items-center text-sm text-gray-500">
                    {currentActivity.start_date && (
                      <span>Start: {formatDateString(currentActivity.start_date)}</span>
                    )}
                    {currentActivity.start_date && currentActivity.end_date && (
                      <span className="mx-2">→</span>
                    )}
                    {currentActivity.end_date && (
                      <span>End: {formatDateString(currentActivity.end_date)}</span>
                    )}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Linked Indicator:</span>
                    <span className="text-sm text-gray-600">
                      {getSelectedIndicatorName() || "Not selected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium">Status:</span>
                    <span className={`text-sm ${currentActivity.is_completed ? 'text-green-600' : 'text-blue-600'}`}>
                      {currentActivity.is_completed ? "Completed" : "In Progress"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose} className="min-w-[100px]">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                disabled={!currentActivity.name || !currentActivity.description || !currentActivity.linked_project_indicator}
              >
                {activity ? "Update Activity" : "Create Activity"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}