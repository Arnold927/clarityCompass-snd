'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from 'lucide-react';
import TeamMemberEditor from './team-member-editor';
import { ROLE_OPTIONS } from '@/lib/constants';
import type { TeamMember } from '@/lib/types';
import api from '@/lib/api';

function formatRole(role: string) {
  if (!role) return "Unknown";
  if (role === 'M_E_OFFICER') return 'M&E Officer';
  return role.replace(/_/g, ' ');
}

export function TeamManagement({
  teamMembers,
  setTeamMembers,
  projectManager,
  selectedProjectTitle = "this project",
  projectId,
}: {
  teamMembers: TeamMember[],
  setTeamMembers: (members: TeamMember[]) => void,
  projectManager?: string,
  selectedProjectTitle?: string,
  projectId: string,
}) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [addingMember, setAddingMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await api.get(`/projects/${projectId}/team-members/`);
        setTeamMembers(res.data);
      } catch (err) {
        console.error('Failed to fetch team members', err);
      }
    }
    fetchTeam();
  }, [projectId]);

  const handleSaveMember = async (memberToSave: Partial<TeamMember>) => {
    if (!memberToSave) return;

    try {
      let res;
      if (memberToSave.id && !memberToSave.id.toString().startsWith("usr-new-")) {
        res = await api.put(`/projects/${projectId}/team-members/${memberToSave.id}/`, memberToSave);
      } else {
        res = await api.post(`/projects/${projectId}/team-members/`, memberToSave);
      }

      const savedMember: TeamMember = res.data;
      let updatedTeam = [...teamMembers];

      if (savedMember.role === 'PROJECT_MANAGER' && projectManager) {
        updatedTeam = updatedTeam.map(m =>
          m.name === projectManager ? { ...m, role: 'VIEWER' } : m
        );
      }

      const index = updatedTeam.findIndex(m => m.id === savedMember.id);
      if (index > -1) {
        updatedTeam[index] = savedMember;
      } else {
        updatedTeam = [...updatedTeam, savedMember];
      }

      setTeamMembers(updatedTeam);
      setIsEditorOpen(false);
      setAddingMember(null);
    } catch (err) {
      console.error('Failed to save team member', err);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    try {
      await api.delete(`/projects/${projectId}/team-members/${member.id}/`);
      setTeamMembers(teamMembers.filter(m => m.id !== member.id));
      setDeletingMember(null);
    } catch (err) {
      console.error('Failed to delete team member', err);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className='flex-row items-center justify-between'>
          <div>
            <CardTitle>Project Team</CardTitle>
            <CardDescription>Manage project team members and their roles.</CardDescription>
          </div>
          <Button onClick={() => setIsEditorOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {teamMembers.map(member => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{formatRole(member.role)}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeletingMember(member)}
                      disabled={member.name === projectManager}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team Member Editor */}
      {isEditorOpen && (
        <TeamMemberEditor
          isOpen={isEditorOpen}
          onClose={() => { setIsEditorOpen(false); setAddingMember(null); }}
          onSave={handleSaveMember}
          projectId={projectId}
          teamMembers={teamMembers}
          availableRoles={ROLE_OPTIONS}
          selectedProjectTitle={selectedProjectTitle}
          addingMember={addingMember}
          setAddingMember={setAddingMember}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to remove <strong>{deletingMember.name}</strong> from the project team?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeletingMember(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteMember(deletingMember)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
