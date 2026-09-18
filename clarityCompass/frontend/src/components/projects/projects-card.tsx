'use client';

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronUp,
  GanttChart,
  Calendar,
  CheckCircle,
  Circle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import api from "@/lib/api";
import { ActivitiesModal } from "@/components/projects/activities-modal"; 

interface KeyActivity {
  id: number;
  title: string;
  description: string;
  is_completed: boolean;
  due_date: string;
  created_at: string;
}

interface Project {
  id: number;
  title: string;
  code: string;
  description: string;
  key_activities: KeyActivity[];
}

interface DashboardStats {
  active_projects_count?: number;
  active_donors_count?: number;
  completed_activities_count?: number;
  pending_activities_count?: number;
  active_projects?: Project[];
}

const ProjectsCard = () => {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<number[]>([]);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/dashboard/stats/');
      setStats(response.data);
      
      if (response.data.active_projects?.[0]?.id) {
        setExpandedProjects([response.data.active_projects[0].id]);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load projects data');
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleManageActivities = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProject(project);
    setShowActivitiesModal(true);
  };

  const handleModalClose = () => {
    setShowActivitiesModal(false);
    setSelectedProject(null);
    fetchDashboardStats();
  };

  const getProjectProgress = (project: Project) => {
    const totalActivities = project.key_activities.length;
    const completedActivities = project.key_activities.filter(a => a.is_completed).length;
    return totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
  };

  const getUpcomingActivities = (project: Project) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return project.key_activities.filter(activity => {
      if (activity.is_completed) return false;
      const dueDate = new Date(activity.due_date);
      return dueDate <= nextWeek && dueDate >= today;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getActivityStatus = (activity: KeyActivity) => {
    const dueDate = new Date(activity.due_date);
    const today = new Date();
    
    if (activity.is_completed) return 'completed';
    if (dueDate < today) return 'overdue';
    if (dueDate <= new Date(today.setDate(today.getDate() + 3))) return 'due-soon';
    return 'upcoming';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'due-soon':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      case 'due-soon':
        return 'Due Soon';
      default:
        return 'Upcoming';
    }
  };

  const projectsToShow = showAllProjects 
    ? stats.active_projects || []
    : (stats.active_projects || []).slice(0, 3);

  if (loading) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GanttChart className="h-5 w-5" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Loading projects...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GanttChart className="h-5 w-5" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">Unable to load projects: {error}</p>
          <Button onClick={fetchDashboardStats} variant="outline" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GanttChart className="h-5 w-5" />
                Active Projects ({stats.active_projects_count || 0})
              </CardTitle>
              <CardDescription>
                Track key activities and their statuses across all active projects
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">
                View All Projects
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projectsToShow.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active projects found
            </div>
          ) : (
            <div className="space-y-4">
              {projectsToShow.map((project) => {
                const progress = getProjectProgress(project);
                const upcomingActivities = getUpcomingActivities(project);
                const isExpanded = expandedProjects.includes(project.id);

                return (
                  <Collapsible
                    key={project.id}
                    open={isExpanded}
                    onOpenChange={() => toggleProject(project.id)}
                    className="border rounded-lg"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{project.title}</h3>
                            <Badge variant="outline" className="font-mono">
                              {project.code}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {project.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Progress:</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Activities:</span>
                              <span className="font-medium">
                                {project.key_activities.filter(a => a.is_completed).length} / {project.key_activities.length}
                              </span>
                            </div>
                            {upcomingActivities.length > 0 && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span className="text-amber-600">{upcomingActivities.length} due soon</span>
                              </div>
                            )}
                          </div>
                          <Progress value={progress} className="mt-3 h-2" />
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t p-4 bg-muted/20">
                        <h4 className="font-medium mb-3">Key Activities</h4>
                        {project.key_activities.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No key activities defined for this project
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {project.key_activities.map((activity) => {
                              const status = getActivityStatus(activity);
                              
                              return (
                                <div
                                  key={activity.id}
                                  className="flex items-start justify-between p-3 bg-white rounded-lg border"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getStatusIcon(status)}
                                      <span className="font-medium">{activity.title}</span>
                                      <Badge
                                        variant={
                                          status === 'completed'
                                            ? 'default'
                                            : status === 'overdue'
                                            ? 'destructive'
                                            : status === 'due-soon'
                                            ? 'secondary'
                                            : 'outline'
                                        }
                                        className="text-xs"
                                      >
                                        {getStatusText(status)}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {activity.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Due: {formatDate(activity.due_date)}</span>
                                      </div>
                                      {activity.is_completed && (
                                        <div className="flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          <span>Completed</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-4 flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => handleManageActivities(e, project)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Manage Activities
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {(stats.active_projects?.length || 0) > 3 && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    variant="outline"
                    size="sm"
                  >
                    {showAllProjects ? 'Show Less' : `View All ${stats.active_projects?.length} Projects`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <ActivitiesModal
          project={selectedProject}
          isOpen={showActivitiesModal}
          onClose={handleModalClose}
          onUpdate={fetchDashboardStats}
        />
      )}
    </>
  );
};

export { ProjectsCard };