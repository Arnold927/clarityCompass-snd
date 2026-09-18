'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from "@/components/layout/app-layout";
import { AccountabilityLedger } from "@/components/dashboard/accountability-ledger";
import { Button } from '@/components/ui/button';
import { PlusCircle, Filter, Download, RefreshCw, Search } from 'lucide-react';
import { DecisionEditor } from '@/components/accountability/decision-editor';
import { QuickActions } from '@/components/accountability/quick-actions';
import { DecisionTimeline } from '@/components/accountability/decision-timeline';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  fetchDecisions, 
  createDecision, 
  updateDecision, 
  deleteDecision,
  fetchProjects,
  fetchUsers,
  fetchTags,
  addCommentToDecision,
  assignDecisionToUser 
} from '@/lib/api';
import type { Decision } from '@/lib/api';
import { useSharedPortalAuth } from '@/app/shared-portal/auth-context';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type FilterType = 'all' | 'my-tasks' | 'overdue' | 'priority' | 'unassigned';
type SortType = 'date-desc' | 'date-asc' | 'priority' | 'status' | 'deadline';

export default function AccountabilityPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filteredDecisions, setFilteredDecisions] = useState<Decision[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentDecision, setCurrentDecision] = useState<Decision | null>(null);
  const [deletingDecision, setDeletingDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGlobalTimeline, setShowGlobalTimeline] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [statuses] = useState<string[]>(['pending', 'in_progress', 'completed', 'overdue', 'cancelled']);

  const { user } = useSharedPortalAuth();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      setCurrentUserId(parseInt(user.id, 10));
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [decisionsData, usersData, projectsData, tagsData] = await Promise.all([
        fetchDecisions(),
        fetchUsers(),
        fetchProjects(),
        fetchTags(),
      ]);
      
      if (decisionsData.length > 0) {
        decisionsData.slice(0, 3).forEach((decision, index) => {
        });
      }
      
      setDecisions(decisionsData);
      setUsers(usersData);
      setProjects(projectsData);
      setTags(tagsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!decisions.length) {
      setFilteredDecisions([]);
      return;
    }

    let result = [...decisions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      result = result.filter(decision => {
        const titleMatch = decision.title.toLowerCase().includes(query);
        const descMatch = decision.description?.toLowerCase().includes(query) || false;
        
        let tagsMatch = false;
        if (decision.tags_details && Array.isArray(decision.tags_details)) {
          tagsMatch = decision.tags_details.some((tag: any) => {
            if (typeof tag === 'string') {
              return tag.toLowerCase().includes(query);
            } else if (tag && typeof tag === 'object') {
              return tag.name?.toLowerCase().includes(query);
            }
            return false;
          });
        }
        
        return titleMatch || descMatch || tagsMatch;
      });
    }

    if (selectedStatus !== 'all') {
      const before = result.length;
      result = result.filter(decision => decision.status === selectedStatus);
    }

    switch (activeFilter) {
      case 'my-tasks':
        
        if (currentUserId) {
          const before = result.length;
          result = result.filter(decision => {
            const isAssigned = decision.assigned_to === currentUserId;
            return isAssigned;
          });
        } else {
          result = [];
        }
        break;
        
      case 'overdue':
        const beforeOverdue = result.length;
        result = result.filter(decision => {
          if (!decision.deadline) return false;
          try {
            const deadline = new Date(decision.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const isOverdue = deadline < today && decision.status !== 'completed';
            return isOverdue;
          } catch (error) {
            console.error('Error parsing deadline:', decision.deadline);
            return false;
          }
        });
        break;
        
      case 'priority':
        const beforePriority = result.length;
        result = result.filter(decision => 
          decision.priority === 'high' || decision.priority === 'critical'
        );
        break;
        
      case 'unassigned':
        const beforeUnassigned = result.length;
        result = result.filter(decision => decision.assigned_to === null || decision.assigned_to === undefined);
        break;
    }

    const beforeSort = [...result];
    
    result.sort((a, b) => {
      try {
        switch (sortBy) {
          case 'date-desc':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            
          case 'date-asc':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            
          case 'priority':
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
            const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 4;
            return aPriority - bPriority;
            
          case 'deadline':
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            
          case 'status':
            const statusOrder = { 'overdue': 0, 'pending': 1, 'in_progress': 2, 'completed': 3, 'cancelled': 4 };
            const aStatus = statusOrder[a.status as keyof typeof statusOrder] || 5;
            const bStatus = statusOrder[b.status as keyof typeof statusOrder] || 5;
            return aStatus - bStatus;
            
          default:
            return 0;
        }
      } catch (error) {
        console.error('Error sorting:', error);
        return 0;
      }
    });
    
    if (result.length > 0) {
      result.slice(0, 3).forEach((decision, index) => {
      });
    }

    setFilteredDecisions(result);
    setCurrentPage(1);
    
  }, [decisions, activeFilter, sortBy, searchQuery, selectedStatus, currentUserId]);

  const paginatedDecisions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDecisions.slice(startIndex, endIndex);
  }, [filteredDecisions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDecisions.length / itemsPerPage);

  const handleSaveDecision = async (decisionToSave: Partial<Decision>) => {
    try {
      if (decisionToSave.id) {
        await updateDecision(decisionToSave.id.toString(), decisionToSave);
      } else {
        await createDecision(decisionToSave);
      }
      
      setIsEditorOpen(false);
      setCurrentDecision(null);
      loadAllData();
    } catch (error) {
      console.error(' Error saving decision:', error);
      alert(`Error saving decision: ${error}`);
    }
  };
  
  const handleDeleteDecision = async () => {
    if (!deletingDecision) return;
    
    try {
      await deleteDecision(deletingDecision.id.toString());
      setDeletingDecision(null);
      loadAllData();
    } catch (error) {
      console.error('Error deleting decision:', error);
      alert(`Error deleting decision: ${error}`);
    }
  };
  
  const handleOpenEditor = (decision: Decision | null = null) => {
    setCurrentDecision(decision);
    setIsEditorOpen(true);
  };

  const handleAddComment = async (decision: Decision) => {
    const comment = prompt('Enter your comment:');
    if (comment && comment.trim()) {
      try {
        await addCommentToDecision(decision.id.toString(), comment);
        loadAllData();
      } catch (error) {
        console.error('Error adding comment:', error);
        alert(`Error adding comment: ${error}`);
      }
    }
  };

  const handleAssignUser = async (decision: Decision) => {
    const userOptions = users.map(u => `${u.id}: ${u.name || u.email}`).join('\n');
    const userId = prompt(`Enter user ID to assign:\n\nAvailable users:\n${userOptions}`);
    
    if (userId && userId.trim()) {
      try {
        await assignDecisionToUser(decision.id.toString(), userId.trim());
        loadAllData();
      } catch (error) {
        alert(`Error assigning user: ${error}`);
      }
    }
  };

  const stats = useMemo(() => {
    if (!decisions.length) return null;
    
    const myTasks = decisions.filter(d => 
      currentUserId && d.assigned_to === currentUserId
    ).length;
    
    const overdue = decisions.filter(d => {
      if (!d.deadline) return false;
      try {
        const deadline = new Date(d.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return deadline < today && d.status !== 'completed';
      } catch {
        return false;
      }
    }).length;
    
    const highPriority = decisions.filter(d => 
      d.priority === 'high' || d.priority === 'critical'
    ).length;
    
    const unassigned = decisions.filter(d => !d.assigned_to).length;
    
    
    return { myTasks, overdue, highPriority, unassigned };
  }, [decisions, currentUserId]);

  const handleClearFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
    setSelectedStatus('all');
    setSortBy('date-desc');
  };


  if (loading && !decisions.length) {
    return (
      <AppLayout platform="ngo">
        <div className="flex items-center justify-center h-dvh">
          <div className="space-y-4 w-full max-w-6xl px-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              <Skeleton className="h-[400px] lg:col-span-1" />
              <Skeleton className="h-[400px] lg:col-span-2" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Accountability Ledger</h2>
            <p className="text-muted-foreground">
              Track decisions, assignments, and follow-ups across all projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowGlobalTimeline(true)}
              className="hidden md:flex"
            >
              <Filter className="mr-2 h-4 w-4" />
              Timeline View
            </Button>
            <NotificationBell />
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button 
              onClick={() => handleOpenEditor()}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden md:inline">Create Decision</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Decisions</p>
              <p className="text-2xl font-bold">{decisions.length}</p>
            </div>
            <button 
              onClick={() => setActiveFilter('my-tasks')}
              className={`bg-card rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                activeFilter === 'my-tasks' ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="text-sm text-muted-foreground">My Tasks</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{stats.myTasks}</p>
                {stats.myTasks > 0 && (
                  <Badge variant={stats.myTasks > 5 ? "destructive" : "secondary"}>
                    {stats.myTasks} pending
                  </Badge>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveFilter('overdue')}
              className={`bg-card rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                activeFilter === 'overdue' ? 'ring-2 ring-destructive' : ''
              }`}
            >
              <p className="text-sm text-muted-foreground">Overdue</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{stats.overdue}</p>
                {stats.overdue > 0 && (
                  <Badge variant="destructive">Attention</Badge>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveFilter('priority')}
              className={`bg-card rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                activeFilter === 'priority' ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="text-sm text-muted-foreground">High Priority</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{stats.highPriority}</p>
                {stats.highPriority > 0 && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveFilter('unassigned')}
              className={`bg-card rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                activeFilter === 'unassigned' ? 'ring-2 ring-primary' : ''
              }`}
            >
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{stats.unassigned || 0}</p>
                {stats.unassigned > 0 && (
                  <Badge variant="secondary">Needs assign</Badge>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search decisions by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: SortType) => {
              setSortBy(value);
            }}>
              
            </Select>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              title="Clear all filters"
            >
              Clear Filters
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={loadAllData}
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="border-b pb-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All Decisions
            </Button>
            <Button
              variant={activeFilter === 'my-tasks' ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveFilter('my-tasks');
              }}
            >
              My Tasks
              {stats?.myTasks ? (
                <Badge variant="secondary" className="ml-2">
                  {stats.myTasks}
                </Badge>
              ) : null}
            </Button>
            <Button
              variant={activeFilter === 'overdue' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter('overdue')}
            >
              Overdue
              {stats?.overdue ? (
                <Badge variant="destructive" className="ml-2">
                  {stats.overdue}
                </Badge>
              ) : null}
            </Button>
            <Button
              variant={activeFilter === 'priority' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter('priority')}
            >
              High Priority
              {stats?.highPriority ? (
                <Badge variant="destructive" className="ml-2">
                  {stats.highPriority}
                </Badge>
              ) : null}
            </Button>
            <Button
              variant={activeFilter === 'unassigned' ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter('unassigned')}
            >
              Unassigned
              {stats?.unassigned ? (
                <Badge variant="secondary" className="ml-2">
                  {stats.unassigned}
                </Badge>
              ) : null}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quick Actions & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            <QuickActions 
              onActionComplete={loadAllData} 
              variant='global'
              currentUserId={currentUserId || undefined}
            />
            <DecisionTimeline 
              decisions={paginatedDecisions} 
              variant="global" 
            />
          </div>

          {/* Right Column - Main Ledger */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {activeFilter === 'my-tasks' ? 'My Tasks' : 
                   activeFilter === 'overdue' ? 'Overdue Decisions' :
                   activeFilter === 'priority' ? 'High Priority Decisions' :
                   activeFilter === 'unassigned' ? 'Unassigned Decisions' : 'All Decisions'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground hidden md:block">
                  Page {currentPage} of {totalPages}
                </div>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {paginatedDecisions.length > 0 ? (
              <>
                <AccountabilityLedger 
                  decisions={paginatedDecisions}
                  onEdit={handleOpenEditor}
                  onDelete={setDeletingDecision}
                  onAddComment={handleAddComment}
                  onAssignUser={handleAssignUser}
                  showFilters={false}
                  currentUserId={currentUserId || undefined}
                />
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDecisions.length)} of {filteredDecisions.length} decisions
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Filter className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No decisions found</h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilter === 'my-tasks' && currentUserId 
                    ? `You have no tasks assigned to you.`
                    : searchQuery 
                    ? `No decisions match your search "${searchQuery}"`
                    : `No decisions match the selected filters`}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                  >
                    Clear all filters
                  </Button>
                  <Button 
                    onClick={() => handleOpenEditor()}
                  >
                    Create new decision
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Decision Editor Dialog */}
      <DecisionEditor
        decision={currentDecision}
        isOpen={isEditorOpen}
        onClose={() => { 
          setIsEditorOpen(false); 
          setCurrentDecision(null); 
        }}
        onSave={handleSaveDecision}
        users={users}
        projects={projects}
        tags={tags}
        currentUserId={currentUserId || 0}
      />

      {/* Global Timeline Dialog */}
      <Dialog open={showGlobalTimeline} onOpenChange={setShowGlobalTimeline}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Global Timeline View</DialogTitle>
            <DialogDescription>
              View all decisions in chronological order
            </DialogDescription>
          </DialogHeader>
          <div className="p-2">
            <DecisionTimeline decisions={decisions} variant="global" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deletingDecision && (
        <AlertDialog open={!!deletingDecision} onOpenChange={() => setDeletingDecision(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the decision: "{deletingDecision.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDecision} className='bg-destructive hover:bg-destructive/90'>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AppLayout>
  );
}


