'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, X } from 'lucide-react';

export interface MultiSelectOption { value: number; label: string; }

export function MultiSelect({
  label, options, selected, onChange, placeholder = 'Select...',
}: {
  label?: string;
  options: MultiSelectOption[];
  selected: number[];
  onChange: (next: number[]) => void;
  placeholder?: string;
}) {
  const toggle = (value: number) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const selectedOptions = options.filter(o => selected.includes(o.value));

  return (
    <div>
      {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal h-auto min-h-10 py-2">
            <div className="flex flex-wrap gap-1 flex-1 text-left">
              {selectedOptions.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
              {selectedOptions.map(o => (
                <Badge key={o.value} variant="secondary" className="gap-1">
                  {o.label}
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); toggle(o.value); }}
                    className="cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-2" align="start">
          {options.length === 0 && <p className="text-sm text-muted-foreground px-2 py-1">No options available.</p>}
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}