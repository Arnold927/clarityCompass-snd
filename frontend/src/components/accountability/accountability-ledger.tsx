'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar } from 'lucide-react';
import { fetchDecisions } from '@/lib/api';
import type { Decision } from '@/lib/types';

interface AccountabilityLedgerProps {
  onEdit?: (decision: Decision) => void;
  refetchTrigger?: number;
  showFilters?: boolean;
}

export function AccountabilityLedger({
  onEdit,
  refetchTrigger = 0,
  showFilters = false,
}: AccountabilityLedgerProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filteredDecisions, setFilteredDecisions] = useState<Decision[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    loadDecisions();
  }, [refetchTrigger]);

  useEffect(() => {
    filterDecisions();
  }, [decisions, searchTerm, statusFilter, priorityFilter]);

  const loadDecisions = async () => {
    try {
      const data = await fetchDecisions();
      setDecisions(data);
    } catch (error) {
      console.error('Error loading decisions:', error);
    }
  };

  const filterDecisions = () => {
    let filtered = decisions;

    if (searchTerm) {
      filtered = filtered.filter(
        (decision) =>
          decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          decision.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          decision.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          decision.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((decision) => decision.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((decision) => decision.priority === priorityFilter);
    }

    setFilteredDecisions(filtered);
  };

  const getStatusBadge = (status: Decision['status']) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' },
      in_progress: { label: 'In Progress', variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
      completed: { label: 'Completed', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      overdue: { label: 'Overdue', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelled', variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' },
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const, className: '' };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Decision['priority']) => {
    const priorityConfig = {
      low: { label: 'Low', variant: 'outline' as const, className: 'bg-gray-50 text-gray-600' },
      medium: { label: 'Medium', variant: 'default' as const, className: 'bg-yellow-50 text-yellow-800' },
      high: { label: 'High', variant: 'destructive' as const, className: 'bg-orange-100 text-orange-800' },
      critical: { label: 'Critical', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
    };
    const config = priorityConfig[priority] || { label: priority, variant: 'outline' as const, className: '' };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accountability Ledger</CardTitle>
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search decisions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDecisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No decisions found
                </TableCell>
              </TableRow>
            ) : (
              filteredDecisions.map((decision) => (
                <TableRow key={decision.id}>
                  <TableCell className="font-medium">{decision.title}</TableCell>
                  <TableCell>{getStatusBadge(decision.status)}</TableCell>
                  <TableCell>{getPriorityBadge(decision.priority)}</TableCell>
                  <TableCell>{decision.owner_name || 'Unassigned'}</TableCell>
                  <TableCell>{decision.assigned_to_name || 'Unassigned'}</TableCell>
                  <TableCell>
                    {decision.deadline
                      ? new Date(decision.deadline).toLocaleDateString()
                      : 'No deadline'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.(decision)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}