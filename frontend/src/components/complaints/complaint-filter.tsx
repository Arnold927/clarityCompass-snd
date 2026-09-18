import React, { useState } from 'react';
import { ComplaintFilters, STATUSES, PRIORITIES, SENSITIVITY_LEVELS } from '../../types/complaint.types';

interface Props {
  filters: ComplaintFilters;
  onFilterChange: (filters: Partial<ComplaintFilters>) => void;
  onClear: () => void;
  userOptions?: Array<{ id: number; name: string }>;
}

export const ComplaintFiltersComponent: React.FC<Props> = ({
  filters,
  onFilterChange,
  onClear,
  userOptions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={filters.priority || ''}
                onChange={(e) => onFilterChange({ priority: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">All Priorities</option>
                {PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sensitivity Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sensitivity Level
              </label>
              <select
                value={filters.sensitivity_level || ''}
                onChange={(e) => onFilterChange({ sensitivity_level: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">All Levels</option>
                {SENSITIVITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <select
                value={filters.assigned_to || ''}
                onChange={(e) => onFilterChange({ assigned_to: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">All Users</option>
                <option value="unassigned">Unassigned</option>
                {userOptions.map(user => (
                  <option key={user.id} value={user.id.toString()}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => onFilterChange({ date_from: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => onFilterChange({ date_to: e.target.value || undefined })}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>

            {/* Overdue Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="overdue"
                checked={filters.overdue || false}
                onChange={(e) => onFilterChange({ overdue: e.target.checked || undefined })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="overdue" className="ml-2 text-sm text-gray-700">
                Show only overdue
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <button
              onClick={onClear}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};