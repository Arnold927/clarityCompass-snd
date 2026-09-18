'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from '../ui/button';
import { Edit, Trash2, CheckCircle, Clock, AlertCircle, Eye, MessageSquare, UserPlus, MoreVertical } from 'lucide-react';
import type { Decision } from '@/lib/api';
import { fetchDecisions, deleteDecision, markDecisionComplete } from '@/lib/api';
import { DecisionDetailModal } from '@/components/accountability/decision-detail-modal';
import { useCallback, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountabilityLedgerProps {
  decisions?: Decision[],
  projectId?: string;
  onEdit?: (decision: Decision) => void;
  onDelete?: (decision: Decision) => void;
  onAddComment?: (decision: Decision) => void;
  onAssignUser?: (decision: Decision) => void;
  isDashboard?: boolean;
  showFilters?: boolean;
  refetchTrigger?: number;
  currentUserId?: number;
}

export function AccountabilityLedger({
  projectId, 
  onEdit, 
  onDelete, 
  onAddComment,
  onAssignUser,
  isDashboard = false,
  showFilters = false,
  refetchTrigger = 0,
  currentUserId,
}: AccountabilityLedgerProps) {
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    overdue: false,
  });

  useEffect(() => {
    loadDecisions();
  }, [projectId, filters, refetchTrigger]);

  const handleViewDetail = useCallback((decision: Decision) => {
    setSelectedDecision(decision);
    setDetailOpen(true);
  }, []);

  const handleDetailUpdate = useCallback(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (projectId) params.project_id = projectId;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.overdue) params.overdue = true;
      
      if (isDashboard) params.dashboard = true;
      
      
      const data = await fetchDecisions(params);
      
      if (data && data.length > 0) {
        const firstDecision = data[0];
      }
      
      setDecisions(data);
    } catch (error) {
      console.error('Error loading decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (decision: Decision) => {
    if (window.confirm(`Are you sure you want to delete "${decision.title}"?`)) {
      try {
        await deleteDecision(decision.id.toString());
        if (onDelete) {
          onDelete(decision);
        } else {
          loadDecisions();
        }
      } catch (error) {
        console.error('Error deleting decision:', error);
      }
    }
  };

  const handleMarkComplete = async (decision: Decision) => {
    try {
      await markDecisionComplete(decision.id.toString());
      loadDecisions();
    } catch (error) {
      console.error('Error marking decision complete:', error);
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    const variants = {
      completed: { className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      in_progress: { className: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
      overdue: { className: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
      pending: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    };
    
    const displayStatus = isOverdue ? 'overdue' : status;
    const config = variants[displayStatus as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {displayStatus.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-gray-100 text-gray-800 border-gray-200",
    };
    
    return (
      <Badge variant="outline" className={cn("text-xs", colors[priority as keyof typeof colors])}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'No deadline';
    
    const date = new Date(dateString);
    const today = new Date();
    const isOverdue = date < today;
    
    return (
      <span className={cn(isOverdue && "text-red-600 font-medium")}>
        {date.toLocaleDateString()}
        {isOverdue && " ⚠️"}
      </span>
    );
  };

  const displayedDecisions = isDashboard ? decisions.slice(0, 5) : decisions;

  if (loading && decisions.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accountability Ledger</CardTitle>
        <CardDescription>
          Tracking key decisions and ownership
          {projectId && " for this project"}
        </CardDescription>
        
        {showFilters && !isDashboard && (
          <div className="flex gap-2 mt-2">
            <select 
              className="border rounded px-2 py-1 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            
            <select 
              className="border rounded px-2 py-1 text-sm"
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            {/* <label className="flex items-center gap-1 text-sm">
              <input 
                type="checkbox"
                checked={filters.overdue}
                onChange={(e) => setFilters({...filters, overdue: e.target.checked})}
              />
              Overdue Only
            </label> */}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {decisions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No decisions found. {projectId ? 'Create one to get started!' : 'Use the filters to see decisions.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Decision</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                {!isDashboard && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedDecisions.map((decision) => (
                <TableRow key={decision.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{decision.title}</div>
                      {decision.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {decision.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {decision.owner_name ||
                    decision.owner_details?.full_name || 
                    decision.owner_details?.username || 
                    'Unassigned'}
                  </TableCell>
                  <TableCell>
                    {decision.assigned_to_name ||
                    decision.assigned_to_details?.full_name || 
                    decision.assigned_to_details?.username || 
                    'Unassigned'}
                  </TableCell>
                  <TableCell>{formatDate(decision.deadline)}</TableCell>
                  <TableCell>{getPriorityBadge(decision.priority)}</TableCell>
                  <TableCell>
                    {getStatusBadge(decision.status, decision.is_overdue)}
                  </TableCell>
                  {!isDashboard && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewDetail(decision)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          
                          {/* {onAddComment && (
                            <DropdownMenuItem onClick={() => onAddComment(decision)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Add Comment
                            </DropdownMenuItem>
                          )} */}
                          
                          {/* {onAssignUser && (
                            <DropdownMenuItem onClick={() => onAssignUser(decision)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Assign User
                            </DropdownMenuItem>
                          )} */}
                          
                          {decision.status !== 'completed' && (
                            <DropdownMenuItem
                              onClick={() => handleMarkComplete(decision)}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem onClick={() => onEdit?.(decision)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {/* <DropdownMenuItem 
                            onClick={() => handleDelete(decision)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem> */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {isDashboard && decisions.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <a href="/accountability">View All Decisions →</a>
            </Button>
          </div>
        )}
        {selectedDecision && (
          <DecisionDetailModal
            decision={selectedDecision}
            open={detailOpen}
            onClose={() => {
              setDetailOpen(false);
              setSelectedDecision(null);
            }}
            onUpdate={handleDetailUpdate}
            currentUserId={currentUserId}
          />
        )}
      </CardContent>
    </Card>
  );
}