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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "../ui/checkbox";
import { Separator } from "../ui/separator";
import { PlusCircle, Trash2 } from "lucide-react";
import { subFieldTypes } from "@/lib/mock-data";

interface FieldEditorProps {
  field: any;
  formFields: any[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: any) => void;
  availableTypes: string[];
}

export function FieldEditor({
  field,
  formFields,
  isOpen,
  onClose,
  onSave,
  availableTypes
}: FieldEditorProps) {
  const [currentField, setCurrentField] = useState<any>(null);
  const [hasCondition, setHasCondition] = useState(false);

  const getType = (f: any) => f?.type || f?.field_type;

  useEffect(() => {
    if (!field) return;
    const initial = {
      ...field,
      id: String(field?.id ?? `tmp-${Date.now()}`),
      type: field?.type || field?.field_type || 'text',
      field_type: field?.field_type || field?.type || 'text',
      options: Array.isArray(field?.options) ? field.options : (field?.options?.choices || []),
      // subfields: (field?.subfields || []).map((s: any) => ({
      nested_subfields: (field?.nested_subfields || field?.subfields || []).map((s: any) => ({

        ...s,
        id: String(s.id ?? `${field?.id}-sub-${Math.random().toString(36).slice(2,8)}`),
        type: s.type || s.field_type || 'text',
        field_type: s.field_type || s.type || 'text',
        options: Array.isArray(s.options) ? s.options : (s.options?.choices || []),
      })),
      required: !!field?.required,
      order: field?.order ?? 0,
      label: field?.label ?? '',
      condition: field?.condition ? { ...field.condition, fieldId: String(field.condition.fieldId) } : undefined,
    };
    setCurrentField(initial);
    setHasCondition(!!initial.condition);
  }, [field, isOpen]);

  const handleChange = (prop: string, value: any) => {
    setCurrentField((prev: any) => ({ ...prev, [prop]: value }));
  };

  const handleTypeChange = (value: string) => {
    const newField = { ...currentField, type: value, field_type: value };
    if (value === 'field_group') newField.nested_subfields = newField.nested_subfields || [];
    if (value === 'select' || value === 'checkbox') newField.options = newField.options || [];
    else newField.options = [];
    setCurrentField(newField);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(currentField.options || [])];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const handleAddOption = () => handleChange('options', [...(currentField.options || []), 'New Option']);
  const handleRemoveOption = (index: number) => handleChange('options', (currentField.options || []).filter((_: any, i: number) => i !== index));

  const handleAddSubField = () => {
    const newSubField = {
      id: `${currentField.id}-sub-${(currentField.nested_subfields || []).length + 1}`,
      label: 'New Sub-Field',
      type: 'text',
      field_type: 'text',
      required: false,
      options: [],
      order: (currentField.nested_subfields || []).length,
    };
    handleChange('nested_subfields', [...(currentField.nested_subfields || []), newSubField]);
  };

  const handleSubFieldChange = (index: number, prop: string, value: any) => {
    const newSubFields = [...(currentField.nested_subfields || [])];
    const subField = { ...newSubFields[index], [prop]: value };
    subField.id = String(subField.id ?? `${currentField.id}-sub-${index + 1}`);
    subField.type = subField.field_type = prop === 'type' ? value : subField.field_type;
    if (prop === 'type' && (value === 'select' || value === 'checkbox')) subField.options = subField.options || [];
    newSubFields[index] = subField;
    handleChange('nested_subfields', newSubFields);
  };

  const handleRemoveSubField = (index: number) => {
    handleChange('nested_subfields', (currentField.nested_subfields || []).filter((_: any, i: number) => i !== index));
  };

  const handleConditionToggle = (checked: boolean) => {
    setHasCondition(checked);
    if (!checked) {
      const { condition, ...rest } = currentField;
      setCurrentField(rest);
    } else {
      handleChange('condition', { fieldId: '', operator: 'equals', value: '' });
    }
  };

  const handleConditionChange = (prop: string, value: string) => {
    const newCond = { ...(currentField.condition || {}) };
    if (prop === 'fieldId') newCond.fieldId = String(value);
    else newCond[prop] = value;
    handleChange('condition', newCond);
  };

  const handleSave = () => {
    if (!currentField) return;

    const normalize = (fld: any): any => ({
      id: String(fld.id || ''),
      label: fld.label || '',
      field_type: fld.field_type || 'text',
      required: !!fld.required,
      order: fld.order ?? 0,
      options: (fld.field_type === 'select' || fld.field_type === 'checkbox') ? (Array.isArray(fld.options) ? fld.options : []) : null,
      nested_subfields: (fld.nested_subfields || []).map(normalize),
      condition: fld.condition ? { fieldId: String(fld.condition.fieldId), operator: fld.condition.operator, value: fld.condition.value } : null,
    });

    onSave(normalize(currentField));
  };

  if (!currentField) return null;

  const logicCapableTypes = ['select', 'checkbox', 'radio'];
  const conditionalFields = formFields.filter(f =>
    f && f.id && String(f.id) !== String(currentField.id) && logicCapableTypes.includes(getType(f))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{currentField.id.startsWith('tmp-') ? "Add New Field" : "Edit Field"}</DialogTitle>
          <DialogDescription>Configure the properties for this form field.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Field Label</Label>
            <Input id="label" value={currentField.label} onChange={(e) => handleChange('label', e.target.value)} />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Field Type</Label>
            <Select onValueChange={handleTypeChange} value={currentField.field_type || currentField.type}>
              <SelectTrigger id="type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableTypes.map(type => <SelectItem key={type} value={type} className="capitalize">{type.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Required */}
          <div className="flex items-center space-x-2">
            <Checkbox id="required" checked={!!currentField.required} onCheckedChange={(checked) => handleChange('required', !!checked)} />
            <Label htmlFor="required">This field is required</Label>
          </div>

          {/* Options */}
          {(getType(currentField) === 'select' || getType(currentField) === 'checkbox') && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Options</h4>
                  <Button variant="outline" size="sm" onClick={handleAddOption}><PlusCircle className="mr-2 h-4 w-4" /> Add Option</Button>
                </div>
                <div className="space-y-2">
                  {(currentField.options || []).map((option: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} />
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => handleRemoveOption(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Subfields for Field Groups */}
          {getType(currentField) === "field_group" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Subfields</h4>

                  <Button variant="outline" size="sm" onClick={handleAddSubField}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Subfield
                  </Button>
                </div>

                <div className="space-y-4">
                  {(currentField.nested_subfields || []).map((sub:any, index:any) => (
                    <div
                      key={sub.id}
                      className="border rounded-lg p-4 space-y-3 bg-muted/30"
                    >
                      {/* LABEL */}
                      <div className="space-y-2">
                        <Label>Subfield Label</Label>
                        <Input
                          value={sub.label}
                          onChange={(e) =>
                            handleSubFieldChange(index, "label", e.target.value)
                          }
                        />
                      </div>

                      {/* TYPE */}
                      <div className="space-y-2">
                        <Label>Subfield Type</Label>
                        <Select
                          value={sub.field_type}
                          onValueChange={(val) =>
                            handleSubFieldChange(index, "type", val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTypes.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* REQUIRED CHECKBOX */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!!sub.required}
                          onCheckedChange={(checked) =>
                            handleSubFieldChange(index, "required", !!checked)
                          }
                        />
                        <Label>Required</Label>
                      </div>

                      {/* OPTIONS FOR SELECT / CHECKBOX */}
                      {(sub.field_type === "select" || sub.field_type === "checkbox") && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h5 className="font-medium">Options</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newOpts = [...(sub.options || []), "New Option"];
                                handleSubFieldChange(index, "options", newOpts);
                              }}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" /> Add Option
                            </Button>
                          </div>

                          {(sub.options || []).map((opt:any, optIdx:any) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...sub.options];
                                  newOpts[optIdx] = e.target.value;
                                  handleSubFieldChange(index, "options", newOpts);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  const newOpts = sub.options.filter(
                                    (_:any, i:any) => i !== optIdx
                                  );
                                  handleSubFieldChange(index, "options", newOpts);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* REMOVE SUBFIELD */}
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveSubField(index)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Remove Subfield
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}


          {/* Conditional Logic */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-semibold">Conditional Logic</h4>
            <div className="flex items-center space-x-2">
              <Checkbox id="hasCondition" checked={hasCondition} onCheckedChange={(checked) => handleConditionToggle(!!checked)} />
              <Label htmlFor="hasCondition">Only show this field if a condition is met</Label>
            </div>

            {hasCondition && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <p className="text-sm">Show this field if the value of...</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <Select onValueChange={(value) => handleConditionChange('fieldId', value)} value={currentField.condition?.fieldId}>
                    <SelectTrigger><SelectValue placeholder="Select a field..." /></SelectTrigger>
                    <SelectContent>
                      {conditionalFields.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select disabled value={currentField.condition?.operator || 'equals'}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">is equal to</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input placeholder="Enter value..." value={currentField.condition?.value} onChange={(e) => handleConditionChange('value', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
