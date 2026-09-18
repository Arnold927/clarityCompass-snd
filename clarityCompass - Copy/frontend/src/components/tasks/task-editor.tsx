'use client';

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, MapPin, User, Calendar, DollarSign, FileText, Tag, AlertCircle } from "lucide-react";
// import { Calendar } from "../ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { TaskIndicatorDataEntry } from "./task-indicator-data-entry";
import { TaskDatePicker } from "@/components/ui/date-picker";
import api from "@/lib/api";
import axios from 'axios';
import { Separator } from "../ui/separator";
import { Card, CardContent } from "../ui/card";

interface Task {
  id?: string;
  title: string;
  description: string;
  activityId?: string;
  focalPersonId?: string;
  locationIds?: string[];
  start_date?: string;
  end_date?: string;
  budget?: string;
  updates?: TaskUpdate[];
  indicatorData?: any;
  attachments?: Attachment[];
  activity?: number;
  focal_person?: { id: number; name: string } | null;
  location?: number[];
}

interface TaskUpdate {
  statusDate: string | null;
  status: "green" | "amber" | "red";
  statusJustification: string;
  isComplete: boolean;
  amountSpent?: string;
}

interface Attachment {
  name: string;
  size: number;
}

interface TaskEditorProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  projectActivities: { id: string; name: string; linkedIndicatorId?: string }[];
  projectTeam: { id: string; name: string; role: string }[];
  projectIndicators: { id: string; name: string }[];
  projectLocations: { id: string; name: string }[];
  projectCurrency: string;
  projectId: string;
}

export function TaskEditor({
  task,
  isOpen,
  onClose,
  onSave,
  projectActivities,
  projectTeam,
  projectIndicators,
  projectLocations,
  projectCurrency,
  projectId,
}: TaskEditorProps) {
  const [currentTask, setCurrentTask] = useState<Task>(task || {
    title: '',
    description: '',
    updates: [],
    indicatorData: {},
    attachments: [],
    locationIds: [],
  });

  const [currentUpdate, setCurrentUpdate] = useState<TaskUpdate>({
    statusDate: null,
    status: "green",
    statusJustification: "",
    isComplete: false,
    amountSpent: "",
  });

  const [startDate, setStartDate] = useState<Date | undefined>(
    task?.start_date ? new Date(task.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    task?.end_date ? new Date(task.end_date) : undefined
  );

  const [isIndicatorEntryOpen, setIsIndicatorEntryOpen] = useState(false);
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!task;
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!currentTask.title.trim()) errors.title = "Title is required";
    if (!currentTask.description.trim()) errors.description = "Description is required";
    if (!currentTask.focalPersonId) errors.focalPerson = "Focal person is required";
    if (!currentTask.locationIds?.length) errors.location = "At least one location is required";
    if (!startDate) errors.startDate = "Start date is required";
    if (!endDate) errors.endDate = "End date is required";
    if (!currentTask.budget) errors.budget = "Budget is required";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canSaveNew = currentTask.title.trim() !== '' &&
    currentTask.description.trim() !== '' &&
    currentTask.focalPersonId &&
    (currentTask.locationIds?.length || 0) > 0 &&
    startDate &&
    endDate &&
    currentTask.budget;

  const linkedActivity = projectActivities.find(a => a.id === currentTask.activityId);
  const linkedIndicator = linkedActivity ? projectIndicators.find(i => i.id === linkedActivity.linkedIndicatorId) : null;
  const selectedLocations = projectLocations.filter(l => currentTask.locationIds?.includes(String(l.id)));

  useEffect(() => {
    if (task && isOpen) {
      console.log("TASK RECEIVED BY MODAL:", JSON.stringify(task, null, 2));
      setCurrentTask({
        title: task?.title || '',
        description: task?.description || '',
        updates: task?.updates || [],
        indicatorData: task?.indicatorData || {},
        attachments: task?.attachments || [],
        activityId: task?.activity != null ? String(task.activity) : '',
        focalPersonId: task?.focal_person ? String(task.focal_person.id) : '',
        locationIds: task?.location?.map((id: number) => String(id)) || [],
        start_date: task?.start_date,
        end_date: task?.end_date,
        budget: task?.budget || '',
        id: task?.id,
      });

      setCurrentUpdate({
        statusDate: null,
        status: "green",
        statusJustification: "",
        isComplete: false,
        amountSpent: "",
      });

      setStartDate(task?.start_date ? new Date(task.start_date) : undefined);
      setEndDate(task?.end_date ? new Date(task.end_date) : undefined);
      setFormErrors({});
    }
  }, [task, isOpen]);

  useEffect(() => {
    console.log('projectTeam in TaskEditor:', projectTeam);
    console.log('projectTeam members count:', projectTeam.length);
    console.log('Current focalPersonId:', currentTask.focalPersonId);
    console.log('Matching member:', projectTeam.find(
      member => String(member.id) === String(currentTask.focalPersonId)
    ));
  }, [projectTeam, currentTask.focalPersonId]);

  const handleTaskChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    setCurrentTask(prev => ({ ...prev, [field]: value }));
    if (formErrors[field as string]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const handleLocationSelect = (id: string) => {
    setCurrentTask(prev => {
      const locs = prev.locationIds || [];
      const newLocs = locs.includes(id) ? locs.filter(x => x !== id) : [...locs, id];
      return { ...prev, locationIds: newLocs };
    });
    if (formErrors.location) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.location;
        return newErrors;
      });
    }
  };

  const handleUpdateChange = <K extends keyof TaskUpdate>(field: K, value: TaskUpdate[K]) => {
    setCurrentUpdate(prev => ({ ...prev, [field]: value }));
  };

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files: Attachment[] = Array.from(event.target.files).map(file => ({
        name: file.name,
        size: file.size,
      }));
      handleTaskChange("attachments", [...(currentTask.attachments || []), ...files]);
    }
  };

  const handleRemoveAttachment = (name: string) => {
    handleTaskChange("attachments", (currentTask.attachments || []).filter(att => att.name !== name));
  };

  const handleSave = async () => {
    if (!validateForm() && !isEditing) return;

    const selectedTeamMember = projectTeam.find(
      member => String(member.id) === String(currentTask.focalPersonId)
    );
    
    const focalPersonIdValue = selectedTeamMember 
      ? Number(selectedTeamMember.id) 
      : null;

    const taskPayload: any = {
      title: currentTask.title,
      description: currentTask.description,
      activity: currentTask.activityId ? Number(currentTask.activityId) : null,
      focal_person_id: focalPersonIdValue,
      start_date: startDate?.toISOString().split("T")[0],
      end_date: endDate?.toISOString().split("T")[0],
      budget: currentTask.budget,
      location: currentTask.locationIds?.map(id => Number(id)) || [],
      project: projectId,
    };

    try {
      let response;
      if (isEditing && currentTask.id) {
        response = await api.patch(`/tasks/tasks/${currentTask.id}/`, taskPayload);
      } else {
        response = await api.post("/tasks/tasks/", taskPayload);
      }
      
      onSave(response.data);
      onClose();
    } catch (error: any) {
      console.error('Error saving task:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        payload: taskPayload
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl overflow-visible p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {isEditing ? "Update Task Status" : "Create New Task"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isEditing 
                ? `Updating task: ${task?.title}` 
                : "Fill in the details below to create a new task."}
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Basic Information
                </h3>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* TITLE */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="title" 
                        value={currentTask.title} 
                        onChange={e => handleTaskChange("title", e.target.value)} 
                        placeholder="Enter task title"
                        className={cn(formErrors.title && "border-destructive focus-visible:ring-destructive")}
                      />
                      {formErrors.title && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.title}
                        </p>
                      )}
                    </div>

                    {/* DESCRIPTION */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea 
                        id="description" 
                        value={currentTask.description} 
                        onChange={e => handleTaskChange("description", e.target.value)} 
                        placeholder="Describe the task in detail"
                        rows={4}
                        className={cn("resize-none", formErrors.description && "border-destructive focus-visible:ring-destructive")}
                      />
                      {formErrors.description && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assignment Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assignment
                </h3>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* FOCAL PERSON */}
                    <div className="space-y-2">
                      <Label htmlFor="focalPersonId" className="text-sm font-medium">
                        Focal Person <span className="text-destructive">*</span>
                      </Label>
                      <Select onValueChange={val => handleTaskChange("focalPersonId", val)} value={currentTask.focalPersonId}>
                        <SelectTrigger className={cn(formErrors.focalPerson && "border-destructive focus-visible:ring-destructive")}>
                          <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectTeam.map(mem => (
                            <SelectItem key={mem.id} value={String(mem.id)}>
                              <div className="flex items-center gap-2">
                                <span>{mem.name}</span>
                                <Badge variant="outline" className="ml-auto text-xs">
                                  {mem.role.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.focalPerson && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.focalPerson}
                        </p>
                      )}
                    </div>

                    {/* LOCATIONS */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Location(s) <span className="text-destructive">*</span>
                      </Label>
                      <Popover open={isLocationPopoverOpen} onOpenChange={setIsLocationPopoverOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isLocationPopoverOpen}
                            className={cn(
                              "w-full justify-between h-auto min-h-10",
                              formErrors.location && "border-destructive focus-visible:ring-destructive"
                            )}
                          >
                            <div className="flex gap-1 flex-wrap">
                              {selectedLocations.length > 0 ? (
                                selectedLocations.map(l => (
                                  <Badge key={l.id} variant="secondary" className="gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {l.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">Select location(s)...</span>
                              )}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start" onClick={(e) => e.stopPropagation()}>
                          <Command>
                            <CommandInput placeholder="Search locations..." />
                            <CommandList>
                              <CommandEmpty>No locations found.</CommandEmpty>
                              <CommandGroup>
                                {projectLocations.map(location => (
                                  <CommandItem
                                    key={location.id}
                                    value={location.name}
                                    onSelect={() => handleLocationSelect(String(location.id))}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        currentTask.locationIds?.includes(String(location.id)) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {location.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {formErrors.location && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.location}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline & Budget Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline & Budget
                </h3>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* START & END DATES */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Start Date <span className="text-destructive">*</span>
                        </Label>
                        <TaskDatePicker
                          value={startDate}
                          onChange={(d) => {
                            setStartDate(d);
                            handleTaskChange("start_date", d ? d.toISOString() : undefined);
                          }}
                          placeholder="Pick start date"
                        />
                        {formErrors.startDate && (
                          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            {formErrors.startDate}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          End Date <span className="text-destructive">*</span>
                        </Label>
                        <TaskDatePicker
                          value={endDate}
                          onChange={(d) => {
                            setEndDate(d);
                            handleTaskChange("end_date", d ? d.toISOString() : undefined);
                          }}
                          placeholder="Pick end date"
                        />
                        {formErrors.endDate && (
                          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            {formErrors.endDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* BUDGET */}
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="text-sm font-medium">
                        Budget <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input 
                          id="budget" 
                          type="number" 
                          value={currentTask.budget ?? ''} 
                          onChange={e => handleTaskChange("budget", e.target.value)} 
                          placeholder="0.00"
                          className={cn("pl-9", formErrors.budget && "border-destructive focus-visible:ring-destructive")}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {projectCurrency}
                        </span>
                      </div>
                      {formErrors.budget && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.budget}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Separator />

          <DialogFooter className="px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline" className="gap-2">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handleSave} 
              disabled={!canSaveNew && !isEditing}
              className="gap-2"
            >
              {isEditing ? "Update Task" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Indicator Data Entry */}
      {isIndicatorEntryOpen && linkedIndicator && (
        <TaskIndicatorDataEntry
          isOpen={isIndicatorEntryOpen}
          onClose={() => setIsIndicatorEntryOpen(false)}
          onSave={(data) => { handleTaskChange("indicatorData", data); setIsIndicatorEntryOpen(false); }}
          indicator={linkedIndicator}
          initialData={currentTask.indicatorData}
        />
      )}
    </>
  );
}