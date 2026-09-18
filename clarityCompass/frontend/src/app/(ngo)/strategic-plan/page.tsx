'use client';

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/app-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle,
  Calendar, 
  Eye, 
  Edit, 
  Archive, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  Target,
  BarChart3,
  Download,
  Copy,
  Star,
  StarOff,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format, isBefore, isAfter } from "date-fns";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StrategicPlanEditor } from "@/components/strategic-plan/strategic-plan-editor";

interface StrategicPlan {
  id: number;
  title: string;
  version: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  overall_objective: string;
  created_at: string;
  updated_at: string;
  strategicObjectives?: any[];
  is_favorite?: boolean;
}

type PlanStatus = 'active' | 'upcoming' | 'completed' | 'archived' | 'all';

export default function StrategicPlanListPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<StrategicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'recent'>('recent');

  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const handleSaveNewPlan = async (newPlan: any) => {
    try {
      const payload = {
        title: newPlan.title,
        version: newPlan.version || "1.0",
        start_date: newPlan.start_date,
        end_date: newPlan.end_date,
        is_active: newPlan.isActive || true,
        overall_objective: newPlan.overall_objective || newPlan.overallObjective || "",
      };
      
      const res = await api.post("/strategic/strategic-plan/", payload);
      
      router.push(`/strategic-plan/${res.data.id}`);
      setIsCreatingPlan(false);
    } catch (error: any) {
      console.error("Error creating plan:", error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          alert(`Validation errors:\n${errorMessages}`);
        } else if (typeof errorData === 'string') {
          alert(errorData);
        } else {
          alert('Failed to create plan. Please check your inputs.');
        }
      } else {
        alert('Network error. Please check your connection and try again.');
      }
    }
  };  

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get("/strategic/strategic-plan/");
        const plansData = response.data.results || response.data;
        
        setPlans(plansData);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch strategic plans:", err);
        setError("Failed to load strategic plans. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const getPlanStatus = (plan: StrategicPlan) => {
    const today = new Date();
    const startDate = new Date(plan.start_date);
    const endDate = new Date(plan.end_date);

    if (!plan.is_active) return { label: "Archived", color: "bg-gray-500", textColor: "text-gray-700", icon: Archive };
    if (isBefore(today, startDate)) return { label: "Upcoming", color: "bg-blue-500", textColor: "text-blue-700", icon: Clock };
    if (isAfter(today, endDate)) return { label: "Completed", color: "bg-green-500", textColor: "text-green-700", icon: CheckCircle };
    return { label: "Active", color: "bg-white-600", textColor: "text-green-700", icon: CheckCircle };
  };

  const filteredPlans = useMemo(() => {
    let filtered = [...plans];

    if (searchQuery) {
      filtered = filtered.filter(plan =>
        plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.overall_objective.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    filtered.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return 0;
    });

    return filtered;
  }, [plans, searchQuery, sortBy]);

  const toggleFavorite = async (planId: number) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId ? { ...plan, is_favorite: !plan.is_favorite } : plan
    ));
  };

  const duplicatePlan = async (plan: StrategicPlan) => {
    try {
      const { id, created_at, updated_at, ...planData } = plan;
      const newPlan = {
        ...planData,
        title: `${plan.title} (Copy)`,
        version: `${plan.version}.1`,
        is_active: false,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      };
      
      const response = await api.post("/strategic/strategic-plan/", newPlan);
      router.push(`/strategic-plan/${response.data.id}`);
    } catch (err) {
      console.error("Failed to duplicate plan:", err);
      alert("Failed to duplicate plan. Please try again.");
    }
  };

  const exportPlan = (plan: StrategicPlan) => {
    const data = {
      title: plan.title,
      version: plan.version,
      period: `${formatDate(plan.start_date)} - ${formatDate(plan.end_date)}`,
      objectives: plan.strategicObjectives?.length || 0,
      status: getPlanStatus(plan).label,
      created: formatDate(plan.created_at),
    };
    
    alert(`Exporting ${plan.title}... (Check console for details)`);
  };

  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => getPlanStatus(p).label === 'Active').length;
    const upcoming = plans.filter(p => getPlanStatus(p).label === 'Upcoming').length;
    const completed = plans.filter(p => getPlanStatus(p).label === 'Completed').length;
    const archived = plans.filter(p => getPlanStatus(p).label === 'Archived').length;
    
    return { total, active, upcoming, completed, archived };
  }, [plans]);

  if (loading) {
    return (
      <AppLayout platform="ngo">
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Strategic Plans</h2>
              <p className="text-muted-foreground">
                Loading your strategic planning cycles...
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Strategic Plans</h2>
            <p className="text-muted-foreground">
              Manage your organization's strategic planning cycles
            </p>
          </div>
          <Button onClick={() => setIsCreatingPlan(true)} className="w-full md:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
              Create New Plan
          </Button>
        </div>

        {/* Filters Section */}
        <div className="bg-white border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plans by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value: 'date' | 'title' | 'recent') => setSortBy(value)}>
              <SelectTrigger>
                <BarChart3 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="date">Start Date</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {/* Stats Summary */}
            <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">{plans.length}</span>
                <span>Total Plans</span>
              </div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
                <span>{stats.active}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                <span>{stats.upcoming}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Unable to Load Plans</h3>
                <p className="text-red-600">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Plans List */}
        {filteredPlans.length > 0 ? (
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* List Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-sm font-medium text-gray-600">
              <div className="col-span-5">Plan Title</div>
              <div className="col-span-2">Period</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Objectives</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* List Items */}
            <div className="divide-y">
              {filteredPlans.map((plan) => {
                const status = getPlanStatus(plan);
                const StatusIcon = status.icon;
                const isActivePlan = plan.is_active;

                return (
                  <div 
                    key={plan.id} 
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center"
                  >
                    {/* Plan Title */}
                    <div className="col-span-5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleFavorite(plan.id)}
                          className="text-gray-300 hover:text-yellow-500 transition-colors"
                        >
                          {plan.is_favorite ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {plan.title}
                            {/* {isActivePlan && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                Active
                              </span>
                            )} */}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {plan.overall_objective}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>v{plan.version}</span>
                            <span>•</span>
                            <span>Created {formatDate(plan.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Period */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <Badge className={`${status.color} ${status.textColor} border-0 gap-1.5`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>

                    {/* Objectives */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          {plan.strategicObjectives?.length || 0} objectives
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/strategic-plan/${plan.id}`)}
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/strategic-plan/${plan.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFavorite(plan.id)}>
                              {plan.is_favorite ? (
                                <>
                                  <StarOff className="h-4 w-4 mr-2" />
                                  Remove from Favorites
                                </>
                              ) : (
                                <>
                                  <Star className="h-4 w-4 mr-2" />
                                  Add to Favorites
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicatePlan(plan)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportPlan(plan)}>
                              <Download className="h-4 w-4 mr-2" />
                              Export Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <ChevronRight 
                          className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" 
                          onClick={() => router.push(`/strategic-plan/${plan.id}`)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white border rounded-lg text-center py-16">
            <div className="space-y-6 max-w-md mx-auto">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">No Strategic Plans Found</h3>
                <p className="text-muted-foreground mt-2">
                  {searchQuery
                    ? "No plans match your search. Try different keywords."
                    : "Start by creating your first strategic plan to define your organization's goals."}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                {searchQuery ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </Button>
                ) : null}
                <Button onClick={() => setIsCreatingPlan(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create First Plan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Info */}
        {filteredPlans.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Showing {filteredPlans.length} of {plans.length} strategic plans
          </div>
        )}
        {isCreatingPlan && (
          <StrategicPlanEditor
            plan={null}
            isOpen={isCreatingPlan}
            onClose={() => setIsCreatingPlan(false)}
            onSave={handleSaveNewPlan}
          />
        )}
      </main>
    </AppLayout>
  );
}