
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronDown, ChevronsRight, Dot, Goal, PlusCircle, Target } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { OutcomeEditor } from './outcome-editor';
import { OutputEditor } from './output-editor';
import { OutputIndicatorEditor } from './output-indicator-editor';

export function FrameworkView({ level, data, onUpdate, strategicPlan, program }: { level: 'strategic' | 'program' | 'project', data: any, onUpdate: (data: any) => void, strategicPlan?: any, program?: any }) {
    const [editingOutcome, setEditingOutcome] = useState<any>(null);
    const [editingOutput, setEditingOutput] = useState<any>(null);
    const [editingIndicator, setEditingIndicator] = useState<any>(null);

    const [parentForOutcome, setParentForOutcome] = useState<any>(null);
    const [parentForOutput, setParentForOutput] = useState<any>(null);
    const [parentForIndicator, setParentForIndicator] = useState<any>(null);

    const handleAddOutcome = (objective: any) => {
        setParentForOutcome(objective);
        setEditingOutcome({ name: '', description: '' });
    };
    
    const handleSaveOutcome = (newOutcome: any) => {
        const updatedObjectives = data.strategicObjectives.map((obj: any) => {
            if (obj.id === parentForOutcome.id) {
                return { ...obj, outcomes: [...obj.outcomes, { ...newOutcome, id: `outcome-new-${Date.now()}`, outputs: [] }] };
            }
            return obj;
        });
        onUpdate({ ...data, strategicObjectives: updatedObjectives });
        setEditingOutcome(null);
        setParentForOutcome(null);
    }
    
    const handleAddOutput = (outcome: any) => {
        setParentForOutput(outcome);
        setEditingOutput({ name: '' });
    };

    const handleSaveOutput = (newOutput: any) => {
        const updatedObjectives = data.strategicObjectives.map((obj: any) => ({
            ...obj,
            outcomes: obj.outcomes.map((out: any) => {
                if (out.id === parentForOutput.id) {
                    return { ...out, outputs: [...out.outputs, { ...newOutput, id: `output-new-${Date.now()}`, indicators: [] }] };
                }
                return out;
            })
        }));
        onUpdate({ ...data, strategicObjectives: updatedObjectives });
        setEditingOutput(null);
        setParentForOutput(null);
    };
    
    const handleAddIndicator = (output: any) => {
        setParentForIndicator(output);
        setEditingIndicator({ name: '' });
    }
    
    const handleSaveIndicator = (newIndicator: any) => {
         const updatedObjectives = data.strategicObjectives.map((obj: any) => ({
            ...obj,
            outcomes: obj.outcomes.map((out: any) => ({
                ...out,
                outputs: out.outputs.map((op: any) => {
                    if (op.id === parentForIndicator.id) {
                        return { ...op, indicators: [...op.indicators, { ...newIndicator, id: `ind-new-${Date.now()}` }] };
                    }
                    return op;
                })
            }))
        }));
        onUpdate({ ...data, strategicObjectives: updatedObjectives });
        setEditingIndicator(null);
        setParentForIndicator(null);
    }

    const renderTitle = () => {
        switch (level) {
            case 'strategic': return 'Strategic Plan Results Framework';
            case 'program': return `Program: ${data.name}`;
            case 'project': return `Project: ${data.title}`;
        }
    };
    
    const objectives = level === 'strategic' ? data.strategicObjectives : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{renderTitle()}</CardTitle>
                <CardDescription>
                    Defines the hierarchy of objectives, outcomes, and outputs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="p-4 border-l-4 border-primary bg-primary/10 rounded-r-lg">
                    <div className="flex items-center gap-3">
                        <Goal className="h-6 w-6 text-primary" />
                        <div>
                            <h3 className="text-lg font-bold text-primary">Overall Goal</h3>
                            <p className="text-sm text-primary/80">{data.overallObjective}</p>
                        </div>
                    </div>
                </div>

                {objectives.map((objective: any) => (
                    <Collapsible key={objective.id} defaultOpen className="p-4 border rounded-lg space-y-3">
                         <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Target className="h-5 w-5 text-accent-foreground" />
                                    <h3 className="text-base font-bold">
                                        <Badge variant="secondary" className="mr-2">{objective.number}</Badge>
                                        {objective.name}
                                    </h3>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                            </div>
                         </CollapsibleTrigger>
                         <CollapsibleContent className="space-y-3 pt-2">
                            <p className="text-sm text-muted-foreground ml-9">{objective.description}</p>
                            
                            <div className="pl-9 space-y-3">
                                {objective.outcomes.map((outcome: any) => (
                                    <Collapsible key={outcome.id} defaultOpen className="p-3 border-l-2 border-slate-200">
                                         <CollapsibleTrigger className="w-full">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                                                    <h4 className="font-semibold text-sm">{outcome.name}</h4>
                                                </div>
                                                 <ChevronDown className="h-4 w-4" />
                                            </div>
                                         </CollapsibleTrigger>
                                         <CollapsibleContent className="space-y-2 pt-2">
                                            <div className="pl-6 space-y-2">
                                                {outcome.outputs.map((output: any) => (
                                                     <div key={output.id} className="p-2 border-l-2 border-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            <Dot className="h-4 w-4 text-muted-foreground" />
                                                            <p className="font-medium text-xs">{output.name}</p>
                                                        </div>
                                                         {level === 'project' && (
                                                            <div className="pl-6 mt-2">
                                                                 <Button size="sm" variant="outline" onClick={() => handleAddIndicator(output)}>
                                                                    <PlusCircle className="mr-2 h-3 w-3" /> Add Output Indicator
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                 {level === 'program' && (
                                                    <div className="pl-1 mt-2">
                                                        <Button size="sm" variant="outline" onClick={() => handleAddOutput(outcome)}>
                                                            <PlusCircle className="mr-2 h-3 w-3" /> Add Output
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                         </CollapsibleContent>
                                    </Collapsible>
                                ))}

                                {level === 'strategic' && (
                                    <Button size="sm" variant="outline" onClick={() => handleAddOutcome(objective)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Outcome
                                    </Button>
                                )}
                            </div>
                         </CollapsibleContent>
                    </Collapsible>
                ))}

                {editingOutcome && (
                    <OutcomeEditor 
                        isOpen={!!editingOutcome}
                        onClose={() => setEditingOutcome(null)}
                        onSave={handleSaveOutcome}
                        outcome={editingOutcome}
                    />
                )}
                 {editingOutput && (
                    <OutputEditor 
                        isOpen={!!editingOutput}
                        onClose={() => setEditingOutput(null)}
                        onSave={handleSaveOutput}
                        output={editingOutput}
                    />
                )}
                {editingIndicator && (
                    <OutputIndicatorEditor 
                        isOpen={!!editingIndicator}
                        onClose={() => setEditingIndicator(null)}
                        onSave={handleSaveIndicator}
                        indicator={editingIndicator}
                    />
                )}

            </CardContent>
        </Card>
    );
}
