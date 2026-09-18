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
import api from "@/lib/api";


interface ReportingSchedule {
  id: number;
  name: string;
  recipient: string;
  frequency: string;
  submissions: any[];
}

interface ProjectReportingData {
  schedules: ReportingSchedule[];
  submissions: any[];
}

const targetAudiences = [
  "Donor",
  "Executive Management",
  "Project Team",
  "Government Partners",
  "General Public"
];

interface ReportGeneratorProps {
  project?: any;
}

export default function ReportGenerator({ project }: ReportGeneratorProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(project?.id || "");
  const [selectedProjectData, setSelectedProjectData] = useState<ProjectReportData | null>(null);
  const [targetAudience, setTargetAudience] = useState("");
  const [reportContext, setReportContext] = useState("");
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingProjects, setIsLoadingProjects] = useState(!project?.id);
  const [isLoadingProjectData, setIsLoadingProjectData] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("none");
  const [reportingPeriod, setReportingPeriod] = useState<string>("");
  const [schedules, setSchedules] = useState<ReportingSchedule[]>([]);


  useEffect(() => {
    if (project?.id) {
      setSelectedProjectId(project.id);
      setIsLoadingProjects(false);
      return;
    }

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
  }, [project]);

  // const handleScheduleSelect = (scheduleId: string) => {
  //   setSelectedScheduleId(scheduleId);
    
  //   if (scheduleId && scheduleId !== "none") {
  //     const selectedSchedule = schedules.find(s => s.id.toString() === scheduleId);
  //     if (selectedSchedule) {
  //       setTargetAudience(selectedSchedule.recipient);
        
  //       const period = generateReportingPeriod(selectedSchedule.frequency);
  //       setReportingPeriod(period);
        
  //       const frequencyDisplay = getFrequencyDisplay(selectedSchedule.frequency);
  //       setReportContext(`${frequencyDisplay} report for ${period}`);
  //     }
  //   } else {
  //     setReportingPeriod("");
  //     const selectedSchedule = schedules.find(s => s.id.toString() === selectedScheduleId);
  //   if (selectedSchedule && selectedSchedule.recipient === targetAudience) {
  //     setTargetAudience("");
  //   }
  //   }
  // };

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

useEffect(() => {
  
  const loadSchedules = async () => {
    if (!selectedProjectId) {
      setSchedules([]);
      setSelectedScheduleId("none");
      setReportingPeriod("");
      return;
    }
    
    try {      
      const response = await api.get(`/projects/${selectedProjectId}/schedules/`);
      const schedulesData = response.data;
      
      setSchedules(schedulesData);

      if (schedulesData.length > 0) {
        const firstSchedule = schedulesData[0];
        
        setSelectedScheduleId(firstSchedule.id.toString());
        setTargetAudience(firstSchedule.recipient);
        
        const period = generateReportingPeriod(firstSchedule.frequency);
        setReportingPeriod(period);
        
        const frequencyDisplay = getFrequencyDisplay(firstSchedule.frequency);
        setReportContext(`${frequencyDisplay} report for ${period}`);
        
        const submissions = await fetchScheduleSubmissions(firstSchedule.id.toString());
      }
    } catch (error: any) {
      console.error("Failed to load reporting schedules:", error);
      
      if (error.response) {
        console.error("Error response:", error.response.status, error.response.data);
        console.error("Request URL:", error.config?.url);
      } else if (error.request) {
        console.error("No response received:", error.request);
      } else {
        console.error("Error setting up request:", error.message);
      }
    }
  };
  
  loadSchedules();
}, [selectedProjectId]);

const fetchScheduleSubmissions = async (scheduleId: string) => {
  try {
    // const response = await api.get(`/reporting/schedules/${scheduleId}/submissions/`);
      const response = await api.get(`/projects/${selectedProjectId}/schedules/${scheduleId}/submissions/`);

    return response.data;
  } catch (error) {
    console.error("Failed to fetch schedule submissions:", error);
    return [];
  }
};

const handleScheduleSelect = async (scheduleId: string) => {
  setSelectedScheduleId(scheduleId);
  
  if (scheduleId && scheduleId !== "none") {
    const selectedSchedule = schedules.find(s => s.id.toString() === scheduleId);
    if (selectedSchedule) {
      setTargetAudience(selectedSchedule.recipient);
      
      const period = generateReportingPeriod(selectedSchedule.frequency);
      setReportingPeriod(period);
      
      const frequencyDisplay = getFrequencyDisplay(selectedSchedule.frequency);
      setReportContext(`${frequencyDisplay} report for ${period}`);
      
      const submissions = await fetchScheduleSubmissions(scheduleId);
    }
  } else {
    setReportingPeriod("");
    const selectedSchedule = schedules.find(s => s.id.toString() === selectedScheduleId);
    if (selectedSchedule && selectedSchedule.recipient === targetAudience) {
      setTargetAudience("");
    }
  }
};
  

const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    setTargetAudience("");
    setReportContext("");
    setGeneratedReport(null);
    setError(null);
  };

  const synthesizeProjectData = () => {
  if (!selectedProjectData) return "";
  
  const selectedSchedule = selectedScheduleId && selectedScheduleId !== "none" 
    ? schedules.find(s => s.id.toString() === selectedScheduleId)
    : null;
  
  const scheduleSubmissions = selectedSchedule ? selectedSchedule.submissions || [] : [];
  
  const periodSubmissions = reportingPeriod 
    ? scheduleSubmissions.filter(sub => {
        const submissionDate = new Date(sub.submitted_at || sub.date);
        const periodStart = new Date();
        const periodEnd = new Date();
        return submissionDate >= periodStart && submissionDate <= periodEnd;
      })
    : scheduleSubmissions;
  
  const dataToSynthesize = {
    project: {
      title: selectedProjectData.title,
      code: selectedProjectData.code,
      description: selectedProjectData.description,
      program: selectedProjectData.program_name,
      manager: selectedProjectData.manager_name,
      duration: `${selectedProjectData.start_date} to ${selectedProjectData.end_date}`,
      status: selectedProjectData.status,
      health_status: selectedProjectData.health_status,
      lifecycle_status: selectedProjectData.lifecycle_status,
      locations: selectedProjectData.locations_list?.map(loc => loc.name) || [],
    },
    
    reporting_schedule: selectedSchedule ? {
      name: selectedSchedule.name,
      recipient: selectedSchedule.recipient,
      frequency: selectedSchedule.frequency,
      frequency_display: getFrequencyDisplay(selectedSchedule.frequency),
      reporting_period: reportingPeriod,
      total_submissions: scheduleSubmissions.length,
      period_submissions: periodSubmissions.length,
      
      recent_submissions: scheduleSubmissions.slice(0, 3).map(sub => ({
        title: sub.title,
        date: sub.date || sub.submitted_at,
        status: sub.status,
        notes: sub.notes || "No notes provided",
        url: sub.url || "#",
      })),
      
      submission_metrics: {
        pending: scheduleSubmissions.filter(s => s.status === 'Pending').length,
        approved: scheduleSubmissions.filter(s => s.status === 'Approved').length,
        rejected: scheduleSubmissions.filter(s => s.status === 'Rejected').length,
        last_submission: scheduleSubmissions.length > 0 
          ? scheduleSubmissions[0].date || scheduleSubmissions[0].submitted_at 
          : null,
      }
    } : null,
    
    financials: {
      currency: selectedProjectData.financial_summary?.currency || "USD",
      total_budget: selectedProjectData.financial_summary?.total_budget || 0,
      total_spent: selectedProjectData.financial_summary?.total_spent || 0,
      balance: selectedProjectData.financial_summary?.balance || 0,
      budget_utilization: selectedProjectData.financial_summary?.budget_utilization || 0,
      donors: selectedProjectData.financial_summary?.donor_contributions?.map(d => d.name) || [],
      donor_contributions: selectedProjectData.financial_summary?.donor_contributions || [],
    },
    
    indicators: selectedProjectData.indicators_summary?.map(ind => ({
      name: ind.name,
      description: ind.description,
      current_value: ind.current_value,
      target_value: ind.target_value,
      progress_percentage: ind.progress_percentage,
      linked_to: ind.linked_program_indicator,
      strategic_objective: ind.linked_strategic_objective,
      is_donor_indicator: ind.is_donor_indicator,
      disaggregators: ind.disaggregators,
    })) || [],
    
    activities: selectedProjectData.activities_summary?.map(act => ({
      name: act.name,
      description: act.description,
      progress_percentage: act.progress_percentage,
      linked_indicator: act.linked_indicator_name,
      
      tasks: act.tasks?.map(task => ({
        title: task.title,
        assignee: task.assignee,
        status: task.current_status,
        is_complete: task.is_complete,
        justification: task.justification,
        budget: task.budget,
        spent: task.spent,
        progress_percentage: task.progress_percentage,
        timeline: `${task.start_date} to ${task.end_date}`,
        last_update: task.last_update_date,
      })) || [],
    })) || [],
    
    beneficiaries: selectedProjectData.beneficiaries_summary,
    timeline: selectedProjectData.timeline_summary,
    donors: selectedProjectData.donors_list,
    
    report_context: {
      is_scheduled_report: !!selectedSchedule,
      target_audience: targetAudience,
      custom_context: reportContext,
      requested_at: new Date().toISOString(),
    }
  };

  return JSON.stringify(dataToSynthesize, null, 2);
};

const parseReportingPeriod = (periodString: string): { start: Date | null; end: Date | null } => {
  if (!periodString) return { start: null, end: null };
  
  const now = new Date();
  
  const quarterMatch = periodString.match(/Q([1-4])\s+(\d{4})/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, endMonth + 1, 0);
    
    return { start, end };
  }
  
  const monthMatch = periodString.match(/(\w+)\s+(\d{4})/);
  if (monthMatch) {
    const monthName = monthMatch[1];
    const year = parseInt(monthMatch[2]);
    
    const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    
    return { start, end };
  }
  
  const yearMatch = periodString.match(/^\d{4}$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    
    return { start, end };
  }
  
  return { start: null, end: null };
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
      
      const periodDates = parseReportingPeriod(reportingPeriod);
      
      const requestData: any = {
        projectData: projectDataString,
        targetAudience,
        reportContext,
      };
      
      if (selectedScheduleId && selectedScheduleId !== "none" && reportingPeriod) {
        requestData.scheduleId = selectedScheduleId;
        requestData.reportingPeriod = reportingPeriod;
        
        if (periodDates.start && periodDates.end) {
          requestData.periodStart = periodDates.start.toISOString().split('T')[0];
          requestData.periodEnd = periodDates.end.toISOString().split('T')[0];
        }
        
        try {
            const scheduleResponse = await api.get(`/generate-scheduled-report/${selectedScheduleId}/`);

          if (scheduleResponse.data) {
            const scheduleInfo = scheduleResponse.data;
            Object.assign(requestData, {
              scheduleName: scheduleInfo.schedule,
              period: scheduleInfo.period,
              period_start: scheduleInfo.period_start,
              period_end: scheduleInfo.period_end
            });
          }
        } catch (scheduleError) {
        }
      }
      
      const result = await generateReportAction(requestData);

      if (result.error) {
        setError(result.error);
      } else {
        setGeneratedReport(result.report);
        
        if (selectedScheduleId && selectedScheduleId !== "none" && result.report) {
          await saveReportSubmission(selectedScheduleId, result.report, reportingPeriod);
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report. Please try again.");
    }
  });
};
  

const saveReportSubmission = async (scheduleId: string, reportContent: string, period: string) => {
  try {
    const response = await api.post(`/projects/${selectedProjectId}/schedules/${scheduleId}/submissions/`, {
      title: `AI Generated Report - ${period}`,
      content: reportContent,
      notes: "AI-generated report",
      status: "Generated"
    });
    
    if (response.data) {
      console.log("Report submission saved successfully:", response.data);
      const scheduleResponse = await api.get(`/projects/${selectedProjectId}/schedules/`);
      setSchedules(scheduleResponse.data);
    }
  } catch (error) {
    console.error("Error saving submission:", error);
  }
};

  const isFormDisabled = isLoadingProjectData || !selectedProjectData;
  const showProjectSelector = !project?.id;

  const generateReportingPeriod = (frequency: string): string => {
    const now = new Date();
    switch(frequency.toUpperCase()) {
      case 'WEEKLY':
        return `Week ending ${now.toLocaleDateString()}`;
      case 'MONTHLY':
        return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      case 'QUARTERLY':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `Q${quarter} ${now.getFullYear()}`;
      case 'BI-ANNUALLY':
        const half = now.getMonth() < 6 ? 'H1' : 'H2';
        return `${half} ${now.getFullYear()}`;
      case 'ANNUALLY':
        return `${now.getFullYear()}`;
      default:
        return now.toLocaleDateString();
    }
  };

  const getFrequencyDisplay = (frequency?: string): string => {
    if (!frequency) return '';
    const frequencyMap: Record<string, string> = {
      'DAILY': 'Daily',
      'WEEKLY': 'Weekly',
      'MONTHLY': 'Monthly',
      'QUARTERLY': 'Quarterly',
      'BI-ANNUALLY': 'Bi-Annually',
      'ANNUALLY': 'Annually'
    };
    return frequencyMap[frequency.toUpperCase()] || frequency;
  };

  const generatePeriodOptions = (frequency: string) => {
  const options = [];
  const now = new Date();
  
  const freq = frequency.toUpperCase();
  
  if (freq === 'WEEKLY') {
    for (let i = 0; i < 8; i++) {
      const date = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnding = new Date(date.getTime() + (6 - date.getDay()) * 24 * 60 * 60 * 1000);
      const weekLabel = `Week ending ${weekEnding.toLocaleDateString()}`;
      options.push({ value: weekLabel, label: weekLabel });
    }
  } else if (freq === 'MONTHLY') {
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      options.push({ value: monthYear, label: monthYear });
    }
  } else if (freq === 'QUARTERLY') {
    for (let i = 0; i < 4; i++) {
      const year = now.getFullYear();
      const quarter = Math.floor(now.getMonth() / 3) + 1 - i;
      let adjustedQuarter = quarter;
      let adjustedYear = year;
      
      if (adjustedQuarter <= 0) {
        adjustedQuarter += 4;
        adjustedYear -= 1;
      }
      
      options.push({ value: `Q${adjustedQuarter} ${adjustedYear}`, label: `Q${adjustedQuarter} ${adjustedYear}` });
    }
  } else if (freq === 'BI-ANNUALLY' || freq === 'BI-ANNUAL' || freq === 'HALF-YEARLY') {
    for (let i = 0; i < 4; i++) {
      const year = now.getFullYear() - Math.floor(i / 2);
      const half = i % 2 === 0 ? 'H2' : 'H1';
      options.push({ value: `${half} ${year}`, label: `${half} ${year}` });
    }
  } else if (freq === 'ANNUALLY' || freq === 'YEARLY') {
    for (let i = 0; i < 3; i++) {
      const year = now.getFullYear() - i;
      options.push({ value: `${year}`, label: `${year}` });
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayLabel = date.toLocaleDateString();
      options.push({ value: dayLabel, label: dayLabel });
    }
  }
  
  return options;
};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>AI-Powered Reporting Engine</CardTitle>
            <CardDescription>
              {showProjectSelector 
                ? "Select a project, an audience, and provide context to generate a tailored narrative report."
                : `Generate a tailored narrative report for ${project?.title || selectedProjectData?.title}.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selection - only show if no project prop */}
            {showProjectSelector ? (
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
            ) : (
              <div className="space-y-2">
                <Label>Project</Label>
                <div className="p-3 border rounded-md bg-muted/50">
                  <div className="font-medium">{project?.title || selectedProjectData?.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {project?.code || selectedProjectData?.code} • {project?.status || selectedProjectData?.status}
                  </div>
                </div>
              </div>
            )}

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
          {/* Reporting Schedule Section */}
          {schedules.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reporting-schedule">Use Reporting Schedule (Optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} available
                  </span>
                </div>
                <Select 
                  onValueChange={handleScheduleSelect} 
                  value={selectedScheduleId}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger id="reporting-schedule">
                    <SelectValue placeholder="Select a reporting schedule..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Ad-hoc Report)</SelectItem>
                    {schedules.map(schedule => (
                      <SelectItem key={schedule.id} value={schedule.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{schedule.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getFrequencyDisplay(schedule.frequency)} • For: {schedule.recipient}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedScheduleId && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded-md">
                    ✓ Using "{schedules.find(s => s.id.toString() === selectedScheduleId)?.name}". 
                    Audience and context auto-filled.
                  </div>
                )}
              </div>
              {/* Reporting Period Selection (when using schedule) */}
              {selectedScheduleId && selectedScheduleId !== "" && selectedScheduleId !== "none" && reportingPeriod && reportingPeriod.trim() !== "" && (
                <div className="space-y-2">
                  <Label htmlFor="reporting-period">Reporting Period</Label>
                  <Select 
                    onValueChange={setReportingPeriod} 
                    value={reportingPeriod}
                  >
                    <SelectTrigger id="reporting-period">
                      <SelectValue placeholder="Select period..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Only render SelectItem if reportingPeriod is not empty */}
                      {reportingPeriod.trim() !== "" && (
                        <SelectItem value={reportingPeriod}>
                          {reportingPeriod}
                        </SelectItem>
                      )}
                      
                      {/* Additional quarterly options for QUARTERLY frequency */}
                      {(() => {
                        const selectedSchedule = schedules.find(s => s.id.toString() === selectedScheduleId);
                        if (!selectedSchedule || selectedSchedule.frequency.toUpperCase() !== 'QUARTERLY') {
                          return null;
                        }
                        
                        const now = new Date();
                        const options = [];
                        
                        // Generate quarterly options
                        for (let i = 1; i <= 4; i++) {
                          const year = now.getFullYear();
                          const currentYearOption = `Q${i} ${year}`;
                          const prevYearOption = `Q${i} ${year - 1}`;
                          
                          // Only add if not empty and not the current period
                          if (currentYearOption && currentYearOption.trim() !== "" && currentYearOption !== reportingPeriod) {
                            options.push({ value: currentYearOption, label: currentYearOption });
                          }
                          if (prevYearOption && prevYearOption.trim() !== "" && prevYearOption !== reportingPeriod) {
                            options.push({ value: prevYearOption, label: prevYearOption });
                          }
                        }
                        
                        // Remove duplicates
                        const uniqueOptions = Array.from(new Map(options.map(opt => [opt.value, opt])).values());
                        
                        return uniqueOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    The AI will structure this as a {getFrequencyDisplay(
                      schedules.find(s => s.id.toString() === selectedScheduleId)?.frequency || ''
                    ).toLowerCase()} report
                  </div>
                </div>
              )}
                          </div>
                        )}

          {/* Show message if no schedules exist */}
          {selectedProjectId && schedules.length === 0 && !isLoadingProjectData && (
            <div className="border-t pt-4">
              <div className="text-sm text-muted-foreground text-center p-3 border rounded-md">
                No reporting schedules configured for this project. 
                {/* <br />
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs"
                  // onClick={() => {
                  //   window.open(`/projects/${selectedProjectId}/settings#reporting`, '_blank');
                  // }}
                >
                  Add reporting schedules in Reporting Schedules
                </Button> */}
              </div>
            </div>
          )}
          <CardFooter className="flex-col md:flex-row gap-3">
            <div className="flex-1">
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
            </div>
            
            {/* Quick schedule buttons */}
            {schedules.length > 0 && !selectedScheduleId && (
              <div className="flex flex-wrap gap-2">
                <div className="text-xs text-muted-foreground self-center">Quick fill:</div>
                {schedules.slice(0, 3).map(schedule => (
                  <Button
                    key={schedule.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleScheduleSelect(schedule.id.toString())}
                  >
                    {schedule.name}
                  </Button>
                ))}
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
                  <div className="mb-4 space-y-2">
                    <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Generated for: {selectedProjectData?.title || project?.title}
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

                  {selectedScheduleId && (
                    <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 p-2 rounded-md">
                      <div className="font-medium">
                        {getFrequencyDisplay(schedules.find(s => s.id.toString() === selectedScheduleId)?.frequency || '')} Report
                      </div>
                      <div className="text-blue-600">•</div>
                      <div>For: {targetAudience}</div>
                      <div className="text-blue-600">•</div>
                      <div>Period: {reportingPeriod}</div>
                    </div>
                  )}
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
          {selectedProjectData || project ? (
            <div className="text-sm text-muted-foreground w-full">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Project:</span> {selectedProjectData?.title || project?.title}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedProjectData?.status || project?.status}
                </div>
                <div>
                  <span className="font-medium">Budget:</span> {selectedProjectData?.currency || 'USD'} {selectedProjectData?.financial_summary?.total_budget?.toLocaleString() || project?.budget?.toLocaleString() || '0'}
                </div>
                <div>
                  <span className="font-medium">Spent:</span> {selectedProjectData?.currency || 'USD'} {selectedProjectData?.financial_summary?.total_spent?.toLocaleString() || '0'}
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

export { ReportGenerator as ProjectReportGenerator };