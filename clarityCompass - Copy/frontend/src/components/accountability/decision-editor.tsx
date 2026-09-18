'use client';

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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "@/components/ui/switch";
import type { Decision, UserDetails, Project, Tag } from "@/lib/api";
import { fetchProjectTeamMembers } from '@/lib/api';

interface DecisionEditorProps {
  decision: Decision | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (decision: Partial<Decision>) => void;
  users?: UserDetails[];
  projects?: Project[];
  tags?: Tag[];
  currentUserId: number;
}

const emptyDecision: Partial<Decision> = {
  id: undefined,
  title: '',
  description: '',
  decision_type: 'action_item',
  owner: null,
  assigned_to: null,
  project: null,
  deadline: null,
  status: 'pending',
  priority: 'medium',
  progress_percentage: 0,
  rationale: '',
  expected_outcome: '',
  actual_outcome: '',
  risk_level: 'medium',
  impact_level: 'medium',
  is_recurring: false,
  recurrence_pattern: '',
  stakeholders: [],
  tags: [],
};

export function DecisionEditor({
  decision,
  isOpen,
  onClose,
  onSave,
  users,
  projects,
  tags,
  currentUserId,
}: DecisionEditorProps) {
  const [currentDecision, setCurrentDecision] = useState<Partial<Decision>>(emptyDecision);
  const [selectedStakeholders, setSelectedStakeholders] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<UserDetails[]>(users || []);

  useEffect(() => {
    if (decision) {
      setCurrentDecision(decision);
      setSelectedStakeholders(decision.stakeholders || []);
      setSelectedTags(decision.tags || []);
    } else {
      setCurrentDecision({
        ...emptyDecision,
        owner: currentUserId,
        created_by: currentUserId,
      });
      setSelectedStakeholders([]);
      setSelectedTags([]);
    }
  }, [decision, isOpen, currentUserId]);

  useEffect(() => {
  const updateAssigneeOptions = async () => {
    if (currentDecision.project && currentDecision.project !== null) {
      try {
        const teamMembers = await fetchProjectTeamMembers(currentDecision.project);
        const teamMemberUsers = teamMembers.map((member:any) => member.user);
        setAssigneeOptions(teamMemberUsers);
      } catch (error) {
        console.error('Error fetching team members:', error);
        setAssigneeOptions(users || []);
      }
    } else {
      setAssigneeOptions(users || []);
    }
  };
  
  updateAssigneeOptions();
}, [currentDecision.project, users]);

  const handleChange = (field: string, value: any) => {
    setCurrentDecision(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const decisionToSave: Partial<Decision> = {
      ...currentDecision,
      stakeholders: selectedStakeholders,
      tags: selectedTags,
    };
    
    onSave(decisionToSave);
  };

  const getStatusOptions = () => [
    'pending', 'in_progress', 'completed', 'overdue', 'cancelled'
  ];

  const getPriorityOptions = () => [
    'low', 'medium', 'high', 'critical'
  ];

  const getDecisionTypeOptions = () => [
    'action_item',
    'strategic_decision', 
    'review_required',
    'follow_up',
    'corrective_action'
  ];

  const getRiskLevelOptions = () => [
    'low', 'medium', 'high'
  ];

  const getImpactLevelOptions = () => [
    'low', 'medium', 'high', 'critical'
  ];

  const getUserName = (userId: number | null) => {
    if (!userId) return 'Unassigned';
    const user = users?.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'Unknown';
  };

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return 'No Project';
    const project = projects?.find(p => p.id === projectId);
    return project ? project.title : 'Unknown Project';
  };

  const title = decision ? "Edit Decision" : "Create New Decision";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {decision ? "Make changes to the decision." : "Enter the details for the new decision."}
            Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Basic Information */}
          <div className="space-y-2">
            <Label htmlFor="title">Title*</Label>
            <Input
              id="title"
              value={currentDecision.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter decision title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={currentDecision.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="col-span-3"
              rows={2}
              placeholder="Describe the decision..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="decision_type">Decision Type</Label>
              <Select 
                value={currentDecision.decision_type} 
                onValueChange={(value) => handleChange('decision_type', value)}
              >
                <SelectTrigger id="decision_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {getDecisionTypeOptions().map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select 
                value={currentDecision.project?.toString() || ''} 
                onValueChange={(value) => handleChange('project', value ? parseInt(value) : null)}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {/* {projects?.map((project) => ( */}
                  {projects?.filter(p => p && p.id && p.title).map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ownership */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Owner*</Label>
              <Select 
                value={currentDecision.owner?.toString() || ''}
                onValueChange={(value) => handleChange('owner', value ? parseInt(value) : null)}
              >
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.first_name} {user.last_name} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned To</Label>
              <Select 
                value={currentDecision.assigned_to?.toString() || ''}
                onValueChange={(value) => handleChange('assigned_to', value ? parseInt(value) : null)}
              >
                <SelectTrigger id="assigned_to">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assigneeOptions.filter(user => user && user.id).map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.first_name} {user.last_name} ({user.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={currentDecision.deadline || ''}
                onChange={(e) => handleChange('deadline', e.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress_percentage">Progress (%)</Label>
              <Input
                id="progress_percentage"
                type="number"
                min="0"
                max="100"
                value={currentDecision.progress_percentage || 0}
                onChange={(e) => handleChange('progress_percentage', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={currentDecision.status} 
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {getStatusOptions().map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={currentDecision.priority} 
                onValueChange={(value) => handleChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {getPriorityOptions().map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Risk & Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="risk_level">Risk Level</Label>
              <Select 
                value={currentDecision.risk_level} 
                onValueChange={(value) => handleChange('risk_level', value)}
              >
                <SelectTrigger id="risk_level">
                  <SelectValue placeholder="Select risk level" />
                </SelectTrigger>
                <SelectContent>
                  {getRiskLevelOptions().map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="impact_level">Impact Level</Label>
              <Select 
                value={currentDecision.impact_level} 
                onValueChange={(value) => handleChange('impact_level', value)}
              >
                <SelectTrigger id="impact_level">
                  <SelectValue placeholder="Select impact level" />
                </SelectTrigger>
                <SelectContent>
                  {getImpactLevelOptions().map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="rationale">Rationale</Label>
            <Textarea
              id="rationale"
              value={currentDecision.rationale || ''}
              onChange={(e) => handleChange('rationale', e.target.value)}
              rows={2}
              placeholder="Why this decision was made..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_outcome">Expected Outcome</Label>
            <Textarea
              id="expected_outcome"
              value={currentDecision.expected_outcome || ''}
              onChange={(e) => handleChange('expected_outcome', e.target.value)}
              rows={2}
              placeholder="What outcome is expected..."
            />
          </div>

          {/* Stakeholders */}
          <div className="space-y-2">
            <Label>Stakeholders</Label>
            <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
              {users?.map((user) => (
                <div key={user.id} className="flex items-center space-x-2 p-1">
                  <input
                    type="checkbox"
                    id={`stakeholder-${user.id}`}
                    checked={selectedStakeholders.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStakeholders([...selectedStakeholders, user.id]);
                      } else {
                        setSelectedStakeholders(selectedStakeholders.filter(id => id !== user.id));
                      }
                    }}
                  />
                  <label htmlFor={`stakeholder-${user.id}`} className="text-sm">
                    {user.first_name} {user.last_name} ({user.username})
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
              {tags?.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2 p-1">
                  <input
                    type="checkbox"
                    id={`tag-${tag.id}`}
                    checked={selectedTags.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag.id]);
                      } else {
                        setSelectedTags(selectedTags.filter(id => id !== tag.id));
                      }
                    }}
                  />
                  <label htmlFor={`tag-${tag.id}`} className="text-sm flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={currentDecision.is_recurring || false}
              onCheckedChange={(checked) => handleChange('is_recurring', checked)}
            />
            <Label htmlFor="is_recurring">Recurring Decision</Label>
          </div>

          {currentDecision.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
              <Input
                id="recurrence_pattern"
                value={currentDecision.recurrence_pattern || ''}
                onChange={(e) => handleChange('recurrence_pattern', e.target.value)}
                placeholder="e.g., weekly, monthly, quarterly"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentDecision.title}>
            {decision ? 'Save Changes' : 'Create Decision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}