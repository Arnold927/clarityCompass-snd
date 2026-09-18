'use client';

import { useEffect } from 'react';

/** Sets document.title while this page is mounted, restoring the previous
 * title on unmount. Needed because these are client components — the
 * Next.js `metadata` export only works in server components. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
}
