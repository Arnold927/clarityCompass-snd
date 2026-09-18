'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sharedPortalService, type Proposal } from '@/lib/shared-portal-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, ExternalLink, Lock } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useSharedPortalAuth } from '@/app/shared-portal/auth-context';
import { usePortalPermissions } from '@/hooks/use-portal-permissions';
import { Badge } from "@/components/ui/badge";

interface ProposalFormData {
  title: string;
  description: string;
  budget_amount: number;
  currency: string;
  duration_months: number;
  partner_organizations: string[];
  objectives?: string[];
  start_date?: string;
  end_date?: string;
}

type ExtendedProposal = Proposal & {
  objectives?: string[];
  start_date?: string;
  end_date?: string;
  project_details?: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
};

export default function EditProposalPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useSharedPortalAuth();
  const permissions = usePortalPermissions();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    budget_amount: 0,
    currency: 'USD',
    duration_months: 12,
    partner_organizations: [],
    objectives: [],
    start_date: '',
    end_date: '',
  });
  
  const [availablePartners, setAvailablePartners] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [objectivesInput, setObjectivesInput] = useState('');
  
  const [isProjectLinked, setIsProjectLinked] = useState(false);
  const [linkedProject, setLinkedProject] = useState<{
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  } | null>(null);

  useEffect(() => {
    fetchProposalData();
    fetchAvailablePartners();
  }, [id]);

  const fetchProposalData = async () => {
    try {
      setLoading(true);
      const proposal = await sharedPortalService.getProposal(id as string) as ExtendedProposal;
      
      if (!permissions.isNGOUser || proposal.ngo_details.id !== user?.ngo) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to edit this proposal",
          variant: "destructive",
        });
        router.push(`/shared-portal/proposals/${id}`);
        return;
      }
      
      if (!['draft', 'returned_for_edits'].includes(proposal.status)) {
        toast({
          title: "Cannot Edit",
          description: "This proposal cannot be edited in its current status",
          variant: "destructive",
        });
        router.push(`/shared-portal/proposals/${id}`);
        return;
      }
      
      const hasProjectLink = !!proposal.project_details;
      setIsProjectLinked(hasProjectLink);
      
      if (hasProjectLink && proposal.project_details) {
        setLinkedProject(proposal.project_details);
        
        toast({
          title: "Project-Linked Proposal",
          description: "Start and end dates are inherited from the linked project and cannot be edited here.",
          variant: "default",
        });
      }
      
      setFormData({
        title: proposal.title,
        description: proposal.description,
        budget_amount: proposal.budget_amount,
        currency: proposal.currency,
        duration_months: proposal.duration_months,
        partner_organizations: proposal.partner_organizations,
        objectives: proposal.objectives || [],
        start_date: hasProjectLink && proposal.project_details?.start_date 
          ? proposal.project_details.start_date 
          : proposal.start_date || '',
        end_date: hasProjectLink && proposal.project_details?.end_date 
          ? proposal.project_details.end_date 
          : proposal.end_date || '',
      });
      
      setSelectedPartners(proposal.partner_organizations || []);
      
      if (proposal.objectives && proposal.objectives.length > 0) {
        setObjectivesInput(proposal.objectives.join(', '));
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load proposal');
      toast({
        title: "Error",
        description: "Failed to load proposal data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePartners = async () => {
    try {
      const partners = await sharedPortalService.getPartnerOrganizations();
      setAvailablePartners(partners);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    }
  };

  const handleInputChange = (field: keyof ProposalFormData, value: any) => {
    if (isProjectLinked && (field === 'start_date' || field === 'end_date')) {
      toast({
        title: "Cannot Edit",
        description: "Start and end dates are inherited from the linked project and cannot be edited here.",
        variant: "destructive",
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePartnerToggle = (partnerId: string) => {
    setSelectedPartners(prev => {
      if (prev.includes(partnerId)) {
        return prev.filter(id => id !== partnerId);
      } else {
        return [...prev, partnerId];
      }
    });
  };

  const handleObjectivesChange = (value: string) => {
    setObjectivesInput(value);
    const objectives = value.split(',').map(obj => obj.trim()).filter(obj => obj.length > 0);
    setFormData(prev => ({
      ...prev,
      objectives
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        budget_amount: formData.budget_amount,
        currency: formData.currency,
        duration_months: formData.duration_months,
        partner_organizations: selectedPartners,
        objectives: formData.objectives,
      };
      
      if (!isProjectLinked) {
        updateData.start_date = formData.start_date || null;
        updateData.end_date = formData.end_date || null;
      }
      
      await sharedPortalService.updateProposal(id as string, updateData);
      
      toast({
        title: "Proposal Updated",
        description: "Your proposal has been updated successfully.",
      });
      
      router.push(`/shared-portal/proposals/${id}`);
      router.refresh();
      
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update proposal",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/shared-portal/proposals/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Loading...</h1>
            <p className="text-muted-foreground">Loading proposal data</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/shared-portal/proposals/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Failed to load proposal data. Please try again.
              </p>
              <Button asChild>
                <Link href={`/shared-portal/proposals/${id}`}>
                  Back to Proposal
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/shared-portal/proposals/${id}`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Proposal</h1>
          <p className="text-muted-foreground">
            Update the details of your collaboration proposal
          </p>
        </div>
      </div>

      {/* Project Link Alert */}
      {isProjectLinked && linkedProject && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Linked to Project</p>
                  <p className="text-sm text-muted-foreground">
                    This proposal is associated with project: <strong>{linkedProject.title}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start and end dates are inherited from the project and cannot be edited here.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Dates Locked
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  asChild
                  className="text-xs"
                >
                  <Link href={`/shared-portal/projects/${linkedProject.id}`}>
                    View Project
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Proposal Details</CardTitle>
                <CardDescription>
                  Update the basic information about your proposal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Proposal Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter proposal title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your proposal in detail..."
                    rows={6}
                    required
                  />
                </div>

                
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="budget_amount">Budget Amount *</Label>
                    <Input
                      id="budget_amount"
                      type="number"
                      value={formData.budget_amount}
                      onChange={(e) => handleInputChange('budget_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleInputChange('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="KES">KES (KSh)</SelectItem>
                        <SelectItem value="UGX">UGX (USh)</SelectItem>
                        <SelectItem value="TZS">TZS (TSh)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration_months">Duration (Months) *</Label>
                    <Input
                      id="duration_months"
                      type="number"
                      value={formData.duration_months}
                      onChange={(e) => handleInputChange('duration_months', parseInt(e.target.value) || 0)}
                      placeholder="12"
                      required
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="start_date" className={isProjectLinked ? "text-muted-foreground" : ""}>
                        Start Date {isProjectLinked ? "(Inherited from Project)" : "(Optional)"}
                      </Label>
                      {isProjectLinked && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="start_date"
                      type="date"
                      value={formatDateForInput(formData.start_date || '')}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      disabled={isProjectLinked}
                      className={isProjectLinked ? "bg-muted/50 cursor-not-allowed" : ""}
                    />
                    {isProjectLinked && linkedProject && (
                      <p className="text-xs text-muted-foreground">
                        Project start date: {new Date(linkedProject.start_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="end_date" className={isProjectLinked ? "text-muted-foreground" : ""}>
                        End Date {isProjectLinked ? "(Inherited from Project)" : "(Optional)"}
                      </Label>
                      {isProjectLinked && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="end_date"
                      type="date"
                      value={formatDateForInput(formData.end_date || '')}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      disabled={isProjectLinked}
                      className={isProjectLinked ? "bg-muted/50 cursor-not-allowed" : ""}
                    />
                    {isProjectLinked && linkedProject && (
                      <p className="text-xs text-muted-foreground">
                        Project end date: {new Date(linkedProject.end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Partner Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Partner Organizations</CardTitle>
                <CardDescription>
                  Select organizations to review this proposal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availablePartners.map((partner) => (
                    <div key={partner.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`partner-${partner.id}`}
                        checked={selectedPartners.includes(partner.id)}
                        onChange={() => handlePartnerToggle(partner.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`partner-${partner.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {partner.name}
                      </label>
                    </div>
                  ))}
                  
                  {availablePartners.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No partner organizations available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/shared-portal/proposals/${id}`)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    All changes will be saved as a new version of the proposal
                  </p>
                  {isProjectLinked && (
                    <p className="text-xs text-muted-foreground text-center">
                      <Lock className="h-3 w-3 inline mr-1" />
                      Start and end dates are inherited from the linked project
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}