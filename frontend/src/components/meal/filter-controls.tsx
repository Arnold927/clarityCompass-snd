'use client';

import React from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarDays, X } from 'lucide-react';
import { C } from '@/lib/meal-api';

export function DateRangeFilter({ range, onChange, label = 'Project Date Range' }: {
  range: DateRange | undefined; onChange: (r: DateRange | undefined) => void; label?: string;
}) {
  const display = range?.from
    ? range.to
      ? `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`
      : format(range.from, 'MMM d, yyyy')
    : 'All dates';
  return (
    <div className="min-w-[200px]">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-start text-left font-normal flex-1 min-w-0">
              <CalendarDays className="h-4 w-4 mr-2 shrink-0" style={{ color: C.orange }} />
              <span className="truncate">{display}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range" selected={range} onSelect={onChange} numberOfMonths={2} initialFocus
              captionLayout="dropdown-buttons" fromYear={2015} toYear={new Date().getFullYear() + 5}
            />
          </PopoverContent>
        </Popover>
        {range?.from && (
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onChange(undefined)} aria-label="Clear date range" title="Clear date range">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function FilterSelect({ label, pluralLabel, value, onChange, options }: {
  label: string; pluralLabel?: string; value?: number; onChange: (v: number | undefined) => void;
  options: { value: number; label: string }[];
}) {
  const allLabel = `All ${pluralLabel ?? `${label}s`}`;
  return (
    <div className="min-w-[160px]">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <Select
        value={value?.toString() ?? 'all'}
        onValueChange={v => onChange(v === 'all' ? undefined : Number(v))}
      >
        <SelectTrigger className="h-9"><SelectValue placeholder={allLabel} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value.toString()}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}