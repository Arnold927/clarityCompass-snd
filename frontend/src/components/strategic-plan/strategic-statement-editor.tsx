// strategic-statement-editor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare } from 'lucide-react';

interface StrategicStatementEditorProps {
  statement: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (statement: any) => Promise<void> | void;
  formError?: string | null;
}

export function StrategicStatementEditor({
  statement,
  isOpen,
  onClose,
  onSave,
  formError,
}: StrategicStatementEditorProps) {
  const [editedStatement, setEditedStatement] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (statement) {
      setEditedStatement({
        id: statement.id,
        text: statement.text || '',
      });
    } else {
      setEditedStatement({
        text: '',
      });
    }
    setLocalError(null);
  }, [statement]);

  const handleSave = async () => {
    // Validate the statement
    if (!editedStatement.text || editedStatement.text.trim() === '') {
      setLocalError('Statement text is required');
      return;
    }

    setIsSaving(true);
    setLocalError(null);

    try {
      await onSave(editedStatement);
      onClose();
    } catch (error: any) {
      console.error('Error saving statement:', error);
      setLocalError(error.message || 'Failed to save statement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedStatement({
      ...editedStatement,
      text: e.target.value,
    });
    // Clear error when user starts typing
    if (localError) {
      setLocalError(null);
    }
  };

  const isEditing = Boolean(statement?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-green-100">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle>
                {isEditing ? 'Edit Statement' : 'Add Statement'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Update the statement text'
                  : 'Add a new statement for this strategic objective'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="statement-text">Statement Text *</Label>
            <Textarea
              id="statement-text"
              value={editedStatement.text || ''}
              onChange={handleTextChange}
              placeholder="Enter the statement text..."
              rows={6}
              className="min-h-[120px] resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Describe the specific outcome or result to be achieved
            </p>
          </div>

          {/* Error display */}
          {(localError || formError) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {localError || formError}
              </p>
            </div>
          )}

          {/* Character count (optional) */}
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {editedStatement.text?.length || 0} characters
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editedStatement.text?.trim()}
          >
            {isSaving ? (
              <>
                <span className="mr-2">Saving...</span>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              </>
            ) : isEditing ? (
              'Update Statement'
            ) : (
              'Add Statement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Optional: Add a simple version for inline editing
export function StrategicStatementInlineEditor({
  statement,
  onSave,
  onCancel,
}: {
  statement: any;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(statement?.text || '');
  const [isEditing, setIsEditing] = useState(true);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setText(statement?.text || '');
    onCancel();
  };

  if (!isEditing) return null;

  return (
    <div className="space-y-2 p-3 border rounded-md bg-white">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Edit statement text..."
        rows={3}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!text.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}