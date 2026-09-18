'use client';

import { useRef } from 'react';

/**
 * Snapshots a form's values when a dialog opens, then lets the dialog check
 * whether anything has changed before it actually closes (Cancel, outside
 * click, Escape, or the dialog's own X button all route through this).
 * File inputs (image/logo uploads) aren't part of the JSON snapshot since
 * File objects don't compare meaningfully — pass `extraDirty: true` from the
 * caller when a file has been selected, so that alone still triggers the
 * confirmation.
 */
export function useConfirmDiscard<T>() {
  const snapshotRef = useRef<T | null>(null);

  const capture = (values: T) => {
    snapshotRef.current = JSON.parse(JSON.stringify(values));
  };

  const isDirty = (values: T, extraDirty = false) => {
    if (extraDirty) return true;
    if (snapshotRef.current === null) return false;
    return JSON.stringify(values) !== JSON.stringify(snapshotRef.current);
  };

  /** Returns true if it's OK to proceed with closing (not dirty, or user confirmed discarding). */
  const confirmClose = (values: T, extraDirty = false): boolean => {
    if (!isDirty(values, extraDirty)) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  };

  return { capture, confirmClose };
}
