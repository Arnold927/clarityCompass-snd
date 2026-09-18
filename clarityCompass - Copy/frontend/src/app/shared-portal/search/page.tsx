'use client';

import { useState } from 'react';
import { Search, FileText, Users, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Mock results
      setResults([
        { id: 1, type: 'proposal', title: 'Education Initiative 2024', status: 'under_review' },
        { id: 2, type: 'report', title: 'Q3 Progress Report', status: 'submitted' },
      ]);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground">Find proposals, reports, and messages</p>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search for proposals, reports, messages, or users..."
          className="pl-10 pr-4 py-6 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2">
          Search
        </Button>
      </form>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Searching...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {item.type === 'proposal' ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : item.type === 'report' ? (
                        <MessageSquare className="h-5 w-5 text-green-600" />
                      ) : (
                        <Users className="h-5 w-5 text-purple-600" />
                      )}
                      <h3 className="font-semibold">{item.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.status === 'accepted' ? 'default' :
                      item.status === 'under_review' ? 'secondary' :
                      'outline'
                    }>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/shared-portal/${item.type}s/${item.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : query && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No results found for "{query}"</p>
        </div>
      ) : null}
    </div>
  );
}