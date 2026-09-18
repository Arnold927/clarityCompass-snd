'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Edit, ArrowLeft } from 'lucide-react';
import { ProjectEditor } from '@/components/projects/project-editor';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import api from "@/lib/api";
import type { TeamMember } from "@/lib/types";
import Link from 'next/link';
import { TeamManagement } from '@/components/projects/team-management';


interface Program {
  id: number;
  name: string;
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-48 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const ProjectOverviewTab = dynamic(() => import('@/components/projects/tabs/project-overview-tab').then(mod => mod.ProjectOverviewTab), { loading: () => <LoadingSkeleton /> });
const ProjectResultsFrameworkTab = dynamic(() => import('@/components/projects/tabs/project-results-framework-tab').then(mod => mod.ProjectResultsFrameworkTab), { loading: () => <LoadingSkeleton /> });
const ProjectActivitiesTab = dynamic(() => import('@/components/projects/tabs/project-activities-tab').then(mod => mod.ProjectActivitiesTab), { loading: () => <LoadingSkeleton /> });
const ProjectIndicatorsTab = dynamic(() => import('@/components/projects/tabs/project-indicators-tab').then(mod => mod.OutcomeOutputIndicatorsTab), { loading: () => <LoadingSkeleton /> });
// const ProjectTargetsTab = dynamic(() => import('@/components/projects/tabs/project-targets-tab').then(mod => mod.ProjectTargetsTab), { loading: () => <LoadingSkeleton /> });
const ProjectDataCollectionTab = dynamic(() => import('@/components/projects/tabs/project-data-collection-tab').then(mod => mod.ProjectDataCollectionTab), { loading: () => <LoadingSkeleton /> });
const ProjectTasksTab = dynamic(() => import('@/components/projects/tabs/project-tasks-tab').then(mod => mod.ProjectTasksTab), { loading: () => <LoadingSkeleton /> });
const ProjectQaTab = dynamic(() => import('@/components/projects/tabs/project-qa-tab').then(mod => mod.ProjectQaTab), { loading: () => <LoadingSkeleton /> });
const ProjectReportsTab = dynamic(() => import('@/components/projects/tabs/project-reports-tab').then(mod => mod.ProjectReportsTab), { loading: () => <LoadingSkeleton /> });
const ProjectEvaluationTab = dynamic(() => import('@/components/projects/tabs/project-evaluation-tab').then(mod => mod.ProjectEvaluationTab), { loading: () => <LoadingSkeleton /> });
const ProjectTorTab = dynamic(() => import('@/components/projects/tabs/project-tor-tab').then(mod => mod.ProjectTorTab), { loading: () => <LoadingSkeleton /> });

export default function ProjectDetailsPage() {
  const params = useParams();
  const [project, setProject] = useState<any>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const [availableDonors, setAvailableDonors] = useState<any[]>([]);

  const [indicators, setIndicators] = useState([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [activities, setActivities] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);



  useEffect(() => {
  const fetchData = async () => {
    try {
      const [programsRes, teamMembersRes, donorsRes] = await Promise.all([
          api.get("/programs/"),
          api.get(`/projects/${params.id}/team-members/`),  // <-- Use the project-specific endpoint
          api.get("/donors/"),
        ]);

      setPrograms(programsRes.data);
      setTeamMembers(teamMembersRes.data);
      setAvailableDonors(donorsRes.data);

      const projectRes = await api.get(`/projects/${params.id}/`);
      setProject(projectRes.data);

      const indicatorsRes = await api.get(
        `/projects/project-indicators/?project=${params.id}`
      );
      setIndicators(indicatorsRes.data);

      const projectTasksRes = await api.get(`/tasks/tasks/?project=${params.id}`);
console.log('Raw API response:', projectTasksRes.data); // Add this log

      // const projectTasksRes = await api.get(`/tasks/tasks/?project=${params.id}`);
      
      const mappedTasks = projectTasksRes.data.map((t: any) => ({
        ...t,
        startDate: t.start_date,
        endDate: t.end_date,
        indicatorData: t.indicatorData || {},
        qaAdjustments: t.qaAdjustments || {},
      }));
      
      setTasks(mappedTasks);

      const activitiesRes = await api.get(`/tasks/key-activities/?project=${params.id}`);
      setActivities(activitiesRes.data);

      const targetsRes = await api.get(`/projects/project-indicator-targets/?project=${params.id}`);
      setTargets(targetsRes.data);


    } catch (err) {
      console.error(err);
    }
  };

  fetchData();
}, [params.id]);

  const handleSaveProject = async (updatedProject: any) => {
    setIsEditorOpen(false); 
    try {
      const res = await api.put(`/projects/${project.id}/`, updatedProject);
      setProject(res.data);
      setIsEditorOpen(false);
    } catch (err) {
      console.error("Failed to save project", err);
    }
  };

  const handleSaveTask = (savedTask: any) => {
  setTasks(prev => {
    const exists = prev.some(t => t.id === savedTask.id);

    if (exists) {
      return prev.map(t => t.id === savedTask.id ? savedTask : t);
    }

    return [...prev, savedTask];
  });
};


  if (!project) {
    return (
      <AppLayout platform="ngo">
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <p>Loading project...</p>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{project.title}</h2>
            <p className="text-muted-foreground">Project Code: {project.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/projects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
            <Button onClick={() => setIsEditorOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resultsFramework">Results Framework</TabsTrigger>
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
            <TabsTrigger value="tor">Field Visit</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            {/* <TabsTrigger value="targets">Targets</TabsTrigger> */}
            <TabsTrigger value="dataCollection">Data Collection</TabsTrigger>
            <TabsTrigger value="tasks">Task Manager</TabsTrigger>
            {/* <TabsTrigger value="qa">Task QA</TabsTrigger> */}
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="evaluation">AI Evaluation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <ProjectOverviewTab project={project} setProject={setProject} />
          </TabsContent>
          <TabsContent value="resultsFramework">
            <ProjectResultsFrameworkTab project={project} setProject={setProject} />
          </TabsContent>
          <TabsContent value="activities">
            <ProjectActivitiesTab project={project} setProject={setProject} indicators={indicators} teamMembers={teamMembers} />
          </TabsContent>
          <TabsContent value="indicators">
            <ProjectIndicatorsTab project={project} setProject={setProject} />
          </TabsContent>
          {/* <TabsContent value="targets">
            <ProjectTargetsTab project={project} setProject={setProject} />
          </TabsContent> */}
          <TabsContent value="dataCollection">
            <ProjectDataCollectionTab project={project} />
          </TabsContent>
          <TabsContent value="tasks">
            <ProjectTasksTab project={project} setProject={setProject} tasks={tasks} onSaveTask={handleSaveTask}/>
          </TabsContent>
          <TabsContent value="tor">
            <ProjectTorTab project={project} setProject={setProject} tasks={tasks}/>
          </TabsContent>
          {/* <TabsContent value="qa">
            <ProjectQaTab 
              project={project} 
              setProject={setProject} 
              tasks={tasks} 
              indicators={indicators} 
              activities={activities} 
              indicatorTargets={targets} 
            />
          </TabsContent> */}

          <TabsContent value="reports" className="space-y-6">
            <ProjectReportsTab project={project} />
          </TabsContent>
          <TabsContent value="evaluation">
            <ProjectEvaluationTab project={project} />
          </TabsContent>
        </Tabs>
      </main>

      {isEditorOpen && (
        <ProjectEditor
          project={project}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveProject}
          availablePrograms={programs}
          availableTeamMembers={teamMembers}
          availableDonors={availableDonors}
        />
      )}
    </AppLayout>
  );
}
