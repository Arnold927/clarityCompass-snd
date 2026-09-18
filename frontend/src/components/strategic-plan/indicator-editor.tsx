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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ProjectIndicator {
  id: number;
  name: string;
  linked_corporate_indicator_name?: string | null;
}

interface ObjectiveStatement {
  id: number;
  text: string;
  objective?: {
    id: number;
    name: string;
    number: string;
  };
}

interface IndicatorEditorProps {
  indicator?: {
    id?: number | null;
    name: string;
    description?: string;
    project_indicator?: ProjectIndicator | number | null;
    statements?: ObjectiveStatement[] | number[];
  };
  projectIndicators?: ProjectIndicator[];
  objectiveStatements?: ObjectiveStatement[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: { 
    name: string; 
    description?: string; 
    project_indicator?: ProjectIndicator | null;
    statements?: number[];
  }) => void;
  title?: string;
  parentStatementId?: number;
}

export function IndicatorEditor({
  indicator,
  projectIndicators = [],
  objectiveStatements = [],
  isOpen,
  onClose,
  onSave,
  title = "Edit Indicator",
  parentStatementId,
}: IndicatorEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectIndicator, setProjectIndicator] = useState<ProjectIndicator | null>(null);
  const [selectedStatements, setSelectedStatements] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (!indicator) {
      setName("");
      setDescription("");
      setProjectIndicator(null);
      setSelectedStatements(parentStatementId ? [parentStatementId] : []);
      return;
    }

    setName(indicator.name || "");
    setDescription(indicator.description || "");

    let linkedProjectIndicator: ProjectIndicator | null = null;
    if (indicator.project_indicator) {
      if (typeof indicator.project_indicator === "object") {
        linkedProjectIndicator = indicator.project_indicator;
      } else if (typeof indicator.project_indicator === "number") {
        linkedProjectIndicator =
          projectIndicators.find((pi) => pi.id === indicator.project_indicator) || null;
      }
    }
    setProjectIndicator(linkedProjectIndicator);

    if (indicator.statements) {
      if (Array.isArray(indicator.statements)) {
        const statementIds = indicator.statements.map((stmt: any) => 
          typeof stmt === 'object' ? stmt.id : stmt
        );
        setSelectedStatements(statementIds);
      }
    } else if (parentStatementId) {
      setSelectedStatements([parentStatementId]);
    }
  }, [isOpen, indicator, projectIndicators, parentStatementId]);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Indicator name is required");
      return;
    }

    if (selectedStatements.length === 0) {
      alert("At least one objective statement must be selected");
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      project_indicator: projectIndicator,
      statements: selectedStatements,
    });
  };

  const toggleStatement = (statementId: number) => {
    setSelectedStatements(prev => {
      if (prev.includes(statementId)) {
        return prev.filter(id => id !== statementId);
      } else {
        return [...prev, statementId];
      }
    });
  };

  const statementsByObjective: Record<string, ObjectiveStatement[]> = {};
  objectiveStatements.forEach(statement => {
    const objectiveName = statement.objective?.name || 'Uncategorized';
    if (!statementsByObjective[objectiveName]) {
      statementsByObjective[objectiveName] = [];
    }
    statementsByObjective[objectiveName].push(statement);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {parentStatementId 
              ? "Create a corporate indicator linked to this objective statement"
              : "Create or edit a corporate indicator. Indicators can be linked to multiple objective statements."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="indicator-name" className="text-right">
              Name *
            </Label>
            <Input
              id="indicator-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="indicator-description" className="text-right">
              Description
            </Label>
            <Textarea
              id="indicator-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>

          {/* Objective Statements Selection */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              Linked Statements *
            </Label>
            <div className="col-span-3 space-y-4">
              {parentStatementId && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200 mb-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> This indicator will be automatically linked to the current statement.
                  </p>
                </div>
              )}
              
              {objectiveStatements.length === 0 ? (
                <div className="p-4 border border-dashed rounded-md text-center">
                  <p className="text-muted-foreground">No objective statements available.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create statements in your strategic objectives first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto p-1">
                  {Object.entries(statementsByObjective).map(([objectiveName, statements]) => (
                    <div key={objectiveName} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">
                          {objectiveName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {statements.length} statement{statements.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-2 pl-4">
                        {statements.map(statement => (
                          <div 
                            key={statement.id} 
                            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                              selectedStatements.includes(statement.id)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleStatement(statement.id)}
                          >
                            <div className="flex-shrink-0 mt-1">
                              <input
                                type="checkbox"
                                checked={selectedStatements.includes(statement.id)}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{statement.text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {statement.objective?.number && (
                                  <Badge variant="secondary" className="text-xs">
                                    {statement.objective.number}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  ID: {statement.id}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary"></span>
                  Selected: {selectedStatements.length} statement{selectedStatements.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs mt-1">
                  Indicators can track progress across multiple objective statements.
                </p>
              </div>
            </div>
          </div>

          {/* Project Indicator Link (Optional) */}
          {/* {projectIndicators.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-indicator" className="text-right">
                Link to Project Indicator
              </Label>
              <Select
                value={projectIndicator?.id?.toString() || "none"}
                onValueChange={(val) => {
                  if (val === "none") {
                    setProjectIndicator(null);
                  } else {
                    const selected = projectIndicators.find((pi) => pi.id.toString() === val) || null;
                    setProjectIndicator(selected);
                  }
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Optional: Link to existing project indicator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Create new corporate indicator)</SelectItem>
                  {projectIndicators.map((pi) => {
                    const isLinked = !!pi.linked_corporate_indicator_name;
                    return (
                      <SelectItem
                        key={pi.id}
                        value={pi.id.toString()}
                        disabled={isLinked}
                        title={isLinked ? `Already linked to: ${pi.linked_corporate_indicator_name}` : ''}
                      >
                        {pi.name} {isLinked && `(Linked)`} 
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )} */}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || selectedStatements.length === 0}>
            Save Corporate Indicator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}