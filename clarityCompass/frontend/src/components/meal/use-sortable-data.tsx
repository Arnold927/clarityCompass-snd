'use client';

import React, { useMemo, useState } from 'react';
import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

/**
 * Client-side sorting for a table whose full dataset is already in memory
 * (every table in this app loads its rows up front — no server-side paging
 * yet). Sorting is stable for equal values and pushes null/undefined to the
 * end regardless of direction, so "no value" never jumps to the top on desc.
 */
export function useSortableData<T>(items: T[], initialKey: keyof T | null = null, initialDirection: SortDirection = 'asc') {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialKey);
  const [direction, setDirection] = useState<SortDirection>(initialDirection);

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    const withIndex = items.map((item, index) => ({ item, index }));
    withIndex.sort((a, b) => {
      const av = a.item[sortKey];
      const bv = b.item[sortKey];
      const aEmpty = av === null || av === undefined || av === '';
      const bEmpty = bv === null || bv === undefined || bv === '';
      if (aEmpty && bEmpty) return a.index - b.index;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      if (cmp === 0) return a.index - b.index;
      return direction === 'asc' ? cmp : -cmp;
    });
    return withIndex.map(w => w.item);
  }, [items, sortKey, direction]);

  const requestSort = (key: keyof T) => {
    if (sortKey === key) {
      setDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  return { sortedItems, sortKey, direction, requestSort };
}

export function SortableTableHead<T>({
  label, sortKey, activeKey, direction, onSort, className,
}: {
  label: string;
  sortKey: keyof T;
  activeKey: keyof T | null;
  direction: SortDirection;
  onSort: (key: keyof T) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        aria-label={`Sort by ${label}${isActive ? (direction === 'asc' ? ', currently ascending' : ', currently descending') : ''}`}
      >
        {label}
        {isActive ? (
          direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  );
}
