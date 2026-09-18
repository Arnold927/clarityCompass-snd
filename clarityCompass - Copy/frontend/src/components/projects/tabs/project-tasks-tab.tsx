'use client';

import React, { useState, useMemo } from 'react';
import { TaskCalendar } from '@/components/tasks/task-calendar';
import { TaskEditor } from '@/components/tasks/task-editor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface ProjectTasksTabProps {
  project: any;
  setProject: Function;
  tasks: any[];
  onSaveTask: (task: any) => void;
}

export function ProjectTasksTab({ project, setProject, tasks, onSaveTask }: ProjectTasksTabProps) {
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deletingTask, setDeletingTask] = useState<any>(null);

  const projectTasks = useMemo(() => {
    if (!project?.id || !tasks) return [];
    
    return tasks.filter(task => {
      return task.focal_person?.project === project.id || 
             task.project === project.id;
    });
  }, [tasks, project?.id]);

  const handleOpenTaskEditor = (task: any = null) => {
    setEditingTask(task);
    setIsTaskEditorOpen(true);
  };

  const handleSaveTask = (savedTask: any) => {
    setProject((prev: any) => {
      const currentTasks = prev.tasks || [];
      const exists = currentTasks.some((t: any) => t.id === savedTask.id);
      const updatedTasks = exists
        ? currentTasks.map((t: any) => (t.id === savedTask.id ? savedTask : t))
        : [...currentTasks, savedTask];

      return { ...prev, tasks: updatedTasks };
    });

    onSaveTask(savedTask);

    setIsTaskEditorOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!deletingTask) return;

    setProject((prev: any) => ({
      ...prev,
      tasks: prev.tasks.filter((t: any) => t.id !== deletingTask.id)
    }));

    setDeletingTask(null);
  };

  return (
    <>
      <TaskCalendar
        tasks={projectTasks}
        locations={project.locations || []}
        onAddTask={() => handleOpenTaskEditor()}
        onEditTask={handleOpenTaskEditor}
        projectCurrency={project.currency}
      />

      {isTaskEditorOpen && (
        <TaskEditor
          isOpen={isTaskEditorOpen}
          onClose={() => { setIsTaskEditorOpen(false); setEditingTask(null); }}
          onSave={handleSaveTask}
          task={editingTask}
          projectActivities={project.activities || []}
          projectTeam={project.team || []}
          projectIndicators={project.indicators || []}
          projectLocations={project.locations || []}
          projectCurrency={project.currency}
          projectId={String(project.id)}
        />
      )}

      {deletingTask && (
        <AlertDialog open={!!deletingTask} onOpenChange={() => setDeletingTask(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task: "{deletingTask.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingTask(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}