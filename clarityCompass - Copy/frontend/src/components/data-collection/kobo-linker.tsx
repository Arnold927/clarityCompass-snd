'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ExternalLink, RefreshCw, Check, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface KoboForm {
  uid: string;
  name: string;
  date_created: string;
  date_modified: string;
  deployment__active: boolean;
  submissions_count: number;
  asset_type: string;
}

interface KoboFormLinkerProps {
  projectId?: string;
  onBack: () => void;
}

export function KoboFormLinker({ projectId, onBack }: KoboFormLinkerProps) {
  const [koboForms, setKoboForms] = useState<KoboForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<KoboForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState<KoboForm | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [linking, setLinking] = useState(false);
  const { toast } = useToast();

  const fetchKoboForms = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data-collection/forms/kobo-forms/');
      setKoboForms(response.data.forms || []);
      setFilteredForms(response.data.forms || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching Kobo forms',
        description: error.response?.data?.error || 'Could not connect to Kobo Toolbox',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKoboForms();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredForms(koboForms);
      return;
    }
    
    const filtered = koboForms.filter(form =>
      form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.uid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredForms(filtered);
  }, [searchTerm, koboForms]);

  const handleSelectForm = (form: KoboForm) => {
    setSelectedForm(form);
    setFormTitle(form.name);
    setFormDescription(`Linked from Kobo: ${form.name}`);
  };

  const handleLinkForm = async () => {
    if (!selectedForm) return;

    setLinking(true);
    try {
      const response = await api.post(`/data-collection/forms/create-kobo-form/`, {
        asset_id: selectedForm.uid,
        title: formTitle || selectedForm.name,
        description: formDescription,
        projectIds: projectId ? [projectId] : [],
        form_type: 'kobo',
      });

      toast({
        title: 'Form Linked Successfully',
        description: `${selectedForm.name} has been linked to your project.`,
      });

      window.location.href = `/data-collection/forms/kobo/${response.data.form.id}`;
    } catch (error: any) {
      toast({
        title: 'Failed to Link Form',
        description: error.response?.data?.error || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Link Kobo Toolbox Form</h2>
          <p className="text-muted-foreground">
            Connect an existing Kobo form to your project for offline data collection
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Kobo Forms */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Available Kobo Forms</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchKoboForms}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Select a form from your Kobo Toolbox account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Loading Kobo forms...</p>
                  </div>
                ) : filteredForms.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">
                      {searchTerm ? 'No matching forms found' : 'No forms available in your Kobo account'}
                    </p>
                    <Button variant="outline" className="mt-4" asChild>
                      <a
                        href="https://kf.kobotoolbox.org/#/forms"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Go to Kobo Toolbox
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Form Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submissions</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredForms.map((form) => (
                          <TableRow 
                            key={form.uid}
                            className={
                              selectedForm?.uid === form.uid 
                                ? 'bg-muted/50' 
                                : 'cursor-pointer hover:bg-muted/30'
                            }
                            onClick={() => handleSelectForm(form)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {form.name}
                                {selectedForm?.uid === form.uid && (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={form.deployment__active ? 'default' : 'secondary'}>
                                {form.deployment__active ? 'Active' : 'Draft'}
                              </Badge>
                            </TableCell>
                            <TableCell>{form.submissions_count}</TableCell>
                            <TableCell>
                              {new Date(form.date_created).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a
                                  href={`https://kf.kobotoolbox.org/#/forms/${form.uid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Details & Link */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              <CardDescription>
                Configure how this form appears in your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedForm ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Form Title *</Label>
                    <Input
                      id="form-title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Enter a display name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Original in Kobo: {selectedForm.name}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="form-description">Description</Label>
                    <Input
                      id="form-description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium">Kobo Form Information</h4>
                    <div className="text-sm space-y-1">
                    <div><span className="font-medium">ID:</span> {selectedForm.uid}</div>
                    <div><span className="font-medium">Status:</span> 
                      <Badge variant={selectedForm.deployment__active ? 'default' : 'secondary'} className="ml-2">
                        {selectedForm.deployment__active ? 'Active' : 'Draft'}
                      </Badge>
                    </div>
                    <div><span className="font-medium">Submissions:</span> {selectedForm.submissions_count}</div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedForm.date_created).toLocaleDateString()}</div>
                  </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      onClick={handleLinkForm}
                      disabled={!formTitle.trim() || linking}
                    >
                      {linking ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link Kobo Form
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    Select a Kobo form from the list to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">How Kobo Forms Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Forms sync automatically from Kobo</p>
              <p>• Field workers use Kobo Collect app offline</p>
              <p>• Data appears here when sync completes</p>
              <p>• You cannot edit the form structure here</p>
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <a
                  href="https://support.kobotoolbox.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more about Kobo
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}