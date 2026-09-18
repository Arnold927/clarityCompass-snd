'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  UserPlus, 
  Calendar,
  FileText,
  Tag,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { AddCommentForm } from '@/components/accountability/add-comment-form';
import { AssignUserDialog } from '@/components/accountability/assign-user-dialog';
import { DecisionTimeline } from '@/components/accountability/decision-timeline';
import { fetchDecisionComments, addCommentToDecision, fetchDecisionHistory } from '@/lib/api';
import type { Decision, Comment, DecisionHistory } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DecisionDetailModalProps {
  decision: Decision;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  currentUserId?: number;
}

export function DecisionDetailModal({
  decision,
  open,
  onClose,
  onUpdate,
  currentUserId,
}: DecisionDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [comments, setComments] = useState<Comment[]>([]);
  const [history, setHistory] = useState<DecisionHistory[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (open) {
      loadComments();
      loadHistory();
    }
  }, [open, decision.id]);

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const data = await fetchDecisionComments(decision.id.toString());
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await fetchDecisionHistory(decision.id.toString());
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddComment = async (content: string) => {
    try {
      await addCommentToDecision(decision.id.toString(), content);
      await loadComments();
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAssignSuccess = () => {
    setShowAssignDialog(false);
    onUpdate();
  };

  const getStatusIcon = () => {
    if (decision.is_overdue) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (decision.status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  const getStatusBadgeClass = () => {
    if (decision.is_overdue) return "bg-red-100 text-red-800 border-red-200";
    if (decision.status === 'completed') return "bg-green-100 text-green-800 border-green-200";
    if (decision.status === 'in_progress') return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{decision.title}</span>
              <div className="flex items-center gap-2">
                <Badge variant={
                  decision.priority === 'critical' ? 'destructive' :
                  decision.priority === 'high' ? 'default' :
                  decision.priority === 'medium' ? 'secondary' : 'outline'
                }>
                  {decision.priority.toUpperCase()}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("flex items-center gap-1", getStatusBadgeClass())}
                >
                  {getStatusIcon()}
                  {decision.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              Created on {format(new Date(decision.created_at), 'PPP')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {decision.description || 'No description provided'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowAssignDialog(true)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign/Reassign
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setActiveTab('comments')}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Add Comment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Assignment Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Assignment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Owner</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {decision.owner_details?.full_name?.[0] || 'O'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {decision.owner_details?.full_name || 'Unassigned'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {decision.owner_details?.email || ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Assigned To</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {decision.assigned_to_details?.full_name?.[0] || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {decision.assigned_to_details?.full_name || 'Unassigned'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {decision.assigned_to_details?.email || ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {decision.project_title && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Project</p>
                            <Badge variant="outline">
                              {decision.project_title}
                            </Badge>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="font-medium">
                          {format(new Date(decision.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Deadline</span>
                        <span className={`font-medium ${
                          decision.is_overdue ? 'text-red-600' : ''
                        }`}>
                          {decision.deadline
                            ? format(new Date(decision.deadline), 'MMM d, yyyy')
                            : 'No deadline'}
                          {decision.is_overdue && ' ⚠️'}
                        </span>
                      </div>
                      {decision.completed_at && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Completed</span>
                          <span className="font-medium">
                            {format(new Date(decision.completed_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Comments & Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddCommentForm
                    decisionId={decision.id}
                    onSuccess={() => {
                        loadComments();
                        onUpdate();
                    }}
                    onCommentAdded={handleAddComment}
                    currentUserId={currentUserId}
                  />

                  <div className="mt-6 space-y-4">
                    {loadingComments ? (
                      <div className="text-center py-8">Loading comments...</div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No comments yet. Be the first to comment!
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                          <Avatar>
                            <AvatarFallback>
                              {comment.user_details?.full_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">
                                  {comment.user_details?.full_name || 'Unknown User'}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm')}
                                </span>
                              </div>
                            </div>
                            <p className="mt-2 text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <DecisionTimeline decision={decision} />
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change History</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="text-center py-8">Loading history...</div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No history available for this decision.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((record) => (
                        <div key={record.id} className="flex gap-3 pb-3 border-b last:border-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {record.user_details?.full_name?.[0] || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {record.user_details?.full_name || 'System'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(record.created_at), 'MMM d, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{record.action}</p>
                            {record.changes && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {Object.entries(record.changes).map(([key, value]) => (
                                  <div key={key} className="flex">
                                    <span className="font-medium w-32">{key}:</span>
                                    <span>{JSON.stringify(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      {showAssignDialog && (
        <AssignUserDialog
          decision={decision}
          onSuccess={handleAssignSuccess}
          currentAssignedTo={decision.assigned_to}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
        />
      )}
    </>
  );
}