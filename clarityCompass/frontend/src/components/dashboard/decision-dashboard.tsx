'use client';

import React, { useState, useEffect } from 'react';
import { AccountabilityLedger } from '@/components/accountability/accountability-ledger';
import { QuickActions } from '@/components/accountability/quick-actions';
import { DecisionTimeline } from '@/components/accountability/decision-timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchDecisionStats } from '@/lib/api';
import type { Decision } from '@/lib/types';
import { useRouter } from 'next/navigation';

export function DecisionDashboard() {
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [stats, setStats] = useState<any>({});
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const router = useRouter();

  useEffect(() => {
    loadStats();
  }, [refetchTrigger]);

  const loadStats = async () => {
    try {
      const data = await fetchDecisionStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleDecisionSelect = (decision: Decision) => {
    setSelectedDecision(decision);
  };

  const handleDecisionUpdate = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <div className="text-sm text-muted-foreground">Total Decisions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue || 0}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed || 0}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.in_progress || 0}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">All Decisions</TabsTrigger>
          <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="recent">Recently Updated</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AccountabilityLedger 
                onEdit={handleDecisionSelect}
                refetchTrigger={refetchTrigger}
                showFilters
              />
            </div>
            <div className="space-y-4">
              {selectedDecision ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Selected Decision</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DecisionTimeline 
                        decision={selectedDecision}
                        onProgressUpdate={handleDecisionUpdate}
                      />
                      <QuickActions 
                        decision={selectedDecision}
                        onUpdate={handleDecisionUpdate}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                    Select a decision to view details
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="my-tasks">
          <AccountabilityLedger 
            refetchTrigger={refetchTrigger}
            showFilters
            onEdit={handleDecisionSelect}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}