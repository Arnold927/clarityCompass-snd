'use client';

import React, { useState, useTransition, useEffect } from "react";
import { generateReportAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BotMessageSquare, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { fetchProjects, fetchProjectReportData, type ProjectSummary, type ProjectReportData } from "@/lib/api";

const targetAudiences = [
  "Donor",
  "Executive Management",
  "Project Team",
  "Government Partners",
  "General Public"
];

export default function ReportGenerator() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProjectData, setSelectedProjectData] = useState<ProjectReportData | null>(null);
  const [targetAudience, setTargetAudience] = useState("");
  const [reportContext, setReportContext] = useState("");
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingProjectData, setIsLoadingProjectData] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const projectsData = await fetchProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error("Failed to load projects:", error);
        setError("Failed to load projects. Please try again.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    const loadProjectData = async () => {
      if (!selectedProjectId) {
        setSelectedProjectData(null);
        return;
      }

      setIsLoadingProjectData(true);
      try {
        const projectData = await fetchProjectReportData(selectedProjectId);
        setSelectedProjectData(projectData);
      } catch (error) {
        console.error("Failed to load project data:", error);
        setError("Failed to load project details. Please try again.");
      } finally {
        setIsLoadingProjectData(false);
      }
    };

    loadProjectData();
  }, [selectedProjectId]);

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setTargetAudience("");
    setReportContext("");
    setGeneratedReport(null);
    setError(null);
  };

  const synthesizeProjectData = () => {
    if (!selectedProjectData) return "";

    const sd = selectedProjectData as any;

    const serializeTask = (task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status || task.current_status,
      assignee: task.assignee,
      timeline: `${task.start_date ?? '?'} to ${task.end_date ?? '?'}`,
      budget: task.budget,
      cumulative_spent: task.cumulative_spent ?? task.spent ?? 0,
      budget_utilization: task.budget_utilization ?? task.progress_percentage ?? 0,
      last_update_status: task.last_update_status ?? task.current_status,
      last_update_date: task.last_update_date,
      last_update_justification: task.last_update_justification ?? task.justification,
      is_complete: task.is_complete,
      has_tor: task.has_tor,
      tor: task.tor ?? null,
      has_completion_report: task.has_completion_report,
      completion_report: task.completion_report ?? null,
      updates_count: task.updates_count ?? 0,
    });

    const dataToSynthesize = {
      // ── Project overview ──────────────────────────────────────────────────
      project: {
        title: sd.title,
        code: sd.code,
        description: sd.description,
        program: sd.program_name,
        manager: sd.manager_name,
        duration: `${sd.start_date} to ${sd.end_date}`,
        status: sd.status,
        lifecycle_status: sd.lifecycle_status,
        health_status: sd.health_status,
        locations: sd.locations_list?.map((l: any) => l.name) ?? [],
      },

      // ── Financials ────────────────────────────────────────────────────────
      financials: {
        currency: sd.financial_summary?.currency ?? 'USD',
        project_budget: sd.financial_summary?.project_budget ?? sd.budget ?? 0,
        effective_budget: sd.financial_summary?.effective_budget ?? 0,
        total_spent: sd.financial_summary?.total_spent ?? 0,
        balance: sd.financial_summary?.balance ?? 0,
        budget_utilization: sd.financial_summary?.budget_utilization ?? 0,
        spending_efficiency: sd.financial_summary?.spending_efficiency ?? null,
        donor_contributions: sd.financial_summary?.donor_contributions ?? [],
        breakdown_by_activity: sd.financial_summary?.breakdown_by_activity ?? {},
        alerts: sd.financial_summary?.alerts ?? [],
      },

      // ── Results framework (objectives → outcomes → outputs) ───────────────
      results_framework: sd.results_framework ?? [],

      // ── Project indicators ────────────────────────────────────────────────
      indicators: sd.indicators_summary?.map((ind: any) => ({
        name: ind.name,
        description: ind.description,
        current_value: ind.current_value,
        target_value: ind.target_value,
        progress_percentage: ind.progress_percentage,
        is_donor_indicator: ind.is_donor_indicator,
        linked_program_indicator: ind.linked_program_indicator,
        linked_corporate_indicator: ind.linked_corporate_indicator,
        linked_strategic_objective: ind.linked_strategic_objective,
        disaggregators: ind.disaggregators,
      })) ?? [],

      // ── Activities and their tasks ────────────────────────────────────────
      activities: sd.activities_summary?.map((act: any) => ({
        name: act.name,
        description: act.description,
        progress_percentage: act.progress_percentage,
        linked_indicator: act.linked_indicator_name,
        tasks: act.tasks?.map(serializeTask) ?? [],
      })) ?? [],

      // ── Tasks linked directly to project (no activity) ────────────────────
      direct_tasks: sd.direct_tasks_summary?.map(serializeTask) ?? [],

      // ── FCRM complaints ───────────────────────────────────────────────────
      complaints: sd.complaints_summary ?? { total: 0 },

      // ── Beneficiaries ─────────────────────────────────────────────────────
      beneficiaries: sd.beneficiaries_summary,

      // ── Donors ───────────────────────────────────────────────────────────
      donors: sd.donors_list ?? [],

      // ── Timeline ─────────────────────────────────────────────────────────
      timeline: sd.timeline_summary ?? [],

      // ── Data collection ───────────────────────────────────────────────────
      data_collection: sd.data_collection_summary ?? null,
      submission_insights: sd.submission_insights ?? null,
    };

    return JSON.stringify(dataToSynthesize, null, 2);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setGeneratedReport(null);

    if (!selectedProjectId || !targetAudience || !reportContext.trim()) {
      setError("Please select a project, a target audience, and provide a context for the report.");
      return;
    }

    if (!selectedProjectData) {
      setError("Project data is still loading. Please wait a moment and try again.");
      return;
    }

    startTransition(async () => {
      try {
        const projectDataString = synthesizeProjectData();
        const result = await generateReportAction({
          projectData: projectDataString,
          targetAudience,
          reportContext,
        });

        if (result.error) {
          setError(result.error);
        } else {
          setGeneratedReport(result.report);
        }
      } catch (error) {
        console.error("Error generating report:", error);
        setError("Failed to generate report. Please try again.");
      }
    });
  };

  const isFormDisabled = isLoadingProjectData || !selectedProjectData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>AI-Powered Reporting Engine</CardTitle>
            <CardDescription>
              Select a project, an audience, and provide context to generate a tailored narrative report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select 
                onValueChange={handleProjectSelect} 
                value={selectedProjectId}
                disabled={isLoadingProjects}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder={
                    isLoadingProjects ? "Loading projects..." : "Select a project..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">Loading projects...</span>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No projects available
                    </div>
                  ) : (
                    projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {project.code} • {project.status}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedProjectData && (
                <div className="text-xs text-muted-foreground mt-1">
                  Program loaded: {selectedProjectData.program_name}
                  {isLoadingProjectData && " (Loading details...)"}
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target-audience">Target Audience</Label>
              <Select 
                onValueChange={setTargetAudience} 
                value={targetAudience} 
                disabled={isFormDisabled}
              >
                <SelectTrigger id="target-audience">
                  <SelectValue placeholder={
                    isFormDisabled ? "Select a project first" : "Select an audience..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {targetAudiences.map(audience => (
                    <SelectItem key={audience} value={audience}>
                      {audience}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report Context */}
            <div className="space-y-2">
              <Label htmlFor="report-context">Report Context / Theme</Label>
              <Textarea 
                id="report-context"
                placeholder={
                  isFormDisabled 
                    ? "Select a project first" 
                    : "e.g., 'Focus on the challenges faced during Q3 and the mitigation strategies implemented.' or 'Highlight the project's impact on female beneficiaries.'"
                }
                value={reportContext}
                onChange={(e) => setReportContext(e.target.value)}
                rows={4}
                disabled={isFormDisabled}
              />
              <div className="text-xs text-muted-foreground">
                Provide specific guidance for the AI. The more detailed your context, the better the report.
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              disabled={isPending || isFormDisabled || !targetAudience || !reportContext.trim()} 
              className="w-full md:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BotMessageSquare className="mr-2 h-4 w-4" />
                  Generate Project Report
                </>
              )}
            </Button>
            {isLoadingProjectData && (
              <div className="ml-4 text-sm text-muted-foreground flex items-center">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Loading project details...
              </div>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* Generated Report Panel */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Generated Report</CardTitle>
          <CardDescription>
            This is the AI-generated report. Review, copy, and edit as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <ScrollArea className="h-96 w-full rounded-md border">
            <div className="p-4">
              {generatedReport ? (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Generated for: {selectedProjectData?.title}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedReport);
                      }}
                    >
                      Copy Report
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/50 p-4 rounded">
                      {generatedReport}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                  <BotMessageSquare className="h-12 w-12 mb-4 opacity-50" />
                  <p className="font-medium">No report generated yet</p>
                  <p className="text-sm mt-2">
                    Fill out the form on the left and click "Generate Project Report" to create your first report.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Loading State for Report Generation */}
          {isPending && !generatedReport && (
            <Alert className="mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Generating Report</AlertTitle>
              <AlertDescription>
                The AI is analyzing project data and creating your report. This may take a moment...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        {/* Footer with Project Info */}
        <CardFooter className="border-t pt-4">
          {selectedProjectData ? (
            <div className="text-sm text-muted-foreground w-full">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Project:</span> {selectedProjectData.title}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedProjectData.status}
                </div>
                <div>
                  <span className="font-medium">Budget:</span> {selectedProjectData.currency || 'USD'} {selectedProjectData.financial_summary?.total_budget?.toLocaleString() || '0'}
                </div>
                <div>
                  <span className="font-medium">Spent:</span> {selectedProjectData.currency || 'USD'} {selectedProjectData.financial_summary?.total_spent?.toLocaleString() || '0'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Select a project to see details
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}