'use client';

import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon, BarChart3, ZoomIn, ZoomOut } from 'lucide-react';
import { TaskDetailsModal } from './task-details-modal';
import { addDays, format, isSameDay, isWithinInterval, startOfDay, startOfMonth, endOfMonth, differenceInDays, addMonths, addQuarters } from 'date-fns';
import { cn } from '@/lib/utils';
import { TaskUpdateEditor } from "./task-update-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ZoomLevel = 'daily' | 'weekly' | 'monthly' | 'quarterly';

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
  startDate: string;
  endDate: string;
  budget?: string;
  cumulative_spent?: number;
  updates?: TaskUpdate[];
}

interface Location {
  id: string | number;
  name: string;
}

interface Props {
  tasks: Task[];
  locations: Location[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  projectCurrency: string;
  onTaskUpdate?: (updatedTask: Task) => void;
}

export function TaskCalendar({ tasks, locations, onAddTask, onEditTask, projectCurrency, onTaskUpdate }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeUpdateTask, setActiveUpdateTask] = useState<Task | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'gantt'>('calendar');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('weekly');

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const tasksForSelectedMonth = tasks.filter(task => {
    if (!task.startDate || !task.endDate) return false;

    const taskStart = parseLocalDate(task.startDate);
    const taskEnd = parseLocalDate(task.endDate);
    const viewStart = startOfMonth(displayMonth);
    const viewEnd   = endOfMonth(displayMonth);

    return (
      isWithinInterval(taskStart, { start: viewStart, end: viewEnd }) ||
      isWithinInterval(taskEnd,   { start: viewStart, end: viewEnd }) ||
      (taskStart < viewStart && taskEnd > viewEnd)
    );
  });

  const getLatestUpdate = (task: Task) => task.updates?.[task.updates.length - 1];

  const getTaskColor = (task: Task) => {
    const latestUpdate = getLatestUpdate(task);
    if (!latestUpdate) return 'bg-gray-400/20 text-gray-600 border-gray-400/30';
    switch (latestUpdate.status) {
      case 'red': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'amber': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'green': return 'bg-green-500/20 text-green-700 border-green-500/30';
      default: return 'bg-gray-400/20 text-gray-600 border-gray-400/30';
    }
  };

  const getTaskDotColor = (task: Task) => {
    const latestUpdate = getLatestUpdate(task);
    if (!latestUpdate) return 'bg-gray-400';
    switch (latestUpdate.status) {
      case 'red': return 'bg-red-500';
      case 'amber': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusColorClass = (task: Task) => {
    const latestUpdate = getLatestUpdate(task);
    if (!latestUpdate) return 'bg-gray-400';
    switch (latestUpdate.status) {
      case 'red': return 'bg-red-500';
      case 'amber': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const getVisibleDateRange = () => {
    if (tasks.length === 0) {
      const today = new Date();
      switch (zoomLevel) {
        case 'daily':
          return { start: today, end: addDays(today, 1) };
        case 'weekly':
          return { start: today, end: addDays(today, 7) };
        case 'monthly':
          return { start: today, end: addDays(today, 30) };
        case 'quarterly':
          return { start: today, end: addDays(today, 90) };
        default:
          return { start: today, end: addDays(today, 30) };
      }
    }
    
    const dates = tasks.flatMap(task => [
      parseLocalDate(task.startDate),
      parseLocalDate(task.endDate)
    ]);
    
    let start = new Date(Math.min(...dates.map(d => d.getTime())));
    let end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Adjust range based on zoom level
    switch (zoomLevel) {
      case 'daily':
        start = addDays(start, -1);
        end = addDays(end, 1);
        break;
      case 'weekly':
        start = addDays(start, -7);
        end = addDays(end, 7);
        break;
      case 'monthly':
        start = addDays(start, -14);
        end = addDays(end, 14);
        break;
      case 'quarterly':
        start = addDays(start, -30);
        end = addDays(end, 30);
        break;
    }
    
    return { start, end };
  };

  const generateDateHeaders = (start: Date, end: Date) => {
    const dates = [];
    const diffDays = differenceInDays(end, start);
    
    switch (zoomLevel) {
      case 'daily':
        for (let i = 0; i <= diffDays; i++) {
          dates.push(addDays(start, i));
        }
        break;
      
      case 'weekly':
        let current = start;
        while (current <= end) {
          dates.push(current);
          current = addDays(current, 7);
        }
        break;
      
      case 'monthly':
        let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        while (currentMonth <= endMonth) {
          dates.push(currentMonth);
          currentMonth = addMonths(currentMonth, 1);
        }
        break;
      
      case 'quarterly':
        let currentQuarter = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
        const endQuarter = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
        while (currentQuarter <= endQuarter) {
          dates.push(currentQuarter);
          currentQuarter = addQuarters(currentQuarter, 1);
        }
        break;
    }
    
    return dates;
  };

  const getColumnWidth = () => {
    switch (zoomLevel) {
      case 'daily': return 'w-24';
      case 'weekly': return 'w-32';
      case 'monthly': return 'w-36';
      case 'quarterly': return 'w-40';
      default: return 'w-24';
    }
  };

  const getDateDisplayFormat = () => {
    switch (zoomLevel) {
      case 'daily': return 'EEE, MMM d';
      case 'weekly': return "'Week of' MMM d";
      case 'monthly': return 'MMMM yyyy';
      case 'quarterly': return "'Q' Q yyyy";
      default: return 'MMM d';
    }
  };

  const getDateHeaderSubText = (date: Date) => {
    switch (zoomLevel) {
      case 'daily':
        return format(date, 'MMM d');
      case 'weekly':
        return `${format(date, 'MMM d')} - ${format(addDays(date, 6), 'MMM d')}`;
      case 'monthly':
        return `${format(date, 'MMMM yyyy')}`;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      default:
        return format(date, 'MMM d');
    }
  };

  const dateRange = getVisibleDateRange();
  const dateHeaders = generateDateHeaders(dateRange.start, dateRange.end);

  const getTaskProgress = (task: Task) => {
    if (!task.updates || task.updates.length === 0) return 0;
    
    const latestUpdate = task.updates[task.updates.length - 1];
    return latestUpdate.is_complete ? 100 : 0;
  };

  const getTaskBarPosition = (taskStart: Date, taskEnd: Date) => {
    const totalDuration = differenceInDays(dateRange.end, dateRange.start);
    
    let taskStartOffset: number;
    let taskDuration: number;
    
    switch (zoomLevel) {
      case 'daily':
        taskStartOffset = differenceInDays(taskStart, dateRange.start);
        taskDuration = differenceInDays(taskEnd, taskStart);
        break;
      
      case 'weekly':
        const startWeekStart = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate() - dateRange.start.getDay());
        const taskWeekStart = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate() - taskStart.getDay());
        taskStartOffset = Math.floor(differenceInDays(taskWeekStart, startWeekStart) / 7);
        taskDuration = Math.ceil(differenceInDays(taskEnd, taskStart) / 7);
        break;
      
      case 'monthly':
        taskStartOffset = (taskStart.getFullYear() - dateRange.start.getFullYear()) * 12 + (taskStart.getMonth() - dateRange.start.getMonth());
        taskDuration = (taskEnd.getFullYear() - taskStart.getFullYear()) * 12 + (taskEnd.getMonth() - taskStart.getMonth()) + 1;
        break;
      
      case 'quarterly':
        const startQuarter = Math.floor(dateRange.start.getMonth() / 3) + (dateRange.start.getFullYear() * 4);
        const taskStartQuarter = Math.floor(taskStart.getMonth() / 3) + (taskStart.getFullYear() * 4);
        taskStartOffset = taskStartQuarter - startQuarter;
        const taskEndQuarter = Math.floor(taskEnd.getMonth() / 3) + (taskEnd.getFullYear() * 4);
        taskDuration = taskEndQuarter - taskStartQuarter + 1;
        break;
      
      default:
        taskStartOffset = differenceInDays(taskStart, dateRange.start);
        taskDuration = differenceInDays(taskEnd, taskStart);
    }
    
    const totalUnits = zoomLevel === 'daily' ? totalDuration :
                       zoomLevel === 'weekly' ? Math.ceil(totalDuration / 7) :
                       zoomLevel === 'monthly' ? (dateRange.end.getFullYear() - dateRange.start.getFullYear()) * 12 + (dateRange.end.getMonth() - dateRange.start.getMonth()) + 1 :
                       Math.floor((dateRange.end.getFullYear() - dateRange.start.getFullYear()) * 4) + Math.floor(dateRange.end.getMonth() / 3) - Math.floor(dateRange.start.getMonth() / 3) + 1;
    
    return {
      left: `${(taskStartOffset / totalUnits) * 100}%`,
      width: `${Math.max(2, (taskDuration / totalUnits) * 100)}%`,
      minWidth: '40px'
    };
  };

  const handleZoomIn = () => {
    const levels: ZoomLevel[] = ['quarterly', 'monthly', 'weekly', 'daily'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const levels: ZoomLevel[] = ['daily', 'weekly', 'monthly', 'quarterly'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Task Manager</CardTitle>
          <CardDescription>Manage project tasks, assignees, and deadlines.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="calendar" onValueChange={(value) => setActiveView(value as 'calendar' | 'gantt')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gantt Chart
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  month={displayMonth}
                  onMonthChange={setDisplayMonth}
                  onSelect={(date: Date | undefined) => {
                    if (date) setSelectedDate(date);
                  }}
                  // v8 native dropdown: shows month + year <select> elements
                  // plus prev/next arrow buttons on each side.
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 5}
                  className="rounded-md border"
                  modifiers={{
                    ...tasks.reduce((acc, task) => {
                      if (task.startDate && task.endDate) {
                        acc[task.id] = { from: parseLocalDate(task.startDate), to: parseLocalDate(task.endDate) };
                      }
                      return acc;
                    }, {} as Record<string, { from: Date; to: Date }>),
                  }}
                  modifiersClassNames={{
                    ...tasks.reduce((acc, task) => {
                      acc[task.id] = getTaskColor(task);
                      return acc;
                    }, {} as Record<string, string>),
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const dailyTasks = tasks.filter(task => {
                        if (!task.startDate || !task.endDate) return false;
                        const taskStart = parseLocalDate(task.startDate);
                        const taskEnd   = parseLocalDate(task.endDate);
                        return date >= taskStart && date <= taskEnd;
                      });
                      return (
                        <div className="relative h-full w-full flex flex-col items-center justify-center">
                          <span>{format(date, 'd')}</span>
                          {dailyTasks.length > 0 && (
                            <div className="flex -space-x-1 mt-1">
                              {dailyTasks.map(task => (
                                <span
                                  key={task.id}
                                  className={cn(
                                    "h-2 w-2 rounded-full cursor-pointer hover:scale-125 transition-transform",
                                    getTaskDotColor(task)
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleTaskClick(task);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleTaskClick(task);
                                    }
                                  }}
                                  title={task.title}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`View details for task: ${task.title}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                  }}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tasks for {format(displayMonth, 'MMMM yyyy')}</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {tasksForSelectedMonth.length > 0 ? (
                    tasksForSelectedMonth.map(task => (
                      <div
                        key={task.id}
                        className="p-3 rounded-md border flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleTaskClick(task)}
                      >
                        <span className={cn("h-3 w-3 rounded-full shrink-0", getTaskDotColor(task))}></span>
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.startDate), 'MMM d')} - {format(new Date(task.endDate), 'MMM d')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks scheduled for this month.</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gantt" className="mt-6">
            {/* Zoom Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel === 'quarterly'}
                >
                  <ZoomOut className="h-4 w-4 mr-1" />
                  Zoom Out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel === 'daily'}
                >
                  <ZoomIn className="h-4 w-4 mr-1" />
                  Zoom In
                </Button>
              </div>
              
              <Select value={zoomLevel} onValueChange={(value: ZoomLevel) => setZoomLevel(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              {/* Date headers */}
              <div className="flex border-b bg-muted/50 min-w-max">
                <div className="w-48 border-r p-3 font-medium sticky left-0 bg-muted/50 z-10">Task</div>
                <div className="flex">
                  {dateHeaders.map((date, index) => (
                    <div 
                      key={index}
                      className={cn(
                        getColumnWidth(),
                        "flex-shrink-0 text-center p-2 border-r",
                        isSameDay(date, new Date()) && zoomLevel === 'daily' && "bg-orange-100 dark:bg-orange-900"
                      )}
                    >
                      <div className="font-medium text-xs">{format(date, getDateDisplayFormat())}</div>
                      <div className="text-xs text-muted-foreground">{getDateHeaderSubText(date)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Task bars */}
              <div className="max-h-[500px] overflow-y-auto">
                {tasks.map((task, index) => {
                  const taskStart = parseLocalDate(task.startDate);
                  const taskEnd = parseLocalDate(task.endDate);
                  const progress = getTaskProgress(task);
                  const { left, width, minWidth } = getTaskBarPosition(taskStart, taskEnd);
                  
                  return (
                    <div 
                      key={task.id} 
                      className={cn(
                        "flex border-b hover:bg-muted/30 cursor-pointer min-w-max",
                        index % 2 === 0 && "bg-muted/10"
                      )}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="w-48 border-r p-3 flex items-center gap-2 sticky left-0 bg-inherit z-10">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", getStatusColorClass(task))} />
                        <div className="truncate">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(taskStart, 'MMM d')} - {format(taskEnd, 'MMM d')}
                          </div>
                        </div>
                      </div>
                      <div className="relative min-h-[60px]" style={{ minWidth: `${dateHeaders.length * 96}px` }}>
                        <div className="absolute inset-0 flex">
                          {/* Task bar */}
                          <div
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 h-8 rounded-md flex items-center px-2",
                              getTaskColor(task)
                            )}
                            style={{
                              left,
                              width,
                              minWidth
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-medium truncate">
                                {progress > 0 ? `${progress}%` : ''}
                              </span>
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-xs opacity-75">
                                  {format(taskStart, 'MMM d')}
                                </span>
                                <span className="text-xs opacity-75">→</span>
                                <span className="text-xs opacity-75">
                                  {format(taskEnd, 'MMM d')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Progress bar inside task bar */}
                            {progress > 0 && (
                              <div
                                className="absolute left-0 top-0 h-full bg-white/30 rounded-md"
                                style={{ width: `${progress}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {tasks.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No tasks to display in Gantt chart
                  </div>
                )}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 p-3 border rounded-md bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30"></div>
                <span className="text-xs">On Track (Green)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/30"></div>
                <span className="text-xs">At Risk (Amber)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30"></div>
                <span className="text-xs">Behind (Red)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-400/20 border border-gray-400/30"></div>
                <span className="text-xs">No Status (Gray)</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          locations={locations}
          onEditTask={onEditTask}
          projectCurrency={projectCurrency}
          onOpenUpdateEditor={() => {
            const freshTask = tasks.find(t => t.id === selectedTask.id);
            if (freshTask) {
              setActiveUpdateTask(freshTask);
            } else {
              setActiveUpdateTask(selectedTask);
            }
            setSelectedTask(null);
          }}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Task Update Editor Modal */}
      {activeUpdateTask && (
        <TaskUpdateEditor
          key={`${activeUpdateTask.id}-${activeUpdateTask.cumulative_spent}-${Date.now()}`}
          task={activeUpdateTask}
          isOpen={true}
          onClose={() => setActiveUpdateTask(null)}
          onSave={(updatedUpdate: TaskUpdate) => {
            const newAmount = Number(updatedUpdate.amount_spent) || 0;
            const newCumulativeSpent = (activeUpdateTask.cumulative_spent || 0) + newAmount;
            
            const updatedTask = {
              ...activeUpdateTask,
              updates: [...(activeUpdateTask.updates || []), updatedUpdate],
              cumulative_spent: newCumulativeSpent
            };
            
            const updatedTasks = tasks.map(t => 
              t.id === activeUpdateTask.id ? updatedTask : t
            );
            
            setActiveUpdateTask(updatedTask);
            
            if (onTaskUpdate) {
              onTaskUpdate(updatedTask);
            }
            
            setTimeout(() => {
              setActiveUpdateTask(null);
            }, 1000);
          }}
          projectCurrency={projectCurrency}
          latestUpdate={activeUpdateTask?.updates?.slice(-1)[0]}
        />
      )}
    </Card>
  );
}