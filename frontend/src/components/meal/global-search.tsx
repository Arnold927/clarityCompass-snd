'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2, FolderKanban, Coins, Users, Globe, Layers, Target } from 'lucide-react';
import { mealApi, searchResultHref, type SearchResult } from '@/lib/meal-api';

const KIND_ICONS: Record<string, any> = {
  project: FolderKanban, donor: Coins, 'lead-partner': Users,
  country: Globe, 'thematic-focus': Layers, indicator: Target,
};

const KIND_LABELS: Record<string, string> = {
  project: 'Project', donor: 'Donor', 'lead-partner': 'Lead Partner',
  country: 'Country', 'thematic-focus': 'Thematic Focus', indicator: 'Indicator',
};

export function GlobalSearch({ collapsed }: { collapsed?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const handle = setTimeout(() => {
      mealApi.search(q)
        .then(r => { setResults(r); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250); // debounce so every keystroke doesn't fire a request
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQuery('');
    router.push(searchResultHref(r));
  };

  if (collapsed) return null;

  return (
    <div ref={containerRef} className="relative px-3 pb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: '#C8A87A' }} />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search everything..."
          aria-label="Global search"
          className="pl-8 pr-8 h-9 text-sm bg-white/10 border-white/10 text-white placeholder:text-[#C8A87A] focus-visible:ring-[#C8793A]"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin" style={{ color: '#C8A87A' }} />
        ) : query && (
          <button onClick={() => { setQuery(''); setResults([]); }} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5" style={{ color: '#C8A87A' }} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-3 right-3 mt-1 bg-white rounded-md shadow-xl border max-h-96 overflow-y-auto z-50">
          {results.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground p-3">No matches for &ldquo;{query}&rdquo;.</p>
          ) : (
            results.map(r => {
              const Icon = KIND_ICONS[r.kind] ?? Target;
              return (
                <button
                  key={`${r.kind}-${r.indicator_kind ?? ''}-${r.id}`}
                  onClick={() => go(r)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: '#C8793A' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{KIND_LABELS[r.kind]} · {r.subtitle}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}