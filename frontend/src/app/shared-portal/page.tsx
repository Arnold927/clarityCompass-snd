'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, BarChart, MessageSquare, AlertCircle, CheckCircle, Clock, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { sharedPortalService } from "@/lib/shared-portal-service";
import { useSharedPortalAuth } from "./auth-context";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  active_proposals: number;
  pending_reports: number;
  unread_messages: number;
  upcoming_deadlines: number;
  recent_proposals: any[];
  recent_reports: any[];
}

export default function SharedPortalDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading, isAuthenticated } = useSharedPortalAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/shared-portal/login');
      return;
    }

    if (isAuthenticated) {
      loadDashboard();
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDashboard = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const hasValidToken = await sharedPortalService.checkAuth();
      if (!hasValidToken) {
        throw new Error('Session expired. Please login again.');
      }
      
      const data = await sharedPortalService.getDashboard();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      
      if (error.message.includes('Session expired') || error.message.includes('401')) {
        setError('Your session has expired. Please login again.');
        setTimeout(() => {
          sharedPortalService.clearTokens();
          router.push('/shared-portal/login');
        }, 2000);
      } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h1 className="text-3xl font-bold mb-2">Unable to load dashboard</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={loadDashboard}>
              Try Again
            </Button>
            {error.includes('Session expired') && (
              <Button variant="outline" asChild>
                <Link href="/shared-portal/login">
                  Go to Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-2">Unable to load dashboard</h1>
          <p className="text-muted-foreground">No data available</p>
          <Button onClick={loadDashboard} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    return user.firstName || 'User';
  };

  const getUserOrganization = () => {
  if (!user) return 'Organization';
  
  console.log('🔍 Full user object:', user);
  
  switch(user.role) {
    case 'ngo_user':
      return user.ngo_name || user.ngoName || 'NGO User';
    case 'donor_reviewer':
      return user.organization_name || user.organizationName || 'Donor Reviewer';
    case 'oversight_body':
      return user.organization_name || user.organizationName || 'Oversight Body';
    case 'admin':
      return 'Administrator';
    default:
      return 'Organization';
  }
};

  const getUserRole = () => {
    if (!user) return 'User';
    
    const role = user.role || '';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {getUserDisplayName()}!</h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your collaborations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize" style={{borderColor:"#C8793A",color:"#C8793A"}}>
            {getUserRole()}
          </Badge>
          <Badge style={{backgroundColor:"#E8C97A",color:"#5A3010"}}>
            {getUserOrganization()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_proposals}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'ngo_user' ? 'Under review' : 'Awaiting your review'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_reports}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'ngo_user' ? 'To be submitted' : 'Require review'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread_messages}</div>
            <p className="text-xs text-muted-foreground">
              From partners and collaborators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming_deadlines}</div>
            <p className="text-xs text-muted-foreground">
              In the next 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Proposals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Proposals</CardTitle>
                <CardDescription>Your latest proposal submissions</CardDescription>
              </div>
              <Link href="/shared-portal/proposals">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_proposals.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No proposals yet
                </div>
              ) : (
                stats.recent_proposals.slice(0, 5).map((proposal) => (
                  <Link 
                    key={proposal.id} 
                    href={`/shared-portal/proposals/${proposal.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-secondary p-2 rounded-lg transition-colors">
                      <div className="flex-1">
                        <p className="font-medium truncate">{proposal.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{proposal.ngo_details?.name || 'NGO'}</span>
                          <span>•</span>
                          <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          proposal.status === 'accepted' ? 'default' :
                          proposal.status === 'under_review' ? 'secondary' :
                          proposal.status === 'returned_for_edits' ? 'destructive' : 'outline'
                        } className="ml-2">
                          {proposal.status.replace('_', ' ')}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {user?.role === 'ngo_user' && (
              <Button className="w-full mt-4" asChild>
                <Link href="/shared-portal/proposals/new">
                  <FileText className="mr-2 h-4 w-4" />
                  Create New Proposal
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>Latest report submissions and reviews</CardDescription>
              </div>
              <Link href="/shared-portal/reports">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_reports.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No reports yet
                </div>
              ) : (
                stats.recent_reports.slice(0, 5).map((report) => (
                  <Link 
                    key={report.id} 
                    href={`/shared-portal/reports/${report.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-secondary p-2 rounded-lg transition-colors">
                      <div className="flex-1">
                        <p className="font-medium truncate">{report.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{report.period}</span>
                          <span>•</span>
                          <span>{report.ngo_details?.name || 'NGO'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="ml-2" style={{
                            backgroundColor:
                              report.status === 'accepted'     ? '#4A6830' :
                              report.status === 'submitted'    ? '#E8C97A' :
                              report.status === 'under_review' ? 'transparent' : '#C0392B',
                            color:
                              report.status === 'accepted'     ? '#fff' :
                              report.status === 'submitted'    ? '#5A3010' :
                              report.status === 'under_review' ? '#5A3010' : '#fff',
                            border: report.status === 'under_review' ? '1px solid #D4B090' : 'none'
                          }}>
                          {report.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
            {user?.role === 'ngo_user' && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/shared-portal/reports/new">
                  <BarChart className="mr-2 h-4 w-4" />
                  Submit New Report
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you can perform right now</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {user?.role === 'ngo_user' ? (
              <>
                <Button variant="outline" className="h-auto flex-col items-center justify-center p-4" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
                  <Link href="/shared-portal/proposals/new">
                    <FileText className="mb-2 h-6 w-6" />
                    <span>Submit Proposal</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-center justify-center p-4" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
                  <Link href="/shared-portal/reports/new">
                    <BarChart className="mb-2 h-6 w-6" />
                    <span>Share Report</span>
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="h-auto flex-col items-center justify-center p-4" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
                  <Link href="/shared-portal/proposals?status=under_review">
                    <CheckCircle className="mb-2 h-6 w-6" />
                    <span>Review Proposals</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col items-center justify-center p-4" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
                  <Link href="/shared-portal/reports?status=submitted">
                    <TrendingUp className="mb-2 h-6 w-6" />
                    <span>Review Reports</span>
                  </Link>
                </Button>
              </>
            )}
            <Button variant="outline" className="h-auto flex-col items-center justify-center p-4" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
              <Link href="/shared-portal/messages">
                <MessageSquare className="mb-2 h-6 w-6" />
                <span>Check Messages</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-center justify-center p-4" style={{borderColor:"#C8793A",color:"#C8793A"}} asChild>
              <Link href="/shared-portal/documents">
                <Users className="mb-2 h-6 w-6" />
                <span>View Documents</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}