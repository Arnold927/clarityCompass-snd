'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, ChevronRight, ArrowLeft, Download, FileText } from 'lucide-react';
import { usePageTitle } from '@/components/meal/use-page-title';
import {
  mealApi, C, fmtDate, moduleHref, documentParentId, fetchModuleName,
  DOCUMENT_KIND_LABELS, type DocumentDetail, type DocumentKind,
} from '@/lib/meal-api';

const VALID_KINDS: DocumentKind[] = ['project', 'donor', 'lead-partner'];
const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kindParam = params.kind as string;
  const id = params.id as string;
  const kind = VALID_KINDS.includes(kindParam as DocumentKind) ? (kindParam as DocumentKind) : null;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  usePageTitle(doc ? `${doc.title} | Document Details | SND Africa MEAL` : 'Document Details | SND Africa MEAL');
  const [parentName, setParentName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) { setError('Unknown document type.'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    mealApi.document(kind, id)
      .then(async (d) => {
        setDoc(d);
        const pId = documentParentId(kind, d);
        if (pId) {
          setParentId(pId);
          try { setParentName(await fetchModuleName(kind, pId)); } catch { setParentName(''); }
        }
      })
      .catch(() => setError('This document could not be found.'))
      .finally(() => setLoading(false));
  }, [kind, id]);

  const parentLabel = kind ? DOCUMENT_KIND_LABELS[kind] : '';
  const backHref = kind && parentId ? moduleHref(kind, parentId, 'documents') : '/projects';
  const filename = doc?.file.split('/').pop() ?? '';
  const extension = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  const isImage = IMAGE_EXT.includes(extension);
  const isPdf = extension === 'pdf';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
          <Link href="/dashboard" aria-label="Home" className="hover:text-foreground"><Home className="h-3.5 w-3.5" /></Link> <ChevronRight className="h-3.5 w-3.5" />
          {kind && <span>{parentLabel}s</span>}
          <ChevronRight className="h-3.5 w-3.5" />
          {parentId && (
            <>
              <Link href={backHref} className="hover:underline">{parentName || parentLabel}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="text-foreground font-medium">Document Details</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : error || !doc ? (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">{error || 'Document not found.'}</CardContent></Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold" style={{ color: C.brown }}>{doc.title}</h1>
                  {parentName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Uploaded under <Link href={backHref} className="hover:underline" style={{ color: C.orange }}>{parentName}</Link> ({parentLabel})
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Uploaded {fmtDate(doc.uploaded_at)}</p>
                </div>
                <a href={doc.file} target="_blank" rel="noopener noreferrer">
                  <Button style={{ backgroundColor: C.orange }} className="text-white">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader>
              <CardContent>
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doc.file} alt={doc.title} className="max-w-full rounded-md border mx-auto" />
                ) : isPdf ? (
                  <iframe src={doc.file} className="w-full h-[70vh] rounded-md border" title={doc.title} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-12 w-12 mb-3" style={{ color: C.orange }} />
                    <p className="text-sm text-muted-foreground mb-4">
                      No inline preview available for this file type{extension ? ` (.${extension})` : ''}.
                    </p>
                    <a href={doc.file} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Download to view</Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
