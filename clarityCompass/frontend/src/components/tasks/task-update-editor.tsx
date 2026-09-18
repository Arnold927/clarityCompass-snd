'use client';

import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, AlertTriangle, TrendingUp, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import api from "@/lib/api";
import axios from 'axios';

interface TaskUpdate {
  id?: string;
  status_date: string;
  status: "green" | "amber" | "red";
  status_justification: string;
  is_complete: boolean;
  amount_spent?: string | number;
}

interface Task {
  id: string;
  title: string;
  budget?: string;
  cumulative_spent?: number;
  updates?: TaskUpdate[];
}

interface TaskUpdateEditorProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (update: TaskUpdate) => void;
  projectCurrency: string;
  latestUpdate?: TaskUpdate;
}

export function TaskUpdateEditor({
  task,
  isOpen,
  onClose,
  onSave,
  projectCurrency,
  latestUpdate
}: TaskUpdateEditorProps) {
  const [currentUpdate, setCurrentUpdate] = useState<TaskUpdate>({
    status_date: format(new Date(), 'yyyy-MM-dd'),
    status: "green",
    status_justification: "",
    is_complete: false,
    amount_spent: "",
  });

  const [date, setDate] = useState<Date>(new Date());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

useEffect(() => {
  setCurrentUpdate(prev => ({
    ...prev,
    amount_spent: ""
  }));
  
}, [task]); 

  const taskBudget = parseFloat(task.budget || "0") || 0;
  const cumulativeSpent = parseFloat(String(task.cumulative_spent || 0)) || 0;
  
  const getCurrentAmount = () => {
    if (!currentUpdate.amount_spent) return 0;
    const amount = currentUpdate.amount_spent;
    if (typeof amount === 'string') {
      return parseFloat(amount) || 0;
    }
    return Number(amount) || 0;
  };

  const currentAmount = getCurrentAmount();
  const newTotal = cumulativeSpent + currentAmount;
  const remainingBudget = taskBudget - newTotal;
  const utilizationPercentage = taskBudget > 0 ? (newTotal / taskBudget) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return CheckCircle;
      case 'amber': return AlertCircle;
      case 'red': return AlertTriangle;
      default: return Clock;
    }
  };

  const StatusIcon = getStatusIcon(currentUpdate.status);

  const getSuggestedNextDate = () => {
    if (task.updates && task.updates.length > 0) {
      const sortedUpdates = [...task.updates].sort((a, b) => 
        new Date(b.status_date).getTime() - new Date(a.status_date).getTime()
      );
      const lastUpdateDate = new Date(sortedUpdates[0].status_date);
      const nextDay = new Date(lastUpdateDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const today = startOfDay(new Date());
      return startOfDay(nextDay) < today ? nextDay : new Date();
    }
    return new Date();
  };

  const canSave = currentUpdate.status_date &&
    currentUpdate.status_justification.trim() !== '' &&
    currentAmount >= 0;

  useEffect(() => {
    if (isOpen) {
      const suggestedDate = getSuggestedNextDate();
      const initialUpdate: TaskUpdate = {
        status_date: format(suggestedDate, 'yyyy-MM-dd'),
        status: "green",
        status_justification: "",
        is_complete: latestUpdate?.is_complete || false,
        amount_spent: "",
      };
      
      setCurrentUpdate(initialUpdate);
      setDate(suggestedDate);
      setBudgetWarning(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentAmount > 0 && taskBudget > 0) {
      setIsCalculating(true);
      
      setTimeout(() => {
        if (newTotal > taskBudget) {
          const overspendAmount = newTotal - taskBudget;
          setBudgetWarning(
            `This update will exceed the total budget by ${projectCurrency} ${overspendAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}.`
          );
        } else if (newTotal > taskBudget * 0.8) {
          setBudgetWarning(
            `This will bring total spending to ${((newTotal / taskBudget) * 100).toFixed(1)}% of budget.`
          );
        } else {
          setBudgetWarning(null);
        }
        setIsCalculating(false);
      }, 300);
    } else {
      setBudgetWarning(null);
    }
  }, [currentAmount, taskBudget, newTotal, projectCurrency]);

  const handleChange = <K extends keyof TaskUpdate>(field: K, value: TaskUpdate[K]) => {
    setCurrentUpdate(prev => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      handleChange("status_date", format(selectedDate, 'yyyy-MM-dd'));
      setDatePopoverOpen(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    try {
      const payload = {
        task: task.id,
        status_date: currentUpdate.status_date,
        status: currentUpdate.status,
        status_justification: currentUpdate.status_justification,
        is_complete: currentUpdate.is_complete,
        amount_spent: currentAmount || null,
      };

      const response = await api.post("/tasks/task-updates/", payload);
      onSave(response.data);
      onClose();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error saving task update:", {
          message: error.message,
          responseData: error.response?.data,
          status: error.response?.status,
        });
      } else {
        console.error("Unexpected error saving task update:", error);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `${projectCurrency} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-white">
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              currentUpdate.status === "green" ? "bg-green-100" :
              currentUpdate.status === "amber" ? "bg-yellow-100" : "bg-red-100"
            )}>
              <StatusIcon className={cn(
                "h-5 w-5",
                currentUpdate.status === "green" ? "text-green-600" :
                currentUpdate.status === "amber" ? "text-yellow-600" : "text-red-600"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>Update Task Status</span>
                <Badge variant="outline" className="text-xs">
                  {task.title}
                </Badge>
              </div>
              <DialogDescription className="mt-1">
                Report progress and update financial tracking
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left Column - Form */}
          <div className="lg:w-2/3 p-6 overflow-y-auto space-y-6">
            {/* Status Date */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Reporting Date
              </Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEEE, MMMM d, yyyy") : <span>Select reporting date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Current Status</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["green", "amber", "red"] as const).map((status) => {
                  const Icon = getStatusIcon(status);
                  return (
                    <Button
                      key={status}
                      type="button"
                      variant={currentUpdate.status === status ? "default" : "outline"}
                      className={cn(
                        "h-auto py-3 flex flex-col items-center gap-2",
                        currentUpdate.status === status && (
                          status === "green" ? "bg-green-600 hover:bg-green-700" :
                          status === "amber" ? "bg-yellow-600 hover:bg-yellow-700" :
                          "bg-red-600 hover:bg-red-700"
                        )
                      )}
                      onClick={() => handleChange("status", status)}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="space-y-1">
                        <div className="capitalize font-medium">{status}</div>
                        <div className="text-xs opacity-90">
                          {status === "green" ? "On Track" :
                           status === "amber" ? "Needs Attention" : "Critical"}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Status Justification */}
            <div className="space-y-3">
              <Label htmlFor="justification" className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Status Details *
              </Label>
              <Textarea
                id="justification"
                value={currentUpdate.status_justification}
                onChange={(e) => handleChange("status_justification", e.target.value)}
                rows={4}
                placeholder="Describe progress, challenges, achievements, and next steps..."
                className="min-h-[120px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                Required field. Be specific about what has been accomplished and any issues encountered.
              </p>
            </div>

            {/* Amount Spent */}
            <div className="space-y-3">
              <Label htmlFor="amount-spent" className="text-sm font-medium flex items-center gap-2">
                {/* <DollarSign className="h-4 w-4" /> */}
                Spending This Period
              </Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    {/* <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /> */}
                    <p>{formatCurrency(taskBudget)}</p>
                    <Input
                      id="amount-spent"
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentUpdate.amount_spent}
                      onChange={(e) => handleChange("amount_spent", e.target.value)}
                      placeholder="0.00"
                      className="pl-9 h-11"
                    />
                  </div>
                  <Badge variant="outline" className="h-11 px-4">
                    {projectCurrency}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Enter the amount spent since the last update. Leave empty if no spending this period.
                </p>
              </div>
            </div>

            {/* Task Completion */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Task Completion</Label>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">Mark as completed</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUpdate.is_complete 
                      ? "Task will be marked complete"
                      : "Task remains active for future updates"
                    }
                  </p>
                </div>
                <Switch
                  checked={currentUpdate.is_complete}
                  onCheckedChange={(checked) => handleChange("is_complete", checked)}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:w-1/3 border-l bg-gray-50 p-6 space-y-6 overflow-y-auto">
            {/* Budget Summary Card */}
            <Card className="shadow-sm border">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Budget Summary</h3>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Budget</p>
                      <p className="font-semibold">{formatCurrency(taskBudget)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Spent to Date</p>
                      <p className="font-semibold">{formatCurrency(cumulativeSpent)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">This Period</p>
                      <p className={cn(
                        "font-semibold",
                        currentAmount > 0 ? "text-orange-700" : "text-muted-foreground"
                      )}>
                        {formatCurrency(currentAmount)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">New Total</p>
                      <p className={cn(
                        "font-semibold",
                        newTotal > taskBudget ? "text-red-600" :
                        newTotal > taskBudget * 0.8 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {formatCurrency(newTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {taskBudget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Budget Utilization</span>
                      <span className={cn(
                        "text-sm font-semibold",
                        utilizationPercentage > 100 ? "text-red-600" :
                        utilizationPercentage > 80 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {utilizationPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          utilizationPercentage > 100 ? "bg-red-500" :
                          utilizationPercentage > 80 ? "bg-yellow-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                      />
                    </div>
                    
                    {/* Budget Status */}
                    {budgetWarning && (
                      <div className={cn(
                        "p-3 rounded-lg mt-3 text-sm flex items-start gap-2",
                        budgetWarning.includes('exceed') ? "bg-red-50 border border-red-200" :
                        "bg-yellow-50 border border-yellow-200"
                      )}>
                        <AlertTriangle className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          budgetWarning.includes('exceed') ? "text-red-600" : "text-yellow-600"
                        )} />
                        <span>{budgetWarning}</span>
                      </div>
                    )}
                    
                    {/* Remaining Budget */}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Remaining Budget</span>
                        <span className={cn(
                          "font-semibold",
                          remainingBudget < 0 ? "text-red-600" :
                          remainingBudget < taskBudget * 0.2 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {formatCurrency(Math.max(remainingBudget, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last Update Info */}
            {latestUpdate && (
              <Card className="shadow-sm border">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold">Last Update</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        latestUpdate.status === "green" && "bg-green-500",
                        latestUpdate.status === "amber" && "bg-yellow-500",
                        latestUpdate.status === "red" && "bg-red-500"
                      )} />
                      <span className="text-sm capitalize">{latestUpdate.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(latestUpdate.status_date), 'MMM d, yyyy')}
                    </p>
                    {latestUpdate.is_complete && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save Status */}
            {/* <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-700">Ready to Save</p>
                  <p className="text-xs text-blue-600">
                    All required fields are completed
                  </p>
                </div>
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  canSave ? "bg-green-500 animate-pulse" : "bg-gray-400"
                )} />
              </div>
              
              <Button 
                onClick={handleSave} 
                disabled={!canSave || isCalculating}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                size="lg"
              >
                {isCalculating ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Calculating...
                  </span>
                ) : (
                  "Save Status Update"
                )}
              </Button>
            </div> */}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-xs text-muted-foreground flex-1">
            <p className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              * Required fields. Status updates create permanent records.
            </p>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="h-10">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSave} 
              disabled={!canSave || isCalculating}
              className="h-10 bg-orange-600 hover:bg-orange-700"
            >
              {isCalculating ? "Saving..." : "Save Update"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}