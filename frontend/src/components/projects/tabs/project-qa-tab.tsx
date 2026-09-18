'use client';

import React, { useEffect, useState } from 'react';
import { TaskQa } from '@/components/tasks/task-qa';
import { QaDisaggregatorEditor } from '@/components/tasks/qa-disaggregator-editor';
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
import api from '@/lib/api';

interface ProjectQaTabProps {
  project: any;
  setProject: Function;
  tasks: any[];
  indicators: any[];
  activities: any[];
  indicatorTargets: any[];
}

export function ProjectQaTab({
  project,
  setProject,
  tasks,
  indicators,
  activities,
  indicatorTargets
}: ProjectQaTabProps) {
  const [isQaEditorOpen, setIsQaEditorOpen] = useState(false);
  const [editingQa, setEditingQa] = useState<any>(null);
  const [deletingQaAdjustment, setDeletingQaAdjustment] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
        try {
        const res = await api.get(`/tasks/task-reports/?project=${project.id}`);
        const reportsWithDisagg = res.data.map((report: any) => {
            const indicator = indicators.find((i: any) => i.id === report.indicator.id);
            const disaggregators = indicator?.disaggregators.length > 0 ? indicator.disaggregators : ['value'];

            const reported_data = { ...report.reported_data };
            disaggregators.forEach((d: string) => {
            if (!(d in reported_data)) reported_data[d] = 0;
            });

            return { ...report, reported_data };
        });

        console.log('Fetched reports with disaggregators:', reportsWithDisagg);

        setReports(reportsWithDisagg);
        } catch (err) {
        console.error('Failed to fetch task reports:', err);
        }
    };

    fetchReports();
    }, [project.id, indicators.map(i => i.id).join(',')]);



  const handleOpenQaEditor = (qaItem: any) => {
    setEditingQa(qaItem);
    setIsQaEditorOpen(true);
  };

  const handleSaveQaAdjustment = async (adjustments: any) => {
    if (!editingQa) return;
    const { taskId, indicatorId } = editingQa;

    const updatedTasks = tasks.map((task: any) => {
      if (task.id === taskId) {
        const newQaAdjustments = { ...task.qaAdjustments };
        if (!(indicatorId in newQaAdjustments)) newQaAdjustments[indicatorId] = {};

        Object.keys(adjustments).forEach((disaggregator) => {
          const adj = adjustments[disaggregator];
          if (adj.value === 0 && !adj.justification) {
            delete newQaAdjustments[indicatorId][disaggregator];
          } else {
            newQaAdjustments[indicatorId][disaggregator] = adj;
          }
        });

        if (Object.keys(newQaAdjustments[indicatorId]).length === 0) {
          delete newQaAdjustments[indicatorId];
        }

        return { ...task, qaAdjustments: newQaAdjustments };
      }
      return task;
    });

    setProject((prev: any) => ({ ...prev, tasks: updatedTasks }));

    try {
      const taskToUpdate = updatedTasks.find(t => t.id === taskId);
      await api.patch(`/tasks/tasks/${taskId}/`, {
        qaAdjustments: taskToUpdate.qaAdjustments
      });
    } catch (error) {
      console.error("Failed to save QA adjustments:", error);
    }

    setIsQaEditorOpen(false);
    setEditingQa(null);
  };

  const handleDeleteQaAdjustment = async () => {
    if (!deletingQaAdjustment) return;
    const { taskId, indicatorId } = deletingQaAdjustment;

    const updatedTasks = tasks.map((task: any) => {
      if (task.id === taskId) {
        const newAdjustments = { ...task.qaAdjustments };
        delete newAdjustments[indicatorId];
        return { ...task, qaAdjustments: newAdjustments };
      }
      return task;
    });

    setProject((prev: any) => ({ ...prev, tasks: updatedTasks }));

    try {
      await api.patch(`/tasks/tasks/${taskId}/`, {
        qaAdjustments: updatedTasks.find(t => t.id === taskId).qaAdjustments
      });
    } catch (error) {
      console.error("Failed to delete QA adjustment:", error);
    }

    setDeletingQaAdjustment(null);
  };

  return (
    <>
      <TaskQa
        tasks={tasks}
        indicators={indicators}
        activities={activities}
        targets={indicatorTargets}
        reports={reports}
        onAdjust={handleOpenQaEditor}
        onDelete={setDeletingQaAdjustment}
      />

      {isQaEditorOpen && editingQa && (
        <QaDisaggregatorEditor
          isOpen={isQaEditorOpen}
          onClose={() => { setIsQaEditorOpen(false); setEditingQa(null); }}
          onSave={handleSaveQaAdjustment}
          qaItem={editingQa}
        />
      )}

      {deletingQaAdjustment && (
        <AlertDialog open={!!deletingQaAdjustment} onOpenChange={() => setDeletingQaAdjustment(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all adjustments for indicator <strong>{deletingQaAdjustment.indicatorName}</strong> on task "{deletingQaAdjustment.taskTitle}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteQaAdjustment} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
