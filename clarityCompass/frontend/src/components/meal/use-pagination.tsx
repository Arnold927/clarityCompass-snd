'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client-side pagination over an already-fetched array. Every list in this
 * app is fetched in full up front (no server-side paging exists yet), so
 * this paginates in memory — consistent with how sorting already works.
 * If a module ever grows into the hundreds of records, this is the first
 * place that would need to move to real server-side paging.
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp back to the last valid page if filtering/sorting shrinks the list
  // out from under the current page (e.g. a search narrows to fewer pages).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    pageItems,
    page: Math.min(page, totalPages),
    totalPages,
    totalItems: items.length,
    setPage,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setPage(p => Math.max(p - 1, 1)),
  };
}

export function PaginationControls({
  page, totalPages, totalItems, pageSize, onPrev, onNext, onPage, itemLabel = 'items',
}: {
  page: number; totalPages: number; totalItems: number; pageSize: number;
  onPrev: () => void; onNext: () => void; onPage: (p: number) => void; itemLabel?: string;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Show at most 5 page numbers, centred on the current page.
  const pages: number[] = [];
  let from = Math.max(1, page - 2);
  let to = Math.min(totalPages, from + 4);
  from = Math.max(1, to - 4);
  for (let p = from; p <= to; p++) pages.push(p);

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mt-3 text-sm">
      <span className="text-muted-foreground text-xs">
        Showing {start}–{end} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="outline" disabled={page <= 1} onClick={onPrev} aria-label="Previous page" title="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map(p => (
          <Button
            key={p} size="icon" variant={p === page ? 'default' : 'outline'}
            style={p === page ? { backgroundColor: '#C8793A', color: 'white' } : undefined}
            onClick={() => onPage(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Button>
        ))}
        <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={onNext} aria-label="Next page" title="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
