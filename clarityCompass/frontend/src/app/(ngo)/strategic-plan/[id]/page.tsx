'use client';

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AppLayout from "@/components/layout/app-layout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, PlusCircle, List, Trash2, ArrowLeft } from "lucide-react";
import { StrategicPlanEditor } from "@/components/strategic-plan/strategic-plan-editor";
import api from "@/lib/api";
import { IndicatorEditor } from "@/components/strategic-plan/indicator-editor";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DisaggregatorManager } from "@/components/strategic-plan/disaggregator-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategicResultsFramework } from "@/components/strategic-plan/results-framework";
import { useRouter } from "next/navigation";

export default function StrategicPlanPage() {
  const router = useRouter();
  const { id } = useParams();
  const [plan, setPlan] = useState<any>(null);
  const [allDisaggregators, setAllDisaggregators] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  
  const [objectiveStatements, setObjectiveStatements] = useState<any[]>([]);

  const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const [isIndicatorEditorOpen, setIsIndicatorEditorOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<{ indicator: any; index: number } | null>(null);
  const [parentObjectiveForIndicator, setParentObjectiveForIndicator] = useState<any>(null);

  const [deletingIndicator, setDeletingIndicator] = useState<{ indicator: any; index: number; objectiveId: string } | null>(null);

  const [managingDisaggregatorsFor, setManagingDisaggregatorsFor] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planRes, disaggRes] = await Promise.allSettled([
          api.get(`/strategic/strategic-plan/${id}/`),
          api.get("/strategic/disaggregators/"),
        ]);

        if (planRes.status === "fulfilled") {
          const data = planRes.value.data;
          setPlan(data);
          setError(null);
        } else {
          console.warn("Strategic plan fetch failed:", planRes.reason);
          setPlan(null);
          setError("Unable to load strategic plan.");
        }

        if (disaggRes.status === "fulfilled") {
          setAllDisaggregators(disaggRes.value.data);
        } else {
          console.warn("Disaggregators fetch failed:", disaggRes.reason);
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        setError("An unexpected error occurred while loading data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchStatements = async () => {
      if (!plan?.strategicObjectives) return;
      
      try {
        const allStatementIds: number[] = [];
        plan.strategicObjectives.forEach((objective: any) => {
          if (objective.statements) {
            objective.statements.forEach((statement: any) => {
              if (statement.id) allStatementIds.push(statement.id);
            });
          }
        });
        
        if (allStatementIds.length > 0) {
          const response = await api.get(`/strategic/statements/`);
          const planStatements = response.data.filter((stmt: any) => 
            stmt.objective && plan.strategicObjectives.some((obj: any) => obj.id === stmt.objective.id)
          );
          setObjectiveStatements(planStatements);
        }
      } catch (error) {
        console.error("Error fetching statements:", error);
      }
    };
    
    fetchStatements();
  }, [plan]);

  interface ProjectIndicator {
    id: number;
    name: string;
    linked_corporate_indicator_name?: string | null;
  }

  const [projectIndicators, setProjectIndicators] = useState<ProjectIndicator[]>([]);

  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const res = await api.get("/projects/project-indicators/");
        setProjectIndicators(res.data);
      } catch (error) {
        console.error("Failed to fetch project indicators:", error);
      }
    };
    fetchIndicators();
  }, []);

  const handleSavePlan = async (updatedPlan: any) => {
    try {
      const res = await api.put(`/strategic/strategic-plan/${updatedPlan.id}/`, updatedPlan);
      setPlan(res.data);
      setIsPlanEditorOpen(false);
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

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
      console.error(" Error creating plan:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        fullError: error
      });
      
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

  const handleDeletePlan = async () => {
    const confirmed = confirm(
      "Are you sure you want to delete this strategic plan? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await api.delete(`/strategic/strategic-plan/${id}/`, {
        withCredentials: true,
      });

      router.push("/strategic-plan");
    } catch (error) {
      console.error("Error deleting strategic plan:", error);
      alert("Failed to delete strategic plan.");
    }
  };

  const handleOpenIndicatorEditor = (indicator: any, index: number, objective: any) => {
    setParentObjectiveForIndicator(objective);
    setEditingIndicator({ indicator, index });
    setIsIndicatorEditorOpen(true);
  };

  const handleOpenIndicatorCreator = (objective: any) => {
    setParentObjectiveForIndicator(objective);
    setEditingIndicator(null);
    setIsIndicatorEditorOpen(true);
  };

  const handleSaveIndicator = async (value: {
    name: string;
    description?: string;
    project_indicator?: any;
    statements?: number[];
  }) => {
    if (!parentObjectiveForIndicator) return;

    try {
      let updatedIndicator;
      
      const objectiveStatements = plan.strategicObjectives
        .find((obj: any) => obj.id === parentObjectiveForIndicator.id)
        ?.statements || [];
      
      const statementIds = value.statements || objectiveStatements.map((stmt: any) => stmt.id);

      if (editingIndicator) {
        const indicatorId = editingIndicator.indicator.id;
        const res = await api.put(`/strategic/indicators/${indicatorId}/`, {
          name: value.name,
          description: value.description,
          statement_ids: statementIds,
        });
        updatedIndicator = res.data;
      } else {
        const res = await api.post(`/strategic/indicators/`, {
          name: value.name,
          description: value.description,
          statement_ids: statementIds,
        });
        updatedIndicator = res.data;
      }

      if (value.project_indicator?.id) {
        await api.patch(`/projects/project-indicators/${value.project_indicator.id}/`, {
          corporate_indicator: updatedIndicator.id,
        });

        setProjectIndicators(prev =>
          prev.map(pi =>
            pi.id === value.project_indicator.id
              ? { ...pi, linked_corporate_indicator_name: updatedIndicator.name }
              : pi
          )
        );
      }

      const updatedPlan = { ...plan };
      
      statementIds.forEach((statementId: number) => {
        updatedPlan.strategicObjectives.forEach((obj: any) => {
          if (obj.statements) {
            obj.statements.forEach((stmt: any) => {
              if (stmt.id === statementId) {
                if (!stmt.corporateIndicators) {
                  stmt.corporateIndicators = [];
                }
                const existingIndex = stmt.corporateIndicators.findIndex((ind: any) => ind.id === updatedIndicator.id);
                if (existingIndex === -1) {
                  stmt.corporateIndicators.push(updatedIndicator);
                } else {
                  stmt.corporateIndicators[existingIndex] = updatedIndicator;
                }
              }
            });
          }
        });
      });

      setPlan(updatedPlan);

      setIsIndicatorEditorOpen(false);
      setEditingIndicator(null);
      setParentObjectiveForIndicator(null);
    } catch (error: any) {
      console.error("Failed to save indicator:", error);
      console.error("Error response:", error.response?.data);
      alert(`Error saving indicator: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDeleteIndicator = async () => {
    if (!deletingIndicator) return;
    const { objectiveId, index, indicator } = deletingIndicator;

    try {
      if (indicator.id) {
        await api.delete(`/strategic/indicators/${indicator.id}/`)
      }
    
      const updatedPlan = { ...plan };
      updatedPlan.strategicObjectives.forEach((obj: any) => {
        if (obj.statements) {
          obj.statements.forEach((stmt: any) => {
            if (stmt.corporateIndicators) {
              stmt.corporateIndicators = stmt.corporateIndicators.filter((ind: any) => ind.id !== indicator.id);
            }
          });
        }
      });

      setPlan(updatedPlan);
    } catch (error) {
      console.error("Failed to delete indicator:", error);
    } finally {
      setDeletingIndicator(null);
    }
  };

  const handleOpenDisaggregatorManager = (indicator: any, objective: any) => {
    setParentObjectiveForIndicator(objective);

    const normalizedDisaggregators =
      indicator.disaggregators?.map((d: any) =>
        typeof d === "object"
          ? d
          : allDisaggregators.find((a) => a.id === d)
      ) || [];

    setManagingDisaggregatorsFor({
      ...indicator,
      disaggregators: normalizedDisaggregators.filter(Boolean),
    });
  };

  const handleSaveDisaggregators = async (selectedNames: string[]) => {
      if (!managingDisaggregatorsFor || !parentObjectiveForIndicator) return;

      try {
          const selectedIds = selectedNames.map(
              name => allDisaggregators.find(d => d.name === name)!.id
          );

          const currentIndicator = managingDisaggregatorsFor;
          
          const statementIds = currentIndicator.statements?.map((stmt: any) => 
              typeof stmt === 'object' ? stmt.id : stmt
          ) || [];
          
          if (statementIds.length === 0) {
              const indicatorRes = await api.get(`/strategic/indicators/${managingDisaggregatorsFor.id}/`);
              const fullIndicator = indicatorRes.data;
              
              if (fullIndicator.statements) {
                  statementIds.push(...fullIndicator.statements.map((stmt: any) => stmt.id));
              }
          }

          await api.patch(`/strategic/indicators/${managingDisaggregatorsFor.id}/`, {
              disaggregator_ids: selectedIds,
              name: managingDisaggregatorsFor.name,
              // statement_ids: statementIds,
          });

          const res = await api.get(`/strategic/indicators/${managingDisaggregatorsFor.id}/`);
          const updatedIndicator = res.data;

          const updatedPlan = { ...plan };
          updatedPlan.strategicObjectives.forEach((obj: any) => {
              if (obj.statements) {
                  obj.statements.forEach((stmt: any) => {
                      if (stmt.corporateIndicators) {
                          const index = stmt.corporateIndicators.findIndex((ind: any) => ind.id === updatedIndicator.id);
                          if (index !== -1) {
                              stmt.corporateIndicators[index] = updatedIndicator;
                          }
                      }
                  });
              }
          });

          setPlan(updatedPlan);
          setManagingDisaggregatorsFor(null);
          setParentObjectiveForIndicator(null);
      } catch (error) {
          console.error("Failed to save disaggregators:", error);
      }
  };

  const handleAddNewDisaggregator = async (newDisaggregator: string) => {
    if (!allDisaggregators.some(d => d.name === newDisaggregator)) {
      try {
        const res = await api.post("/strategic/disaggregators/", { name: newDisaggregator });
        const savedDisaggregator = res.data;

        setAllDisaggregators([...allDisaggregators, savedDisaggregator]);

        setManagingDisaggregatorsFor((prev: any) => ({
          ...prev,
          disaggregators: [...prev.disaggregators, savedDisaggregator],
        }));
      } catch (error) {
        console.error("Failed to add new disaggregator:", error);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout platform="ngo">
        <main className="flex-1 flex items-center justify-center p-8">
          <p className="text-gray-500">Loading Strategic Plan...</p>
        </main>
      </AppLayout>
    );
  }

  if (error && !plan) {
    return (
      <AppLayout platform="ngo">
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 mt-10 mx-6">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Strategic Plan Not Found</h2>
            <p className="text-gray-500 mb-6">
              {error || "The strategic plan you're looking for doesn't exist."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => router.push("/strategic-plan")}>
                View All Plans
              </Button>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout platform="ngo">
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 mt-10 mx-6">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Strategic Plan Found</h2>
            <p className="text-gray-500 mb-6">
              The requested strategic plan could not be loaded.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => setIsCreatingPlan(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Plan
              </Button>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/strategic-plan")}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Strategic Planning</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/strategic-plan")}
                className="hidden md:flex items-center gap-2 -ml-3 mt-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Plans
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsCreatingPlan(true)}>
              <PlusCircle className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Create New Plan</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="plan">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="plan">Plan Details</TabsTrigger>
            <TabsTrigger value="framework">Results Framework</TabsTrigger>
          </TabsList>

          <TabsContent value="plan">
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{plan.title} (v{plan.version})</CardTitle>
                  <CardDescription>
                    Running from {plan.start_date} to {plan.end_date}
                    {plan.is_active && <Badge className="ml-2">Active</Badge>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsPlanEditorOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Plan Details
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeletePlan}
                  >
                    Delete Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Overall Objective (Impact)</h3>
                <p className="text-muted-foreground mb-6">{plan.overall_objective}</p>

                <h3 className="font-semibold text-lg mb-4">Strategic Objectives</h3>
                {plan.strategicObjectives && plan.strategicObjectives.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {plan.strategicObjectives.map((objective: any) => (
                      <AccordionItem key={objective.id} value={objective.id.toString()}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-4">
                            <Badge variant="secondary">{objective.number}</Badge>
                            <span className="font-semibold text-left">{objective.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {objective.statements?.length || 0} statements
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-12 space-y-4">
                          <p className="text-muted-foreground">{objective.description}</p>
                          
                          {/* Show statements */}
                          {objective.statements && objective.statements.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Objective Statements</h4>
                              <div className="space-y-2 mb-4">
                                {objective.statements.map((statement: any) => (
                                  <div key={statement.id} className="border-l-2 border-blue-200 pl-3 py-1">
                                    <p className="text-sm">{statement.text}</p>
                                    {statement.corporateIndicators?.length > 0 && (
                                      <div className="mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {statement.corporateIndicators.length} indicator(s)
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Corporate Indicators Section */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-sm">Corporate Indicators</h4>
                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenIndicatorCreator(objective)}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Indicator
                              </Button> */}
                            </div>
                            
                            {/* Show indicators linked to this objective's statements */}
                            {objective.statements && objective.statements.some((stmt: any) => 
                              stmt.corporateIndicators && stmt.corporateIndicators.length > 0
                            ) ? (
                              <div className="space-y-3">
                                {objective.statements.flatMap((statement: any) => 
                                  (statement.corporateIndicators || []).map((indicator: any, index: number) => (
                                    <div key={indicator.id} className="border rounded-lg p-3 bg-white shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">{indicator.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              Indicator
                                            </Badge>
                                            <Badge variant="secondary" className="text-xs">
                                              Linked to: Statement
                                            </Badge>
                                          </div>
                                          
                                          <p className="text-xs text-muted-foreground mb-2">
                                            Statement: {statement.text.substring(0, 100)}...
                                          </p>
                                          
                                          {indicator.disaggregators?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                                                  Disaggregators
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  ({indicator.disaggregators.length})
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap gap-1">
                                                {indicator.disaggregators
                                                  .map((d: any) => typeof d === "string" ? d : d.name)
                                                  .map((name: string, idx: number) => (
                                                    <Badge 
                                                      key={idx} 
                                                      variant="outline" 
                                                      className="text-xs bg-gray-50"
                                                    >
                                                      {name}
                                                    </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center space-x-1 ml-4">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleOpenDisaggregatorManager(indicator, objective)}
                                            title="Manage Disaggregators"
                                          >
                                            <List className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleOpenIndicatorEditor(indicator, index, objective)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                              setDeletingIndicator({ indicator, index, objectiveId: objective.id })
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No indicators added to statements yet.</p>
                            )}
                          </div>
                          
                          {/* Also show direct indicators on objective (legacy support) */}
                          {objective.corporateIndicators && objective.corporateIndicators.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-sm mb-2">Direct Corporate Indicators</h4>
                              <div className="space-y-3">
                                {objective.corporateIndicators.map((indicator: any, index: number) => (
                                  <div key={indicator.id} className="border rounded-lg p-3 bg-white shadow-sm">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium">{indicator.name}</span>
                                          <Badge variant="outline" className="text-xs">
                                            Indicator
                                          </Badge>
                                          <Badge variant="secondary" className="text-xs">
                                            Direct on Objective
                                          </Badge>
                                        </div>
                                        
                                        {indicator.disaggregators?.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-gray-100">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                                                Disaggregators
                                              </Badge>
                                              <span className="text-xs text-muted-foreground">
                                                ({indicator.disaggregators.length})
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {indicator.disaggregators
                                                .map((d: any) => typeof d === "string" ? d : d.name)
                                                .map((name: string, idx: number) => (
                                                  <Badge 
                                                    key={idx} 
                                                    variant="outline" 
                                                    className="text-xs bg-gray-50"
                                                  >
                                                    {name}
                                                  </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center space-x-1 ml-4">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleOpenDisaggregatorManager(indicator, objective)}
                                          title="Manage Disaggregators"
                                        >
                                          <List className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleOpenIndicatorEditor(indicator, index, objective)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() =>
                                            setDeletingIndicator({ indicator, index, objectiveId: objective.id })
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-muted-foreground">No strategic objectives defined yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="framework">
            <StrategicResultsFramework plan={plan} setPlan={setPlan} />
          </TabsContent>
        </Tabs>

        {isPlanEditorOpen && (
          <StrategicPlanEditor
            plan={plan}
            isOpen={isPlanEditorOpen}
            onClose={() => setIsPlanEditorOpen(false)}
            onSave={handleSavePlan}
          />
        )}

        {isCreatingPlan && (
          <StrategicPlanEditor
            plan={null}
            isOpen={isCreatingPlan}
            onClose={() => setIsCreatingPlan(false)}
            onSave={handleSaveNewPlan}
          />
        )}

        {(isIndicatorEditorOpen || (editingIndicator && parentObjectiveForIndicator)) && (
          <IndicatorEditor
            isOpen={isIndicatorEditorOpen}
            indicator={editingIndicator?.indicator || null}
            projectIndicators={projectIndicators || []}
            objectiveStatements={objectiveStatements}
            parentStatementId={undefined}
            onClose={() => {
              setIsIndicatorEditorOpen(false);
              setEditingIndicator(null);
              setParentObjectiveForIndicator(null);
            }}
            onSave={handleSaveIndicator}
            title={editingIndicator ? "Edit Indicator" : "Add New Indicator"}
          />
        )}

        {deletingIndicator && (
          <AlertDialog open={!!deletingIndicator} onOpenChange={() => setDeletingIndicator(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the indicator: "
                  {deletingIndicator.indicator.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingIndicator(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteIndicator}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {managingDisaggregatorsFor && parentObjectiveForIndicator && (
          <DisaggregatorManager
            isOpen={!!managingDisaggregatorsFor}
            onClose={() => {
              setManagingDisaggregatorsFor(null);
              setParentObjectiveForIndicator(null);
            }}
            onSave={handleSaveDisaggregators}
            onAddNew={handleAddNewDisaggregator}
            availableDisaggregators={allDisaggregators}
            selectedDisaggregators={managingDisaggregatorsFor.disaggregators.map((d: any) => d.name)}
            indicatorName={managingDisaggregatorsFor.name}
          />
        )}
      </main>
    </AppLayout>
  );
}


