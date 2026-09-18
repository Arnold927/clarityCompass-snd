'use client';

import React, { useState } from 'react';
import { Tasks } from '@/components/projects/key-activities';
import { TaskEditor } from '@/components/tasks/task-editor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import api from '@/lib/api';

interface TaskType {
  id?: number | string;
  title: string;
  description?: string;
  activity?: number | null;
  focal_person?: { id: number; name: string } | null;
  location?: number[];
  start_date?: string;
  end_date?: string;
  budget?: string;
  cumulative_spent?: number;
  updates?: any[];
  indicatorData?: any;
}

export function ProjectActivitiesTab({ project, setProject, indicators, teamMembers }: { project: any, setProject: Function, indicators: any[], teamMembers: any[] }) {
    const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [deletingTask, setDeletingTask] = useState<any>(null);

    const projectActivities = project.activities?.map((act: any) => ({
        id: String(act.id),
        name: act.name,
        linkedIndicatorId: act.linked_project_indicator?.id ? String(act.linked_project_indicator.id) : undefined
    })) || [];

    const projectTeam = teamMembers?.map((member: any) => ({
        id: String(member.id),
        name: member.name,
        role: member.role || ''
    })) || [];

    const projectLocations = project.locations?.map((loc: any) => ({
        id: String(loc.id),
        name: loc.name
    })) || [];

    const projectCurrency = project.currency || 'USD';

    const handleOpenTaskEditor = (task: any = null) => {
        setEditingTask(task);
        setIsTaskEditorOpen(true);
    };

    const handleSaveTask = async (taskToSave: any) => {
        try {
            if (editingTask) {
                setProject((prev: any) => ({
                    ...prev,
                    tasks: prev.tasks
                        ? prev.tasks.map((t: any) => 
                            t.id === taskToSave.id ? taskToSave : t
                        )
                        : [taskToSave],
                }));
            } else {
                setProject((prev: any) => ({
                    ...prev,
                    tasks: [...(prev.tasks || []), taskToSave],
                }));
            }

            setIsTaskEditorOpen(false);
            setEditingTask(null);
        } catch (error) {
            console.error('Failed to save task:', error);
        }
    };

    const handleDeleteTask = async () => {
        if (!deletingTask) return;

        try {
            await api.delete(`/tasks/tasks/${deletingTask.id}/`);

            setProject((prev: any) => ({
                ...prev,
                tasks: prev.tasks.filter((t: any) => t.id !== deletingTask.id),
            }));

            setDeletingTask(null);
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };

    return (
        <>
            <Tasks
                projectId={String(project.id)}
                autoFetch={true}
                // tasks={project.tasks || []}
                onEdit={handleOpenTaskEditor}
                onDelete={setDeletingTask}
                onAdd={() => handleOpenTaskEditor()}
                isLoading={false}
                projectCurrency={projectCurrency}
            />

            {isTaskEditorOpen && (
                <TaskEditor
                    task={editingTask}
                    isOpen={isTaskEditorOpen}
                    onClose={() => {
                        setIsTaskEditorOpen(false);
                        setEditingTask(null);
                    }}
                    onSave={handleSaveTask}
                    projectActivities={projectActivities}
                    projectTeam={projectTeam}
                    projectIndicators={indicators}
                    projectLocations={projectLocations}
                    projectCurrency={projectCurrency}
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
                            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}