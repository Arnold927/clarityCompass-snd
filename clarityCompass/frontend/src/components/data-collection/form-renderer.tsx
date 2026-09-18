'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '../ui/calendar';
import { Separator } from '../ui/separator';

interface FormRendererProps {
  form: any;
  onSubmit: (data: Record<string, any>) => void;
}

export function FormRenderer({ form, onSubmit }: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const normalizeFieldId = (id: any) => id ? String(id).replace(/^tmp-/, '') : '';
  const getType = (f: any) => f.type || f.field_type;

  const getFieldError = (fieldId: string, groupId?: string, groupIndex?: number): string | undefined => {
    if (groupId && groupIndex !== undefined) {
      return errors[`${groupId}.${groupIndex}.${fieldId}`];
    }
    return errors[fieldId];
  };

  const initializeField = (field: any, parentData: Record<string, any>) => {
    const id = normalizeFieldId(field.id);
    const type = getType(field);

    if (type === 'field_group') {
      const subfields = field.subfields ?? field.nested_subfields ?? [];
      parentData[id] = (field.defaultValue ?? []).map(() => {
        const groupData: Record<string, any> = {};
        subfields.forEach((sub: any) => initializeField(sub, groupData));
        return groupData;
      });
    } else if (type === 'checkbox') {
      parentData[id] = field.defaultValue ?? [];
    } else {
      parentData[id] = field.defaultValue ?? '';
    }

    if (field.condition) {
      const condId = normalizeFieldId(field.condition.fieldId ?? field.condition.conditionFieldId);
      if (!(condId in parentData)) parentData[condId] = '';
    }
  };

  const initializeForm = () => {
    const data: Record<string, any> = {};
    (form?.fields || []).forEach((f: any) => initializeField(f, data));
    setFormData(data);
  };

  useEffect(() => {
    if (form) initializeForm();
  }, [form]);

  const isFieldVisible = (field: any, groupData?: Record<string, any>) => {
    const cond = field.condition;
    if (!cond) return true;

    const fieldId = cond.fieldId ?? cond.conditionFieldId;
    const operator = cond.operator ?? 'equals';
    const expectedValue = cond.value ?? cond.expectedValue;

    const normalizedId = normalizeFieldId(fieldId);
    const sourceValue = groupData?.[normalizedId] ?? formData[normalizedId] ?? '';

    const sourceStr = typeof sourceValue === 'string' ? sourceValue.trim() : sourceValue;
    const valueStr = typeof expectedValue === 'string' ? expectedValue.trim() : expectedValue;

    switch (operator) {
      case 'equals': return sourceStr === valueStr;
      case 'not_equals': return sourceStr !== valueStr;
      case 'contains': return Array.isArray(sourceValue) && sourceValue.includes(expectedValue);
      case 'in': return Array.isArray(expectedValue) && expectedValue.map(String).includes(String(sourceValue));
      default: return true;
    }
  };

  const handleChange = (fieldId: string, value: any) => {
    const normalized = normalizeFieldId(fieldId);
    setFormData(prev => ({ ...prev, [normalized]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[normalized];
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${normalized}.`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const normalized = normalizeFieldId(fieldId);
    const current = formData[normalized] || [];
    const updated = checked ? [...current, option] : current.filter((v: any) => v !== option);
    handleChange(normalized, updated);
  };

  const handleFieldGroupChange = (
    groupId: string,
    groupIndex: number,
    subFieldId: string,
    value: any
  ) => {
    const normalizedGroupId = normalizeFieldId(groupId);
    const normalizedSubFieldId = normalizeFieldId(subFieldId);

    const newGroups = (formData[normalizedGroupId] || []).map((g: any, idx: number) =>
      idx === groupIndex ? { ...g, [normalizedSubFieldId]: value } : g
    );

    handleChange(normalizedGroupId, newGroups);
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${normalizedGroupId}.${groupIndex}.${normalizedSubFieldId}`];
      return newErrors;
    });
  };

  const addFieldGroupEntry = (groupId: string, subFields: any[]) => {
    const normalizedGroupId = normalizeFieldId(groupId);
    const newEntry: Record<string, any> = {};
    subFields.forEach(sub => initializeField(sub, newEntry));
    handleChange(normalizedGroupId, [...(formData[normalizedGroupId] || []), newEntry]);
  };

  const removeFieldGroupEntry = (groupId: string, index: number) => {
    const normalizedGroupId = normalizeFieldId(groupId);
    const updated = [...(formData[normalizedGroupId] || [])];
    updated.splice(index, 1);
    handleChange(normalizedGroupId, updated);
    
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`${normalizedGroupId}.${index}.`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  const validateFormData = () => {
    const errors: Record<string, string> = {};

    const validateField = (field: any, currentData: Record<string, any>, context?: {
      groupId?: string;
      groupIndex?: number;
      groupData?: Record<string, any>;
    }) => {
      const id = normalizeFieldId(field.id);
      const type = getType(field);

      let value;
      if (context?.groupData && context.groupId && context.groupIndex !== undefined) {
        value = context.groupData[id];
      } else {
        value = currentData[id];
      }

      const isVisible = isFieldVisible(field, context?.groupData || currentData);
      
      if (field.required && isVisible) {
        if (type === "field_group") {
          const groups = value || [];
          const subfields = field.subfields ?? field.nested_subfields ?? [];

          groups.forEach((group: any, idx: number) => {
            subfields.forEach((sub: any) => {
              validateField(sub, currentData, {
                groupId: id,
                groupIndex: idx,
                groupData: group,
              });
            });
          });
        } else if (type === "checkbox") {
          if (!value || value.length === 0) {
            const errorKey = context?.groupId && context.groupIndex !== undefined
              ? `${context.groupId}.${context.groupIndex}.${id}`
              : id;
            errors[errorKey] = `${field.label} is required`;
          }
        } else {
          if (!value || value.toString().trim() === "") {
            const errorKey = context?.groupId && context.groupIndex !== undefined
              ? `${context.groupId}.${context.groupIndex}.${id}`
              : id;
            errors[errorKey] = `${field.label} is required`;
          }
        }
      }
    };

    form.fields.forEach((field: any) => {
      validateField(field, formData);
    });

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateFormData();
    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      
      toast({
        title: "Missing Required Field",
        description: errors[firstErrorKey],
        variant: "destructive",
      });

      let scrollId = firstErrorKey;
      if (firstErrorKey.includes('.')) {
        const parts = firstErrorKey.split('.');
        scrollId = parts[parts.length - 1];
      }
      
      const el = document.getElementById(scrollId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

      return;
    }

    setIsSubmitting(true);
    onSubmit(formData);
  };

  const renderField = (
    field: any,
    groupData?: Record<string, any>,
    groupIndex?: number,
    parentGroupId?: string
  ) => {
    if (!isFieldVisible(field, groupData)) return null;

    const id = normalizeFieldId(field.id);
    const type = getType(field);
    const value = groupData ? groupData[id] : formData[id];
    const error = getFieldError(id, parentGroupId, groupIndex);

    const commonLabel = (
      <Label htmlFor={id}>
        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
    );

    switch (type) {
      case 'text':
      case 'number':
        return (
          <div key={id} className="space-y-1">
            {commonLabel}
            <Input
              id={id}
              type={type === 'number' ? 'number' : 'text'}
              value={value ?? ''}
              onChange={e =>
                groupData && parentGroupId && groupIndex !== undefined
                  ? handleFieldGroupChange(parentGroupId, groupIndex, id, e.target.value)
                  : handleChange(id, e.target.value)
              }
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={id} className="space-y-1">
            {commonLabel}
            <Textarea
              id={id}
              value={value ?? ''}
              onChange={e =>
                groupData && parentGroupId && groupIndex !== undefined
                  ? handleFieldGroupChange(parentGroupId, groupIndex, id, e.target.value)
                  : handleChange(id, e.target.value)
              }
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={id} className="space-y-1">
            {commonLabel}
            <Select
              value={value ?? ''}
              onValueChange={val =>
                groupData && parentGroupId && groupIndex !== undefined
                  ? handleFieldGroupChange(parentGroupId, groupIndex, id, val)
                  : handleChange(id, val)
              }
            >
              <SelectTrigger id={id}>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt: any, idx: number) => {
                  const val = typeof opt === 'object' ? opt.name ?? opt.label ?? opt.id : String(opt);
                  return <SelectItem key={`${id}-option-${idx}`} value={val}>{val}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={id} className="space-y-2">
            {commonLabel}
            {(field.options || []).map((opt: any, idx: number) => {
              const optStr = String(opt);
              const checked = (value || []).includes(optStr);
              return (
                <div key={`${id}-checkbox-${idx}`} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${id}-${optStr}`}
                    checked={checked}
                    onCheckedChange={v =>
                      groupData && parentGroupId && groupIndex !== undefined
                        ? handleFieldGroupChange(
                            parentGroupId,
                            groupIndex,
                            id,
                            v ? [...(value || []), optStr] : (value || []).filter((x: any) => x !== optStr)
                          )
                        : handleCheckboxChange(id, optStr, !!v)
                    }
                  />
                  <Label htmlFor={`${id}-${optStr}`}>{optStr}</Label>
                </div>
              );
            })}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={id} className="space-y-1">
            {commonLabel}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !value && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(d: Date | undefined) =>
                    groupData && parentGroupId && groupIndex !== undefined
                      ? handleFieldGroupChange(parentGroupId, groupIndex, id, d ? d.toISOString() : '')
                      : handleChange(id, d ? d.toISOString() : '')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'field_group':
        const subfields = field.subfields ?? field.nested_subfields ?? [];
        const groups = value || [];
        return (
          <div key={id} className="space-y-4 rounded-lg border p-4">
            {groups.map((g: any, idx: number) => (
              <div key={`${id}-group-${idx}`} className="space-y-4 p-4 rounded-md bg-muted/50 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-destructive"
                  onClick={() => removeFieldGroupEntry(id, idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {subfields.map((sub: any, sidx: number) => (
                  <div key={`${id}-subfield-${normalizeFieldId(sub.id)}-${sidx}`} className="space-y-2">
                    {renderField(sub, g, idx, id)}
                  </div>
                ))}

                {idx < groups.length - 1 && <Separator />}
              </div>
            ))}
            <Button variant="outline" type="button" onClick={() => addFieldGroupEntry(id, subfields)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add {field.label}
            </Button>
          </div>
        );

      default:
        return <p key={id}>Unsupported field type</p>;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {(form?.fields || []).map((f: any, idx: number) => renderField(f))}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Data'}
      </Button>
    </form>
  );
}

export default FormRenderer;