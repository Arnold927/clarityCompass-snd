'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Trash2, Upload, Download, Eye } from 'lucide-react';
import { C, fmtDate, type DocumentKind } from '@/lib/meal-api';
import { usePagination, PaginationControls } from './use-pagination';
import { TableFilterBar } from './table-filter-bar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

export interface DocumentLike { id: number; title: string; file: string; uploaded_at: string; }

export function DocumentManager({
  kind, documents, onUpload, onDelete,
}: {
  kind: DocumentKind;
  documents: DocumentLike[];
  onUpload: (title: string, file: File) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const filtered = documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));
  const pagination = usePagination(filtered, 10);

  const upload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(title, file);
      toast({ title: 'Document uploaded', description: `"${title}" has been uploaded.` });
      setTitle('');
      setFile(null);
    } catch {
      setError('Could not upload the document.');
      toast({ title: 'Could not upload document', description: `"${title}" could not be uploaded.`, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: number, docTitle: string) => {
    if (!confirm(`Remove "${docTitle}"?`)) return;
    try {
      await onDelete(id);
      toast({ title: 'Document removed', description: `"${docTitle}" has been removed.` });
    } catch {
      toast({ title: 'Could not remove document', description: `"${docTitle}" could not be removed.`, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="doc-title-input">Document Title</Label>
          <Input id="doc-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Baseline Assessment Report" />
        </div>
        <div>
          <Label htmlFor="doc-file-input">File</Label>
          <Input id="doc-file-input" type="file" aria-label="Document file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button onClick={upload} disabled={uploading || !file || !title.trim()} style={{ backgroundColor: C.orange }} className="text-white">
          <Upload className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {documents.length > 0 && (
        <TableFilterBar
          search={search}
          onSearchChange={v => { setSearch(v); pagination.setPage(1); }}
          searchPlaceholder="Search documents..."
          searchLabel="Search documents"
        />
      )}

      <div className="space-y-2">
        {documents.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}
        {documents.length > 0 && pagination.pageItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No documents match your search.</p>
        )}
        {pagination.pageItems.map(doc => (
          <div key={doc.id} className="flex items-center gap-3 rounded-md border p-3">
            <FileText className="h-5 w-5 shrink-0" style={{ color: C.orange }} />
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                </TooltipTrigger>
                <TooltipContent>{doc.title}</TooltipContent>
              </Tooltip>
              <p className="text-xs text-muted-foreground">Uploaded {fmtDate(doc.uploaded_at)}</p>
            </div>
            <Link href={`/documents/${kind}/${doc.id}`} aria-label={`View details for ${doc.title}`}>
              <Button size="icon" variant="ghost" title="View details" aria-label={`View details for ${doc.title}`}><Eye className="h-4 w-4" /></Button>
            </Link>
            <a href={doc.file} target="_blank" rel="noopener noreferrer" aria-label={`Download ${doc.title}`}>
              <Button size="icon" variant="ghost" title="Download" aria-label={`Download ${doc.title}`}><Download className="h-4 w-4" /></Button>
            </a>
            <Button size="icon" variant="ghost" onClick={() => remove(doc.id, doc.title)} title="Delete" aria-label={`Delete ${doc.title}`}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ))}
      </div>
      <PaginationControls
        page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems}
        pageSize={10} onPrev={pagination.prevPage} onNext={pagination.nextPage} onPage={pagination.setPage}
        itemLabel="documents"
      />
    </div>
  );
}