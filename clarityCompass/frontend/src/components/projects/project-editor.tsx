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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import api from "@/lib/api";

interface Program {
  id: number;
  name: string;
}

interface ProjectEditorProps {
  project: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: any) => void;
  availablePrograms: Program[];
  availableTeamMembers: TeamMember[];
  availableDonors: any[];
}

interface ProjectState {
  id: number | string;
  code: string;
  title: string;
  program: string;
  budget: number | null;
  currency: string;
  manager?: number | { id: number; name?: string } | null;
  team: TeamMember[];
  startDate: string;
  endDate: string;
  is_active?: boolean;
  lifecycle_status: string;
  health_status: string;
}

interface FormErrors {
  code?: string;
  title?: string;
  program?: string;
  manager?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  general?: string;
}

const LIFECYCLE_CHOICES = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const HEALTH_CHOICES = [
  { value: "ON_TRACK", label: "On-track" },
  { value: "AT_RISK", label: "At risk" },
  { value: "OFF_TRACK", label: "Off-track" },
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar (USD)", symbol: "$" },
  { value: "EUR", label: "Euro (EUR)", symbol: "€" },
  { value: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { value: "KES", label: "Kenyan Shilling (KES)", symbol: "KSh" },
  { value: "UGX", label: "Ugandan Shilling (UGX)", symbol: "USh" },
  { value: "TZS", label: "Tanzanian Shilling (TZS)", symbol: "TSh" },
  { value: "ETB", label: "Ethiopian Birr (ETB)", symbol: "Br" },
  { value: "ZAR", label: "South African Rand (ZAR)", symbol: "R" },
  { value: "NGN", label: "Nigerian Naira (NGN)", symbol: "₦" },
  { value: "GHS", label: "Ghanaian Cedi (GHS)", symbol: "GH₵" },
];

const emptyProject: ProjectState = {
  id: "",
  code: "",
  title: "",
  program: "",
  budget: null,
  currency: "USD",
  manager: null,
  team: [],
  startDate: "",
  endDate: "",
  is_active: true,
  lifecycle_status: "PLANNED",
  health_status: "ON_TRACK",
};

export function ProjectEditor({
  project,
  isOpen,
  onClose,
  onSave,
  availablePrograms = [],
  availableTeamMembers = [],
  availableDonors = [],
}: ProjectEditorProps) {
  const [currentProject, setCurrentProject] = useState<ProjectState>(emptyProject);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localDonors, setLocalDonors] = useState<string[]>([]);
  const [donorsList, setDonorsList] = useState<any[]>(availableDonors);
  const [isAddingDonor, setIsAddingDonor] = useState(false);
  const [newDonorName, setNewDonorName] = useState("");

  const getInitialProgram = () => {
    if (!project) return "";
    if (typeof project.program === "object" && project.program !== null && "id" in project.program) {
      return String(project.program.id);
    }
    return String(project.program || "");
  };

  const getInitialManager = (): string => {
    if (!project) return "";
    if (project.manager && typeof project.manager === "object" && "id" in project.manager) {
      return String(project.manager.id);
    }
    return project.manager ? String(project.manager) : "";
  };

  const getInitialLifecycle = () => project?.lifecycle_status || "PLANNED";
  const getInitialHealth = () => project?.health_status || "ON_TRACK";

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = CURRENCY_OPTIONS.find(c => c.value === currencyCode);
    return currency ? currency.symbol : currencyCode;
  };

  const formatBudget = (budget: number | null) => {
    if (budget === null || budget === undefined) return "";
    const symbol = getCurrencySymbol(currentProject.currency);
    return `${symbol} ${budget.toLocaleString()}`;
  };

  useEffect(() => {
    if (!project) {
      setCurrentProject(emptyProject);
      setLocalDonors([]);
      setFormErrors({});
      return;
    }
    
    const initialProject: ProjectState = {
      ...emptyProject,
      ...project,
      program: getInitialProgram(),
      manager: getInitialManager(),
      lifecycle_status: getInitialLifecycle(),
      health_status: getInitialHealth(),
      budget: project.budget ?? null,
      currency: project.currency || "USD",
      team: project.team || [],
      startDate: project.start_date ? project.start_date.split("T")[0] : "",
      endDate: project.end_date ? project.end_date.split("T")[0] : "",
       is_active: project.is_active ?? true,
    };
    
    setCurrentProject(initialProject);
    setDonorsList(availableDonors);
    setLocalDonors(project?.donors?.map((d: any) => String(d.id)) || []);
    setFormErrors({});
  }, [project, isOpen, availableDonors]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!currentProject.code?.trim()) {
      errors.code = "Project code is required";
    }

    if (!currentProject.title?.trim()) {
      errors.title = "Project title is required";
    }

    if (!currentProject.program) {
      errors.program = "Program selection is required";
    }

    if (!currentProject.manager) {
      errors.manager = "Project manager is required";
    }

    if (currentProject.startDate && currentProject.endDate) {
      const startDate = new Date(currentProject.startDate);
      const endDate = new Date(currentProject.endDate);
      
      if (startDate > endDate) {
        errors.endDate = "End date must be after start date";
      }
    }

    if (currentProject.budget !== null) {
      if (currentProject.budget < 0) {
        errors.budget = "Budget cannot be negative";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setCurrentProject(prev => ({ ...prev, [field]: value }));
    
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBudgetChange = (value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    setCurrentProject(prev => ({ ...prev, budget: numValue }));
    
    if (formErrors.budget) {
      setFormErrors(prev => ({ ...prev, budget: undefined }));
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setCurrentProject(prev => ({ ...prev, [field]: value }));
    
    if (formErrors.startDate || formErrors.endDate) {
      setFormErrors(prev => ({ 
        ...prev, 
        startDate: undefined, 
        endDate: undefined 
      }));
    }
  };

  const handleSave = async () => {
    setFormErrors({});
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedTeam = [...(currentProject.team || availableTeamMembers)];
      const newManagerId = currentProject.manager ? Number(currentProject.manager) : null;
      const oldManagerId = project?.manager ? Number(project.manager) : null;

      if (newManagerId && newManagerId !== oldManagerId) {
        const newIndex = updatedTeam.findIndex(m => Number(m.id) === newManagerId);
        if (newIndex > -1) updatedTeam[newIndex] = { ...updatedTeam[newIndex], role: "PROJECT_MANAGER" };

        if (oldManagerId) {
          const oldIndex = updatedTeam.findIndex(m => Number(m.id) === oldManagerId);
          if (oldIndex > -1) updatedTeam[oldIndex] = { ...updatedTeam[oldIndex], role: "VIEWER" };
        }
      }

      const payload = {
        code: currentProject.code || "",
        title: currentProject.title || "",
        program: currentProject.program ? Number(currentProject.program) : null,
        manager: newManagerId,
        start_date: currentProject.startDate || null,
        end_date: currentProject.endDate || null,
        is_active: currentProject.is_active,
        budget: currentProject.budget,
        currency: currentProject.currency || "USD",
        lifecycle_status: currentProject.lifecycle_status || "PLANNED",
        health_status: currentProject.health_status || "ON_TRACK",
        team: updatedTeam.map(member => ({
          id: Number(member.id),
          role: member.role || "VIEWER",
        })),
        donor_ids: localDonors.map(id => Number(id)),
      };

      onSave(payload);
    } catch (error: any) {
      console.error("Error saving project:", error);
      
      let errorMessage = "Failed to save project. Please try again.";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'object') {
          const fieldErrors: FormErrors = {};
          
          Object.keys(errorData).forEach(field => {
            const fieldValue = errorData[field];
            if (Array.isArray(fieldValue)) {
              fieldErrors[field as keyof FormErrors] = fieldValue[0];
            } else if (typeof fieldValue === 'string') {
              fieldErrors[field as keyof FormErrors] = fieldValue;
            }
          });
          
          if (Object.keys(fieldErrors).length > 0) {
            setFormErrors(fieldErrors);
            return;
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      }
      
      setFormErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDonor = async () => {
    if (!newDonorName.trim()) {
      setFormErrors(prev => ({ ...prev, general: "Donor name cannot be empty" }));
      return;
    }
    
    try {
      const response = await api.post("/donors/", { name: newDonorName });
      
      const newDonor = response.data;

      setDonorsList(prev => [...prev, newDonor]);
      setLocalDonors(prev => [...prev, String(newDonor.id)]);
      setNewDonorName("");
      setIsAddingDonor(false);
    } catch (error: any) {
      console.error("Error adding donor:", error);
      
      let errorMessage = "Failed to add donor. Please try again.";
      if (error.response?.data) {
        if (error.response.data.name) {
          errorMessage = error.response.data.name[0];
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      
      setFormErrors(prev => ({ ...prev, general: errorMessage }));
    }
  };

  const titleText = project ? "Edit Project" : "Create New Project";
  const teamForDropdown = currentProject.team && currentProject.team.length > 0 ? currentProject.team : availableTeamMembers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>
            {project ? "Make changes to your project here." : "Enter the details for the new project."} Click save when done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Show general errors at the top */}
          {formErrors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formErrors.general}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">Code*</Label>
              <div className="col-span-3 space-y-1">
                <Input 
                  id="code" 
                  value={currentProject.code} 
                  onChange={(e) => handleChange("code", e.target.value)} 
                  className={formErrors.code ? "border-destructive" : ""}
                  placeholder="e.g., PROJ-001" 
                />
                {formErrors.code && (
                  <p className="text-sm text-destructive">{formErrors.code}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title*</Label>
              <div className="col-span-3 space-y-1">
                <Input 
                  id="title" 
                  value={currentProject.title} 
                  onChange={(e) => handleChange("title", e.target.value)} 
                  className={formErrors.title ? "border-destructive" : ""}
                  placeholder="e.g., Youth Skills Training - Nairobi" 
                />
                {formErrors.title && (
                  <p className="text-sm text-destructive">{formErrors.title}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="program" className="text-right">Program*</Label>
              <div className="col-span-3 space-y-1">
                <Select 
                  value={currentProject.program} 
                  onValueChange={(v) => handleChange("program", v)}
                >
                  <SelectTrigger className={formErrors.program ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrograms.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formErrors.program && (
                  <p className="text-sm text-destructive">{formErrors.program}</p>
                )}
              </div>
            </div>
          </div>

          {/* Budget Section */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Budget Information</h3>
                {currentProject.budget !== null && (
                  <Badge variant="outline" className="text-lg font-bold">
                    {formatBudget(currentProject.budget)}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currentProject.currency} onValueChange={(v) => handleChange("currency", v)}>
                    <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(currency => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Budget Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(currentProject.currency)}
                    </span>
                    <Input
                      id="budget"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Enter budget amount"
                      value={currentProject.budget === null ? "" : currentProject.budget}
                      onChange={(e) => handleBudgetChange(e.target.value)}
                      className={`pl-10 ${formErrors.budget ? "border-destructive" : ""}`}
                    />
                  </div>
                  {formErrors.budget && (
                    <p className="text-sm text-destructive">{formErrors.budget}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter the total budget for this project
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Team & Timeline Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Team</h3>
              <div className="space-y-2">
                <Label htmlFor="manager">Project Manager*</Label>
                <div className="space-y-1">
                  <Select 
                    value={String(currentProject.manager || "")} 
                    onValueChange={(v) => handleChange("manager", v)}
                  >
                    <SelectTrigger className={formErrors.manager ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamForDropdown.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formErrors.manager && (
                    <p className="text-sm text-destructive">{formErrors.manager}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Timeline</h3>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input 
                  type="date" 
                  value={currentProject.startDate || ""} 
                  onChange={e => handleDateChange('startDate', e.target.value)}
                  className={formErrors.startDate ? "border-destructive" : ""}
                />
                {formErrors.startDate && (
                  <p className="text-sm text-destructive">{formErrors.startDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input 
                  type="date" 
                  value={currentProject.endDate || ""} 
                  onChange={e => handleDateChange('endDate', e.target.value)}
                  className={formErrors.endDate ? "border-destructive" : ""}
                />
                {formErrors.endDate && (
                  <p className="text-sm text-destructive">{formErrors.endDate}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={currentProject.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active Project
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive projects are hidden from most views but preserved in the system.
            </p>
          </div>

          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Lifecycle Status</h3>
              <Select value={currentProject.lifecycle_status} onValueChange={(v) => handleChange("lifecycle_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select lifecycle status" /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_CHOICES.map(choice => <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Health Status</h3>
              <Select value={currentProject.health_status} onValueChange={(v) => handleChange("health_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select health status" /></SelectTrigger>
                <SelectContent>
                  {HEALTH_CHOICES.map(choice => <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Donors Section */}
          <Card className="p-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Donors</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    multiple
                    value={localDonors}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions).map(opt => opt.value);
                      setLocalDonors(selectedIds);
                    }}
                    className="flex-1 border rounded-md p-2 min-h-[100px]"
                  >
                    {donorsList.map(donor => (
                      <option key={donor.id} value={String(donor.id)}>{donor.name}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => setIsAddingDonor(true)}>Add Donor</Button>
                </div>
                <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple donors</p>
              </div>

              {/* Add Donor Modal */}
              <Dialog open={isAddingDonor} onOpenChange={() => setIsAddingDonor(false)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Donor</DialogTitle>
                    <DialogDescription>Enter the donor name and save.</DialogDescription>
                  </DialogHeader>
                  <Input
                    placeholder="Donor name"
                    value={newDonorName}
                    onChange={(e) => setNewDonorName(e.target.value)}
                  />
                  <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={() => setIsAddingDonor(false)}>Cancel</Button>
                    <Button onClick={handleAddDonor}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}