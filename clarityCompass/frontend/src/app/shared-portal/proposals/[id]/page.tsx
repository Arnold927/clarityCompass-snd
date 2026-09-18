'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { sharedPortalService, type Proposal } from '@/lib/shared-portal-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Calendar, User, DollarSign, Clock, FileText, 
  Building2, Users, MessageSquare, Download, Eye, 
  CheckCircle, Clock4, AlertCircle, FileArchive, Upload as UploadIcon,
  Edit, Send, RefreshCw, CheckSquare, MessageCircle,
  Copy, Share2, Printer, Bookmark, MoreVertical,
  Target, BarChart3, TrendingUp, MapPin, Globe,
  CheckCheck, XCircle, PauseCircle, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePortalPermissions } from '@/hooks/use-portal-permissions';
import { useSharedPortalAuth } from '@/app/shared-portal/auth-context';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReviewData {
  feedback_text: string;
  action_required: string[];
  status_change?: string;
}

interface ExtendedFeedbackItem {
  id: string;
  reviewer_name: string;
  reviewer_role: string;
  reviewer_type?: string;
  reviewer_org_id?: string;
  reviewer_org?: string;
  feedback_text: string;
  action_required: string[];
  created_at: string;
  status_change?: string;
}

type ProposalWithExtendedData = Proposal & {
  objectives?: string[];
  start_date?: string;
  end_date?: string;
  milestones?: Array<{
    title: string;
    due_date: string;
    description?: string;
  }>;
  project_details?: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
  };
  feedback_history: ExtendedFeedbackItem[];
};

export default function ProposalDetailPage() {
  const { id } = useParams();
  const [proposal, setProposal] = useState<ProposalWithExtendedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData>({
    feedback_text: '',
    action_required: [],
  });
  const [currentAction, setCurrentAction] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [copied, setCopied] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const { user } = useSharedPortalAuth();
  const permissions = usePortalPermissions();

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      const data = await sharedPortalService.getProposal(id as string);
      setProposal(data as ProposalWithExtendedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const canReviewProposal = () => {
    if (!proposal || !user) return false;
    
    if (!permissions.isPartnerUser) return false;
    
    const userOrgId = user.organization;
    const isAssignedPartner = proposal.partner_organizations_details.some(
      partner => partner.id === userOrgId
    );
    
    return isAssignedPartner && 
           ['submitted', 'under_review', 'returned_for_edits'].includes(proposal.status);
  };

  const canEditProposal = () => {
    if (!proposal || !user) return false;
    
    if (!permissions.isNGOUser) return false;
    
    const userNgoId = user.ngo;
    const isUserNgo = proposal.ngo_details.id === userNgoId;
    
    return isUserNgo && 
           ['draft', 'returned_for_edits'].includes(proposal.status);
  };

  const canSubmitProposal = () => {
    if (!proposal || !user) return false;
    
    if (!permissions.isNGOUser) return false;
    
    const userNgoId = user.ngo;
    const isUserNgo = proposal.ngo_details.id === userNgoId;
    
    return isUserNgo && proposal.status === 'draft';
  };

  const handleSubmitProposal = async () => {
    try {
      await sharedPortalService.submitProposal(id as string);
      toast({
        title: "Proposal Submitted",
        description: "Proposal has been sent for review.",
      });
      fetchProposal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit proposal",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmittingReview(true);
      await sharedPortalService.submitProposalReview(id as string, reviewData);
      toast({
        title: "Review Submitted",
        description: "Your feedback has been submitted.",
      });
      setReviewDialogOpen(false);
      setReviewData({ feedback_text: '', action_required: [] });
      fetchProposal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!documentFile || !documentType) {
      toast({
        title: "Error",
        description: "Please select a file and document type",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingDocument(true);
      await sharedPortalService.uploadProposalDocument(id as string, documentFile, documentType);
      toast({
        title: "Document Uploaded",
        description: "File has been uploaded successfully.",
      });
      setUploadDialogOpen(false);
      setDocumentFile(null);
      setDocumentType('');
      fetchProposal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const addAction = () => {
    if (currentAction.trim()) {
      setReviewData(prev => ({
        ...prev,
        action_required: [...prev.action_required, currentAction.trim()]
      }));
      setCurrentAction('');
    }
  };

  const removeAction = (index: number) => {
    setReviewData(prev => ({
      ...prev,
      action_required: prev.action_required.filter((_, i) => i !== index)
    }));
  };

  const canResubmitProposal = () => {
    if (!proposal || !user) return false;
    
    if (!permissions.isNGOUser) return false;
    
    const userNgoId = user.ngo;
    const isUserNgo = proposal.ngo_details.id === userNgoId;
    
    return isUserNgo && proposal.status === 'returned_for_edits';
  };

  const handleResubmitProposal = async () => {
    try {
      await sharedPortalService.resubmitProposal(id as string);
      toast({
        title: "Proposal Resubmitted",
        description: "Proposal has been sent back for review.",
      });
      fetchProposal();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resubmit proposal",
        variant: "destructive",
      });
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      variant: "default" | "secondary" | "destructive" | "outline",
      icon: React.ReactNode, 
      label: string,
      color: string,
      description: string 
    }> = {
      'draft': { 
        variant: "outline", 
        icon: <FileText className="h-3.5 w-3.5" />, 
        label: 'Draft',
        color: 'text-muted-foreground',
        description: 'Proposal is being prepared'
      },
      'submitted': { 
        variant: "secondary", 
        icon: <Clock4 className="h-3.5 w-3.5" />, 
        label: 'Submitted',
        color: 'text-blue-600',
        description: 'Awaiting review from partners'
      },
      'under_review': { 
        variant: "secondary", 
        icon: <Eye className="h-3.5 w-3.5" />, 
        label: 'Under Review',
        color: 'text-amber-600',
        description: 'Currently being reviewed'
      },
      'returned_for_edits': { 
        variant: "outline", 
        icon: <RefreshCw className="h-3.5 w-3.5" />, 
        label: 'Returned for Edits',
        color: 'text-orange-600',
        description: 'Updates requested by reviewers'
      },
      'accepted': { 
        variant: "default",
        icon: <CheckCircle className="h-3.5 w-3.5" />, 
        label: 'Accepted',
        color: 'text-white',
        description: 'Proposal has been approved'
      },
      'rejected': { 
        variant: "destructive", 
        icon: <AlertCircle className="h-3.5 w-3.5" />, 
        label: 'Rejected',
        color: 'text-red-600',
        description: 'Proposal was not approved'
      },
    };

    return configs[status] || { 
      variant: "outline" as const, 
      icon: null, 
      label: status,
      color: 'text-muted-foreground',
      description: 'Unknown status'
    };
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={cn("gap-1.5 font-medium", config.color)}>
          {config.icon}
          {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground hidden md:inline">
          {config.description}
        </span>
      </div>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (document: Proposal['documents'][0]) => {
    window.open(document.file, '_blank');
  };

  const getDaysUntilDeadline = () => {
    if (!proposal?.review_deadline) return null;
    const deadline = new Date(proposal.review_deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const copyProposalLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Proposal link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getReviewProgress = () => {
    if (!proposal?.partner_organizations_details) return 0;
    
    const totalPartners = proposal.partner_organizations_details.length;
    if (totalPartners === 0) return 0;
    
    const reviewsSubmitted = proposal.feedback_history.filter(
      f => f.reviewer_role.toLowerCase().includes('partner') || 
         f.reviewer_role.toLowerCase().includes('reviewer')
  ).length;
    
    return Math.min(100, (reviewsSubmitted / totalPartners) * 100);
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'budget': 'bg-green-100 text-green-800',
      'technical': 'bg-blue-100 text-blue-800',
      'legal': 'bg-purple-100 text-purple-800',
      'report': 'bg-amber-100 text-amber-800',
      'other': 'bg-gray-100 text-gray-800',
      'proposal': 'bg-primary/10 text-primary',
      'mou': 'bg-red-100 text-red-800',
      'financial': 'bg-emerald-100 text-emerald-800',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getPartnerReviewStatus = (partnerId: string) => {
    if (!proposal?.feedback_history) return 'pending';

    const partnerName = proposal.partner_organizations_details.find(p => p.id === partnerId)?.name || '';
    
    const partnerReview = proposal.feedback_history.find(
    f => f.reviewer_name.toLowerCase().includes(partnerName.toLowerCase()) ||
         f.reviewer_role.toLowerCase().includes('partner')
  );
    
    if (partnerReview) {
      return partnerReview.status_change === 'accepted' ? 'approved' : 
             partnerReview.status_change === 'rejected' ? 'rejected' :
             'reviewed';
    }
    return 'pending';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/shared-portal/proposals">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Loading Proposal...</h1>
            <p className="text-muted-foreground">Fetching proposal details</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading proposal details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/shared-portal/proposals">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Proposal Not Found</h1>
            <p className="text-muted-foreground">
              {error || 'The proposal could not be found'}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                The proposal you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild>
                <Link href="/shared-portal/proposals">View All Proposals</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilDeadline = getDaysUntilDeadline();
  const showReviewDialog = canReviewProposal();
  const showEditButton = canEditProposal();
  const showSubmitButton = canSubmitProposal();
  const showUploadButton = permissions.isNGOUser && 
                         proposal.ngo_details.id === user?.ngo;
  
  const statusConfig = getStatusConfig(proposal.status);
  const reviewProgress = getReviewProgress();

  const objectives = proposal.objectives || [];
  const startDate = proposal.start_date;
  const endDate = proposal.end_date;
  const milestones = proposal.milestones || [];
  const feedbackHistory = proposal.feedback_history || [];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="space-y-4">
        {/* Breadcrumb and Back Navigation */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link 
            href="/shared-portal/dashboard" 
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <span>/</span>
          <Link 
            href="/shared-portal/proposals" 
            className="hover:text-foreground transition-colors"
          >
            Proposals
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {proposal.title}
          </span>
        </div>

        {/* Main Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3">
              <Link href="/shared-portal/proposals">
                <Button variant="outline" size="icon" className="rounded-full shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">
                    {proposal.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(proposal.status)}
                    {daysUntilDeadline !== null && daysUntilDeadline <= 7 && proposal.status === 'under_review' && (
                      <Badge variant="destructive" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {daysUntilDeadline <= 0 ? 'Overdue' : `${daysUntilDeadline}d left`}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Review Progress Bar */}
                {(proposal.status === 'under_review' || proposal.status === 'submitted') && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">Review Progress</span>
                      <span className="text-muted-foreground">
                        {Math.round(reviewProgress)}% complete
                      </span>
                    </div>
                    <Progress value={reviewProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {proposal.partner_organizations_details.length} partner{proposal.partner_organizations_details.length !== 1 ? 's' : ''} assigned
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyProposalLink}
                className="gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Bookmark className="h-4 w-4" />
                    Bookmark
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Report Issue
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2">
              {showEditButton && (
                <Button variant="outline" asChild className="gap-2">
                  <Link href={`/shared-portal/proposals/${proposal.id}/edit`}>
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>
                </Button>
              )}
              
              {showSubmitButton && (
                <Button onClick={handleSubmitProposal} className="gap-2">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Submit</span>
                </Button>
              )}

              {canResubmitProposal() && (
                <Button onClick={handleResubmitProposal} className="gap-2 bg-amber-600 hover:bg-amber-700">
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Resubmit</span>
                </Button>
              )}
              
              {showReviewDialog && (
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="gap-2">
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Review</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Submit Proposal Review</DialogTitle>
                      <DialogDescription>
                        Provide feedback and recommendations for this proposal.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Feedback</Label>
                        <Textarea
                          value={reviewData.feedback_text}
                          onChange={(e) => setReviewData(prev => ({
                            ...prev,
                            feedback_text: e.target.value
                          }))}
                          placeholder="Provide detailed feedback about the proposal..."
                          rows={6}
                          className="mt-2"
                        />
                      </div>
                      
                      <div>
                        <Label>Actions Required</Label>
                        <div className="flex gap-2 mb-2 mt-2">
                          <Input
                            type="text"
                            value={currentAction}
                            onChange={(e) => setCurrentAction(e.target.value)}
                            placeholder="Enter an action item..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAction())}
                          />
                          <Button type="button" onClick={addAction}>
                            Add
                          </Button>
                        </div>
                        
                        {reviewData.action_required.length > 0 && (
                          <div className="space-y-2">
                            {reviewData.action_required.map((action, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted p-3 rounded">
                                <span>{action}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAction(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Label>Recommendation</Label>
                        <Select
                          value={reviewData.status_change}
                          onValueChange={(value) => setReviewData(prev => ({
                            ...prev,
                            status_change: value
                          }))}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select recommendation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accepted">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Accept Proposal
                              </div>
                            </SelectItem>
                            <SelectItem value="returned_for_edits">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-amber-600" />
                                Return for Edits
                              </div>
                            </SelectItem>
                            <SelectItem value="rejected">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-600" />
                                Reject Proposal
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setReviewDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || !reviewData.feedback_text.trim()}
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Proposal ID</p>
                  <p className="text-lg font-semibold font-mono truncate">{proposal.id}</p>
                </div>
                <Badge variant="outline" className="font-mono">v{proposal.current_version}</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Partners</p>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4" />
                  <p className="text-lg font-semibold">
                    {proposal.partner_organizations_details.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documents</p>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4" />
                  <p className="text-lg font-semibold">
                    {proposal.documents?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  <p className="text-lg font-semibold">
                    {format(new Date(proposal.updated_at || proposal.created_at), 'MMM d')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>

      {/* TABS SECTION */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">

          {proposal.status === 'returned_for_edits' && feedbackHistory.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                  Required Actions for Resubmission
                </CardTitle>
                <CardDescription>
                  Address these items before resubmitting your proposal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Get latest feedback with action_required */}
                  {feedbackHistory
                    .filter(f => f.action_required && f.action_required.length > 0)
                    .slice(0, 1) // Show only latest feedback's actions
                    .map((feedback) => (
                      <div key={feedback.id}>
                        <p className="text-sm font-medium mb-2">
                          From {feedback.reviewer_name} ({format(new Date(feedback.created_at), 'MMM d')}):
                        </p>
                        <ul className="space-y-2">
                          {feedback.action_required.map((action, index) => (
                            <li key={index} className="flex items-start gap-2 p-2 bg-white/50 rounded">
                              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-xs font-medium text-amber-700">{index + 1}</span>
                              </div>
                              <p className="text-sm">{action}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('feedback')}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      View All Feedback
                    </Button>
                    {showEditButton && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
                      >
                        <Link href={`/shared-portal/proposals/${proposal.id}/edit`}>
                          Make Edits
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Details</CardTitle>
                  <CardDescription>
                    Detailed information about the collaboration proposal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Proposal Title</Label>
                      <p className="font-medium">{proposal.title}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(proposal.status)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">NGO</Label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback>
                            {proposal.ngo_details.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{proposal.ngo_details.name}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Budget</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {formatCurrency(proposal.budget_amount, proposal.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Description</Label>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-justify leading-relaxed">{proposal.description}</p>
                    </div>
                  </div>
                  
                  {objectives.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground">Objectives</Label>
                      <ul className="space-y-2">
                        {objectives.map((objective: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                            <Target className="h-4 w-4 text-primary mt-0.5" />
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Project Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                  <CardDescription>
                    {proposal.project_details ? 'Linked Project Information' : 'Project timeline information'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Duration</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <p className="font-medium">{proposal.duration_months} months</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Currency</Label>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-purple-600" />
                          <p className="font-medium">{proposal.currency}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* Show linked project dates if available, otherwise show proposal dates */}
                      {proposal.project_details ? (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-muted-foreground">Project Start Date</Label>
                              <Badge variant="outline" className="text-xs">
                                Linked Project
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="font-medium">
                                  {proposal.project_details.start_date
                                    ? format(new Date(proposal.project_details.start_date), 'PPP')
                                    : 'Not specified'}
                                </p>
                                {proposal.project_details.title && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Project: {proposal.project_details.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">Project End Date</Label>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-red-600" />
                              <p className="font-medium">
                                {proposal.project_details.end_date
                                  ? format(new Date(proposal.project_details.end_date), 'PPP')
                                  : 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">Start Date</Label>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-green-600" />
                              <p className="font-medium">
                                {startDate ? format(new Date(startDate), 'PPP') : 'Not specified'}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-muted-foreground">End Date</Label>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-red-600" />
                              <p className="font-medium">
                                {endDate ? format(new Date(endDate), 'PPP') : 'Not specified'}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Show linked project info if available */}
                  {proposal.project_details && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <ExternalLink className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Linked to Project</p>
                            <p className="text-sm text-muted-foreground">
                              This proposal is associated with an existing project
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1"
                            asChild
                          >
                            <Link href={`/shared-portal/projects/${proposal.project_details.id}`}>
                              <span className="text-xs">View Project Details</span>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column */}
            <div className="space-y-6">
              {/* Partner Organizations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Partner Organizations
                  </CardTitle>
                  <CardDescription>
                    Organizations assigned to review this proposal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {proposal.partner_organizations_details.map((partner) => {
                      const reviewStatus = getPartnerReviewStatus(partner.id);
                      const StatusIcon = {
                        pending: Clock4,
                        reviewed: Eye,
                        approved: CheckCircle,
                        rejected: XCircle,
                      }[reviewStatus];
                      
                      const statusColor = {
                        pending: 'text-muted-foreground',
                        reviewed: 'text-blue-600',
                        approved: 'text-green-600',
                        rejected: 'text-red-600',
                      }[reviewStatus];
                      
                      return (
                        <div key={partner.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{partner.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{partner.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Partner Organization
                              </p>
                            </div>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{reviewStatus.charAt(0).toUpperCase() + reviewStatus.slice(1)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Key Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Key Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">Created By</Label>
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {(proposal.created_by_name || 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm">{proposal.created_by_name || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-sm">NGO Contact</Label>
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {proposal.ngo_details.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{proposal.ngo_details.name}</p>
                        <p className="text-xs text-muted-foreground">Primary Contact</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <Link href={`/shared-portal/messages/new?proposal=${proposal.id}`}>
                      <MessageCircle className="h-4 w-4" />
                      Send Message
                    </Link>
                  </Button>
                  {showUploadButton && (
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start gap-2">
                          <UploadIcon className="h-4 w-4" />
                          Upload Document
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Document</DialogTitle>
                          <DialogDescription>
                            Add a supporting document to this proposal
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Document Type</Label>
                            <Select value={documentType} onValueChange={setDocumentType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="budget">Budget Document</SelectItem>
                                <SelectItem value="proposal">Proposal Document</SelectItem>
                                <SelectItem value="technical">Technical Report</SelectItem>
                                <SelectItem value="financial">Financial Statement</SelectItem>
                                <SelectItem value="legal">Legal Agreement</SelectItem>
                                <SelectItem value="mou">MOU</SelectItem>
                                <SelectItem value="report">Progress Report</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>File</Label>
                            <Input
                              type="file"
                              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                          </div>
                          {documentFile && (
                            <p className="text-sm text-muted-foreground">
                              Selected: {documentFile.name} ({formatFileSize(documentFile.size)})
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handleDocumentUpload}
                            disabled={!documentFile || !documentType || uploadingDocument}
                          >
                            {uploadingDocument ? "Uploading..." : "Upload"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={copyProposalLink}>
                    <Copy className="h-4 w-4" />
                    Copy Proposal Link
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Supporting Documents</CardTitle>
                  <CardDescription>
                    Files uploaded with this proposal
                  </CardDescription>
                </div>
                {showUploadButton && (
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <UploadIcon className="h-4 w-4" />
                        Upload New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                          Add a supporting document to this proposal
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Document Type</Label>
                          <Select value={documentType} onValueChange={setDocumentType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="budget">Budget Document</SelectItem>
                              <SelectItem value="proposal">Proposal Document</SelectItem>
                              <SelectItem value="technical">Technical Report</SelectItem>
                              <SelectItem value="financial">Financial Statement</SelectItem>
                              <SelectItem value="legal">Legal Agreement</SelectItem>
                              <SelectItem value="mou">MOU</SelectItem>
                              <SelectItem value="report">Progress Report</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>File</Label>
                          <Input
                            type="file"
                            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          />
                        </div>
                        {documentFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {documentFile.name} ({formatFileSize(documentFile.size)})
                          </p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDocumentUpload}
                          disabled={!documentFile || !documentType || uploadingDocument}
                        >
                          {uploadingDocument ? "Uploading..." : "Upload"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {proposal.documents && proposal.documents.length > 0 ? (
                <div className="space-y-3">
                  {proposal.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${getDocumentTypeColor(doc.document_type)}`}>
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size || 0)}</span>
                            <span>•</span>
                            <span>Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => window.open(doc.file, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open in new tab</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No documents uploaded yet</p>
                  <p className="text-sm mt-2">Upload supporting documents to provide more context</p>
                  {showUploadButton && (
                    <Button 
                      variant="outline" 
                      className="mt-4 gap-2"
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      <UploadIcon className="h-4 w-4" />
                      Upload First Document
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Feedback</CardTitle>
              <CardDescription>
                Reviews and feedback from partner organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedbackHistory.length > 0 ? (
                <div className="space-y-6">
                  {feedbackHistory.map((feedback) => (
                    <Card key={feedback.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Feedback Header */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {feedback.reviewer_name?.charAt(0) || 'R'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{feedback.reviewer_name || 'Anonymous Reviewer'}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {feedback.reviewer_role}
                                    </Badge>
                                    {feedback.reviewer_org && (
                                      <Badge variant="secondary" className="text-xs">
                                        {feedback.reviewer_org}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(feedback.created_at), 'PPp')}
                              </p>
                              {feedback.status_change && (
                                <Badge 
                                  variant={feedback.status_change === 'accepted' ? 'default' : 
                                        feedback.status_change === 'rejected' ? 'destructive' : 
                                        'outline'}
                                  className="mt-1"
                                >
                                  {feedback.status_change === 'returned_for_edits' ? 'Returned for Edits' : 
                                  feedback.status_change === 'accepted' ? 'Accepted' : 
                                  feedback.status_change === 'rejected' ? 'Rejected' : 
                                  'Reviewed'}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Feedback Content */}
                          <div className="space-y-3">
                            <div>
                              <Label className="text-muted-foreground text-sm">Feedback</Label>
                              <div className="p-3 bg-muted/30 rounded-lg mt-1">
                                <p className="whitespace-pre-wrap">{feedback.feedback_text}</p>
                              </div>
                            </div>

                            {/* Actions Required */}
                            {feedback.action_required && feedback.action_required.length > 0 && (
                              <div>
                                <Label className="text-muted-foreground text-sm">Actions Required</Label>
                                <div className="mt-2 space-y-2">
                                  {feedback.action_required.map((action:any, index) => (
                                    <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-medium">{index + 1}</span>
                                      </div>
                                      <p className="text-sm">{action}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Review Summary */}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  <Clock4 className="h-3 w-3 mr-1" />
                                  {format(new Date(feedback.created_at), 'MMM d, yyyy')}
                                </Badge>
                                {feedback.reviewer_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {feedback.reviewer_type}
                                  </Badge>
                                )}
                              </div>
                              
                              {feedback.status_change && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Recommendation:</span>
                                  <span className={`font-medium ${
                                    feedback.status_change === 'accepted' ? 'text-green-600' :
                                    feedback.status_change === 'rejected' ? 'text-red-600' :
                                    'text-amber-600'
                                  }`}>
                                    {feedback.status_change === 'returned_for_edits' ? 'Return for Edits' :
                                    feedback.status_change === 'accepted' ? 'Accept Proposal' :
                                    feedback.status_change === 'rejected' ? 'Reject Proposal' :
                                    'No Recommendation'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No feedback yet</p>
                  <p className="text-sm mt-2">
                    {proposal.status === 'submitted' || proposal.status === 'under_review' 
                      ? 'Partner organizations will provide feedback here once they review the proposal.'
                      : 'Feedback will appear here once the proposal is reviewed.'}
                  </p>
                  {canReviewProposal() && (
                    <Button 
                      onClick={() => setReviewDialogOpen(true)}
                      className="mt-4 gap-2"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Submit First Review
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <div className="grid grid-cols-1 lg:grid-cols-13 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                  <CardDescription>
                    Key dates for this proposal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Created Date</p>
                          <p className="text-sm text-muted-foreground">When the proposal was created</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{format(new Date(proposal.created_at), 'PPP')}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(proposal.created_at), 'p')}
                        </p>
                      </div>
                    </div>
                    
                    {proposal.submission_date && (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100">
                            <Send className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">Submitted Date</p>
                            <p className="text-sm text-muted-foreground">When the proposal was submitted for review</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{format(new Date(proposal.submission_date), 'PPP')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(proposal.submission_date), 'p')}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {proposal.review_deadline && (
                      <div className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-amber-100">
                            <Clock className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-medium">Review Deadline</p>
                            <p className="text-sm text-muted-foreground">Deadline for partner reviews</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <p className="font-medium">{format(new Date(proposal.review_deadline), 'PPP')}</p>
                            {daysUntilDeadline !== null && (
                              <Badge variant={daysUntilDeadline < 0 ? "destructive" : daysUntilDeadline <= 7 ? "secondary" : "outline"}>
                                {daysUntilDeadline < 0 
                                  ? `Overdue by ${Math.abs(daysUntilDeadline)} days` 
                                  : `${daysUntilDeadline} days remaining`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {proposal.updated_at && (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-purple-100">
                            <RefreshCw className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">Last Updated</p>
                            <p className="text-sm text-muted-foreground">Last modification date</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{format(new Date(proposal.updated_at), 'PPP')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(proposal.updated_at), 'p')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Milestones</CardTitle>
                  <CardDescription>
                    Key project milestones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {milestones.length > 0 ? (
                    <div className="space-y-3">
                      {milestones.map((milestone, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">{index + 1}</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{milestone.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No milestones defined</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {daysUntilDeadline !== null && daysUntilDeadline <= 7 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Review Deadline Approaching</AlertTitle>
                  <AlertDescription>
                    {daysUntilDeadline <= 0 
                      ? "The review deadline has passed. Please complete your review as soon as possible."
                      : `Only ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} remaining until the review deadline.`
                    }
                  </AlertDescription>
                </Alert>
              )}
            </div> */}
          </div>
        </TabsContent>

        {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  Timeline of all actions and status changes for this proposal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Creation Activity */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="absolute top-8 bottom-0 left-1/2 w-px bg-border -translate-x-1/2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium">Proposal created</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(proposal.created_at), 'PPpp')}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By {proposal.created_by_name || 'Unknown user'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Submission Activity */}
                  {proposal.submission_date && (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Send className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="absolute top-8 bottom-0 left-1/2 w-px bg-border -translate-x-1/2" />
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Proposal submitted for review</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(proposal.submission_date), 'PPpp')}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Status changed from <Badge variant="outline">Draft</Badge> to <Badge variant="secondary">Submitted</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Change Activities */}
                  {/* Track status changes in chronological order */}
                  {(() => {
                    // Collect all status change activities
                    const statusChanges: Array<{
                      id: string;
                      date: Date;
                      from: string;
                      to: string;
                      reviewer?: string;
                      feedback?: string;
                    }> = [];
                    
                    // Initial status from creation
                    statusChanges.push({
                      id: 'created',
                      date: new Date(proposal.created_at),
                      from: 'none',
                      to: 'draft',
                      reviewer: proposal.created_by_name
                    });
                    
                    // Add submission status change
                    if (proposal.submission_date) {
                      statusChanges.push({
                        id: 'submitted',
                        date: new Date(proposal.submission_date),
                        from: 'draft',
                        to: 'submitted',
                        reviewer: proposal.created_by_name
                      });
                    }
                    
                    // Add feedback status changes
                    feedbackHistory
                      .filter(feedback => feedback.status_change)
                      .forEach((feedback, index) => {
                        // Determine the 'from' status based on previous status
                        const previousStatus = index > 0 
                          ? feedbackHistory
                              .filter(f => f.status_change)
                              .slice(0, index)
                              .pop()?.status_change || 'submitted'
                          : proposal.submission_date ? 'submitted' : 'draft';
                        
                        statusChanges.push({
                          id: feedback.id,
                          date: new Date(feedback.created_at),
                          from: previousStatus,
                          to: feedback.status_change!,
                          reviewer: feedback.reviewer_name,
                          feedback: feedback.feedback_text
                        });
                      });
                    
                    // Sort by date
                    statusChanges.sort((a, b) => a.date.getTime() - b.date.getTime());
                    
                    return statusChanges.map((change, index) => (
                      <div key={change.id} className="flex items-start gap-4">
                        <div className="relative">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                          </div>
                          {index < statusChanges.length - 1 && (
                            <div className="absolute top-8 bottom-0 left-1/2 w-px bg-border -translate-x-1/2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">
                              {change.id === 'created' ? 'Proposal created' : 
                              change.id === 'submitted' ? 'Proposal submitted' : 
                              `Status changed by ${change.reviewer || 'Reviewer'}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(change.date, 'PPpp')}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Status changed:</span>
                              {change.from !== 'none' && (
                                <>
                                  <Badge 
                                    variant={change.from === 'draft' ? 'outline' : 
                                          change.from === 'submitted' || change.from === 'under_review' ? 'secondary' :
                                          change.from === 'returned_for_edits' ? 'outline' :
                                          change.from === 'accepted' ? 'default' :
                                          change.from === 'rejected' ? 'destructive' : 'outline'}
                                  >
                                    {change.from === 'returned_for_edits' ? 'Returned for Edits' : 
                                    change.from.charAt(0).toUpperCase() + change.from.slice(1)}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              <Badge 
                                variant={change.to === 'draft' ? 'outline' : 
                                      change.to === 'submitted' || change.to === 'under_review' ? 'secondary' :
                                      change.to === 'returned_for_edits' ? 'outline' :
                                      change.to === 'accepted' ? 'default' :
                                      change.to === 'rejected' ? 'destructive' : 'outline'}
                              >
                                {change.to === 'returned_for_edits' ? 'Returned for Edits' : 
                                change.to.charAt(0).toUpperCase() + change.to.slice(1)}
                              </Badge>
                            </div>
                            {change.feedback && (
                              <div className="text-sm bg-muted/30 p-3 rounded-lg">
                                <p className="font-medium mb-1">Comment:</p>
                                <p className="text-muted-foreground">{change.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                  
                  {/* Document Upload Activities */}
                  {proposal.documents && proposal.documents.map((doc, index) => (
                    <div key={doc.id} className="flex items-start gap-4">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <UploadIcon className="h-4 w-4 text-purple-600" />
                        </div>
                        {index < proposal.documents.length - 1 && (
                          <div className="absolute top-8 bottom-0 left-1/2 w-px bg-border -translate-x-1/2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Document uploaded</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(doc.uploaded_at), 'PPpp')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {doc.document_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Last Updated Activity */}
                  {proposal.updated_at && proposal.updated_at !== proposal.created_at && (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Edit className="h-4 w-4 text-amber-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Proposal updated</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(proposal.updated_at), 'PPpp')}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Version {proposal.current_version}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* No Activity Message */}
                  {proposal.created_at === proposal.updated_at && 
                  !proposal.submission_date && 
                  (!feedbackHistory || feedbackHistory.length === 0) && 
                  (!proposal.documents || proposal.documents.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No activity recorded yet</p>
                      <p className="text-sm mt-1">Updates will appear here as they happen</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>

      {/* Bottom Action Bar */}
      <div className="sticky bottom-6 z-10 flex justify-end">
        <Button asChild size="lg" className="shadow-lg">
          <Link href={`/shared-portal/messages/new?proposal=${proposal.id}`}>
            <MessageCircle className="h-5 w-5 mr-2" />
            Send Message
          </Link>
        </Button>
      </div>
    </div>
  );
}