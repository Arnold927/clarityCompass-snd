'use client';

import React, { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow, format } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { Decision } from '@/lib/api';
import { updateDecision } from '@/lib/api';

interface DecisionTimelineProps {
  decision?: Decision;
  decisions?: Decision[];
  variant?: 'single' | 'global';
  onProgressUpdate?: (progress: number) => void;
}

export function DecisionTimeline({ 
  decision, 
  decisions, 
  variant = decision ? 'single' : 'global',
  onProgressUpdate 
}: DecisionTimelineProps) {
  if (variant === 'single') {
    if (!decision) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Decision Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No decision selected</p>
          </CardContent>
        </Card>
      );
    }

    const [localProgress, setLocalProgress] = useState(decision.progress_percentage);
    
    const milestones = [
      { label: 'Created', date: decision.created_at, icon: Clock },
      ...(decision.status === 'completed' && decision.completed_at ? [
        { label: 'Completed', date: decision.completed_at, icon: CheckCircle }
      ] : []),
    ];

    const handleProgressUpdate = async (progress: number) => {
      try {
        await updateDecision(decision.id.toString(), {
          progress_percentage: progress
        });
        setLocalProgress(progress);
        onProgressUpdate?.(progress);
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Decision Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{localProgress}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={localProgress} className="flex-1" />
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={localProgress}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  handleProgressUpdate(value);
                }}
                className="w-24 accent-primary"
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Timeline</h4>
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <milestone.icon className="h-4 w-4 text-muted-foreground" />
                <span>{milestone.label}</span>
                <span className="text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(milestone.date), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>

          {/* Deadline Warning */}
          {decision.deadline && decision.status !== 'completed' && (
            <div className="flex items-center gap-2 text-sm p-2 bg-amber-50 rounded-md border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>
                Due {formatDistanceToNow(new Date(decision.deadline), { addSuffix: true })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!decisions || decisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  const sortedDecisions = [...decisions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {sortedDecisions.map((item) => (
            <div key={item.id} className="border-l-2 border-primary pl-3 py-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : item.is_overdue ? (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    ) : (
                      <Clock className="h-3 w-3 text-blue-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(item.created_at), 'MMM d')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}