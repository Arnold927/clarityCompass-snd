'use client';

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorTargetEditorProps {
  indicator: {
    id: number;
    name: string;
    target?: number | null;
    actual?: number | null;
  };
  type: 'outcome' | 'output';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { target?: number; actual?: number }) => void;
}

export function IndicatorTargetEditor({
  indicator,
  type,
  isOpen,
  onClose,
  onSave,
}: IndicatorTargetEditorProps) {
  const [target, setTarget] = useState<string>("");
  const [actual, setActual] = useState<string>("");

  // A target is considered "saved" only if it already exists on the server-side indicator object.
  // Typing a target in this session does NOT unlock actuals — the user must save first.
  const hasSavedTarget = indicator.target != null && Number(indicator.target) > 0;

  // Derive the current step from server state, not local input state
  const step: 'target' | 'actual' = hasSavedTarget ? 'actual' : 'target';

  useEffect(() => {
    if (isOpen && indicator) {
      setTarget(indicator.target?.toString() ?? "");
      setActual(indicator.actual?.toString() ?? "");
    }
  }, [isOpen, indicator]);

  const handleSave = () => {
    const data: { target?: number; actual?: number } = {};

    if (step === 'target' && target.trim()) {
      data.target = parseFloat(target);
    }

    if (step === 'actual') {
      // Always carry the existing target forward so it isn't wiped
      if (target.trim()) data.target = parseFloat(target);
      if (actual.trim()) data.actual = parseFloat(actual);
    }

    onSave(data);
  };

  const canSave = step === 'target'
    ? target.trim() !== '' && !isNaN(parseFloat(target))
    : actual.trim() !== '' && !isNaN(parseFloat(actual));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'target' ? (
              <><Target className="h-5 w-5 text-primary" /> Set Target</>
            ) : (
              <><TrendingUp className="h-5 w-5 text-primary" /> Enter Actual</>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {type === 'outcome' ? 'Outcome' : 'Output'} Indicator
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Indicator name */}
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="font-medium text-sm">{indicator.name}</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                hasSavedTarget
                  ? "bg-green-100 text-green-700"
                  : "bg-primary text-primary-foreground"
              )}>
                {hasSavedTarget ? <CheckCircle2 className="h-4 w-4" /> : "1"}
              </div>
              <span className={cn(
                "text-xs font-medium",
                hasSavedTarget ? "text-green-700" : "text-foreground"
              )}>
                Set Target
              </span>
            </div>

            <div className="flex-1 h-px bg-border" />

            {/* Step 2 */}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                !hasSavedTarget
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground"
              )}>
                2
              </div>
              <span className={cn(
                "text-xs font-medium",
                !hasSavedTarget ? "text-muted-foreground" : "text-foreground"
              )}>
                Enter Actual
              </span>
            </div>
          </div>

          {/* Step 1 — Target */}
          {step === 'target' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="target">
                  Target Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target"
                  type="number"
                  step="any"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. 85 for 85%"
                  autoFocus
                />
              </div>
              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-primary">
                  Save the target first. Once saved, you can reopen this indicator to record the actual value.
                </p>
              </div>
            </div>
          )}

          {/* Step 2 — Actual (only reachable when target is already saved) */}
          {step === 'actual' && (
            <div className="space-y-3">
              {/* Read-only target display */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Target (saved)</Label>
                <Input
                  type="number"
                  value={target}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>

              {/* Editable actual */}
              <div className="space-y-1.5">
                <Label htmlFor="actual">
                  Actual Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="actual"
                  type="number"
                  step="any"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="Enter the achieved value"
                  autoFocus
                />
              </div>

              {/* Progress preview */}
              {actual.trim() && !isNaN(parseFloat(actual)) && indicator.target && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1.5">Progress preview</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-border rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((parseFloat(actual) / Number(indicator.target)) * 100))}%`
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">
                      {Math.min(100, Math.round((parseFloat(actual) / Number(indicator.target)) * 100))}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {step === 'target' ? 'Save Target' : 'Save Actual'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}