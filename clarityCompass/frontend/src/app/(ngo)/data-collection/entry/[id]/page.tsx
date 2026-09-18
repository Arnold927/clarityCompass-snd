'use client';

import AppLayout from "@/components/layout/app-layout";
import { FormRenderer } from "@/components/data-collection/form-renderer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart } from "lucide-react";
import api from "@/lib/api";

export default function DataEntryPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await api.get(`/data-collection/forms/${formId}/`);
        setForm(res.data);
        if (res.data.project_details && res.data.project_details.length > 0) {
          setSelectedProject(res.data.project_details[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch form:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleFormSubmit = async (formData: any) => {
    console.log("selectedProject:", selectedProject);

    if (!form || !selectedProject) return;

    const newSubmission = {
      local_id: `local-${Date.now()}`,
      id: `sub-${form.id}-${Date.now()}`,
      submitted_at: new Date().toISOString(),
      data: formData,
      project: selectedProject,
    };

    try {
      const res = await api.post('/data-collection/submissions/', {
        form: form.id,
        project_id: Number(selectedProject),
        data: formData,
        local_id: `local-${Date.now()}`,
      });

      console.log('Submission saved to backend:', res.data);
      alert('Submission saved successfully!');
    } catch (err) {
      console.error('Failed to save submission:', err);
      alert('Failed to save submission');
    }
  };

  if (loading) {
    return (
      <AppLayout platform="ngo">
        <div className="p-8 text-center">Loading form...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {form ? (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{form.title}</CardTitle>
                  <CardDescription>{form.description}</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/data-collection/submissions/${formId}`}>
                    <BarChart className="mr-2 h-4 w-4" />
                    View Submissions
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Project selector */}
              {form.project_details && form.project_details.length > 0 && (
                <div>
                  <label htmlFor="project" className="block text-sm font-medium mb-1">Select Project</label>
                  <select
                    id="project"
                    value={selectedProject || ""}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full border rounded p-2"
                  >
                    {form.project_details.map((p: any, idx: number) => (
                      <option key={p.id ?? idx} value={p.id}>
                        {p.title || p.code || `Project #${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form renderer */}
              <FormRenderer 
                form={{
                  ...form,
                  fields: form.form_fields.map((f: any) => ({ ...f, type: f.field_type }))
                }}
                onSubmit={handleFormSubmit}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p>Form not found.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </AppLayout>
  );
}
