
'use client';

import AppLayout from "@/components/layout/app-layout";
import { FormBuilder } from '@/components/data-collection/form-builder';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BarChart, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

export default function FormBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  
  const isNew = id === 'new';
  const title = isNew ? "Create New Form" : "Edit Form";

  return (
    <AppLayout platform="ngo">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            {!isNew && (
              <Button asChild variant="outline">
                <Link href={`/data-collection/submissions/${id}`}>
                  <BarChart className="mr-2 h-4 w-4" />
                  View Submissions
                </Link>
              </Button>
            )}
           <Button asChild variant="outline">
              <Link href="/data-collection">
                <ArrowLeft className="mr-2 h-4 w-4" />Back to Forms
              </Link>
            </Button>
        </div>
        <FormBuilder formId={isNew ? null : id} />
      </main>
    </AppLayout>
  );
}
