
'use client';

import React, { useState } from "react";
import AppLayout from "@/components/layout/app-layout";
import { initialStrategicPlan, initialPrograms, initialProjects } from "@/lib/mock-data";
import { FrameworkView } from "@/components/results-framework/framework-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ResultsFrameworkPage() {
    const [plan, setPlan] = useState(initialStrategicPlan);
    const [programs, setPrograms] = useState(initialPrograms);
    const [projects, setProjects] = useState(initialProjects);

    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    const selectedProgram = programs.find(p => p.id === selectedProgramId);
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    // This function will handle updates from the FrameworkView component
    const handleFrameworkUpdate = (updatedData: any) => {
        // Here you would determine what was updated (plan, program, project)
        // and update the corresponding state.
        // For simplicity, we'll just update the main plan for now.
        setPlan(updatedData);
    };

    return (
        <AppLayout platform="ngo">
            <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Results Framework
                    </h2>
                </div>

                <Tabs defaultValue="strategic" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="strategic">Strategic Plan</TabsTrigger>
                        <TabsTrigger value="program" disabled={!plan.strategicObjectives.length}>Program</TabsTrigger>
                        <TabsTrigger value="project" disabled={!selectedProgramId}>Project</TabsTrigger>
                    </TabsList>

                    <TabsContent value="strategic">
                        <FrameworkView
                            level="strategic"
                            data={plan}
                            onUpdate={handleFrameworkUpdate}
                        />
                    </TabsContent>

                    <TabsContent value="program">
                       <Card>
                            <CardHeader>
                                <CardTitle>Program-Level Framework</CardTitle>
                                <CardDescription>Select a program to view and edit its results framework.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Select onValueChange={setSelectedProgramId}>
                                    <SelectTrigger className="w-[300px]">
                                        <SelectValue placeholder="Select a program..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {programs.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedProgram && (
                                     <div className="mt-6">
                                        <FrameworkView
                                            level="program"
                                            data={selectedProgram}
                                            strategicPlan={plan}
                                            onUpdate={setPrograms} // This would need more complex logic
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="project">
                       <Card>
                            <CardHeader>
                                <CardTitle>Project-Level Framework</CardTitle>
                                <CardDescription>Select a project to view and edit its results framework.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Select onValueChange={setSelectedProjectId} disabled={!selectedProgramId}>
                                    <SelectTrigger className="w-[300px]">
                                        <SelectValue placeholder="Select a project..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.filter(p => p.program === selectedProgram?.name).map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedProject && selectedProgram && (
                                     <div className="mt-6">
                                        <FrameworkView
                                            level="project"
                                            data={selectedProject}
                                            program={selectedProgram}
                                            strategicPlan={plan}
                                            onUpdate={setProjects} // This would need more complex logic
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </main>
        </AppLayout>
    );
}
