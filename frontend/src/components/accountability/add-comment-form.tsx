'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addDecisionUpdate } from '@/lib/api';

interface AddCommentFormProps {
  decisionId: number;
  onSuccess: () => void;
  onCommentAdded?: (content: string) => Promise<void>;
  currentUserId?: number;
}

export function AddCommentForm({ decisionId, onSuccess, onCommentAdded, currentUserId }: AddCommentFormProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await addDecisionUpdate(decisionId.toString(), {
        update_text: comment
      });
      setComment('');
      onSuccess();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment or update..."
        rows={4}
        className="min-h-[100px]"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
        >
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </form>
  );
}