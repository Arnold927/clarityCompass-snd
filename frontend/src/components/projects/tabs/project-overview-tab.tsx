
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, MapPin } from 'lucide-react';
import { TeamManagement } from '@/components/projects/team-management';
import { LocationEditor } from '@/components/projects/location-editor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import api from '@/lib/api';
import type { Location as LocationType } from '@/components/projects/location-editor';
import { DonorManagement } from '@/components/projects/donor-management';


interface ProjectOverviewTabProps {
  project: any;
  setProject: Function;
}

type Location = LocationType;

export function ProjectOverviewTab({ project, setProject }: ProjectOverviewTabProps) {
    
    const [isLocationEditorOpen, setIsLocationEditorOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);


    const handleDonorsChange = async (newDonors: any[]) => {
    try {
        const donorIds = newDonors.map(donor => donor.id);
        await api.put(`/projects/${project.id}/donors/`, { donor_ids: donorIds });
        
        setProject((prev: any) => ({
        ...prev,
        donors: newDonors,
        }));
    } catch (error) {
        console.error('Error updating project donors:', error);
    }
    };

    const handleSetTeamMembers = (newTeam: any[]) => {
        setProject((prev: any) => ({ ...prev, team: newTeam }));
    };

    const handleOpenLocationEditor = (loc: Location | null = null) => {
        setEditingLocation(loc);
        setIsLocationEditorOpen(true);
    }


    const handleSaveLocation = async (locationToSave: Location) => {
    try {
        let savedLocation: Location;

        if (editingLocation) {
        const res = await api.put(`/locations/${locationToSave.id}/`, {
            ...locationToSave,
            project: project.id,
        });
        savedLocation = res.data;

        setProject((prev: any) => ({
            ...prev,
            locations: prev.locations.map((loc: Location) =>
            loc.id === savedLocation.id ? savedLocation : loc
            ),
        }));
        } else {
        const res = await api.post("/locations/", {
            ...locationToSave,
            project: project.id,
        });
        savedLocation = res.data;

        setProject((prev: any) => ({
            ...prev,
            locations: [...(prev.locations || []), savedLocation],
        }));
        }

        setIsLocationEditorOpen(false);
        setEditingLocation(null);
    } catch (err) {
        console.error("Failed to save location", err);
    }
    };


    const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    try {
        await api.delete(`/locations/${deletingLocation.id}/`);
        setProject((prev: any) => ({
        ...prev,
        locations: prev.locations.filter((loc: Location) => loc.id !== deletingLocation.id),
        }));
        setDeletingLocation(null);
    } catch (err) {
        console.error("Failed to delete location", err);
    }
    };

    const formatCurrency = (amount: number | null | undefined, currency = 'USD') => {
    if (amount === null || amount === undefined) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    
    return formatter.format(amount);
    };


    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <strong>Program:</strong>{" "}
                                {project.program_name || project.program?.name || project.program || "—"}
                            </div>

                            <div>
                                <strong>Project Manager:</strong>{" "}
                                {project.manager_name || project.manager?.full_name || project.manager?.username || project.manager || "—"}
                            </div>

                            <div>
                                <strong>Duration:</strong>{" "}
                                {project.start_date ? project.start_date.split("T")[0] : "—"} to{" "}
                                {project.end_date ? project.end_date.split("T")[0] : "—"}
                            </div>

                            <div>
                                <strong>Budget:</strong> {formatCurrency(project.budget, project.currency)}
                            </div>

                            <div className="flex space-x-4">
                                <div>
                                    <strong>Lifecycle:</strong>{" "}
                                    <Badge
                                    variant={
                                        project.lifecycle_status === "ACTIVE" || project.lifecycle_status === "PLANNED"
                                        ? "default"
                                        : project.lifecycle_status === "COMPLETED"
                                        ? "secondary"
                                        : "destructive"
                                    }
                                    >
                                    {project.lifecycle_status
                                        .replace("_", " ")
                                        .toLowerCase()
                                        .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </Badge>
                                </div>

                                <div>
                                    <strong>Health:</strong>{" "}
                                    <Badge
                                    variant={
                                        project.health_status === "ON_TRACK"
                                        ? "default"
                                        : project.health_status === "AT_RISK"
                                        ? "secondary"
                                        : "destructive"
                                    }
                                    >
                                    {project.health_status
                                        .replace("_", " ")
                                        .toLowerCase()
                                        .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </Badge>
                                </div>
                            </div>

                        </div>

                        <div>
                            {/* <h4 className="font-semibold mb-2 mt-4">Donors</h4>
                            <div className="flex flex-wrap gap-2">
                                {(project.donors || []).map((donor: any) => (
                                    <Badge key={donor.id} variant="secondary">{donor.name}</Badge>
                                ))}
                            </div> */}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Implementation Locations</CardTitle>
                            <CardDescription>Geographic areas where this project is active.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleOpenLocationEditor()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Location
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {project.locations && project.locations.length > 0 ? (
                            <ul className="space-y-1">
                                {project.locations.map((loc: any) => (
                                    <li key={loc.id} className="flex items-center justify-between group p-2 rounded-md hover:bg-muted">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">{loc.name}</span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenLocationEditor(loc)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingLocation(loc)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No implementation locations defined for this project.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <DonorManagement
                donors={project.donors || []}
                onDonorsChange={handleDonorsChange}
                projectId={project.id}
            />
            <TeamManagement
                teamMembers={project.team || []}
                setTeamMembers={handleSetTeamMembers}
                projectManager={project.manager}
                projectId={project.id}
            />

            {isLocationEditorOpen && (
                <LocationEditor
                    location={editingLocation}
                    isOpen={isLocationEditorOpen}
                    onClose={() => { setIsLocationEditorOpen(false); setEditingLocation(null); }}
                    onSave={handleSaveLocation}
                />
            )}

            {deletingLocation && (
                <AlertDialog open={!!deletingLocation} onOpenChange={() => setDeletingLocation(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the location: "{deletingLocation.name}".
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteLocation} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
