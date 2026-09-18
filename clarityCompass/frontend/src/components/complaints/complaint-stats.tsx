import React from 'react';
import { ComplaintStats } from '../../types/complaint.types';
import { 
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Flag,
  Inbox
} from 'lucide-react';


interface Props {
  stats: ComplaintStats | null;
  loading?: boolean;
}

export const ComplaintStatsComponent: React.FC<Props> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Complaints',
      value: stats.total,
      icon: BarChart3,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'In Progress',
      value: stats.in_progress,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Overdue',
      value: stats.overdue,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
    {
      title: 'My Tasks',
      value: stats.my_tasks,
      icon: User,
      color: 'bg-purple-500',
    },
    {
      title: 'High Priority',
      value: stats.high_priority,
      icon: Flag,
      color: 'bg-red-500',
    },
    {
      title: 'Unassigned',
      value: stats.unassigned,
      icon: Inbox,
      color: 'bg-gray-500',
    },
  ];

  return (
    <div className="space-y-6 mb-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By Status */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-medium mb-3">By Status</h4>
          <div className="space-y-2">
            {stats.by_status.map((item) => (
              <div key={item.status} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">{item.status}</span>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-medium mb-3">By Priority</h4>
          <div className="space-y-2">
            {stats.by_priority.map((item) => (
              <div key={item.priority} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">{item.priority}</span>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-medium mb-3">By Category</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stats.by_category.map((item) => (
              <div key={item.category} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{item.category.replace(/_/g, ' ')}</span>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};