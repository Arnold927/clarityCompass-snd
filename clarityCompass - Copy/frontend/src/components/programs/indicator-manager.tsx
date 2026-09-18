'use client';

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusCircle,
  Edit,
  Trash2,
  BarChart3,
  Target,
  Link,
  Unlink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAppPermissions } from "@/hooks/use-app-permissions";

interface IndicatorManagerProps {
  program: any;
  isOpen: boolean;
  onClose: () => void;
  strategicObjectives: any[];
}

export function IndicatorManager({
  program,
  isOpen,
  onClose,
  strategicObjectives,
}: IndicatorManagerProps) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [corporateIndicators, setCorporateIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIndicator, setEditingIndicator] = useState<any>(null);
  const [deletingIndicator, setDeletingIndicator] = useState<any>(null);
  const [formData, setFormData] = useState({
    corporate_indicator: "",
    name_override: "",
    description_override: "",
  });
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>("");
  const perms = useAppPermissions();
  const formRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isOpen && program) {
      fetchData();
    }
  }, [isOpen, program]);

  const fetchData = async () => {
  setLoading(true);
  try {
    const [indicatorsRes, corporateRes] = await Promise.all([
      api.get(`/programs/program-indicators/?program=${program.id}`),
      api.get("/strategic/indicators/"),
    ]);
    
    if (corporateRes.data) {
      if (Array.isArray(corporateRes.data)) {
        console.log('Data is directly an array, length:', corporateRes.data.length);
      }
    }

    const indicatorsData = indicatorsRes.data.results || indicatorsRes.data || [];
    
    const corpData = corporateRes.data.results || corporateRes.data || [];
    
    setIndicators(indicatorsData);
    setCorporateIndicators(Array.isArray(corpData) ? corpData : []);
    
    
  } catch (error: any) {
    toast.error("Failed to load data");
  } finally {
    setLoading(false);
  }
};

  const handleCreateIndicator = async () => {
  try {
    const corporateIndicatorValue = formData.corporate_indicator 
      ? parseInt(formData.corporate_indicator) 
      : null;

    const payload = {
      program: program.id,
      corporate_indicator: corporateIndicatorValue,
      name_override: formData.name_override || null,
      description_override: formData.description_override || null,
    };


    const res = await api.post("/programs/program-indicators/", payload);
    setIndicators([...indicators, res.data]);
    toast.success("Indicator created successfully!");
    resetForm();
  } catch (error: any) {
    console.error("Error creating indicator:", error);
    console.error("Error details:", error.response?.data);
    
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        toast.error(`Create failed: ${errorMessages}`);
      } else {
        toast.error(error.response.data?.detail || "Failed to create indicator");
      }
    } else {
      toast.error("Failed to create indicator");
    }
  }
};

  const handleUpdateIndicator = async () => {
  if (!editingIndicator) return;

  try {
    const corporateIndicatorValue = formData.corporate_indicator 
      ? parseInt(formData.corporate_indicator) 
      : null;

    const payload = {
      program: program.id,
      corporate_indicator: corporateIndicatorValue,
      name_override: formData.name_override || null,
      description_override: formData.description_override || null,
    };

    const res = await api.put(
      `/programs/program-indicators/${editingIndicator.id}/`,
      payload
    );
    
    
    setIndicators(
      indicators.map((ind) => (ind.id === res.data.id ? res.data : ind))
    );
    toast.success("Indicator updated successfully!");
    setEditingIndicator(null);
    resetForm();
  } catch (error: any) {
    console.error("Error updating indicator:", error);
    console.error("Error details:", error.response?.data);
    
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        toast.error(`Update failed: ${errorMessages}`);
      } else {
        toast.error(error.response.data?.detail || "Failed to update indicator");
      }
    } else {
      toast.error("Failed to update indicator");
    }
  }
};

  const handleDeleteIndicator = async () => {
    if (!deletingIndicator) return;
    
    try {
      await api.delete(`/programs/program-indicators/${deletingIndicator.id}/`);
      setIndicators(indicators.filter((ind) => ind.id !== deletingIndicator.id));
      toast.success("Indicator deleted successfully!");
    } catch (error) {
      console.error("Error deleting indicator:", error);
      toast.error("Failed to delete indicator");
    } finally {
      setDeletingIndicator(null);
    }
  };

  const resetForm = () => {
    setFormData({
      corporate_indicator: "",
      name_override: "",
      description_override: "",
    });
    setSelectedObjectiveId("");
  };

  const filteredCorporateIndicators = selectedObjectiveId
    ? corporateIndicators.filter(
        (ind) => ind.objective_id?.toString() === selectedObjectiveId
      )
    : corporateIndicators;

  const isFormValid = formData.corporate_indicator || formData.name_override;

  useEffect(() => {
    if (editingIndicator) {
      setFormData({
        corporate_indicator: editingIndicator.corporate_indicator?.toString() || "",
        name_override: editingIndicator.name_override || "",
        description_override: editingIndicator.description_override || "",
      });
      
      if (editingIndicator.strategic_objective_number) {
        const obj = strategicObjectives.find(
          (o) => o.number === editingIndicator.strategic_objective_number
        );
        if (obj) {
          setSelectedObjectiveId(obj.id.toString());
        }
      }
    }
  }, [editingIndicator, strategicObjectives]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Clear inner state before parent's onClose fires so Radix can
        // finish its focus-trap / pointer-events cleanup without the
        // AlertDialog still being mounted and open.
        setDeletingIndicator(null);
        setEditingIndicator(null);
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            M&E Framework: {program.name}
          </DialogTitle>
          <DialogDescription>
            Manage program indicators and link to corporate indicators and strategic objectives.
          </DialogDescription>
        </DialogHeader>

        {/* M&E Best Practice Summary */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-orange-700 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">
                  M&E Best Practices
                </p>
                <ul className="text-xs text-orange-700 mt-1 space-y-1">
                  <li>• Link program indicators to strategic objectives for alignment</li>
                  <li>• Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)</li>
                  <li>• Include both quantitative and qualitative indicators</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Create/Edit Form — Program Managers & M&E */}
          {perms.canManageIndicators && (
          <div ref={formRef} className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingIndicator ? "Edit Indicator" : "Add Indicator"}
                </CardTitle>
                <CardDescription>
                  {editingIndicator
                    ? "Update indicator details"
                    : "Create a new program indicator"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Link to Strategic Objective (Optional)</Label>
                  <Select
                    value={selectedObjectiveId || "none"}
                    onValueChange={(value) => {
                      setSelectedObjectiveId(value === "none" ? "" : value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select objective..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Custom Indicator)</SelectItem>
                      {strategicObjectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id.toString()}>
                          {obj.number}: {obj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Corporate Indicator (Optional)</Label>
                  <Select
                    value={formData.corporate_indicator || "custom"}
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        corporate_indicator: value === "custom" ? "" : value 
                      });
                    }}
                    disabled={!selectedObjectiveId && corporateIndicators.length > 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select corporate indicator..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Create custom indicator</SelectItem>
                      {filteredCorporateIndicators.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id.toString()}>
                          {ind.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {selectedObjectiveId
                      ? "Choose from corporate indicators aligned with selected objective"
                      : "Select a strategic objective first to see aligned corporate indicators"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Indicator Name {!formData.corporate_indicator && "*"}
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Number of beneficiaries trained"
                    value={formData.name_override}
                    onChange={(e) =>
                      setFormData({ ...formData, name_override: e.target.value })
                    }
                    disabled={!!formData.corporate_indicator}
                  />
                  {formData.corporate_indicator ? (
                    <p className="text-xs text-gray-500">
                      Name is inherited from corporate indicator
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Required for custom indicators
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this indicator measures..."
                    value={formData.description_override}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_override: e.target.value,
                      })
                    }
                    rows={3}
                    disabled={!!formData.corporate_indicator}
                  />
                  {formData.corporate_indicator && (
                    <p className="text-xs text-gray-500">
                      Description inherited from corporate indicator
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-4">
                  {editingIndicator ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingIndicator(null);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateIndicator}
                        disabled={!isFormValid}
                      >
                        Update Indicator
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleCreateIndicator}
                      disabled={!isFormValid}
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Indicator
                    </Button>
                  )}
                </DialogFooter>
              </CardContent>
            </Card>
          </div>
          )} {/* end perms.canManageIndicators */}

          {/* Right Column: Indicators List */}
          <div className={perms.canManageIndicators ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Program Indicators ({indicators.length})</CardTitle>
                    <CardDescription>
                      Indicators for monitoring program progress
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchData}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading indicators...</p>
                  </div>
                ) : indicators.length === 0 ? (
                  <div className="text-center py-8 border rounded">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">No indicators yet</p>
                    <p className="text-sm text-gray-400 mt-1 mb-4">
                      Add indicators to track program performance
                    </p>
                    {perms.canManageIndicators ? (
                      <Button onClick={() => {
                        resetForm();
                        setTimeout(() => {
                          formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                      }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create First Indicator
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Contact a Program Manager or M&amp;E officer to add indicators.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicator</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Strategic Link</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indicators.map((indicator) => (
                          <TableRow key={indicator.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {indicator.name_override ||
                                    indicator.corporate_indicator_name ||
                                    "Unnamed Indicator"}
                                </p>
                                {indicator.description_override && (
                                  <p className="text-sm text-gray-600">
                                    {indicator.description_override}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  indicator.corporate_indicator
                                    ? "bg-green-100 text-green-800"
                                    : "bg-orange-100 text-orange-800"
                                }`}
                              >
                                {indicator.corporate_indicator ? (
                                  <>
                                    <Link className="h-3 w-3 mr-1" />
                                    Linked
                                  </>
                                ) : (
                                  <>
                                    <Unlink className="h-3 w-3 mr-1" />
                                    Custom
                                  </>
                                )}
                              </span>
                            </TableCell>
                            <TableCell>
                              {indicator.strategic_objective_number ? (
                                <div className="text-sm">
                                  <span className="font-medium">
                                    SO {indicator.strategic_objective_number}
                                  </span>
                                  <p className="text-xs text-gray-500">
                                    {indicator.outcome_name}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Not linked
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {perms.canManageIndicators && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingIndicator(indicator)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingIndicator(indicator)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog — kept outside DialogContent to avoid
        nested Radix portals which break scroll-lock and pointer-events */}
    <AlertDialog
      open={!!deletingIndicator}
      onOpenChange={() => setDeletingIndicator(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Indicator</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this indicator? This action
            cannot be undone and will remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteIndicator}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}