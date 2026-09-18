'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { fieldTypes } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GripVertical, PlusCircle, Save, Trash2, Check, Share2, ArrowLeft, Folder } from 'lucide-react';
import { FieldEditor } from './field-editor';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';

export function FormBuilder({ formId }: { formId: string | null }) {
  const [form, setForm] = useState<any>(null);
  const [editingField, setEditingField] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const { toast } = useToast();
  const [draggedField, setDraggedField] = useState<any>(null);
  const [projectDetails, setProjectDetails] = useState<any>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const projectIdFromUrl = searchParams.get('projectId');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects/");
        setProjects(res.data);
        
        if (projectIdFromUrl) {
          try {
            const projectRes = await api.get(`/projects/${projectIdFromUrl}/`);
            setProjectDetails(projectRes.data);
          } catch (projectErr) {
            console.error("Failed to fetch project details:", projectErr);
          }
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        toast({ title: "Error fetching projects", description: "Could not load projects.", variant: "destructive" });
      }
    };
    fetchProjects();
  }, [projectIdFromUrl]);

  useEffect(() => {
    if (!formId) {
      setForm({ 
        title: '', 
        description: '', 
        projectIds: projectIdFromUrl ? [projectIdFromUrl] : [], 
        fields: [] 
      });
      return;
    }

    const fetchForm = async () => {
      try {
        const res = await api.get(`/data-collection/forms/${formId}/`);
        const fields = res.data.form_fields || [];
        const processedFields = fields.map((field: any, index: number) => ({
          ...field,
          id: String(field.id),
          order: field.order !== undefined ? field.order : index,
          nested_subfields: field.nested_subfields || [],
        }));
        setForm({ ...res.data, projectIds: res.data.projects || [], fields:processedFields });
      } catch (err) {
        console.error("Failed to fetch form:", err);
        toast({ title: "Error loading form", description: "Could not load the form data.", variant: "destructive" });
      }
    };
    fetchForm();
  }, [formId, projectIdFromUrl]);

  const handleFormMetaChange = (field: string, value: string | string[]) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleProjectSelect = (projectId: string) => {
    const newProjectIds = (form.projectIds || []).includes(projectId)
      ? form.projectIds.filter((id: string) => id !== projectId)
      : [...(form.projectIds || []), projectId];
    handleFormMetaChange('projectIds', newProjectIds);
  };

  const handleBackToProject = () => {
    if (projectIdFromUrl) {
      router.push(`/projects/${projectIdFromUrl}?tab=data-collection`);
    } else if (form?.projectIds?.length > 0) {
      router.push(`/projects/${form.projectIds[0]}?tab=data-collection`);
    } else {
      router.push('/data-collection');
    }
  };

  const recalcFieldOrder = (fields: any[]): any[] =>
    (fields || []).map((f, idx) => ({ ...f, id: String(f.id), order: idx, nested_subfields: recalcFieldOrder(f.nested_subfields) }));

  const handleAddField = () => {
    setEditingField({
      id: `tmp-${Date.now()}`,
      label: 'New Field',
      field_type: 'text',
      type: 'text',
      required: false,
      options: [],
      nested_subfields: [],
      order: (form?.fields?.length ?? 0),
    });
  };

  const handleEditField = (field: any) => {
    setEditingField({ ...field, id: String(field.id) });
  };

  const handleSaveField = (fieldToSave: any) => {
    setForm((prev: any) => {
      const existingIndex = (prev.fields || []).findIndex((f: any) => String(f.id) === String(fieldToSave.id));
      if (existingIndex > -1) {
        const updatedFields = [...prev.fields];
        updatedFields[existingIndex] = { ...fieldToSave, nested_subfields: fieldToSave.nested_subfields || [] };
        return { ...prev, fields: updatedFields };
      } else {
        return { ...prev, fields: [...(prev.fields || []), { ...fieldToSave, nested_subfields: fieldToSave.nested_subfields || [] }] };
      }
    });
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    const removeRecursive = (fields: any[]): any[] =>
      (fields || []).filter(f => String(f.id) !== String(fieldId)).map(f => ({ ...f, nested_subfields: removeRecursive(f.nested_subfields) }));
    setForm((prev: any) => ({ ...prev, fields: recalcFieldOrder(removeRecursive(prev.fields || [])) }));
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, field: any) => {
    setDraggedField(field);
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (!draggedField) return;

    const fields = [...(form.fields || [])];
    const draggedIndex = fields.findIndex(f => String(f.id) === String(draggedField.id));
    if (draggedIndex === -1) return;

    const [reorderedItem] = fields.splice(draggedIndex, 1);
    fields.splice(dropIndex, 0, reorderedItem);
    setForm({ ...form, fields: recalcFieldOrder(fields) });
    setDraggedField(null);
  };
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => e.currentTarget.style.opacity = '1';

  const sortFieldsByDependency = (fields: any[]): any[] => {
    const map = new Map(fields.map(f => [f.id, f]));
    const visited = new Set<string>();
    const result: any[] = [];

    function visit(field: any) {
      if (visited.has(field.id)) return;
      visited.add(field.id);

      const cond = field.condition;
      if (cond && cond.fieldId && map.has(cond.fieldId)) {
        visit(map.get(cond.fieldId));
      }

      result.push(field);

      if (field.nested_subfields?.length) {
        field.nested_subfields = sortFieldsByDependency(field.nested_subfields);
      }
    }

    fields.forEach(f => visit(f));
    return result;
  };

  interface FormFieldType {
    id: string;
    oldId?: string;
    condition?: { fieldId: string; operator: string; value: any };
    nested_subfields?: FormFieldType[];
    [key: string]: any;
  };

  const handleSaveForm = async () => {
    if (!form) return;

    try {
      setIsSaving(true);

      const formCopy = JSON.parse(JSON.stringify(form));

      const assignTmpIds = (fields: FormFieldType[]): void => {
        (fields || []).filter(Boolean).forEach(f => {
          if (!f.id) f.id = `tmp-${crypto.randomUUID()}`;
          if (f.nested_subfields?.length) assignTmpIds(f.nested_subfields);
        });
      };
      assignTmpIds(formCopy.fields);

      const saveMethod = formId ? api.put : api.post;
      const endpoint = formId 
      ? `/data-collection/forms/${formId}/` 
      : '/data-collection/forms/';

      const res1 = await saveMethod(endpoint, {
        ...formCopy,
        projects: formCopy.projectIds,
        form_fields: formCopy.fields,
      });

      const tmpToRealId: Record<string, string> = {};
      const flattenFields = (fields: FormFieldType[], realFields: FormFieldType[]): void => {
        (fields || []).filter(Boolean).forEach((f, idx) => {
          if (!realFields?.[idx]) return;
          tmpToRealId[f.id] = realFields[idx].id;
          flattenFields(f.nested_subfields ?? [], realFields[idx].nested_subfields ?? []);
        });
      };
      flattenFields(formCopy.fields, res1.data.form_fields ?? []);

      const conditionsPayload: { id: string; condition: { fieldId: string; operator: string; value: any } }[] = [];
      const flattenForPatch = (fields: FormFieldType[]) => {
        (fields || []).filter(Boolean).forEach(f => {
          if (f.condition) {
            const realFieldId = tmpToRealId[f.id];
            const realDepId = tmpToRealId[f.condition.fieldId];
            if (realFieldId && realDepId) {
              conditionsPayload.push({
                id: realFieldId,
                condition: { ...f.condition, fieldId: realDepId },
              });
            }
          }
          if (f.nested_subfields?.length) flattenForPatch(f.nested_subfields);
        });
      };
      flattenForPatch(formCopy.fields);

      if (conditionsPayload.length) {
        await api.patch('/data-collection/fields/update-conditions/', { conditions: conditionsPayload });
      }

      toast({ title: "Form Saved", description: `Form "${formCopy.title}" saved successfully.` });

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error saving form", description: JSON.stringify(err.response?.data || err.message), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };



  if (!form) return <p>Loading form...</p>;

  const selectedProjects = projects.filter(p => (form.projectIds || []).includes(p.id));
  
  const projectFromUrl = projectIdFromUrl ? projects.find(p => String(p.id) === projectIdFromUrl) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        {/* Form Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Form Details</span>
              {/* {(projectIdFromUrl || form?.projectIds?.length > 0) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBackToProject}
                  className="flex items-center gap-2"
                >
                  <Folder className="h-4 w-4" />
                  {projectDetails ? `Back to ${projectDetails.title}` : 'Back to Project'}
                </Button>
              )} */}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* {projectDetails && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Creating form for project:</p>
                    <p className="font-semibold text-blue-900">{projectDetails.title}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleBackToProject}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Project
                  </Button>
                </div>
              </div>
            )} */}
            
            <div className="space-y-2">
              <Label htmlFor="form-title">Form Title</Label>
              <Input id="form-title" value={form.title} onChange={(e) => handleFormMetaChange('title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-description">Description</Label>
              <Textarea id="form-description" value={form.description} onChange={(e) => handleFormMetaChange('description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link to Project(s)</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between h-auto">
                    <div className="flex gap-1 flex-wrap">
                      {selectedProjects.length > 0 ? (
                        selectedProjects.map(p => (
                          <Badge key={p.id} variant="secondary">{p.title}</Badge>
                        ))
                      ) : projectFromUrl ? (
                        <Badge variant="secondary">{projectFromUrl.title}</Badge>
                      ) : (
                        "Select project(s)..."
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search projects..." />
                    <CommandList>
                      <CommandEmpty>No project found.</CommandEmpty>
                      <CommandGroup>
                        {projects.map(p => (
                          <CommandItem 
                            key={p.id} 
                            value={p.title} 
                            onSelect={() => handleProjectSelect(String(p.id))}
                          >
                            <Check className={cn(
                              "mr-2 h-4 w-4", 
                              (form.projectIds || []).includes(String(p.id)) ? "opacity-100" : "opacity-0"
                            )} />
                            {p.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {projectIdFromUrl && !formId && (
                <p className="text-xs text-muted-foreground">
                  This form will be linked to the current project. You can add more projects if needed.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Form Fields</CardTitle>
            <CardDescription>Drag and drop to reorder fields.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(form.fields || []).map((field: any, index: any) => (
                <div key={String(field.id)}
                  className="drop-zone flex items-center gap-2 p-4 border rounded-lg bg-muted/50 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, field)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}>
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {field.condition && <Share2 className="h-4 w-4 text-muted-foreground" />}
                      <p className="font-semibold">{field.label} {field.required && <span className="text-red-500">*</span>}</p>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{(field.field_type || '').replace('_', ' ')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditField(field)}>Edit</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteField(field.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {(form.fields || []).length === 0 && <p className="text-center text-muted-foreground py-4">No fields added yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="lg:col-span-1 space-y-4 sticky top-4">
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={handleAddField}><PlusCircle className="mr-2 h-4 w-4" /> Add New Field</Button>
            <Button className="w-full" variant="default" onClick={handleSaveForm} disabled={isSaving}><Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Form'}</Button>
            
            {(projectIdFromUrl || form?.projectIds?.length > 0) && (
              <>
                <div className="pt-2 border-t">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleBackToProject}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Project
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {editingField && (
        <FieldEditor
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          onSave={handleSaveField}
          field={editingField}
          formFields={form.fields || []}
          availableTypes={fieldTypes}
        />
      )}
    </div>
  );
}