'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateDecision, fetchUsers } from '@/lib/api';
import type { User, Decision } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AssignUserDialogProps {
  decision: Decision;
  onSuccess: () => void;
  currentAssignedTo?: number | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AssignUserDialog({ 
  decision, 
  onSuccess, 
  currentAssignedTo,
  open,
  onOpenChange 
}: AssignUserDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    currentAssignedTo || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) return;
    
    setIsSubmitting(true);
    
    try {
      await updateDecision(decision.id.toString(), {
        assigned_to: selectedUserId,
      });
      onSuccess();
      if (onOpenChange) onOpenChange(false);
    } catch (error) {
      console.error('Error assigning user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onOpenChange) onOpenChange(false);
    onSuccess();
  };

  const getUserInitials = (user: User) => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign/Reassign Decision</DialogTitle>
          <DialogDescription>
            Assign "{decision.title}" to a team member
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to:</label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${
                    selectedUserId === user.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{user.full_name || user.username}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                  {selectedUserId === user.id && (
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedUserId}
            >
              {isSubmitting ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}