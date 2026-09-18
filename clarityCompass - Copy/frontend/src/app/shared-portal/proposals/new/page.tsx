'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, FileText, Save, Send, Search, Building, Plus } from "lucide-react";
import Link from "next/link";
import { sharedPortalService } from "@/lib/shared-portal-service";
import { useSharedPortalAuth } from "@/app/shared-portal/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { PartnerOrganization, CreateProposalData } from '@/lib/shared-portal-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import sharedPortalAPI from '@/lib/shared-portal';



interface Project {
  id: string | number;
  title: string;
  code?: string;
  description?: string;
  status?: string;
}

export default function CreateProposalPage() {
  const router = useRouter();
  const { user } = useSharedPortalAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [partnerOrganizations, setPartnerOrganizations] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [durationMonths, setDurationMonths] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState('draft');
  
  const [partners, setPartners] = useState<PartnerOrganization[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');


const fetchProjects = async () => {
  try {
    setLoadingProjects(true);
    const response = await sharedPortalAPI.getProjects();
    setProjects(response.data);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
  } finally {
    setLoadingProjects(false);
  }
};

  useEffect(() => {
    fetchPartnerOrganizations();
    fetchProjects();
  }, []);

  const fetchPartnerOrganizations = async () => {
    try {
      setLoadingPartners(true);
      const data = await sharedPortalService.getPartnerOrganizations();
      
      setPartners(data);
    } catch (error) {
    } finally {
      setLoadingPartners(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      setError('Project title is required');
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newProjectTitle,
          description: newProjectDescription,
          status: 'active'
        }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects(prev => [...prev, newProject]);
        setSelectedProject(newProject.id);
        setCreateNewProject(false);
        setNewProjectTitle('');
        setNewProjectDescription('');
        setProjectDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setError('Failed to create project');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  const submitStatus = status === 'draft' ? 'draft' : 'submitted';
  
  try {
    setSubmitting(true);
    
    const proposalData: CreateProposalData = {
      title,
      description,
      partner_organizations: partnerOrganizations,
      budget_amount: parseFloat(budgetAmount),
      currency,
      duration_months: parseInt(durationMonths),
      status: submitStatus,
    };

    if (selectedProject && selectedProject.trim() !== '') {
      (proposalData as any).project = selectedProject;
    }

    const proposal = await sharedPortalService.createProposal(proposalData);
    
    if (files.length > 0) {
      for (const file of files) {
        await sharedPortalService.uploadProposalDocument(proposal.id, file);
      }
    }

    if (submitStatus === 'submitted') {
      await sharedPortalService.submitProposal(proposal.id);
    }

    setSuccess(
      submitStatus === 'draft' 
        ? 'Proposal saved as draft successfully!' 
        : 'Proposal submitted successfully!'
    );

    setTimeout(() => {
      router.push(`/shared-portal/proposals/${proposal.id}`);
    }, 2000);

  } catch (err: any) {
    setError(err.message || 'Failed to create proposal. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
  if (!user || user.role !== 'ngo_user') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only NGO users can create proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/shared-portal">
                Return to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shared-portal/proposals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create New Proposal</h1>
            <p className="text-muted-foreground">
              Submit a proposal for collaboration with partners
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Proposal Details</CardTitle>
                <CardDescription>
                  Enter the core information about your proposal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Proposal Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a descriptive title"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="project">Link to Existing Project (Optional)</Label>
                    <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          disabled={submitting}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Browse Projects
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Select a Project</DialogTitle>
                          <DialogDescription>
                            Choose an existing project to link with this proposal
                          </DialogDescription>
                        </DialogHeader>
                        
                        {createNewProject ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="new-project-title">New Project Title *</Label>
                              <Input
                                id="new-project-title"
                                value={newProjectTitle}
                                onChange={(e) => setNewProjectTitle(e.target.value)}
                                placeholder="Enter project title"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-project-description">Description (Optional)</Label>
                              <Textarea
                                id="new-project-description"
                                value={newProjectDescription}
                                onChange={(e) => setNewProjectDescription(e.target.value)}
                                placeholder="Enter project description"
                                rows={3}
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateNewProject(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleCreateProject}
                              >
                                Create Project
                              </Button>
                            </DialogFooter>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search projects..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                            
                            <div className="max-h-[300px] overflow-y-auto">
                              {loadingProjects ? (
                                <div className="py-8 text-center">
                                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
                                  <p className="text-sm text-muted-foreground mt-2">Loading projects...</p>
                                </div>
                              ) : projects.length === 0 ? (
                                <div className="py-8 text-center">
                                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                  <p className="text-muted-foreground">No projects found</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setCreateNewProject(true)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Project
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {projects
                                    .filter(project => 
                                      project.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
                                      project.code?.toLowerCase().includes(projectSearch.toLowerCase())
                                    )
                                    .map((project) => (
                                      <div
                                        key={project.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                                          selectedProject === project.id ? 'border-primary bg-primary/5' : ''
                                        }`}
                                        onClick={() => {
                                          setSelectedProject(project.id.toString());
                                          setProjectDialogOpen(false);
                                        }}
                                      >
                                        <div className="font-medium">{project.title}</div>
                                        {project.code && (
                                          <div className="text-sm text-muted-foreground">
                                            Code: {project.code}
                                          </div>
                                        )}
                                        {project.description && (
                                          <div className="text-sm text-muted-foreground truncate">
                                            {project.description}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={() => setCreateNewProject(true)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Project
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        disabled={submitting}
                      >
                        {selectedProject && selectedProject !== 'none' 
                          ? projects.find(p => p.id === selectedProject)?.title || 'Select project...'
                          : 'No project selected (optional)'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search projects..." />
                        <CommandList>
                          <CommandEmpty>No project found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => setSelectedProject('')}
                              className={selectedProject === '' ? 'bg-accent' : ''}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedProject === '' ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              No project (create new)
                            </CommandItem>
                            {projects.map((project) => (
                              <CommandItem
                                key={project.id}
                                value={project.id.toString()}
                                onSelect={(currentValue) => {
                                  setSelectedProject(currentValue === selectedProject ? '' : currentValue);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedProject === project.id ? 'opacity-100' : 'opacity-0'
                                  }`}
                                />
                                {project.title}
                                {project.code && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({project.code})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {selectedProject && selectedProject.toString().trim() !== '' && (
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {projects.find(p => p.id.toString() === selectedProject.toString())?.title || 'Loading...'}
                          </div>
                          {projects.find(p => p.id.toString() === selectedProject.toString())?.code && (
                            <div className="text-sm text-muted-foreground">
                              Code: {projects.find(p => p.id.toString() === selectedProject.toString())?.code}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProject('')}
                          disabled={submitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your proposal in detail..."
                    rows={8}
                    required
                    disabled={submitting}
                    className="min-h-[200px]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget Amount *</Label>
                    <div className="flex">
                      <Select value={currency} onValueChange={setCurrency} disabled={submitting}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="KES">KES</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="budget"
                        type="number"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="0.00"
                        required
                        disabled={submitting}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (months) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      placeholder="e.g., 12, 24"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Partners *</Label>
                  <Select 
                    onValueChange={(value) => {
                      if (!partnerOrganizations.includes(value)) {
                        setPartnerOrganizations([...partnerOrganizations, value]);
                      }
                    }}
                    disabled={submitting || loadingPartners}
                  >
                    <SelectTrigger>
                      {loadingPartners ? (
                        <SelectValue placeholder="Loading partners..." />
                      ) : (
                        <SelectValue placeholder="Select partner organizations" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {loadingPartners ? (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                          Loading partners...
                        </div>
                      ) : partners.length === 0 ? (
                        <div className="py-2 text-center text-sm text-muted-foreground">
                          No partner organizations available
                        </div>
                      ) : (
                        partners.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id.toString()}>
                            <div className="flex flex-col">
                              <span>{partner.name}</span>
                              {/* {partner.description && (
                                <span className="text-xs text-muted-foreground">
                                  {partner.description}
                                </span>
                              )} */}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {partnerOrganizations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {partnerOrganizations.map((partnerId) => {
                        const partner = partners.find(p => p.id === partnerId);
                        return (
                          <div
                            key={partnerId}
                            className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full"
                          >
                            <span className="text-sm">{partner?.name}</span>
                            <button
                              type="button"
                              onClick={() => setPartnerOrganizations(
                                partnerOrganizations.filter(id => id !== partnerId)
                              )}
                              className="text-muted-foreground hover:text-foreground"
                              disabled={submitting}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>
                  Upload supporting documents (PDF, Word, Excel up to 10MB each)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileUpload}
                      disabled={submitting}
                      className="hidden"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Drop files here or click to upload</p>
                          <p className="text-sm text-muted-foreground">
                            Maximum file size: 10MB
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Selected Files</h3>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              disabled={submitting}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission</CardTitle>
                <CardDescription>
                  Choose how you want to save your proposal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Submission Type</Label>
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('draft')}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        status === 'draft'
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                      disabled={submitting}
                    >
                      <div className="font-medium">Save as Draft</div>
                      <div className="text-sm text-muted-foreground">
                        Save for later editing
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setStatus('submitted')}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        status === 'submitted'
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                      disabled={submitting}
                    >
                      <div className="font-medium">Submit for Review</div>
                      <div className="text-sm text-muted-foreground">
                        Send to selected partners for review
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>By submitting, you agree that:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>All information provided is accurate</li>
                      <li>You have the authority to submit this proposal</li>
                      <li>Partners will be notified of your submission</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="sticky top-6 space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span className="ml-2">
                        {status === 'draft' ? 'Saving...' : 'Submitting...'}
                      </span>
                    </>
                  ) : (
                    <>
                      {status === 'draft' ? (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save as Draft
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit for Review
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}