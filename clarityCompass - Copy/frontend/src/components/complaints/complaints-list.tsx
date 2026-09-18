import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintFilters } from '../../types/complaint.types';
import { 
  Search, 
  Plus, 
  RefreshCw,
  Filter,
  X,
  ChevronDown,
  Calendar,
  AlertCircle,
  User,
  Phone,
  Clock,
  Download,
  Eye,
  Edit2,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Layers,
  ChevronRight
} from 'lucide-react';

interface ComplaintsListProps {
  complaints: Complaint[];
  loading: boolean;
  filters: ComplaintFilters;
  onFilterChange: (filters: ComplaintFilters) => void;
  onViewComplaint: (complaint: Complaint) => void;
  onCreateNew: () => void;
  onEditComplaint: (complaint: Complaint) => void;
  onRefresh: () => void;
  onExport?: () => void;
  projects?: Array<{ id: number; name: string; code?: string }>;
}

type GroupByOption = 'none' | 'project' | 'status' | 'priority';

export const ComplaintsList: React.FC<ComplaintsListProps> = ({
  complaints,
  loading,
  filters,
  onFilterChange,
  onViewComplaint,
  onCreateNew,
  onEditComplaint,
  onRefresh,
  onExport,
  projects = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Complaint;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm });
  };

  const clearFilters = () => {
    onFilterChange({});
    setSearchTerm('');
    setGroupBy('none');
    setExpandedGroups(new Set());
  };

  const handleSort = (key: keyof Complaint) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const sortedComplaints = useMemo(() => {
    if (!sortConfig) return complaints;

    return [...complaints].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'project') {
        aValue = a.project?.name || '';
        bValue = b.project?.name || '';
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [complaints, sortConfig]);

  const groupedComplaints = useMemo(() => {
    if (groupBy === 'none') return null;
    
    const groups: Record<string, Complaint[]> = {};
    
    sortedComplaints.forEach(complaint => {
      let key = '';
      switch (groupBy) {
        case 'project':
          if (!complaint.project) {
            key = 'No Project';
          } else {
            key = complaint.project.title || complaint.project.name;
          }
          break;
        case 'status':
          key = complaint.status.charAt(0).toUpperCase() + complaint.status.slice(1).replace('_', ' ');
          break;
        case 'priority':
          key = complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1);
          break;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(complaint);
    });
    
    // Sort groups by key
    const sortedGroups: Record<string, Complaint[]> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [sortedComplaints, groupBy]);

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
      in_progress: { color: 'bg-orange-50 text-orange-800 border-orange-200', icon: AlertCircle, label: 'In Progress' },
      completed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Completed' },
      overdue: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle, label: 'Overdue' },
      cancelled: { color: 'bg-muted/50 text-muted-foreground border-border', icon: X, label: 'Cancelled' },
    };
    const { color, icon: Icon, label } = config[status as keyof typeof config] || config.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        <Icon className="w-3 h-3 mr-1 hidden sm:inline" />
        {label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: 'bg-muted/50 text-muted-foreground border-border',
      medium: 'bg-orange-50 text-orange-700 border-orange-200',
      high: 'bg-orange-50 text-orange-600 border-orange-200',
      critical: 'bg-rose-50 text-rose-600 border-rose-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config[priority as keyof typeof config]}`}>
        {priority}
      </span>
    );
  };

  const getProjectBadge = (project?: { id: number; name: string; code?: string; title?: string }) => {
    if (!project) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted/50 text-muted-foreground border-border">
          <FolderOpen className="w-3 h-3 mr-1 hidden sm:inline" />
          <span className="hidden sm:inline">No Project</span>
          <span className="sm:hidden">—</span>
        </span>
      );
    }
    
    const projectName = project.title || project.name;
    const shortName = projectName.length > 20 ? projectName.substring(0, 17) + '...' : projectName;
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-secondary text-secondary-foreground border-border max-w-[150px]">
        <Layers className="w-3 h-3 mr-1 flex-shrink-0 hidden sm:inline" />
        <span className="truncate">{shortName}</span>
      </span>
    );
  };

  const stats = useMemo(() => {
    const withProject = complaints.filter(c => c.project).length;
    const withoutProject = complaints.filter(c => !c.project).length;
    
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      inProgress: complaints.filter(c => c.status === 'in_progress').length,
      completed: complaints.filter(c => c.status === 'completed').length,
      withProject,
      withoutProject,
    };
  }, [complaints]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid';
    }
  };

  const renderComplaintRow = (complaint: Complaint) => (
    <tr
      key={complaint.id}
      className="hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={() => onViewComplaint(complaint)}
    >
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="text-xs font-medium text-primary">
          {complaint.case_id}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center min-w-[120px]">
          <div className="h-6 w-6 rounded-full bg-primary/5 flex items-center justify-center mr-2 flex-shrink-0">
            <User className="h-3 w-3 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate max-w-[100px]">
              {complaint.full_name}
            </div>
            {complaint.phone_number && (
              <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                {complaint.phone_number}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 hidden lg:table-cell">
        {getProjectBadge(complaint.project)}
      </td>
      <td className="px-3 py-2">
        {getStatusBadge(complaint.status)}
      </td>
      <td className="px-3 py-2 hidden md:table-cell">
        {getPriorityBadge(complaint.priority)}
      </td>
      <td className="px-3 py-2 hidden xl:table-cell">
        {complaint.assigned_to_name ? (
          <span className="text-xs text-muted-foreground truncate block max-w-[80px]">
            {complaint.assigned_to_name.split(' ')[0]}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/70">—</span>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
        {formatDate(complaint.created_at)}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewComplaint(complaint);
            }}
            className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
            title="View"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditComplaint(complaint);
            }}
            className="p-1 text-muted-foreground/70 hover:text-primary transition-colors"
            title="Edit"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  const renderGroupedComplaints = () => {
    if (!groupedComplaints) return null;
    
    return Object.entries(groupedComplaints).map(([groupKey, groupComplaints]) => {
      const isExpanded = expandedGroups.has(groupKey);
      
      return (
        <tbody key={groupKey} className="divide-y divide-gray-200">
          {/* Group Header */}
          <tr className="bg-muted/50 hover:bg-muted cursor-pointer" onClick={() => toggleGroup(groupKey)}>
            <td colSpan={8} className="px-3 py-2">
              <div className="flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 text-muted-foreground/70 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                <span className="text-sm font-semibold text-foreground">{groupKey}</span>
                <span className="text-xs text-muted-foreground">({groupComplaints.length})</span>
              </div>
            </td>
          </tr>
          
          {/* Group Content */}
          {isExpanded && groupComplaints.map(complaint => renderComplaintRow(complaint))}
        </tbody>
      );
    });
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and track community feedback in the system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-muted/50 hover:border-input transition-all"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-1.5 text-muted-foreground hover:text-foreground bg-card border border-border rounded-md hover:border-input transition-all"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-md hover:bg-primary/10 transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">New Feedback</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Total Cases</p>
          <p className="text-lg font-semibold text-foreground">{stats.total}</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-semibold text-amber-600">{stats.pending}</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="text-lg font-semibold text-primary">{stats.inProgress}</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-lg font-semibold text-emerald-600">{stats.completed}</p>
        </div>
      </div>

      {/* Project Stats */}
      <div className="bg-card rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Linked to Projects</p>
              <p className="text-sm font-semibold text-accent">{stats.withProject}</p>
            </div>
            <div className="w-px h-6 bg-border"></div>
            <div>
              <p className="text-xs text-muted-foreground">Not Linked</p>
              <p className="text-sm font-semibold text-muted-foreground">{stats.withoutProject}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card rounded-lg border border-border p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by ID, name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-border rounded-md pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/70" />
          </form>

          <select
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value as GroupByOption);
              setExpandedGroups(new Set()); // Reset expanded groups when grouping changes
            }}
            className="border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-card"
          >
            <option value="none">No Grouping</option>
            <option value="project">Group by Project</option>
            <option value="status">Group by Status</option>
            <option value="priority">Group by Priority</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${
              showFilters 
                ? 'border-primary/20 bg-primary/5 text-primary' 
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {(filters.status || filters.priority || filters.category || filters.project_id) && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary/50"></span>
            )}
          </button>

          {(filters.status || filters.priority || filters.category || filters.project_id || searchTerm || groupBy !== 'none') && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground bg-card border border-border rounded-md hover:bg-muted/50 transition-all"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 mt-3 border-t border-border/50">
            <select
              value={filters.status || ''}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value || undefined })}
              className="border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filters.priority || ''}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value || undefined })}
              className="border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={filters.project_id || ''}
              onChange={(e) => onFilterChange({ ...filters, project_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <option value="">All Projects</option>
              <option value="none">No Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('case_id')}>
                      <div className="flex items-center gap-1">
                        ID
                        {sortConfig?.key === 'case_id' && (
                          <ChevronDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Priority</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Assignee</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                        onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1">
                        Date
                        {sortConfig?.key === 'created_at' && (
                          <ChevronDown className={`h-3 w-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                
                {groupBy === 'none' ? (
                  <tbody className="bg-card divide-y divide-gray-200">
                    {sortedComplaints.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                              <AlertCircle className="h-4 w-4 text-muted-foreground/70" />
                            </div>
                            <p className="text-muted-foreground text-sm">No feedback found</p>
                            <p className="text-muted-foreground/70 text-xs mt-1">Try adjusting your filters</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedComplaints.map(renderComplaintRow)
                    )}
                  </tbody>
                ) : (
                  renderGroupedComplaints()
                )}
              </table>
            </div>

            {sortedComplaints.length > 0 && (
              <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {sortedComplaints.length} {sortedComplaints.length === 1 ? 'result' : 'results'}
                </p>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 text-xs text-muted-foreground bg-card border border-border rounded hover:bg-muted/50 disabled:opacity-50" disabled>
                    Prev
                  </button>
                  <button className="px-2 py-1 text-xs text-muted-foreground bg-card border border-border rounded hover:bg-muted/50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};