'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Paperclip, 
  Calendar, 
  Users, 
  Bell,
  CheckCircle,
  PlusCircle,
  Filter
} from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AddCommentForm } from './add-comment-form';
import { AssignUserDialog } from './assign-user-dialog';
import { updateDecision, markDecisionComplete } from '@/lib/api';
import type { Decision } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  decision?: Decision;
  onUpdate?: () => void;
  onActionComplete?: () => void;
  variant?: 'global' | 'decision-specific';
  currentUserId?: number;
}

export function QuickActions({ 
  decision, 
  onUpdate, 
  onActionComplete,
  variant = decision ? 'decision-specific' : 'global'
}: QuickActionsProps) {
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const router = useRouter();

  const handleQuickStatus = async (status: Decision['status']) => {
    if (!decision) return;
    
    try {
      await updateDecision(decision.id.toString(), { status });
      if (status === 'completed') {
        await markDecisionComplete(decision.id.toString());
      }
      onUpdate?.();
      onActionComplete?.();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleGlobalAction = (action: string) => {
    console.log(`Global action: ${action}`);
    onActionComplete?.();
  };

  if (variant === 'global') {
    return (
      <div className="flex flex-wrap gap-2 p-4 border rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGlobalAction('filter_overdue')}
          className="h-8"
        >
          <Filter className="h-3 w-3 mr-1" />
          Overdue
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGlobalAction('filter_assigned_to_me')}
          className="h-8"
        >
          <Users className="h-3 w-3 mr-1" />
          My Tasks
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGlobalAction('sort_by_priority')}
          className="h-8"
        >
          Sort by Priority
        </Button>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="p-4 border rounded-lg text-center text-muted-foreground">
        No decision selected
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-4 border rounded-lg">
      {/* Status Quick Actions */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickStatus('in_progress')}
          disabled={decision.status === 'in_progress'}
          className="h-8"
        >
          Start
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickStatus('completed')}
          disabled={decision.status === 'completed'}
          className="h-8 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete
        </Button>
      </div>

      {/* Interactive Actions */}
      <Dialog open={isCommentOpen} onOpenChange={setIsCommentOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <MessageSquare className="h-3 w-3 mr-1" />
            Comment
          </Button>
        </DialogTrigger>
        <DialogContent>
          <AddCommentForm 
            decisionId={decision.id}
            onSuccess={() => {
              setIsCommentOpen(false);
              onUpdate?.();
              onActionComplete?.();
            }}
          />
        </DialogContent>
      </Dialog>

          <Button variant="outline" size="sm" className="h-8" onClick={() => setIsAssignOpen(true)}>
            <Users className="h-3 w-3 mr-1" />
            Assign
          </Button>
        
          <AssignUserDialog 
            decision={decision}
            onSuccess={() => {
              setIsAssignOpen(false);
              onUpdate?.();
              onActionComplete?.();
              
            }}
            open={isAssignOpen}
            onOpenChange={setIsAssignOpen}
            currentAssignedTo={decision.assigned_to}
          />
        

      {/* Set Reminder */}
      <Button 
        variant="outline" 
        size="sm" 
        className="h-8" 
        onClick={() => handleGlobalAction('set_reminder')}
      >
        <Bell className="h-3 w-3 mr-1" />
        Remind
      </Button>
    </div>
  );
}