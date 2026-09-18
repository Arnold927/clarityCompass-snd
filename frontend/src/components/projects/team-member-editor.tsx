'use client';

import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleType } from "@/lib/constants";
import { TeamMember } from "@/lib/types";
import api from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

interface TeamMemberEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberToSave: any) => void;
  teamMembers: TeamMember[];
  availableRoles: RoleType[];
  selectedProjectTitle: string;
  projectId: string;
  addingMember: TeamMember | null;
  setAddingMember: React.Dispatch<React.SetStateAction<TeamMember | null>>;
}

export default function TeamMemberEditor({
  isOpen,
  onClose,
  onSave,
  teamMembers,
  availableRoles,
  selectedProjectTitle,
  projectId,
  addingMember,
  setAddingMember,
}: TeamMemberEditorProps) {
  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [externalRole, setExternalRole] = useState<RoleType | "">("");

  const [allUsers, setAllUsers] = useState<User[]>([]);

  const isExisting = Boolean(addingMember?.id);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/users/");
        setAllUsers(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isExisting) {
      setExternalName('');
      setExternalEmail('');
      setExternalPhone(addingMember?.phone || '');
      setExternalRole(addingMember?.role || '');
    }
  }, [isExisting, addingMember]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const memberData = isExisting
      ? {
          user_id: addingMember?.id,
          role: externalRole || addingMember?.role,
          phone: externalPhone || addingMember?.phone,
        }
      : {
          member_name: externalName,
          email: externalEmail,
          phone: externalPhone,
          role: externalRole || "VIEWER",
        };

    try {
      const res = await api.post(`/projects/${projectId}/team-members/`, memberData);

      onSave(res.data);

      setAddingMember(null);
      setExternalName("");
      setExternalEmail("");
      setExternalPhone("");
      setExternalRole("");
      onClose();
    } catch (err) {
      console.error("Failed to save team member:", err);
    }
  };

  const clearExistingSelection = () => {
    setAddingMember(null);
    setExternalPhone("");
    setExternalRole("");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Add Member to {selectedProjectTitle}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Existing User Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Existing User
            </label>
            <select
              className="w-full border rounded px-2 py-1"
              value={addingMember?.id ?? ""}
              onChange={(e) => {
                const selected = allUsers.find((u) => u.id.toString() === e.target.value);
                if (selected) {
                  setAddingMember({
                    id: selected.id,
                    name: selected.name,
                    email: selected.email,
                    phone: "",
                    role: "VIEWER",
                  });
                } else {
                  clearExistingSelection();
                }
              }}
            >
              <option value="">— None —</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-center text-sm text-gray-500 my-2">OR</div>

          {/* External Member Fields */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full Name"
              className="border rounded px-2 py-1 col-span-2"
              value={isExisting ? addingMember?.name || "" : externalName}
              disabled={isExisting}
              onChange={(e) => setExternalName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="border rounded px-2 py-1"
              value={isExisting ? addingMember?.email || "" : externalEmail}
              disabled={isExisting}
              onChange={(e) => setExternalEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Phone"
              className="border rounded px-2 py-1"
              value={externalPhone}
              onChange={(e) => setExternalPhone(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1"
              value={externalRole}
              onChange={(e) => setExternalRole(e.target.value as RoleType)}
            >
              <option value="">Select Role</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Add Member</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
