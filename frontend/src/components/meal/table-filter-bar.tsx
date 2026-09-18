'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

export interface StatusOption { value: string; label: string; }

export function TableFilterBar({
  search, onSearchChange, searchPlaceholder = 'Search...', searchLabel = 'Search',
  statusOptions, statusValue, onStatusChange, statusLabel = 'Status',
  extra,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  statusOptions?: StatusOption[];
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  statusLabel?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-3">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-2.5 top-[calc(50%+2px)] -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="pl-8 h-9"
        />
      </div>
      {statusOptions && (
        <div className="min-w-[150px]">
          <Select value={statusValue ?? 'ALL'} onValueChange={v => onStatusChange?.(v)}>
            <SelectTrigger className="h-9" aria-label={statusLabel}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All {statusLabel}</SelectItem>
              {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {extra}
    </div>
  );
}
