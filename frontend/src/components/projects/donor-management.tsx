'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, X, Pencil } from 'lucide-react';
import { DonorEditor } from './donor-editor';
import api from '@/lib/api';
import { Donor } from './donor-editor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface DonorManagementProps {
  donors: Donor[];
  onDonorsChange: (donors: Donor[]) => void;
  projectId: number;
}

export function DonorManagement({ donors, onDonorsChange, projectId }: DonorManagementProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [allDonors, setAllDonors] = useState<Donor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllDonors = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/donors/');
      setAllDonors(response.data);
    } catch (error) {
      console.error('Error fetching donors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewDonor = () => {
    setEditingDonor(null);
    setIsEditorOpen(true);
  };

  const handleEditDonor = (donor: Donor) => {
    setEditingDonor(donor);
    setIsEditorOpen(true);
  };

  const handleSaveDonor = async (donorData: Donor) => {
    try {
      let savedDonor:any;
      if (donorData.id) {
        const response = await api.put(`/donors/${donorData.id}/`, donorData);
        savedDonor = response.data;
        onDonorsChange(
          donors.map(d => d.id === savedDonor.id ? savedDonor : d)
        );
      } else {
        const response = await api.post('/donors/', donorData);
        savedDonor = response.data;
        onDonorsChange([...donors, savedDonor]);
      }
      
      if (isSelectorOpen) {
        fetchAllDonors();
      }
      
      setIsEditorOpen(false);
      setEditingDonor(null);
    } catch (error) {
      console.error('Error saving donor:', error);
      throw error;
    }
  };

  const handleRemoveDonor = async (donorId: number) => {
    try {
      onDonorsChange(donors.filter(d => d.id !== donorId));
      await api.delete(`/projects/${projectId}/donors/${donorId}/`);
    } catch (error) {
      console.error('Error removing donor:', error);
    }
  };

  const handleAddExistingDonor = async (donor: Donor) => {
    try {
      await api.post(`/projects/${projectId}/donors/`, { donor_id: donor.id });
      onDonorsChange([...donors, donor]);
      setIsSelectorOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding donor:', error);
    }
  };

  const filteredDonors = allDonors.filter(donor =>
    !donors.some(d => d.id === donor.id) &&
    (donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     donor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     donor.country?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const donorTypeColors: Record<string, string> = {
    INDIVIDUAL: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    FOUNDATION: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    CORPORATE: 'bg-green-100 text-green-800 hover:bg-green-200',
    GOVERNMENT: 'bg-red-100 text-red-800 hover:bg-red-200',
    NGO: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Donors</CardTitle>
                <CardDescription>
                  {donors.length > 0 
                    ? `${donors.length} donor${donors.length > 1 ? 's' : ''} supporting this project`
                    : 'No donors assigned yet'
                  }
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      fetchAllDonors();
                      setIsSelectorOpen(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Donor
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Donor to Project</DialogTitle>
                    <DialogDescription>
                      Select an existing donor or create a new one
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search donors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Existing Donors</span>
                        <span className="text-xs text-muted-foreground">
                          {filteredDonors.length} available
                        </span>
                      </div>
                      <ScrollArea className="h-60">
                        {isLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                          </div>
                        ) : filteredDonors.length > 0 ? (
                          <div className="space-y-2 pr-4">
                            {filteredDonors.map(donor => (
                              <div
                                key={donor.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                                onClick={() => handleAddExistingDonor(donor)}
                              >
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{donor.name}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${donorTypeColors[donor.donor_type] || ''}`}
                                    >
                                      {donor.donor_type.replace('_', ' ')}
                                    </Badge>
                                    {donor.country && (
                                      <span className="text-xs text-muted-foreground">{donor.country}</span>
                                    )}
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? 'No donors found' : 'No available donors'}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setIsSelectorOpen(false);
                          handleAddNewDonor();
                        }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Donor
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {donors.length > 0 ? (
            <div className="space-y-3">
              {donors.map(donor => (
                <div 
                  key={donor.id} 
                  className="group flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{donor.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${donorTypeColors[donor.donor_type] || ''}`}
                        >
                          {donor.donor_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {donor.email && (
                          <span>{donor.email}</span>
                        )}
                        {donor.country && (
                          <span className="flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground"></span>
                            {donor.country}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditDonor(donor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => donor.id && handleRemoveDonor(donor.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="font-medium">No donors yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add donors to track funding sources for this project
                  </p>
                </div>
              </div>
              <Button onClick={handleAddNewDonor}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add First Donor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditorOpen && (
        <DonorEditor
          donor={editingDonor}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingDonor(null);
          }}
          onSave={handleSaveDonor}
        />
      )}
    </>
  );
}